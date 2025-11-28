import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      throw new Error("Verification token is required");
    }

    console.log("Verifying gig posting with token:", token);

    // Retrieve the verification record
    const { data: verificationData, error: verificationError } = await supabaseClient
      .from("verification_codes")
      .select("*")
      .eq("code", token)
      .eq("code_type", "gig_confirmation")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (verificationError || !verificationData) {
      console.error("Invalid or expired token:", verificationError);
      return new Response(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invalid Link - Digs and Gigs</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #d32f2f; }
            p { color: #666; line-height: 1.6; }
            a { color: #4CAF50; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Invalid or Expired Link</h1>
            <p>This confirmation link is invalid or has expired. Please post your gig again.</p>
            <p><a href="${Deno.env.get("SUPABASE_URL")?.replace('/functions/v1', '')}/post-gig">Return to Post Gig</a></p>
          </div>
        </body>
        </html>
        `,
        {
          status: 400,
          headers: { "Content-Type": "text/html", ...corsHeaders },
        }
      );
    }

    const gigData = verificationData.metadata.gigData;

    console.log("Posting gig to database:", gigData.title);

    // Geocode the location if provided
    let locationLat = null;
    let locationLng = null;
    
    if (gigData.location) {
      try {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(gigData.location)}.json?access_token=${Deno.env.get("MAPBOX_PUBLIC_KEY")}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.features && geocodeData.features.length > 0) {
          const [lng, lat] = geocodeData.features[0].center;
          locationLat = lat;
          locationLng = lng;
          console.log("Location geocoded successfully");
        }
      } catch (geocodeError) {
        console.error("Geocoding error:", geocodeError);
        // Continue without geocoding
      }
    }

    // Insert the gig into the database
    const { data: gigRecord, error: insertError } = await supabaseClient
      .from("gigs")
      .insert({
        title: gigData.title,
        description: gigData.description,
        location: gigData.location,
        location_lat: locationLat,
        location_lng: locationLng,
        timeline: gigData.timeline,
        budget_min: gigData.budget_min,
        budget_max: gigData.budget_max,
        consumer_id: gigData.consumer_id,
        category_id: gigData.category_id,
        deadline: gigData.deadline,
        contact_preferences: gigData.contact_preferences,
        consumer_phone: gigData.consumer_phone,
        status: gigData.status,
        documents: gigData.documents,
        escrow_requested_by_consumer: gigData.escrow_requested_by_consumer,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting gig:", insertError);
      throw insertError;
    }

    console.log("Gig posted successfully:", gigRecord.id);

    // Match diggers using AI semantic matching
    try {
      // Get category name for better matching
      let categoryName = "";
      if (gigData.category_id) {
        const { data: categoryData } = await supabaseClient
          .from("categories")
          .select("name")
          .eq("id", gigData.category_id)
          .single();
        categoryName = categoryData?.name || "";
      }

      const matchResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/match-diggers-semantic`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            gig_title: gigData.title,
            gig_description: gigData.description,
            gig_category: categoryName,
          }),
        }
      );

      if (matchResponse.ok) {
        const matchData = await matchResponse.json();
        if (matchData.matches && matchData.matches.length > 0) {
          console.log(`AI semantic matching found ${matchData.matches.length} relevant diggers`);
          
          // Send notifications to matched diggers
          for (const match of matchData.matches) {
            try {
              await supabaseClient.rpc('create_notification', {
                p_user_id: match.user_id,
                p_title: 'New Gig Match',
                p_message: `${match.business_name}, we found a gig that matches your expertise! "${gigData.title}"`,
                p_type: 'new_gig',
                p_link: `/gig/${gigRecord.id}`,
                p_metadata: {
                  gig_id: gigRecord.id,
                  confidence: match.confidence,
                  reasoning: match.reasoning
                }
              });
            } catch (notifError) {
              console.error('Error sending notification:', notifError);
            }
          }
        }
      }
    } catch (matchError) {
      console.error("Error matching diggers:", matchError);
      // Don't fail the gig posting if matching fails
    }

    // Delete the verification code
    await supabaseClient
      .from("verification_codes")
      .delete()
      .eq("code", token);

    // Create notification for the user
    await supabaseClient
      .from("notifications")
      .insert({
        user_id: gigData.consumer_id,
        type: "gig_posted",
        title: "Gig Posted Successfully",
        message: `Your gig "${gigData.title}" has been posted and is now visible to professionals.`,
        link: `/gig/${gigRecord.id}`,
      });

    // Return success HTML page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Gig Posted Successfully - Digs and Gigs</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #4CAF50; }
          p { color: #666; line-height: 1.6; }
          .gig-title { font-weight: bold; color: #333; margin: 20px 0; }
          a { display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          a:hover { background: #45a049; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ Gig Posted Successfully!</h1>
          <p class="gig-title">"${gigData.title}"</p>
          <p>Your gig has been confirmed and posted to the marketplace. Professionals can now view and bid on your project.</p>
          <a href="${Deno.env.get("SUPABASE_URL")?.replace('/functions/v1', '')}/my-gigs">View My Gigs</a>
        </div>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-gig-confirmation function:", error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Error - Digs and Gigs</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
          .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #d32f2f; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Error Posting Gig</h1>
          <p>${error.message}</p>
        </div>
      </body>
      </html>
      `,
      {
        status: 500,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      }
    );
  }
};

serve(handler);

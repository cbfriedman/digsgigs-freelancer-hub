import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[GENERATE-BLOG-POST] ${step}`, details || "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting blog post generation");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get request body or use defaults for cron
    const body = req.method === "POST" ? await req.json() : {};
    const { topic, authorId, settingsId } = body;

    // If no topic provided, get from settings
    let finalTopic = topic;
    let settings: any = null;

    if (!finalTopic) {
      logStep("No topic provided, fetching from settings");
      
      const { data: settingsData, error: settingsError } = await supabaseClient
        .from("blog_generation_settings")
        .select("*")
        .eq("enabled", true)
        .single();

      if (settingsError || !settingsData) {
        throw new Error("No active blog generation settings found");
      }

      settings = settingsData;
      
      // Pick a random topic from the list
      if (settings.topics && settings.topics.length > 0) {
        finalTopic = settings.topics[Math.floor(Math.random() * settings.topics.length)];
      } else {
        throw new Error("No topics configured in settings");
      }
    }

    logStep("Generating blog post for topic", { topic: finalTopic });

    // Generate blog content with Lovable AI
    const systemPrompt = `You are an expert blog writer for a service marketplace platform called digsandgigs. 
Write SEO-optimized, engaging blog posts that provide value to readers.
Format your response as a JSON object with these fields:
- title: A compelling, SEO-friendly title (50-60 characters)
- excerpt: A brief summary (150-160 characters)
- content: Full blog post content in markdown format (${settings?.word_count || 800} words)
- meta_title: SEO meta title (50-60 characters)
- meta_description: SEO meta description (150-160 characters)
- meta_keywords: Comma-separated keywords (5-10 keywords)
- slug: URL-friendly slug`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Write a blog post about: ${finalTopic}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logStep("AI API error", { status: aiResponse.status, error: errorText });
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    logStep("AI response received", { contentLength: content.length });

    // Parse AI response
    let blogData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      blogData = JSON.parse(jsonString);
    } catch (parseError) {
      logStep("Failed to parse AI response as JSON, using fallback", { error: parseError });
      // Fallback: create structured data from raw content
      blogData = {
        title: finalTopic,
        excerpt: content.substring(0, 160),
        content: content,
        meta_title: finalTopic,
        meta_description: content.substring(0, 160),
        meta_keywords: finalTopic,
        slug: finalTopic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      };
    }

    logStep("Blog data parsed", { title: blogData.title });

    // Get first admin user as author if not specified
    let finalAuthorId = authorId;
    if (!finalAuthorId) {
      const { data: adminUser } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("user_type", "consumer")
        .limit(1)
        .single();
      
      finalAuthorId = adminUser?.id;
    }

    // Get or create category
    let categoryId = null;
    if (settings?.target_categories && settings.target_categories.length > 0) {
      categoryId = settings.target_categories[0];
    } else {
      // Try to get "General" category or create it
      const { data: generalCategory } = await supabaseClient
        .from("blog_categories")
        .select("id")
        .eq("slug", "general")
        .single();
      
      if (generalCategory) {
        categoryId = generalCategory.id;
      }
    }

    // Generate featured image if enabled
    let featuredImage = null;
    if (settings?.include_images !== false) {
      try {
        logStep("Generating featured image");
        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: `Create a professional, high-quality featured image for a blog post titled: ${blogData.title}. Make it visually appealing and relevant to the topic.`
              }
            ],
            modalities: ["image", "text"]
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          featuredImage = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          logStep("Featured image generated successfully");
        }
      } catch (imageError) {
        logStep("Failed to generate image, continuing without it", { error: imageError });
      }
    }

    // Insert blog post
    const { data: newPost, error: insertError } = await supabaseClient
      .from("blog_posts")
      .insert({
        title: blogData.title,
        slug: blogData.slug,
        excerpt: blogData.excerpt,
        content: blogData.content,
        featured_image: featuredImage,
        author_id: finalAuthorId,
        category_id: categoryId,
        status: "published",
        published_at: new Date().toISOString(),
        meta_title: blogData.meta_title,
        meta_description: blogData.meta_description,
        meta_keywords: blogData.meta_keywords,
      })
      .select()
      .single();

    if (insertError) {
      logStep("Error inserting blog post", { error: insertError });
      throw insertError;
    }

    logStep("Blog post created successfully", { postId: newPost.id });

    // Add tags if specified
    if (settings?.target_tags && settings.target_tags.length > 0 && newPost) {
      const tagInserts = settings.target_tags.map((tagId: string) => ({
        post_id: newPost.id,
        tag_id: tagId,
      }));

      await supabaseClient
        .from("blog_post_tags")
        .insert(tagInserts);
    }

    // Log generation history
    await supabaseClient
      .from("blog_generation_history")
      .insert({
        post_id: newPost.id,
        topic: finalTopic,
        status: "success",
        settings_snapshot: settings,
      });

    return new Response(
      JSON.stringify({
        success: true,
        post: newPost,
        topic: finalTopic,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("ERROR", { message: errorMessage, stack: errorStack });

    // Log failed generation
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabaseClient
        .from("blog_generation_history")
        .insert({
          topic: "Unknown",
          status: "error",
          error_message: errorMessage,
        });
    } catch (logError) {
      logStep("Failed to log error", { error: logError });
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

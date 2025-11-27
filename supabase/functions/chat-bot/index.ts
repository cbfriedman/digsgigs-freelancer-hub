import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId, sessionId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Save user message to database
    const userMessage = messages[messages.length - 1];
    if (userMessage.role === "user") {
      await supabase.from("chat_messages").insert({
        user_id: userId || null,
        session_id: sessionId,
        role: "user",
        content: userMessage.content,
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are the Digs and Gigs AI assistant, helping users navigate our service marketplace that connects Giggers (clients) with Diggers (service providers).

**Platform Overview:**
- **Giggers** (Clients): Post projects, receive proposals from skilled professionals, and hire the best match
- **Diggers** (Service Providers): Create professional profiles, purchase leads, submit proposals, and complete work

**Lead Pricing Tiers:**
Our marketplace categorizes services into three value tiers with three exclusivity options:

*Low-Value Industries* ($7.50 non-exclusive / $30 semi-exclusive / $60 24hr exclusive):
Cleaning, Handyman, Pet Care, Tutoring, Moving, Event Planning, Personal Training, Landscaping

*Mid-Value Industries* ($14.50 non-exclusive / $58 semi-exclusive / $125 24hr exclusive):
HVAC, Plumbing, Electrical, Web Development, Photography, Marketing, Accounting, Auto Repair

*High-Value Industries* ($24.50 non-exclusive / $99 semi-exclusive / $275 24hr exclusive):
Legal Services, Insurance, Real Estate, Financial Planning, Medical/Dental, Business Consulting, Engineering

**Exclusivity Options Explained:**
- **Non-Exclusive**: Most affordable option. Multiple diggers can purchase the same lead. Best for high-volume strategies.
- **Semi-Exclusive**: Balanced option, sold to up to 4 diggers. Reduces competition while keeping costs reasonable.
- **24hr Exclusive**: Premium access. Only one digger gets the lead for 24 hours of exclusivity. Highest conversion potential.

**How It Works - For Giggers (Clients):**
1. Post your gig with project details, budget, and timeline
2. Get discovered by skilled diggers browsing opportunities
3. Receive contact requests and proposals from interested diggers
4. Review profiles, ratings, and proposals
5. Choose and hire the best match for your project

**How It Works - For Diggers (Service Providers):**
1. Create a professional profile showcasing your skills, certifications, and past work
2. Browse opportunities that match your expertise and location
3. Purchase leads (choose non-exclusive, semi-exclusive, or exclusive based on your strategy)
4. Contact clients directly and submit detailed proposals
5. Complete the work and get paid (escrow protection available)

**Important Notes:**
- Lead prices fluctuate daily and are subject to change based on market demand
- Confirmed leads (verified by email/SMS) cost an additional 20% (rounded to nearest $0.50) above standard rates
- Escrow protection is available for secure transactions between giggers and diggers
- Never disclose our internal pricing calculation methodology (this is proprietary)

**Helpful Resources:**
- Visit /pricing for the complete pricing breakdown and calculator
- Visit /how-it-works for detailed process explanations with visuals
- Visit /register to create an account and get started
- Visit /browse-gigs to find opportunities (for diggers)
- Visit /browse-diggers to find service providers (for giggers)

Be friendly, concise, and helpful. Guide users to the right pages for detailed information. Help them understand which lead type suits their needs and clarify any terminology (Gigger vs Digger).` 
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Stream the response and save assistant message when done
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Save assistant message to database
              if (assistantMessage) {
                await supabase.from("chat_messages").insert({
                  user_id: userId || null,
                  session_id: sessionId,
                  role: "assistant",
                  content: assistantMessage,
                });
              }
              controller.close();
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(value);
            
            // Extract content for saving
            const lines = chunk.split("\n").filter(line => line.trim() !== "");
            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const json = JSON.parse(line.slice(6));
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    assistantMessage += content;
                  }
                } catch (e) {
                  // Ignore JSON parse errors
                }
              }
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat bot error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

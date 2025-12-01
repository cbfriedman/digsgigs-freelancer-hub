import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnhanceDescriptionRequest {
  description: string;
  title: string;
  category: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, title, category }: EnhanceDescriptionRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
            content: `You are a professional gig description writer. Your job is to enhance user-provided gig descriptions to make them more comprehensive, professional, and appealing to service providers.

Guidelines:
- Expand on the user's basic description with relevant details
- Include what the project involves, expected outcomes, and any specific requirements
- Mention timeline expectations and project scope
- Add details about work environment or location context if relevant
- Keep the tone professional but approachable
- Maintain the core intent of the original description
- Make it 2-3 paragraphs (150-250 words)
- Focus on clarity and completeness

Do NOT:
- Change the fundamental nature of the project
- Add fictional requirements not implied by the original
- Use overly flowery or sales-heavy language
- Include budget information (that's separate)`,
          },
          {
            role: "user",
            content: `Enhance this gig description:

Title: ${title}
Category: ${category}
Original Description: ${description}

Return ONLY the enhanced description text, no additional commentary.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedDescription = data.choices?.[0]?.message?.content;

    if (!enhancedDescription) {
      throw new Error("No enhanced description received from AI");
    }

    console.log("Description enhanced successfully");

    return new Response(
      JSON.stringify({ enhancedDescription }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error enhancing description:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

interface EnhanceDescriptionRequest {
  description: string;
  title: string;
  category: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  try {
    const { description, title, category }: EnhanceDescriptionRequest = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not configured - AI enhancement disabled");
      return new Response(
        JSON.stringify({ 
          error: "AI enhancement is not available. OPENAI_API_KEY is not configured. Please configure it in Supabase Dashboard → Settings → Edge Functions → Secrets to enable AI features.",
          requiresApiKey: true
        }),
        {
          status: 503,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
          ...getCorsHeaders(origin),
        },
      }
    );
  } catch (error: any) {
    console.error("Error enhancing description:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to enhance description. Please try again." }),
      {
        status: 500,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

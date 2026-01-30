import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

interface EnhanceDescriptionRequest {
  description: string;
  problemLabel?: string;
  clarifyingLabel?: string;
  labels?: string;
  professions?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  
  // Version fingerprint for deployment verification
  console.log("enhance-gig-description v2026-01-15 using LOVABLE_API_KEY");
  
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  try {
    const { description, problemLabel, clarifyingLabel, labels, professions }: EnhanceDescriptionRequest = await req.json();

    if (!description?.trim()) {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const hasLovableKey = !!LOVABLE_API_KEY;
    console.log(`Environment check: hasLovableKey=${hasLovableKey}`);
    
    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI enhancement is not available" }),
        {
          status: 503,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    // Build context from various possible inputs
    const professionContext = professions?.length 
      ? `Professions: ${professions.join(', ')}` 
      : labels 
        ? `Professions: ${labels}` 
        : null;
    
    const contextInfo = [
      problemLabel ? `Project Type: ${problemLabel}` : null,
      clarifyingLabel ? `Specifics: ${clarifyingLabel}` : null,
      professionContext,
    ].filter(Boolean).join('\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that improves project descriptions for a freelance marketplace. 
Your job is to take a basic description and make it clearer, more professional, and more detailed.

Guidelines:
- Expand on the user's basic description with relevant details
- Keep it concise but comprehensive (100-200 words)
- Maintain the user's original intent and voice
- Use clear, professional language
- Include what outcomes are expected
- Do NOT add fictional requirements not implied by the original
- Do NOT include budget, timeline, or contact information
- Return ONLY the enhanced description, no additional commentary or formatting`,
          },
          {
            role: "user",
            content: `Improve this project description:

${contextInfo ? contextInfo + '\n\n' : ''}Original Description: ${description}

Return only the improved description text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a moment." }),
          { status: 429, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits required. Please try again later." }),
          { status: 402, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedDescription) {
      throw new Error("No enhanced description received from AI");
    }

    console.log("Description enhanced successfully");

    return new Response(
      JSON.stringify({ enhancedDescription }),
      {
        status: 200,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error enhancing description:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to enhance description" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

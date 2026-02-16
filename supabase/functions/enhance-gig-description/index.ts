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
  console.log("enhance-gig-description v2026-01-15 using OPENAI_API_KEY");
  
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  try {
    let body: EnhanceDescriptionRequest;
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }
    const { description, problemLabel, clarifyingLabel, labels, professions } = body;

    const hasDescription = !!description?.trim();
    const professionContext = professions?.length
      ? `Professions: ${professions.join(', ')}`
      : labels?.trim()
        ? `Professions: ${labels}`
        : null;

    if (!hasDescription && !professionContext) {
      return new Response(
        JSON.stringify({ error: "Description or professions/labels is required" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI enhancement is not available. Please set OPENAI_API_KEY in Supabase Edge Function secrets." }),
        {
          status: 503,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    // Build context from various possible inputs
    const contextInfo = [
      problemLabel ? `Project Type: ${problemLabel}` : null,
      clarifyingLabel ? `Specifics: ${clarifyingLabel}` : null,
      professionContext,
    ].filter(Boolean).join('\n');

    const systemPrompt = hasDescription
      ? `You are a helpful assistant that improves project descriptions for a freelance marketplace. 
Your job is to take a basic description and make it clearer, more professional, and more detailed.

Guidelines:
- Expand on the user's basic description with relevant details
- Keep it concise but comprehensive (100-200 words)
- Maintain the user's original intent and voice
- Use clear, professional language
- Include what outcomes are expected
- Do NOT add fictional requirements not implied by the original
- Do NOT include budget, timeline, or contact information
- Return ONLY the enhanced description, no additional commentary or formatting`
      : `You are a helpful assistant for a freelance marketplace. 
Your job is to write a short professional specialty description for a service provider (freelancer) based only on their selected professions/skills.

Guidelines:
- Write in first person as the freelancer ("I offer...", "I specialize in...")
- Keep it concise but specific (80-150 words)
- Mention the listed professions and typical services or outcomes
- Use clear, professional language
- Do NOT include budget, pricing, or contact information
- Return ONLY the description text, no headings or extra formatting`;

    const userContent = hasDescription
      ? `Improve this project description:\n\n${contextInfo ? contextInfo + '\n\n' : ''}Original Description: ${description}\n\nReturn only the improved description text.`
      : `Generate a professional specialty description for a freelancer who offers these services:\n\n${contextInfo}\n\nReturn only the description text.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      let userMessage = "AI service error. Please try again.";
      try {
        const errJson = JSON.parse(errorText);
        const msg = errJson?.error?.message ?? errJson?.message ?? errorText?.slice(0, 200);
        if (response.status === 401) userMessage = "OpenAI API key is invalid or missing.";
        else if (response.status === 429) userMessage = "AI service is busy. Please try again in a moment.";
        else if (response.status === 402) userMessage = "AI credits required. Please try again later.";
        else if (msg) userMessage = msg;
      } catch {
        // Ignore JSON parse errors, use errorText
      }
      return new Response(
        JSON.stringify({ error: userMessage }),
        { status: 502, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    let data: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    try {
      data = await response.json();
    } catch (_e) {
      console.error("OpenAI response not JSON");
      return new Response(
        JSON.stringify({ error: "Invalid response from AI service." }),
        { status: 502, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    if (data?.error?.message) {
      console.error("OpenAI error in body:", data.error.message);
      return new Response(
        JSON.stringify({ error: data.error.message }),
        { status: 502, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const enhancedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedDescription) {
      console.error("OpenAI response missing choices:", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "No description generated. Please try again." }),
        { status: 502, headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" } }
      );
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
    const message = error?.message || "Failed to enhance description";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

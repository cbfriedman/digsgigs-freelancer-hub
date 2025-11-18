import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profession, yearsExperience, skills, specialties, tone } = await req.json();
    
    if (!profession) {
      return new Response(
        JSON.stringify({ error: "Profession is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from provided information
    const experienceText = yearsExperience ? `with ${yearsExperience} years of experience` : "";
    const skillsText = skills?.length > 0 ? `skilled in ${skills.join(", ")}` : "";
    const specialtiesText = specialties ? `specializing in ${specialties}` : "";
    
    const toneMap: Record<string, string> = {
      professional: "professional and trustworthy",
      friendly: "warm, approachable, and personable",
      confident: "confident and authoritative",
      creative: "creative and innovative"
    };
    
    const selectedTone = toneMap[tone] || toneMap.professional;

    const systemPrompt = `You are an expert copywriter helping service professionals create compelling bio descriptions for their profiles. Write in a ${selectedTone} tone. Keep the bio concise (2-4 sentences, 50-100 words). Focus on value proposition, expertise, and what makes them stand out. Write in first person. Do not use clichés or generic statements.`;

    const userPrompt = `Write a professional bio for a ${profession} ${experienceText} ${skillsText} ${specialtiesText}. The bio should highlight their expertise, experience, and what clients can expect when working with them.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate bio");
    }

    const data = await response.json();
    const generatedBio = data.choices?.[0]?.message?.content?.trim();

    if (!generatedBio) {
      throw new Error("No bio generated");
    }

    return new Response(
      JSON.stringify({ bio: generatedBio }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-bio function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

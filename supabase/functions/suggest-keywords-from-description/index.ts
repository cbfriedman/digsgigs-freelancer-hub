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
    const { description, location } = await req.json();

    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing description:", description);
    console.log("Location/Zipcode:", location);

    const systemPrompt = `You are a professional services keyword analyzer. Based on the user's description of their business or specialty, suggest 5-10 relevant professional service keywords from common industries like:
- Legal services (lawyer, attorney specialties)
- Home services (HVAC, plumbing, electrical, roofing, remodeling)
- Medical/Healthcare (treatments, procedures)
- Financial services (insurance, loans, accounting)
- Business services (marketing, consulting)
- Automotive services
- Pet care
- Education/tutoring
- Fitness/wellness
- Beauty/personal care

Return specific, searchable keywords that potential customers would use to find this service. Be specific - for example, instead of just "lawyer", suggest "personal injury lawyer" or "DUI lawyer".

IMPORTANT: If a location or zipcode is provided, ensure the suggested keywords are geographically relevant to that location. For example, if the zipcode is in Northern California, do NOT suggest keywords specific to Southern California (e.g., "Los Angeles lawyer" when zipcode is in San Francisco area). Use location-agnostic keywords or keywords specific to the provided location area.`;

    const userPrompt = location 
      ? `Based on this description and location (${location}), suggest relevant professional service keywords that are geographically appropriate: "${description}"`
      : `Based on this description, suggest relevant professional service keywords: "${description}"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_keywords",
              description: "Return 5-10 relevant professional service keywords",
              parameters: {
                type: "object",
                properties: {
                  keywords: {
                    type: "array",
                    items: {
                      type: "string",
                      description: "A specific, searchable professional service keyword"
                    },
                    minItems: 5,
                    maxItems: 10
                  }
                },
                required: ["keywords"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_keywords" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const keywords = JSON.parse(toolCall.function.arguments).keywords;

    return new Response(
      JSON.stringify({ keywords }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

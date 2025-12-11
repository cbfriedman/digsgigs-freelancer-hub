import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  try {
    const { title, description } = await req.json();

    if (!title || !description) {
      throw new Error("Title and description are required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all categories from database
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      throw new Error("Failed to fetch categories");
    }

    // Build category hierarchy for AI
    const parents = categories.filter((cat: any) => !cat.parent_category_id);
    const categoryInfo = parents.map((parent: any) => {
      const subcategories = categories.filter(
        (cat: any) => cat.parent_category_id === parent.id
      );
      return {
        parent: parent.name,
        parent_id: parent.id,
        subcategories: subcategories.map((sub: any) => ({
          id: sub.id,
          name: sub.name,
          description: sub.description,
        })),
      };
    });

    // Use Lovable AI to match the gig to a category
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured in Edge Function secrets");
      throw new Error("AI categorization service is not configured. Please contact support.");
    }

    const systemPrompt = `You are a category matching assistant for a gig marketplace. Given a gig title and description, you must select the SINGLE most appropriate subcategory from the available categories.

Available categories:
${JSON.stringify(categoryInfo, null, 2)}

Your task:
1. Analyze the gig title and description
2. Select the ONE subcategory that best matches the gig
3. Provide a confidence score (0-100)
4. Explain your reasoning briefly

You must respond using the match_category tool with the exact category_id from the list above.`;

    const userPrompt = `Gig Title: ${title}

Gig Description: ${description}

Which subcategory is the best match?`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "match_category",
              description: "Match a gig to the most appropriate category",
              parameters: {
                type: "object",
                properties: {
                  category_id: {
                    type: "string",
                    description: "The UUID of the matched subcategory",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score from 0-100",
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of why this category was chosen",
                  },
                },
                required: ["category_id", "confidence", "reasoning"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "match_category" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI service requires payment. Please contact support.");
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI categorization failed");
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData, null, 2));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No category match found");
    }

    const matchResult = JSON.parse(toolCall.function.arguments);

    // Verify the category exists
    const matchedCategory = categories.find(
      (cat: any) => cat.id === matchResult.category_id
    );

    if (!matchedCategory) {
      throw new Error("Invalid category returned by AI");
    }

    // Get parent category name
    const parentCategory = categories.find(
      (cat: any) => cat.id === matchedCategory.parent_category_id
    );

    return new Response(
      JSON.stringify({
        category_id: matchResult.category_id,
        category_name: matchedCategory.name,
        parent_category: parentCategory?.name,
        confidence: matchResult.confidence,
        reasoning: matchResult.reasoning,
      }),
      {
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in auto-categorize-gig:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleOptionsRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  
  if (req.method === "OPTIONS") {
    return handleOptionsRequest(origin);
  }

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body. Please provide title and description." }),
        {
          status: 400,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    const { title, description } = requestBody;

    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: "Title and description are required" }),
        {
          status: 400,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      });
      throw new Error("Server configuration error. Please contact support.");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all categories from database
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError);
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }

    if (!categories || categories.length === 0) {
      throw new Error("No categories found in database. Please contact support.");
    }

    // Build category hierarchy for AI
    const parents = categories.filter((cat: any) => !cat.parent_category_id);
    
    if (parents.length === 0) {
      throw new Error("No parent categories found. Please contact support.");
    }

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

    // Check if we have any subcategories
    const totalSubcategories = categoryInfo.reduce((sum, cat) => sum + cat.subcategories.length, 0);
    if (totalSubcategories === 0) {
      throw new Error("No subcategories found. Please contact support.");
    }

    // Use Lovable AI to match the gig to a category (optional)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured - AI categorization disabled");
      // Return a response indicating manual selection is needed
      return new Response(
        JSON.stringify({ 
          requires_manual_selection: true,
          message: "AI categorization is not available. Please select a category manually.",
          categories: categoryInfo
        }),
        {
          status: 200,
          headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
        }
      );
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
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", {
        status: aiResponse.status,
        statusText: aiResponse.statusText,
        error: errorText,
      });
      
      if (aiResponse.status === 401 || aiResponse.status === 403) {
        throw new Error("AI service authentication failed. Please contact support.");
      }
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI service requires payment. Please contact support.");
      }
      if (aiResponse.status >= 500) {
        throw new Error("AI service is temporarily unavailable. Please try again later.");
      }
      
      throw new Error(`AI categorization failed: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData, null, 2));

    // Check if we have a valid response
    if (!aiData.choices || aiData.choices.length === 0) {
      console.error("No choices in AI response:", aiData);
      throw new Error("AI service returned an invalid response. Please try again.");
    }

    // Extract the tool call result
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", aiData);
      throw new Error("AI could not determine a category match. Please try describing your gig differently.");
    }

    let matchResult;
    try {
      matchResult = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, toolCall.function.arguments);
      throw new Error("AI returned invalid data. Please try again.");
    }

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

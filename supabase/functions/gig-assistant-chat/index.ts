import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const systemPrompt = `You are a friendly project intake assistant for Digs and Gigs, a freelance marketplace. Your job is to help clients describe their project needs in plain English.

CONVERSATION RULES:
1. Be warm, friendly, and conversational
2. Ask one or two questions at a time - don't overwhelm
3. Use simple language, no technical jargon
4. After each response, call the update_gig_details function with any new information extracted

INFORMATION TO COLLECT:
1. PROBLEM TYPE - What they're trying to do (one of: build-website, build-webapp, design, marketing, content, automation, business-systems, other)
2. CLARIFYING DETAILS - More specific info about their problem
3. DESCRIPTION - Full description of what they want (at least 2-3 sentences)
4. BUDGET RANGE - Minimum and maximum budget in USD
5. TIMELINE - When they need it done (asap, 1-2-weeks, 1-2-months, exploring)
6. CONTACT INFO - Their name and email (phone is optional)

FLOW:
1. Start by asking what they need help with
2. Based on their answer, ask clarifying questions
3. Once you understand the project, ask about budget
4. Then ask about timeline
5. Finally, collect their contact info
6. When you have all required info, set isComplete to true

ALWAYS call the update_gig_details function after each message to update the extracted information. Even if you only have partial info, send what you have.`;

const tools = [
  {
    type: "function",
    function: {
      name: "update_gig_details",
      description: "Update the extracted gig details from the conversation. Call this after every response with any new information gathered.",
      parameters: {
        type: "object",
        properties: {
          problemId: {
            type: "string",
            enum: ["build-website", "build-webapp", "design", "marketing", "content", "automation", "business-systems", "other"],
            description: "The type of problem/project category"
          },
          clarifyingAnswer: {
            type: "string",
            description: "More specific details about the problem"
          },
          description: {
            type: "string",
            description: "Full description of what they want done"
          },
          budgetMin: {
            type: "number",
            description: "Minimum budget in USD"
          },
          budgetMax: {
            type: "number",
            description: "Maximum budget in USD"
          },
          timeline: {
            type: "string",
            enum: ["asap", "1-2-weeks", "1-2-months", "exploring"],
            description: "When they need the project completed"
          },
          clientName: {
            type: "string",
            description: "The client's name"
          },
          clientEmail: {
            type: "string",
            description: "The client's email address"
          },
          clientPhone: {
            type: "string",
            description: "The client's phone number (optional)"
          },
          isComplete: {
            type: "boolean",
            description: "Set to true only when ALL required fields have been collected: problemId, clarifyingAnswer, description, budgetMin, budgetMax, timeline, clientName, clientEmail"
          }
        },
        required: ["isComplete"],
        additionalProperties: false
      }
    }
  }
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, currentData } = await req.json();
    console.log("Received messages:", messages?.length, "Current data:", currentData);

    // Add context about what's already been collected
    let contextMessage = "";
    if (currentData) {
      const collected: string[] = [];
      if (currentData.problemId) collected.push(`Problem type: ${currentData.problemId}`);
      if (currentData.clarifyingAnswer) collected.push(`Details: ${currentData.clarifyingAnswer}`);
      if (currentData.description) collected.push(`Description: ${currentData.description}`);
      if (currentData.budgetMin || currentData.budgetMax) {
        collected.push(`Budget: $${currentData.budgetMin || '?'} - $${currentData.budgetMax || '?'}`);
      }
      if (currentData.timeline) collected.push(`Timeline: ${currentData.timeline}`);
      if (currentData.clientName) collected.push(`Name: ${currentData.clientName}`);
      if (currentData.clientEmail) collected.push(`Email: ${currentData.clientEmail}`);
      
      if (collected.length > 0) {
        contextMessage = `\n\nINFORMATION ALREADY COLLECTED:\n${collected.join("\n")}\n\nFocus on collecting the missing information.`;
      }
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
          { role: "system", content: systemPrompt + contextMessage },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid API key. Please check your OpenAI API configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    const choice = data.choices?.[0];
    const message = choice?.message;
    
    // Extract tool call data if present
    let extractedData = null;
    if (message?.tool_calls?.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.function?.name === "update_gig_details") {
        try {
          extractedData = JSON.parse(toolCall.function.arguments);
          console.log("Extracted data:", extractedData);
        } catch (e) {
          console.error("Failed to parse tool call arguments:", e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        content: message?.content || "",
        extractedData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("gig-assistant-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

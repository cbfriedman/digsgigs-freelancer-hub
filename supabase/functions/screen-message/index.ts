import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScreeningResult {
  approved: boolean;
  violations: string[];
  violationDetails: string[];
  riskScore: number;
  suggestedAction: 'allow' | 'warn' | 'block';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, senderType, context } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Screening message from ${senderType}, length: ${message.length}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a content moderator for Digs & Gigs marketplace.
Analyze messages sent between anonymous parties BEFORE job award.

Your task is to detect violations that would allow parties to bypass the platform.

BLOCK if the message contains ANY of these:
1. EMAIL ADDRESSES: Any pattern like xxx@xxx.xxx or "my email is john at gmail dot com"
2. PHONE NUMBERS: 7+ digit sequences, formatted numbers like 555-123-4567, "call me at...", "text me"
3. SOCIAL MEDIA HANDLES: @username, "find me on Instagram/Twitter/LinkedIn", "DM me"
4. WEBSITE URLs: http://, www., .com, .net, .org, any domain references
5. OFF-PLATFORM SOLICITATION: "Contact me outside", "Let's talk on WhatsApp", "Message me directly"
6. FEE CIRCUMVENTION: "Pay me directly", "Skip the platform fee", "Cash only", "Avoid the commission"
7. HARASSMENT: Threats, profanity, discriminatory language, abusive content
8. IDENTITY REVEAL: Sharing full name, company name, or other unique identifiers

ALLOW legitimate business questions like:
- Timelines and availability
- Experience with similar projects
- Questions about the scope of work
- Technical clarifications
- Process and methodology questions

Respond with a JSON object:
{
  "approved": boolean,
  "violations": ["contact_email" | "contact_phone" | "contact_social" | "contact_website" | "off_platform_solicitation" | "identity_reveal" | "fee_circumvention" | "harassment" | "spam"],
  "violationDetails": ["Human-readable description of each violation"],
  "riskScore": number (0-100, where 100 is highest risk),
  "suggestedAction": "allow" | "warn" | "block"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this message from a ${senderType}:\n\n"${message}"${context ? `\n\nContext: ${context}` : ''}` }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      // Handle rate limits
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fallback to strict regex-based screening if AI fails
      console.log("Falling back to regex-based screening");
      return new Response(
        JSON.stringify(fallbackScreening(message)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify(fallbackScreening(message)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: ScreeningResult;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify(fallbackScreening(message)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Screening result: approved=${result.approved}, violations=${result.violations?.length || 0}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error in screen-message:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback regex-based screening if AI is unavailable
function fallbackScreening(message: string): ScreeningResult {
  const violations: string[] = [];
  const violationDetails: string[] = [];
  
  // Email pattern
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi.test(message) ||
      /\b(email|mail|gmail|yahoo|hotmail|outlook)\b.*\b(at|@)\b/gi.test(message)) {
    violations.push('contact_email');
    violationDetails.push('Message appears to contain an email address');
  }
  
  // Phone pattern
  if (/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g.test(message) ||
      /\b(call|text|phone|mobile|cell)\b.*\b\d{7,}/gi.test(message)) {
    violations.push('contact_phone');
    violationDetails.push('Message appears to contain a phone number');
  }
  
  // URL pattern
  if (/(?:https?:\/\/|www\.)[^\s]+/gi.test(message) ||
      /[a-zA-Z0-9-]+\.(com|net|org|io|co|dev|app|me|biz|info)/gi.test(message)) {
    violations.push('contact_website');
    violationDetails.push('Message appears to contain a website URL');
  }
  
  // Social media pattern
  if (/@[a-zA-Z0-9_]{2,}/g.test(message) ||
      /\b(instagram|twitter|linkedin|facebook|tiktok|snapchat|whatsapp|telegram)\b/gi.test(message)) {
    violations.push('contact_social');
    violationDetails.push('Message appears to contain social media references');
  }
  
  // Off-platform solicitation
  if (/\b(contact me|reach me|find me|message me|dm me|text me|call me)\b.*\b(outside|directly|off|personal)\b/gi.test(message)) {
    violations.push('off_platform_solicitation');
    violationDetails.push('Message appears to request off-platform contact');
  }
  
  // Fee circumvention
  if (/\b(pay me directly|skip the fee|avoid.*commission|cash only|venmo|paypal|zelle)\b/gi.test(message)) {
    violations.push('fee_circumvention');
    violationDetails.push('Message appears to suggest bypassing platform fees');
  }

  const approved = violations.length === 0;
  const riskScore = Math.min(100, violations.length * 30);
  
  return {
    approved,
    violations,
    violationDetails,
    riskScore,
    suggestedAction: approved ? 'allow' : 'block',
  };
}

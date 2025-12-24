import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateEmailRequest {
  leadType: 'gigger' | 'digger';
  industry: string;
  firstName?: string;
  step: number; // 1, 2, 3, or 4
  leadId: string;
}

const INDUSTRY_CONTEXTS: Record<string, { giggerPainPoints: string; diggerPainPoints: string; examples: string[] }> = {
  'home-improvement': {
    giggerPainPoints: 'unreliable contractors, overpriced quotes, unclear timelines for renovations',
    diggerPainPoints: 'expensive lead services like HomeAdvisor, competing with many other contractors, tire-kickers',
    examples: ['kitchen remodel', 'bathroom renovation', 'roof repair', 'deck construction']
  },
  'legal': {
    giggerPainPoints: 'finding affordable legal help, understanding complex legal processes, long wait times',
    diggerPainPoints: 'expensive advertising, building client trust, standing out in a crowded market',
    examples: ['estate planning', 'business formation', 'contract review', 'real estate closing']
  },
  'medical': {
    giggerPainPoints: 'finding specialists, long appointment wait times, understanding insurance coverage',
    diggerPainPoints: 'patient acquisition costs, insurance paperwork, building practice reputation',
    examples: ['dental work', 'physical therapy', 'dermatology', 'mental health counseling']
  },
  'creative': {
    giggerPainPoints: 'finding reliable designers, unclear pricing, quality inconsistency',
    diggerPainPoints: 'underpriced competition, scope creep, finding serious clients with real budgets',
    examples: ['logo design', 'website redesign', 'video production', 'photography']
  },
  'tech': {
    giggerPainPoints: 'finding qualified developers, unclear project timelines, budget overruns',
    diggerPainPoints: 'competing on price with offshore teams, proving expertise, finding funded projects',
    examples: ['app development', 'website maintenance', 'IT support', 'cloud migration']
  },
  'finance': {
    giggerPainPoints: 'finding trustworthy advisors, understanding fees, comparing services',
    diggerPainPoints: 'building client trust, compliance costs, differentiating from big firms',
    examples: ['tax preparation', 'bookkeeping', 'financial planning', 'business consulting']
  },
  'events': {
    giggerPainPoints: 'coordinating multiple vendors, staying on budget, last-minute changes',
    diggerPainPoints: 'seasonal demand, deposit collection, managing client expectations',
    examples: ['wedding planning', 'corporate events', 'catering', 'photography']
  },
  'automotive': {
    giggerPainPoints: 'finding honest mechanics, unexpected repair costs, understanding what work is needed',
    diggerPainPoints: 'competing with dealerships, building trust, customer retention',
    examples: ['auto repair', 'detailing', 'body work', 'maintenance']
  },
  'education': {
    giggerPainPoints: 'finding qualified tutors, tracking progress, scheduling flexibility',
    diggerPainPoints: 'marketing to parents, proving results, managing schedules',
    examples: ['tutoring', 'test prep', 'music lessons', 'language instruction']
  },
  'wellness': {
    giggerPainPoints: 'finding qualified practitioners, understanding treatment options, scheduling',
    diggerPainPoints: 'building clientele, competing with gyms, client retention',
    examples: ['personal training', 'massage therapy', 'nutrition coaching', 'yoga instruction']
  },
  'cleaning': {
    giggerPainPoints: 'finding trustworthy cleaners, consistent quality, security concerns',
    diggerPainPoints: 'low margins, building recurring clients, standing out from competition',
    examples: ['house cleaning', 'office cleaning', 'move-out cleaning', 'deep cleaning']
  },
  'landscaping': {
    giggerPainPoints: 'finding reliable landscapers, seasonal availability, pricing transparency',
    diggerPainPoints: 'weather dependency, equipment costs, seasonal cash flow',
    examples: ['lawn care', 'garden design', 'tree service', 'irrigation']
  },
  'general': {
    giggerPainPoints: 'finding reliable service providers, comparing quotes, ensuring quality work',
    diggerPainPoints: 'expensive advertising, finding quality leads, standing out from competition',
    examples: ['home services', 'professional services', 'consulting', 'maintenance']
  }
};

const getSystemPrompt = (leadType: string, industry: string, step: number): string => {
  const context = INDUSTRY_CONTEXTS[industry] || INDUSTRY_CONTEXTS['general'];
  const painPoints = leadType === 'gigger' ? context.giggerPainPoints : context.diggerPainPoints;
  const examples = context.examples.join(', ');
  
  const stepGuidance: Record<number, string> = {
    1: 'Introduction email - establish the problem and introduce the solution. Focus on the main pain point.',
    2: 'Social proof email - share a success story/testimonial from someone in their industry. Make it specific and believable.',
    3: 'FOMO email - create urgency by mentioning activity in their area or industry. Show what they\'re missing.',
    4: 'Final email - last chance, direct ask, acknowledge this is the last email. Be respectful but compelling.'
  };

  const audienceContext = leadType === 'gigger' 
    ? `You are writing to someone who needs to HIRE a service provider. They want to post a project and get quotes from professionals.`
    : `You are writing to a SERVICE PROVIDER who wants to find new clients and grow their business. They would join the platform to bid on projects.`;

  return `You are an expert email copywriter specializing in high-converting cold emails for a service marketplace called "Digs and Gigs".

${audienceContext}

INDUSTRY: ${industry}
PAIN POINTS for this audience: ${painPoints}
EXAMPLE SERVICES in this industry: ${examples}

EMAIL STEP: ${step} of 4
GUIDANCE: ${stepGuidance[step]}

RULES:
1. Write in a conversational, friendly tone - like a helpful friend, not a salesperson
2. Keep the email concise (under 200 words for the body)
3. Include ONE clear call-to-action
4. Create a realistic testimonial/success story if needed (make up a believable name and location)
5. Use specific numbers and dollar amounts for credibility
6. NEVER use generic phrases like "in today's fast-paced world" or "we understand your needs"
7. Make the subject line compelling (under 60 characters, no spam triggers)
8. Include a preheader that complements the subject (under 100 characters)

RESPOND WITH EXACTLY THIS JSON FORMAT:
{
  "subject": "your subject line here",
  "preheader": "your preheader here",
  "body": "your email body here in plain text with \\n for line breaks"
}`;
};

const generateEmailWithAI = async (
  leadType: 'gigger' | 'digger',
  industry: string,
  firstName: string,
  step: number
): Promise<{ subject: string; preheader: string; body: string }> => {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = getSystemPrompt(leadType, industry, step);
  const userPrompt = `Generate email step ${step} for a ${leadType} in the ${industry} industry. Their first name is "${firstName || 'there'}".`;

  console.log(`Generating email for ${leadType}, industry: ${industry}, step: ${step}`);

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
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to your workspace.");
    }
    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from AI");
  }

  console.log("AI response:", content);

  // Parse the JSON response
  try {
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      subject: parsed.subject || "A message from Digs and Gigs",
      preheader: parsed.preheader || "",
      body: parsed.body || ""
    };
  } catch (parseError) {
    console.error("Failed to parse AI response:", parseError);
    // Fallback: use the content as-is
    return {
      subject: `Step ${step}: Connect with professionals`,
      preheader: "Find what you need on Digs and Gigs",
      body: content
    };
  }
};

const buildEmailHtml = (
  body: string,
  firstName: string,
  leadType: 'gigger' | 'digger',
  leadId: string,
  step: number
): string => {
  const unsubscribeUrl = `https://digsandgigs.com/unsubscribe-cold?id=${leadId}`;
  const ctaUrl = leadType === 'gigger' 
    ? `https://digsandgigs.com/post-gig?utm_source=cold_email&utm_medium=email&utm_campaign=${leadType}_ai_sequence&utm_content=step_${step}`
    : `https://digsandgigs.com/digger-registration?utm_source=cold_email&utm_medium=email&utm_campaign=${leadType}_ai_sequence&utm_content=step_${step}`;
  
  const ctaText = leadType === 'gigger' ? 'Get Free Quotes Now' : 'Create Your Free Profile';
  const gradientColor = leadType === 'gigger' ? '#9b59b6, #8e44ad' : '#2563eb, #1d4ed8';
  const tagline = leadType === 'gigger' 
    ? 'Connecting you with trusted professionals' 
    : 'Where pros find their next project';

  // Convert body line breaks to HTML
  const htmlBody = body
    .replace(/\n\n/g, '</p><p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digs and Gigs</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${gradientColor}); padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Digs and Gigs</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${htmlBody}
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, ${gradientColor}); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 18px;">${ctaText}</a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                Digs and Gigs | ${tagline}
              </p>
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
                123 Main Street, Suite 100, San Francisco, CA 94105
              </p>
              <p style="margin: 0;">
                <a href="${unsubscribeUrl}" style="color: #888888; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadType, industry, firstName, step, leadId }: GenerateEmailRequest = await req.json();

    if (!leadType || !step || !leadId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: leadType, step, leadId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating AI email for lead ${leadId}: ${leadType}, ${industry}, step ${step}`);

    // Generate email content with AI
    const { subject, preheader, body } = await generateEmailWithAI(
      leadType,
      industry || 'general',
      firstName || 'there',
      step
    );

    // Build the HTML email
    const html = buildEmailHtml(body, firstName || 'there', leadType, leadId, step);

    return new Response(
      JSON.stringify({ 
        success: true,
        subject,
        preheader,
        html,
        body
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error generating email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

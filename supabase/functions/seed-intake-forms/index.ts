import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Import form templates
const MV_INDUSTRY_TEMPLATES = [
  {
    industry_name: "HVAC Installation & Repair",
    description: "Heating, ventilation, and air conditioning services",
    questions: [
      {
        question_text: "What type of HVAC service do you need?",
        question_type: "single-select",
        options: ["New Installation", "Repair/Service", "Replacement", "Maintenance", "Not sure - need consultation"],
        is_required: true,
        display_order: 1
      },
      {
        question_text: "What is your property type?",
        question_type: "single-select",
        options: ["Single-family home", "Multi-unit building", "Commercial property", "Industrial facility"],
        is_required: true,
        display_order: 2
      },
      {
        question_text: "What is the approximate square footage?",
        question_type: "single-select",
        options: ["Under 1,500 sq ft", "1,500-2,500 sq ft", "2,500-4,000 sq ft", "Over 4,000 sq ft", "Not sure"],
        is_required: true,
        display_order: 3
      },
      {
        question_text: "How urgent is this project?",
        question_type: "single-select",
        options: ["Emergency (within 24 hours)", "Urgent (within 1 week)", "Standard (within 2-4 weeks)", "Flexible timeline"],
        is_required: true,
        display_order: 4
      },
      {
        question_text: "Please describe any specific issues or requirements",
        question_type: "textarea",
        options: null,
        is_required: false,
        display_order: 5
      }
    ]
  }
  // Add more templates from utils/intakeFormTemplates.ts as needed
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("[SEED-INTAKE-FORMS] Starting seed process...");

    for (const template of MV_INDUSTRY_TEMPLATES) {
      // Check if template exists
      const { data: existingTemplate } = await supabaseClient
        .from('intake_form_templates')
        .select('id')
        .eq('industry_name', template.industry_name)
        .single();

      let templateId: string;

      if (existingTemplate) {
        console.log(`[SEED-INTAKE-FORMS] Template exists: ${template.industry_name}`);
        templateId = existingTemplate.id;
        
        // Delete existing questions
        await supabaseClient
          .from('intake_form_questions')
          .delete()
          .eq('template_id', templateId);
      } else {
        // Create template
        const { data: newTemplate, error: templateError } = await supabaseClient
          .from('intake_form_templates')
          .insert({
            industry_name: template.industry_name,
            description: template.description,
            is_active: true
          })
          .select()
          .single();

        if (templateError) throw templateError;
        templateId = newTemplate.id;
        console.log(`[SEED-INTAKE-FORMS] Created template: ${template.industry_name}`);
      }

      // Insert questions
      const questionsToInsert = template.questions.map(q => ({
        template_id: templateId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? JSON.stringify(q.options) : null,
        is_required: q.is_required,
        display_order: q.display_order
      }));

      const { error: questionsError } = await supabaseClient
        .from('intake_form_questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;
      console.log(`[SEED-INTAKE-FORMS] Added ${questionsToInsert.length} questions for ${template.industry_name}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seeded ${MV_INDUSTRY_TEMPLATES.length} form templates`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEED-INTAKE-FORMS] ERROR:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

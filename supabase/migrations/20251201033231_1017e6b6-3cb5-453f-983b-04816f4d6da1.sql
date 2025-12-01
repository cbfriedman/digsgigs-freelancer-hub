-- Create intake form templates table
CREATE TABLE public.intake_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_name TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create intake form questions table
CREATE TABLE public.intake_form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.intake_form_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single-select', 'multi-select', 'text', 'textarea', 'number', 'date')),
  options JSONB,
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL,
  conditional_logic JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create intake form responses table
CREATE TABLE public.intake_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.intake_form_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intake_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_form_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for intake_form_templates
CREATE POLICY "Anyone can view active templates"
  ON public.intake_form_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.intake_form_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for intake_form_questions
CREATE POLICY "Anyone can view questions for active templates"
  ON public.intake_form_questions
  FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.intake_form_templates WHERE is_active = true
    )
  );

CREATE POLICY "Admins can manage questions"
  ON public.intake_form_questions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for intake_form_responses
CREATE POLICY "Giggers can create responses for their gigs"
  ON public.intake_form_responses
  FOR INSERT
  WITH CHECK (
    gig_id IN (
      SELECT id FROM public.gigs WHERE consumer_id = auth.uid()
    )
  );

CREATE POLICY "Giggers can view their own responses"
  ON public.intake_form_responses
  FOR SELECT
  USING (
    gig_id IN (
      SELECT id FROM public.gigs WHERE consumer_id = auth.uid()
    )
  );

CREATE POLICY "Diggers can view responses for purchased leads"
  ON public.intake_form_responses
  FOR SELECT
  USING (
    gig_id IN (
      SELECT lp.gig_id 
      FROM public.lead_purchases lp
      JOIN public.digger_profiles dp ON lp.digger_id = dp.id
      WHERE dp.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_intake_form_questions_template_id ON public.intake_form_questions(template_id);
CREATE INDEX idx_intake_form_questions_display_order ON public.intake_form_questions(template_id, display_order);
CREATE INDEX idx_intake_form_responses_gig_id ON public.intake_form_responses(gig_id);
CREATE INDEX idx_intake_form_responses_question_id ON public.intake_form_responses(question_id);

-- Create trigger for updated_at
CREATE TRIGGER update_intake_form_templates_updated_at
  BEFORE UPDATE ON public.intake_form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
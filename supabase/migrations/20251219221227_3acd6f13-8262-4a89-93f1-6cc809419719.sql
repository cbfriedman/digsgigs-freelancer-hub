-- =============================================
-- COMPLIANT AI TELEMARKETING OPERATION TABLES
-- =============================================

-- 1. PEWC Consent Records - Full audit trail for 5+ years
CREATE TABLE public.consent_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  phone_hash TEXT GENERATED ALWAYS AS (encode(sha256(phone::bytea), 'hex')) STORED,
  email TEXT,
  full_name TEXT,
  property_address TEXT,
  
  -- Consent details
  consent_given_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  consent_text TEXT NOT NULL,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  
  -- Verification
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  page_url TEXT NOT NULL,
  sms_verified BOOLEAN DEFAULT false,
  sms_verified_at TIMESTAMP WITH TIME ZONE,
  sms_verification_code TEXT,
  
  -- Revocation
  consent_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_method TEXT,
  
  -- Source tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  raw_data_source TEXT,
  
  -- Telemarketer assignment
  telemarketer_id UUID REFERENCES public.telemarketer_profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. DNC Scrub Results - Track all compliance checks
CREATE TABLE public.dnc_scrub_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_record_id UUID NOT NULL REFERENCES public.consent_records(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  
  -- Federal DNC
  federal_dnc_checked_at TIMESTAMP WITH TIME ZONE,
  federal_dnc_listed BOOLEAN,
  
  -- State DNC
  state_dnc_checked_at TIMESTAMP WITH TIME ZONE,
  state_dnc_listed BOOLEAN,
  state_dnc_states_checked TEXT[],
  
  -- Reassigned Numbers Database (RND)
  rnd_checked_at TIMESTAMP WITH TIME ZONE,
  rnd_reassigned BOOLEAN,
  rnd_disconnect_date DATE,
  
  -- Internal DNC
  internal_dnc_listed BOOLEAN DEFAULT false,
  
  -- Overall status
  is_callable BOOLEAN DEFAULT false,
  callable_until TIMESTAMP WITH TIME ZONE,
  block_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. AI Call Logs - Full recording and transcription
CREATE TABLE public.ai_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_record_id UUID NOT NULL REFERENCES public.consent_records(id),
  dnc_scrub_id UUID REFERENCES public.dnc_scrub_results(id),
  telemarketer_id UUID REFERENCES public.telemarketer_profiles(id),
  
  -- Call details
  call_initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  call_connected_at TIMESTAMP WITH TIME ZONE,
  call_ended_at TIMESTAMP WITH TIME ZONE,
  call_duration_seconds INTEGER,
  
  -- Recipient timezone check
  recipient_timezone TEXT,
  recipient_local_time TIME,
  timezone_compliant BOOLEAN NOT NULL DEFAULT true,
  
  -- Recording (for TCPA compliance)
  recording_url TEXT,
  recording_storage_path TEXT,
  transcription TEXT,
  
  -- AI agent details
  ai_agent_id TEXT,
  ai_agent_version TEXT,
  conversation_id TEXT,
  
  -- Outcome
  call_outcome TEXT,
  lead_qualified BOOLEAN DEFAULT false,
  appointment_scheduled BOOLEAN DEFAULT false,
  appointment_datetime TIMESTAMP WITH TIME ZONE,
  
  -- Gig creation
  gig_created BOOLEAN DEFAULT false,
  gig_id UUID REFERENCES public.gigs(id),
  
  -- Opt-out during call
  opted_out_during_call BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Callable Leads Queue - Scheduling system
CREATE TABLE public.callable_leads_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consent_record_id UUID NOT NULL REFERENCES public.consent_records(id),
  dnc_scrub_id UUID NOT NULL REFERENCES public.dnc_scrub_results(id),
  telemarketer_id UUID REFERENCES public.telemarketer_profiles(id),
  
  -- Scheduling
  scheduled_call_time TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 5,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'failed', 'skipped')),
  
  -- Attempt tracking
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  
  -- Result
  last_call_log_id UUID REFERENCES public.ai_call_logs(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Internal DNC List - For opt-outs
CREATE TABLE public.internal_dnc_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  phone_hash TEXT GENERATED ALWAYS AS (encode(sha256(phone::bytea), 'hex')) STORED,
  added_reason TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT,
  consent_record_id UUID REFERENCES public.consent_records(id)
);

-- Enable RLS on all tables
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnc_scrub_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callable_leads_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_dnc_list ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consent_records
CREATE POLICY "Telemarketers can view assigned consent records"
  ON public.consent_records FOR SELECT
  USING (
    telemarketer_id IN (
      SELECT id FROM public.telemarketer_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert consent records"
  ON public.consent_records FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update consent records"
  ON public.consent_records FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view all consent records"
  ON public.consent_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for dnc_scrub_results
CREATE POLICY "Telemarketers can view their dnc results"
  ON public.dnc_scrub_results FOR SELECT
  USING (
    consent_record_id IN (
      SELECT id FROM public.consent_records 
      WHERE telemarketer_id IN (
        SELECT id FROM public.telemarketer_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can manage dnc results"
  ON public.dnc_scrub_results FOR ALL
  USING (true);

-- RLS Policies for ai_call_logs
CREATE POLICY "Telemarketers can view their call logs"
  ON public.ai_call_logs FOR SELECT
  USING (
    telemarketer_id IN (
      SELECT id FROM public.telemarketer_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage call logs"
  ON public.ai_call_logs FOR ALL
  USING (true);

CREATE POLICY "Admins can view all call logs"
  ON public.ai_call_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for callable_leads_queue
CREATE POLICY "Telemarketers can view their queue"
  ON public.callable_leads_queue FOR SELECT
  USING (
    telemarketer_id IN (
      SELECT id FROM public.telemarketer_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage queue"
  ON public.callable_leads_queue FOR ALL
  USING (true);

-- RLS Policies for internal_dnc_list
CREATE POLICY "Telemarketers can view internal DNC"
  ON public.internal_dnc_list FOR SELECT
  USING (true);

CREATE POLICY "System can manage internal DNC"
  ON public.internal_dnc_list FOR ALL
  USING (true);

-- Enable realtime for queue updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.callable_leads_queue;

-- Create indexes for performance
CREATE INDEX idx_consent_records_phone_hash ON public.consent_records(phone_hash);
CREATE INDEX idx_consent_records_telemarketer ON public.consent_records(telemarketer_id);
CREATE INDEX idx_consent_records_revoked ON public.consent_records(consent_revoked);
CREATE INDEX idx_dnc_scrub_callable ON public.dnc_scrub_results(is_callable);
CREATE INDEX idx_ai_call_logs_consent ON public.ai_call_logs(consent_record_id);
CREATE INDEX idx_callable_queue_status ON public.callable_leads_queue(status);
CREATE INDEX idx_callable_queue_scheduled ON public.callable_leads_queue(scheduled_call_time);
CREATE INDEX idx_internal_dnc_phone ON public.internal_dnc_list(phone_hash);

-- Update trigger for timestamps
CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dnc_scrub_results_updated_at
  BEFORE UPDATE ON public.dnc_scrub_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_callable_leads_queue_updated_at
  BEFORE UPDATE ON public.callable_leads_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
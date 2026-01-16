-- Create manual_test_results table for QA testing
CREATE TABLE public.manual_test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_category TEXT NOT NULL,
  test_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'blocked')),
  environment TEXT NOT NULL DEFAULT 'lovable_preview' CHECK (environment IN ('lovable_preview', 'vercel_production')),
  notes TEXT,
  screenshot_url TEXT,
  tester_id UUID REFERENCES auth.users(id),
  tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint for test_id + environment combination
CREATE UNIQUE INDEX idx_manual_test_results_unique ON public.manual_test_results(test_id, environment);

-- Enable RLS
ALTER TABLE public.manual_test_results ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage test results"
ON public.manual_test_results
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_app_roles
    WHERE user_app_roles.user_id = auth.uid()
    AND user_app_roles.app_role = 'admin'
    AND user_app_roles.is_active = true
  )
);

-- Authenticated users can view test results
CREATE POLICY "Authenticated users can view test results"
ON public.manual_test_results
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_test_results;

-- Create updated_at trigger
CREATE TRIGGER update_manual_test_results_updated_at
BEFORE UPDATE ON public.manual_test_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for test screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('test-screenshots', 'test-screenshots', false);

-- Storage policies for test screenshots
CREATE POLICY "Admins can upload test screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'test-screenshots' AND
  EXISTS (
    SELECT 1 FROM user_app_roles
    WHERE user_app_roles.user_id = auth.uid()
    AND user_app_roles.app_role = 'admin'
    AND user_app_roles.is_active = true
  )
);

CREATE POLICY "Admins can view test screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'test-screenshots' AND
  EXISTS (
    SELECT 1 FROM user_app_roles
    WHERE user_app_roles.user_id = auth.uid()
    AND user_app_roles.app_role = 'admin'
    AND user_app_roles.is_active = true
  )
);

CREATE POLICY "Admins can delete test screenshots"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'test-screenshots' AND
  EXISTS (
    SELECT 1 FROM user_app_roles
    WHERE user_app_roles.user_id = auth.uid()
    AND user_app_roles.app_role = 'admin'
    AND user_app_roles.is_active = true
  )
);

-- Seed with all test cases from the protocol (both environments)
INSERT INTO public.manual_test_results (test_category, test_id, test_name, environment) VALUES
-- Authentication Flow (Section 1)
('Authentication', '1.1', 'Navigate to /register?mode=signup&type=digger', 'lovable_preview'),
('Authentication', '1.2', 'Submit valid email for OTP', 'lovable_preview'),
('Authentication', '1.3', 'Enter correct OTP code', 'lovable_preview'),
('Authentication', '1.4', 'Complete Digger profile form', 'lovable_preview'),
('Authentication', '1.5', 'Verify redirect to /role-dashboard', 'lovable_preview'),
('Authentication', '1.6', 'Test sign-out functionality', 'lovable_preview'),
('Authentication', '1.7', 'Test sign-in with existing account', 'lovable_preview'),

-- Gigger Project Posting (Section 2)
('Gigger Flow', '2.1', 'Navigate to /post-gig', 'lovable_preview'),
('Gigger Flow', '2.2', 'Select problem category', 'lovable_preview'),
('Gigger Flow', '2.3', 'Select subcategories (checkbox stability)', 'lovable_preview'),
('Gigger Flow', '2.4', 'Enter description (10+ chars)', 'lovable_preview'),
('Gigger Flow', '2.5', 'Click Enhance with AI button', 'lovable_preview'),
('Gigger Flow', '2.6', 'Verify AI enhancement works', 'lovable_preview'),
('Gigger Flow', '2.7', 'Set budget range', 'lovable_preview'),
('Gigger Flow', '2.8', 'Verify pricing calculation (3% of midpoint, $1-$49)', 'lovable_preview'),
('Gigger Flow', '2.9', 'Enter contact details', 'lovable_preview'),
('Gigger Flow', '2.10', 'Submit project', 'lovable_preview'),
('Gigger Flow', '2.11', 'Verify confirmation email sent', 'lovable_preview'),

-- Lead Unlock Preview (Section 3)
('Lead Unlock Preview', '3.1', 'Navigate to /lead-unlock-preview', 'lovable_preview'),
('Lead Unlock Preview', '3.2', 'Verify demo project data displays', 'lovable_preview'),
('Lead Unlock Preview', '3.3', 'Verify Non-Exclusive price calculation', 'lovable_preview'),
('Lead Unlock Preview', '3.4', 'Toggle to Exclusive option', 'lovable_preview'),
('Lead Unlock Preview', '3.5', 'Verify Exclusive terms display', 'lovable_preview'),
('Lead Unlock Preview', '3.6', 'Click Unlock buttons (toast feedback)', 'lovable_preview'),

-- Bid Template Preview (Section 4)
('Bid Template Preview', '4.1', 'Navigate to /bid-template-preview', 'lovable_preview'),
('Bid Template Preview', '4.2', 'Digger View: Submit bid with cost range', 'lovable_preview'),
('Bid Template Preview', '4.3', 'Verify Max <= 1.2x Min constraint', 'lovable_preview'),
('Bid Template Preview', '4.4', 'Switch to Gigger View', 'lovable_preview'),
('Bid Template Preview', '4.5', 'Verify anonymized bidder display', 'lovable_preview'),
('Bid Template Preview', '4.6', 'Test Ask Question modal', 'lovable_preview'),
('Bid Template Preview', '4.7', 'Test Accept Proposal flow', 'lovable_preview'),
('Bid Template Preview', '4.8', 'Verify 5% deposit calculation', 'lovable_preview'),

-- Live Lead Unlock (Section 5)
('Live Lead Unlock', '5.1', 'Navigate to /lead/:id/unlock with real lead', 'lovable_preview'),
('Live Lead Unlock', '5.2', 'Verify lead data from database', 'lovable_preview'),
('Live Lead Unlock', '5.3', 'Complete Non-Exclusive unlock flow', 'lovable_preview'),
('Live Lead Unlock', '5.4', 'Verify contact info revealed', 'lovable_preview'),
('Live Lead Unlock', '5.5', 'Complete Exclusive unlock flow', 'lovable_preview'),

-- Messaging (Section 6)
('Messaging', '6.1', 'Test pre-award anonymous messaging', 'lovable_preview'),
('Messaging', '6.2', 'Verify AI moderation blocks contact info', 'lovable_preview'),
('Messaging', '6.3', 'Verify proxy email delivery', 'lovable_preview'),

-- Payments (Section 7)
('Payments', '7.1', 'Test Stripe checkout for lead unlock', 'lovable_preview'),
('Payments', '7.2', 'Verify payment success redirect', 'lovable_preview'),
('Payments', '7.3', 'Verify payment record in database', 'lovable_preview'),
('Payments', '7.4', 'Test with Stripe test cards', 'lovable_preview'),

-- Admin Dashboard (Section 8)
('Admin Dashboard', '8.1', 'Login as admin', 'lovable_preview'),
('Admin Dashboard', '8.2', 'Navigate to /admin', 'lovable_preview'),
('Admin Dashboard', '8.3', 'Verify signup analytics tab', 'lovable_preview'),
('Admin Dashboard', '8.4', 'Verify gig management tab', 'lovable_preview'),
('Admin Dashboard', '8.5', 'Test admin actions (approve/reject)', 'lovable_preview'),

-- Email Notifications (Section 9)
('Email Notifications', '9.1', 'Verify OTP email delivery', 'lovable_preview'),
('Email Notifications', '9.2', 'Verify lead confirmation email', 'lovable_preview'),
('Email Notifications', '9.3', 'Verify lead blast to Diggers', 'lovable_preview'),
('Email Notifications', '9.4', 'Verify admin signup notification', 'lovable_preview'),

-- Edge Cases (Section 10)
('Edge Cases', '10.1', 'Test high-risk keyword warning modal', 'lovable_preview'),
('Edge Cases', '10.2', 'Test form validation errors', 'lovable_preview'),
('Edge Cases', '10.3', 'Test session expiry handling', 'lovable_preview'),
('Edge Cases', '10.4', 'Test mobile responsive layouts', 'lovable_preview'),
('Edge Cases', '10.5', 'Test case-insensitive routing', 'lovable_preview');

-- Duplicate all tests for Vercel production environment
INSERT INTO public.manual_test_results (test_category, test_id, test_name, environment)
SELECT test_category, test_id, test_name, 'vercel_production'
FROM public.manual_test_results
WHERE environment = 'lovable_preview';
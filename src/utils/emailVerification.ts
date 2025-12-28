import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if user's email is verified
 */
export const isEmailVerified = (user: User | null): boolean => {
  return !!user?.email_confirmed_at;
};

/**
 * Require email verification for sensitive actions
 * Shows error toast and returns false if not verified
 */
export const requireEmailVerification = (user: User | null): boolean => {
  if (!user) {
    toast.error("Please sign in to continue");
    return false;
  }

  if (!isEmailVerified(user)) {
    toast.error("Please verify your email address to continue. Check your inbox for the verification code or use the banner above to resend it.");
    return false;
  }

  return true;
};

/**
 * Get verification redirect URL
 */
export const getVerificationRedirectUrl = (returnTo?: string): string => {
  const baseUrl = '/register';
  if (returnTo) {
    return `${baseUrl}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return baseUrl;
};

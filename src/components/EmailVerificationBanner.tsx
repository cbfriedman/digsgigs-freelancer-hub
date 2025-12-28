import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const EmailVerificationBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  // Don't show banner if:
  // - User is not logged in
  // - Email is already verified
  // - Banner was dismissed
  if (!user || user.email_confirmed_at || dismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setSending(true);
    try {
      // Send OTP code for verification
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: user.email,
        },
      });

      if (error) {
        console.error("Error sending verification code:", error);
        toast.error("Failed to send verification code. Please try again.");
      } else {
        toast.success("Verification code sent! Please check your email.");
        // Navigate to register page to enter verification code
        navigate('/register');
      }
    } catch (error) {
      console.error("Error sending verification code:", error);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyNow = () => {
    navigate('/register');
  };

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <Mail className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        Verify your email address
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2 text-orange-800 dark:text-orange-200">
        <p>
          Please verify your email address to unlock all features, including posting gigs, purchasing leads, and managing your account settings.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleVerifyNow}
            size="sm"
            variant="default"
            className="bg-orange-600 hover:bg-orange-700"
          >
            Verify Now
          </Button>
          <Button
            onClick={handleResendVerification}
            size="sm"
            variant="outline"
            disabled={sending}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-900/30"
          >
            {sending ? "Sending..." : "Resend Code"}
          </Button>
          <Button
            onClick={() => setDismissed(true)}
            size="sm"
            variant="ghost"
            className="text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/30"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

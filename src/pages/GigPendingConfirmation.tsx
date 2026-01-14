import { useSearchParams, Link } from "react-router-dom";
import { Mail, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GigPendingConfirmation = () => {
  const [searchParams] = useSearchParams();
  const gigId = searchParams.get("gigId");
  const email = searchParams.get("email");
  
  const [resendCount, setResendCount] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Check localStorage for resend tracking
  useEffect(() => {
    const stored = localStorage.getItem(`gig_resend_${gigId}`);
    if (stored) {
      const data = JSON.parse(stored);
      setResendCount(data.count || 0);
      if (data.lastResend) {
        setLastResendTime(new Date(data.lastResend));
      }
    }
  }, [gigId]);

  // Cooldown timer
  useEffect(() => {
    if (!lastResendTime) return;
    
    const updateCooldown = () => {
      const elapsed = (Date.now() - lastResendTime.getTime()) / 1000;
      const remaining = Math.max(0, 60 - elapsed); // 60 second cooldown
      setCooldownSeconds(Math.ceil(remaining));
    };
    
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastResendTime]);

  const handleResend = async () => {
    if (resendCount >= 3) {
      toast.error("Maximum resend limit reached. Please contact support if you need help.");
      return;
    }
    
    if (cooldownSeconds > 0) {
      toast.error(`Please wait ${cooldownSeconds} seconds before resending.`);
      return;
    }

    setResendLoading(true);
    
    try {
      // Fetch the gig details to resend confirmation
      const { data: gig, error: gigError } = await supabase
        .from("gigs")
        .select("*")
        .eq("id", gigId)
        .single();

      if (gigError || !gig) {
        throw new Error("Could not find the project.");
      }

      // Call send-gig-confirmation again
      const { error } = await supabase.functions.invoke("send-gig-confirmation", {
        body: {
          gigId: gig.id,
          email: gig.consumer_email,
          gigTitle: gig.title,
          gigDescription: gig.description,
          location: gig.location || "Remote",
          budgetMin: gig.budget_min,
          budgetMax: gig.budget_max,
          keywords: [],
        },
      });

      if (error) throw error;

      const newCount = resendCount + 1;
      const now = new Date();
      
      setResendCount(newCount);
      setLastResendTime(now);
      
      localStorage.setItem(`gig_resend_${gigId}`, JSON.stringify({
        count: newCount,
        lastResend: now.toISOString(),
      }));

      toast.success("Confirmation email resent! Please check your inbox.");
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message || "Failed to resend email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // Mask email for display
  const maskedEmail = email ? 
    email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : 
    "your email";

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '100vh', 
        width: '100vw',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 50%, #dbeafe 100%)',
        padding: '16px',
        zIndex: 9999,
        overflow: 'auto',
      }}
    >
      <Card className="max-w-md w-full shadow-2xl" style={{ background: 'white' }}>
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <Mail className="h-20 w-20 text-primary" />
              <Clock className="h-8 w-8 text-amber-500 absolute -bottom-1 -right-1 bg-white rounded-full p-1" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Check Your Email</h1>
            <p className="text-muted-foreground">
              We sent a confirmation link to <strong>{maskedEmail}</strong>
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Your project is almost live!</p>
                <p>Click the confirmation link in your email to activate your project and start receiving quotes from freelancers.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or request a new one.
            </p>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendLoading || cooldownSeconds > 0 || resendCount >= 3}
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : cooldownSeconds > 0 ? (
                `Resend available in ${cooldownSeconds}s`
              ) : resendCount >= 3 ? (
                "Max resends reached"
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend Confirmation Email
                </>
              )}
            </Button>
            
            {resendCount > 0 && resendCount < 3 && (
              <p className="text-xs text-muted-foreground">
                Resends remaining: {3 - resendCount}
              </p>
            )}
          </div>

          <div className="border-t pt-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              Still having trouble?
            </p>
            <Link to="/contact">
              <Button variant="link" className="text-primary">
                Contact Support
              </Button>
            </Link>
          </div>

          <div className="pt-4">
            <Link to="/">
              <Button variant="ghost" className="text-muted-foreground">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GigPendingConfirmation;

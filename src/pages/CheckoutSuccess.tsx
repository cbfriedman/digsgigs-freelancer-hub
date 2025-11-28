import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get the purchase type from URL params
    const type = searchParams.get("type");
    
    // Clear appropriate data from storage based on purchase type
    if (type === 'lead_credits') {
      sessionStorage.removeItem("leadPurchaseSelections");
    } else {
      localStorage.removeItem("checkoutData");
      localStorage.removeItem("profileCart");
    }

    // Trigger confetti celebration using canvas-confetti dynamically
    import("canvas-confetti").then((confetti) => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti.default({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.3),
            y: Math.random() - 0.2
          }
        });
        confetti.default({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.7, 0.9),
            y: Math.random() - 0.2
          }
        });
      }, 250);
    }).catch(() => {
      // Silently fail if confetti can't load
    });
  }, [searchParams]);

  const sessionId = searchParams.get("session_id");
  const type = searchParams.get("type");
  const isLeadCredits = type === "lead_credits";

  return (
    <>
      <SEOHead
        title="Purchase Successful - Digsandgigs"
        description="Your lead purchase was successful"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-16 max-w-3xl">
          <Card className="p-8 md:p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping opacity-25">
                  <CheckCircle2 className="h-20 w-20 text-green-600" />
                </div>
                <CheckCircle2 className="h-20 w-20 text-green-600 relative" />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {isLeadCredits ? "Lead Credits Purchased! 🎉" : "Purchase Successful! 🎉"}
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              {isLeadCredits 
                ? "Your lead credits have been added to your account. You'll automatically receive matching gigs!"
                : "Your lead purchase has been processed successfully. You'll start receiving matching leads immediately!"}
            </p>

            <div className="bg-muted/50 rounded-lg p-6 mb-8 text-left">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  {isLeadCredits ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>✓ Your lead credits are ready to use</li>
                      <li>✓ When new gigs match your keywords, credits will be automatically deducted</li>
                      <li>✓ You'll receive email notifications for each matched gig</li>
                      <li>✓ View your credit balance and purchase history in your dashboard</li>
                    </ul>
                  ) : (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>✓ Your profile is now active and visible to gig posters</li>
                      <li>✓ You'll receive email notifications for matching gigs</li>
                      <li>✓ Access your leads dashboard to view all opportunities</li>
                      <li>✓ You can purchase additional leads anytime from your profile</li>
                    </ul>
                  )}
                </div>
              </div>
              
              {sessionId && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Transaction ID: {sessionId.slice(0, 20)}...
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/my-leads")}
                size="lg"
                className="gap-2"
              >
                View My Leads
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={() => navigate("/my-profiles")}
                variant="outline"
                size="lg"
              >
                Manage Profiles
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-8">
              A confirmation email has been sent to your registered email address.
            </p>
          </Card>
        </main>
      </div>
    </>
  );
}

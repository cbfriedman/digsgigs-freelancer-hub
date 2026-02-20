import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";
import { Loader2, Mail, CreditCard, BarChart3, Bell, Wallet } from "lucide-react";

export default function Account() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [isDigger, setIsDigger] = useState<boolean | null>(null);

  useEffect(() => {
    if (location.hash === "#payout-account") {
      document.getElementById("payout-account")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash, isDigger]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/register");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("digger_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsDigger(!!data);
    })();
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const settingsLinks = [
    ...(isDigger
      ? [{ path: "#payout-account", label: "Payout account", icon: Wallet, description: "Receive milestone payments", scroll: true as const }]
      : []),
    { path: "/email-preferences", label: "Email preferences", icon: Mail, description: "Manage report frequency and notifications", scroll: false as const },
    { path: "/payment-methods", label: "Payment methods", icon: CreditCard, description: isDigger ? "Pay referral fees when accepting exclusive awards" : "Add or update payment methods", scroll: false as const },
    { path: "/lead-limits", label: "Lead limits", icon: BarChart3, description: "Set lead limits (diggers only)", scroll: false as const },
    { path: "/notifications", label: "Notifications", icon: Bell, description: "View and manage notifications", scroll: false as const },
  ];

  return (
    <div className="container max-w-2xl py-6 sm:py-8 space-y-6">
      {isDigger && (
        <section id="payout-account" className="scroll-mt-4">
          <StripeConnectBanner />
        </section>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsLinks.map(({ path, label, icon: Icon, description, scroll }) => (
            <Button
              key={path}
              variant="ghost"
              className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
              onClick={() =>
                scroll
                  ? document.getElementById("payout-account")?.scrollIntoView({ behavior: "smooth" })
                  : navigate(path)
              }
            >
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

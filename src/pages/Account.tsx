import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Mail, CreditCard, BarChart3, Bell } from "lucide-react";

export default function Account() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/register");
    }
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
    { path: "/email-preferences", label: "Email preferences", icon: Mail, description: "Manage report frequency and notifications" },
    { path: "/payment-methods", label: "Payment methods", icon: CreditCard, description: "Add or update payment methods" },
    { path: "/lead-limits", label: "Lead limits", icon: BarChart3, description: "Set lead limits (diggers only)" },
    { path: "/notifications", label: "Notifications", icon: Bell, description: "View and manage notifications" },
  ];

  return (
    <div className="container max-w-2xl py-6 sm:py-8">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsLinks.map(({ path, label, icon: Icon, description }) => (
            <Button
              key={path}
              variant="ghost"
              className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
              onClick={() => navigate(path)}
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

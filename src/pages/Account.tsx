import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PageLayout } from "@/components/layout/PageLayout";
import SEOHead from "@/components/SEOHead";
import {
  Loader2,
  Mail,
  CreditCard,
  BarChart3,
  Bell,
  ShieldCheck,
  ChevronRight,
  KeyRound,
  LogOut,
  Trash2,
  ShieldAlert,
} from "lucide-react";

type SettingsLink = {
  path: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
};

export default function Account() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRoles, loading: authLoading, signOut } = useAuth();
  const [isDigger, setIsDigger] = useState<boolean | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteInProgress, setDeleteInProgress] = useState(false);

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

  const isEmailVerified = Boolean(user.email_confirmed_at);

  const renderLink = ({ path, label, icon: Icon, description, badge }: SettingsLink) => (
    <button
      key={path}
      type="button"
      onClick={() => navigate(path)}
      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-4 py-3 text-left transition-colors hover:border-border hover:bg-muted/50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{label}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs font-normal">
              {badge}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );

  const preferenceLinks: SettingsLink[] = [
    { path: "/email-preferences", label: "Email preferences", icon: Mail, description: "Report frequency and digest settings" },
    { path: "/notifications", label: "Notifications", icon: Bell, description: "View and manage your notifications" },
    ...(isDigger
      ? [{ path: "/lead-limits", label: "Lead limits", icon: BarChart3, description: "Set monthly or weekly lead caps" } as SettingsLink]
      : []),
  ];

  const paymentLinks: SettingsLink[] = [
    { path: "/payment-methods", label: "Payment methods", icon: CreditCard, description: isDigger ? "Pay referral fees when accepting awards" : "Add or update cards for gig payments" },
  ];

  return (
    <PageLayout maxWidth="tight">
      <SEOHead
        title="Account settings"
        description="Manage your Digs & Gigs account, security, payments, and preferences."
      />
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account securely. Your data is protected and you control your preferences.
          </p>
        </div>

        {/* Email verification alert */}
        <EmailVerificationBanner />

        {/* Identity & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Identity & Security
            </CardTitle>
            <CardDescription>
              Your login and verification status. Keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{user.email}</span>
                {isEmailVerified ? (
                  <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-0">Verified</Badge>
                ) : (
                  <Badge variant="secondary">Unverified</Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {isEmailVerified
                  ? "Your email is verified. You have full access to all features."
                  : "Verify your email to unlock posting gigs, purchasing leads, and secure communication."}
              </p>
            </div>
            {userRoles.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Roles</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {userRoles.map((role) => (
                    <Badge key={role} variant="outline" className="capitalize">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Dialog open={passwordDialogOpen} onOpenChange={(o) => { setPasswordDialogOpen(o); if (!o) { setNewPassword(""); setConfirmPassword(""); } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change password</DialogTitle>
                    <DialogDescription>
                      Enter a new password. You will stay signed in.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (newPassword.length < 8) {
                        toast.error("Password must be at least 8 characters");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        toast.error("Passwords do not match");
                        return;
                      }
                      setPasswordUpdating(true);
                      try {
                        const { error } = await supabase.auth.updateUser({ password: newPassword });
                        if (error) throw error;
                        toast.success("Password updated successfully.");
                        setPasswordDialogOpen(false);
                        setNewPassword("");
                        setConfirmPassword("");
                      } catch (err: unknown) {
                        toast.error(err instanceof Error ? err.message : "Failed to update password");
                      } finally {
                        setPasswordUpdating(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="new-pw">New password</Label>
                      <Input
                        id="new-pw"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-pw">Confirm password</Label>
                      <Input
                        id="confirm-pw"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        className="mt-1"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={passwordUpdating}>
                        {passwordUpdating ? "Updating…" : "Update password"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={async () => {
                  if (!user?.email) return;
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                      redirectTo: `${window.location.origin}/register?mode=reset-password`,
                    });
                    if (error) throw error;
                    toast.success("Password reset email sent. Check your inbox.");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Failed to send reset email");
                  }
                }}
              >
                Forgot password?
              </Button>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Sessions</p>
              <p className="text-xs text-muted-foreground mb-3">
                Sign out of this device. Use &quot;Sign out everywhere&quot; to end all sessions.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                      toast.success("Signed out.");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed to sign out");
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground"
                  onClick={async () => {
                    try {
                      await signOut();
                      toast.success("Signed out of all devices.");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed to sign out");
                    }
                  }}
                >
                  Sign out everywhere
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout account (Diggers only) */}
        {isDigger && (
          <section id="payout-account" className="scroll-mt-4">
            <StripeConnectBanner />
          </section>
        )}

        {/* Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
            <CardDescription>
              Manage how you pay and get paid on Digs & Gigs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentLinks.map(renderLink)}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
            <CardDescription>
              Email, notifications, and limits. Tailored to your role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {preferenceLinks.map(renderLink)}
          </CardContent>
        </Card>

        {/* Danger zone - Delete account */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <ShieldAlert className="h-4 w-4" />
              Danger zone
            </CardTitle>
            <CardDescription>
              Request account deletion. An admin must approve before your account and data are permanently removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) setDeleteConfirmText(""); }}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Request account deletion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-destructive">Request account deletion</DialogTitle>
                  <DialogDescription>
                    Submit a request to delete your account. An admin will review and approve it before your account, profiles, gigs, bids, and all related data are permanently removed. Type <strong>DELETE</strong> below to confirm.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                    <Input
                      id="delete-confirm"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="mt-1 font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmText !== "DELETE" || deleteInProgress}
                    onClick={async () => {
                      if (deleteConfirmText !== "DELETE") return;
                      setDeleteInProgress(true);
                      try {
                        await invokeEdgeFunction(supabase, "request-account-deletion", {
                          method: "POST",
                          body: { confirm: "DELETE" },
                        });
                        toast.success("Deletion request submitted. An admin will review it shortly.");
                        setDeleteDialogOpen(false);
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : "Failed to delete account");
                      } finally {
                        setDeleteInProgress(false);
                      }
                    }}
                  >
                    {deleteInProgress ? "Submitting…" : "Submit deletion request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

import { useEffect, useState, useMemo, useRef } from "react";
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
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { IdVerificationDialog } from "@/components/IdVerificationDialog";
import { useNotifications } from "@/hooks/useNotifications";
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
  User,
  MapPin,
  Plus,
  Star,
  Building2,
  Phone,
  Smartphone,
  Link2,
} from "lucide-react";

type SettingsLink = {
  path: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  /** If set, called instead of navigating to path (e.g. open a dialog). */
  onClick?: () => void;
};

type PaymentMethod = {
  id: string;
  type: string;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number };
  us_bank_account?: { bank_name: string | null; last4: string | null };
  is_default: boolean;
  created: number;
};

export default function Account() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRoles, activeRole, loading: authLoading, signOut } = useAuth();
  const [isDigger, setIsDigger] = useState<boolean | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentDeletingId, setPaymentDeletingId] = useState<string | null>(null);
  const [showAddFormInDialog, setShowAddFormInDialog] = useState(false);

  const [emailPrefsSummary, setEmailPrefsSummary] = useState<{ enabled: boolean; frequency: string } | null>(null);
  const [leadLimitsSummary, setLeadLimitsSummary] = useState<{ enabled: boolean; limit: string; period: string } | null>(null);
  const { unreadCount: notificationUnreadCount } = useNotifications();

  const [profileIdentity, setProfileIdentity] = useState<{
    first_name: string | null;
    last_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_postal: string | null;
    country: string | null;
  } | null>(null);
  const [pendingIdentityRequest, setPendingIdentityRequest] = useState<boolean>(false);
  const [identityDialogOpen, setIdentityDialogOpen] = useState(false);
  const [identitySubmitting, setIdentitySubmitting] = useState(false);
  const [identityForm, setIdentityForm] = useState({
    first_name: "",
    last_name: "",
    address: "",
    city: "",
    state_region: "",
    zip_postal: "",
    country: "",
  });
  const [idVerified, setIdVerified] = useState<boolean>(false);
  const [idVerificationPendingReview, setIdVerificationPendingReview] = useState<boolean>(false);
  const [idVerificationOpen, setIdVerificationOpen] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [profilePhoneVerified, setProfilePhoneVerified] = useState<boolean>(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  /** Last code we sent (dev only) – so you can complete verification if SMS doesn't arrive (e.g. Twilio trial) */
  const [phoneLastSentCode, setPhoneLastSentCode] = useState<string | null>(null);

  const [mfaFactors, setMfaFactors] = useState<{ id: string; friendly_name?: string; factor_type: string }[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrollDialogOpen, setMfaEnrollDialogOpen] = useState(false);
  const [mfaEnrollSecret, setMfaEnrollSecret] = useState<{ qr_code: string; secret: string; factorId: string } | null>(null);
  const [mfaEnrollCode, setMfaEnrollCode] = useState("");
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaUnenrollingId, setMfaUnenrollingId] = useState<string | null>(null);

  const [linkedIdentities, setLinkedIdentities] = useState<{ provider: string; id: string }[]>([]);
  const [identitiesLoading, setIdentitiesLoading] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<string>("identity-security");
  const scrollingRef = useRef(false);
  const sectionIds = useMemo(
    () =>
      [
        { id: "identity-security", label: "Identity & Security" },
        { id: "name-address", label: "Name & address" },
        ...(isDigger ? [{ id: "payout-account", label: "Get paid" }] : []),
        { id: "payments", label: "Payments" },
        { id: "preferences", label: "Preferences" },
        { id: "danger-zone", label: "Danger zone" },
      ] as const,
    [isDigger]
  );

  const ACTIVE_THRESHOLD = 120;

  useEffect(() => {
    const updateActiveSection = () => {
      const ids = sectionIds.map((s) => s.id);
      if (ids.length === 0) return;
      let bestId = ids[0];
      let bestTop = -Infinity;
      for (let i = 0; i < ids.length; i++) {
        const el = document.getElementById(ids[i]);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= ACTIVE_THRESHOLD && rect.top > bestTop) {
          bestTop = rect.top;
          bestId = ids[i];
        }
      }
      if (bestTop === -Infinity) {
        const firstEl = document.getElementById(ids[0]);
        const firstTop = firstEl ? firstEl.getBoundingClientRect().top : 0;
        if (firstTop > -100) {
          bestId = ids[0];
        } else {
          for (let i = ids.length - 1; i >= 0; i--) {
            const el = document.getElementById(ids[i]);
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
              bestId = ids[i];
              break;
            }
          }
        }
      }
      setActiveSection(bestId);
    };

    const handleScroll = () => {
      if (scrollingRef.current) return;
      updateActiveSection();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const raf = requestAnimationFrame(updateActiveSection);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
    };
  }, [sectionIds]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    scrollingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    const t = setTimeout(() => {
      scrollingRef.current = false;
    }, 800);
    return () => clearTimeout(t);
  };

  useEffect(() => {
    if (user) {
      setPaymentMethodsLoading(true);
      invokeEdgeFunction<{ paymentMethods?: PaymentMethod[] }>(supabase, "manage-payment-methods", { method: "GET" })
        .then((data) => setPaymentMethods(data.paymentMethods || []))
        .catch((err) => console.error("Error loading payment methods:", err))
        .finally(() => setPaymentMethodsLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (!addPaymentDialogOpen) setShowAddFormInDialog(false);
  }, [addPaymentDialogOpen]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data: emailData } = await (supabase as any)
          .from("email_preferences")
          .select("enabled, report_frequency")
          .eq("user_id", user.id)
          .maybeSingle();
        if (emailData) {
          const freq = emailData.report_frequency === "none" ? "Off" : (emailData.report_frequency as string).charAt(0).toUpperCase() + (emailData.report_frequency as string).slice(1);
          setEmailPrefsSummary({ enabled: !!emailData.enabled, frequency: emailData.enabled ? freq : "Off" });
        } else {
          setEmailPrefsSummary({ enabled: true, frequency: "Monthly" });
        }
      } catch {
        setEmailPrefsSummary(null);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !isDigger) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("digger_profiles")
          .select("lead_limit_enabled, lead_limit, lead_limit_period")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setLeadLimitsSummary({
            enabled: !!data.lead_limit_enabled,
            limit: String(data.lead_limit ?? "—"),
            period: (data.lead_limit_period as string) || "monthly",
          });
        } else {
          setLeadLimitsSummary({ enabled: false, limit: "—", period: "monthly" });
        }
      } catch {
        setLeadLimitsSummary(null);
      }
    })();
  }, [user, isDigger]);

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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, diggerRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, full_name, address, city, state, zip_postal, country, id_verified, phone, phone_verified")
          .eq("id", user.id)
          .single(),
        supabase
          .from("digger_profiles")
          .select("location, city, state, country")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const profile = profileRes.data as {
        first_name?: string | null;
        last_name?: string | null;
        full_name?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        zip_postal?: string | null;
        country?: string | null;
        id_verified?: boolean | null;
        phone?: string | null;
        phone_verified?: boolean | null;
      } | null;
      if (profile?.id_verified != null) setIdVerified(!!profile.id_verified);
      setProfilePhone(profile?.phone ?? null);
      setProfilePhoneVerified(!!profile?.phone_verified);
      const digger = diggerRes.data as { location?: string | null; city?: string | null; state?: string | null; country?: string | null } | null;

      if (!profile) {
        setProfileIdentity(null);
        setIdVerified(false);
      } else {
        setIdVerified(!!profile.id_verified);
        const fullName = (profile.full_name ?? "").trim();
        const parts = fullName ? fullName.split(/\s+/) : [];
        const derivedFirst = parts[0] ?? null;
        const derivedLast = parts.length > 1 ? parts.slice(1).join(" ") : null;
        // Use profiles first; fallback to digger for city/state/country only (not street address)
        const city = profile.city ?? digger?.city ?? null;
        const state = profile.state ?? digger?.state ?? null;
        const country = profile.country ?? digger?.country ?? null;
        // Keep profile and Account in sync: one user has one address/location.
        // If digger had location but profiles didn't, backfill profiles.
        const needsProfileBackfill =
          (digger?.city && !profile.city) ||
          (digger?.state && !profile.state) ||
          (digger?.country && !profile.country);
        if (needsProfileBackfill && (city || state || country)) {
          (supabase as any)
            .from("profiles")
            .update({
              ...(city != null && { city }),
              ...(state != null && { state }),
              ...(country != null && { country }),
            })
            .eq("id", user.id)
            .then(() => { /* synced */ });
        }
        // If profiles has location but digger doesn't (or differs), backfill digger_profiles so profile page shows same as Account
        const diggerNeedsBackfill = digger && (
          (city != null && digger.city !== city) ||
          (state != null && digger.state !== state) ||
          (country != null && digger.country !== country)
        );
        if (diggerNeedsBackfill && (city || state || country)) {
          const locationText = [city, state, country].filter(Boolean).join(", ") || "Not specified";
          supabase
            .from("digger_profiles")
            .update({
              ...(city != null && { city }),
              ...(state != null && { state }),
              ...(country != null && { country }),
              location: locationText,
            } as Record<string, unknown>)
            .eq("user_id", user.id)
            .then(() => { /* synced */ });
        }
        setProfileIdentity({
          first_name: profile.first_name ?? derivedFirst,
          last_name: profile.last_name ?? derivedLast,
          address: profile.address ?? null,
          city,
          state,
          zip_postal: profile.zip_postal ?? null,
          country,
        });
      }
      const { data: pending } = await (supabase as any)
        .from("profile_identity_update_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      setPendingIdentityRequest(!!pending);

      const { data: pendingIdSubmission } = await (supabase as any)
        .from("id_verification_submissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending_review")
        .maybeSingle();
      setIdVerificationPendingReview(!!pendingIdSubmission);
    })();
  }, [user, profileRefreshKey]);

  const fetchMfaFactors = async (): Promise<{ id: string; friendly_name?: string; factor_type: string }[]> => {
    const mfa = (supabase.auth as { mfa?: { listFactors: () => Promise<{ data?: { all?: unknown[]; totp?: unknown[]; factors?: unknown[] } }> } }).mfa;
    if (!mfa?.listFactors) return [];
    const result = await mfa.listFactors();
    const data = result.data as { all?: { id: string; friendly_name?: string; factor_type?: string; type?: string }[]; totp?: { id: string; friendly_name?: string; factor_type?: string; type?: string }[]; factors?: { id: string; friendly_name?: string; factor_type?: string; type?: string }[] } | undefined;
    const raw = data?.totp ?? data?.all ?? data?.factors ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map((f) => ({
      id: f.id,
      friendly_name: f.friendly_name,
      factor_type: f.factor_type ?? f.type ?? "totp",
    }));
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setMfaLoading(true);
      try {
        const factors = await fetchMfaFactors();
        setMfaFactors(factors);
      } catch {
        setMfaFactors([]);
      } finally {
        setMfaLoading(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setIdentitiesLoading(true);
      try {
        const auth = supabase.auth as { getUserIdentities?: () => Promise<{ data: { identities?: { provider: string; id: string }[] } }> };
        let list: { provider: string; id: string }[] = [];
        if (auth.getUserIdentities) {
          const { data } = await auth.getUserIdentities();
          list = (data?.identities ?? []) as { provider: string; id: string }[];
        } else {
          const { data } = await supabase.auth.getUser();
          const identities = (data?.user as { identities?: { provider: string; id: string }[] } | undefined)?.identities ?? [];
          list = identities.map((i) => ({ provider: i.provider, id: i.id }));
        }
        setLinkedIdentities(list);
      } catch {
        setLinkedIdentities([]);
      } finally {
        setIdentitiesLoading(false);
      }
    })();
  }, [user, location.pathname, location.search]);

  // Open verification dialog from URL (e.g. from full profile page verification card)
  useEffect(() => {
    if (!user || authLoading) return;
    const open = new URLSearchParams(location.search).get("open");
    if (!open) return;
    if (open === "email") {
      navigate("/register", { replace: true });
      return;
    }
    if (open === "phone") {
      setPhoneDialogOpen(true);
      setPhoneValue(profilePhone ?? "");
      setPhoneOtpSent(false);
      setPhoneOtpCode("");
    } else if (open === "id") {
      setIdVerificationOpen(true);
    } else if (open === "payment") {
      setAddPaymentDialogOpen(true);
    } else if (open === "identity") {
      const el = document.getElementById("identity-security");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const params = new URLSearchParams(location.search);
    params.delete("open");
    const next = params.toString() ? `${location.pathname}?${params}` : location.pathname;
    navigate(next, { replace: true });
  }, [user, authLoading, location.search, location.pathname, navigate]);

  useEffect(() => {
    if (!mfaEnrollDialogOpen || mfaEnrollSecret != null) return;
    (async () => {
      try {
        const mfa = (supabase.auth as { mfa?: { enroll: (opts: { factorType: string; friendlyName: string }) => Promise<{ data: { id: string; totp?: { qr_code: string; secret: string } } | null; error: { message: string } | null }> } }).mfa;
        const { data, error } = await mfa?.enroll?.({ factorType: "totp", friendlyName: "Authenticator app" }) ?? { data: null, error: null };
        if (error) {
          const msg = error?.message ?? "";
          if (msg.includes("already exists") || msg.includes("already exist")) {
            const factors = await fetchMfaFactors();
            setMfaFactors(factors);
            setMfaEnrollDialogOpen(false);
            toast.success("Two-factor authentication is already enabled.");
            return;
          }
          throw new Error(msg);
        }
        if (data?.totp && data.id) setMfaEnrollSecret({ qr_code: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to start 2FA setup");
        setMfaEnrollDialogOpen(false);
      }
    })();
  }, [mfaEnrollDialogOpen, mfaEnrollSecret]);

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

  const loadPaymentMethods = async () => {
    if (!user) return;
    try {
      setPaymentMethodsLoading(true);
      const data = await invokeEdgeFunction<{ paymentMethods?: PaymentMethod[] }>(supabase, "manage-payment-methods", { method: "GET" });
      setPaymentMethods(data.paymentMethods || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load payment methods");
    } finally {
      setPaymentMethodsLoading(false);
    }
  };

  const handlePaymentDelete = async (paymentMethodId: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;
    try {
      setPaymentDeletingId(paymentMethodId);
      await invokeEdgeFunction(supabase, "manage-payment-methods", { method: "DELETE", body: { paymentMethodId } });
      toast.success("Payment method deleted");
      loadPaymentMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setPaymentDeletingId(null);
    }
  };

  const handlePaymentSetDefault = async (paymentMethodId: string) => {
    try {
      await invokeEdgeFunction(supabase, "manage-payment-methods", { method: "PATCH", body: { paymentMethodId, isDefault: true } });
      toast.success("Default payment method updated");
      loadPaymentMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update default");
    }
  };

  const getCardBrandIcon = (brand: string) => "💳";
  const formatExpiry = (month: number, year: number) => `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;

  const renderLink = ({ path, label, icon: Icon, description, badge, onClick }: SettingsLink) => (
    <button
      key={path}
      type="button"
      onClick={() => (onClick ? onClick() : navigate(path))}
      className="flex w-full min-h-[48px] sm:min-h-[44px] items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-colors hover:border-border hover:bg-muted/50 active:bg-muted/60 touch-manipulation"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted sm:h-8 sm:w-8 sm:rounded">
        <Icon className="h-4 w-4 text-muted-foreground sm:h-4 sm:w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground sm:text-base">{label}</span>
          {badge && (
            <Badge variant="secondary" className="text-[10px] font-normal sm:text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground line-clamp-1">{description}</span>
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

  const paymentMethodsDescription =
    activeRole === "gigger"
      ? "Add a card or bank account to pay for awards, deposits, and milestones. You pay from here—not receive."
      : "Add a card or bank for penalties or other charges only. You do not receive milestone payments here—use Get paid below.";
  const paymentLinks: SettingsLink[] = [
    {
      path: "/account",
      label: "Payment methods",
      icon: CreditCard,
      description: paymentMethodsDescription,
      onClick: () => setAddPaymentDialogOpen(true),
    },
  ];

  return (
    <PageLayout maxWidth="wide">
      <SEOHead
        title="Account settings"
        description="Manage your Digs & Gigs account, security, payments, and preferences."
      />
      <div className="mx-auto w-full px-3 pt-0 pb-4 sm:px-4 sm:py-6 flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Left sidebar nav */}
        <nav
          aria-label="Account sections"
          className="sticky top-[var(--header-height)] z-10 bg-background shrink-0 md:w-48 lg:w-52 md:top-24 md:self-start md:pt-1 -mx-3 px-3 py-2 md:mx-0 md:px-0 md:py-0"
        >
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 md:flex-col md:overflow-visible border-b border-border/60 md:border-b-0">
            {sectionIds.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={`text-left px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors md:py-1.5 hover:bg-muted ${
                  activeSection === id
                    ? "bg-muted text-foreground font-medium md:border-l-2 md:border-l-muted-foreground/50 md:pl-3 md:ml-0 hover:text-foreground"
                    : "text-muted-foreground hover:text-foreground md:border-l-2 md:border-l-transparent md:pl-3"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 max-w-2xl space-y-5 sm:space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Account</h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Security, payments, preferences.
            </p>
          </div>

          <EmailVerificationBanner />

          {/* Identity & Security */}
          <Card id="identity-security" className="border-border/60 scroll-mt-24 transition-colors hover:bg-muted/50">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium sm:text-base">
              <ShieldCheck className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              Identity & Security
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Sign-in and verification. Your data stays secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <div
              role={!isEmailVerified ? "button" : undefined}
              tabIndex={!isEmailVerified ? 0 : undefined}
              className={`rounded-md border border-border/50 bg-muted/20 p-3 sm:p-3.5 ${!isEmailVerified ? "cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20" : ""}`}
              onClick={() => { if (!isEmailVerified) navigate("/register"); }}
              onKeyDown={(e) => { if (!isEmailVerified && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); navigate("/register"); } }}
            >
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground break-all">{user.email}</span>
                {isEmailVerified ? (
                  <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-0 text-xs">Verified</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Unverified</Badge>
                )}
                {!isEmailVerified && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />}
              </div>
              {!isEmailVerified && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Verify to unlock gigs, leads, and secure communication.
                </p>
              )}
            </div>
            <div
              role="button"
              tabIndex={0}
              className="rounded-md border border-border/50 bg-muted/20 p-3 sm:p-3.5 cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => { setPhoneDialogOpen(true); setPhoneValue(profilePhone ?? ""); setPhoneOtpSent(false); setPhoneOtpCode(""); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPhoneDialogOpen(true); setPhoneValue(profilePhone ?? ""); setPhoneOtpSent(false); setPhoneOtpCode(""); } }}
            >
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground break-all">
                  {profilePhone && profilePhone.trim() ? profilePhone : "Not set"}
                </span>
                {profilePhone && (
                  profilePhoneVerified ? (
                    <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-0 text-xs">Verified</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Unverified</Badge>
                  )
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); setPhoneDialogOpen(true); setPhoneValue(profilePhone ?? ""); setPhoneOtpSent(false); setPhoneOtpCode(""); }}>
                  <Phone className="h-3.5 w-3.5" />
                  {profilePhone ? "Edit / Verify" : "Add phone"}
                </Button>
              </div>
            </div>
            {userRoles.length > 0 && (
              <div className="rounded-md border border-border/50 bg-muted/20 p-3 sm:p-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {userRoles.map((role) => (
                    <Badge key={role} variant="outline" className="capitalize text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div
              role="button"
              tabIndex={0}
              className="relative rounded-lg border-2 border-primary/25 bg-primary/5 dark:bg-primary/10 p-4 sm:p-4 shadow-sm ring-1 ring-primary/10 cursor-pointer transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
              onClick={() => setIdVerificationOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setIdVerificationOpen(true); } }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-primary/50" aria-hidden />
              <div className="flex flex-wrap items-center gap-2 gap-y-1 pl-1">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold text-foreground">ID verification</span>
                {idVerified ? (
                  <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-0 text-xs">Verified</Badge>
                ) : idVerificationPendingReview ? (
                  <Badge className="bg-amber-600/10 text-amber-700 dark:text-amber-400 border-0 text-xs">Under review</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Unverified</Badge>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />
              </div>
              {idVerified && (
                <p className="mt-2 text-xs text-muted-foreground pl-1">
                  Your identity has been verified.
                </p>
              )}
              {idVerificationPendingReview && (
                <p className="mt-2 text-xs text-muted-foreground pl-1">
                  Your submission is being reviewed. We&apos;ll update your status soon.
                </p>
              )}
              {!idVerified && !idVerificationPendingReview && (
                <>
                  <p className="mt-2 text-xs text-muted-foreground pl-1">
                    Verify your identity with a government-issued ID to access full features.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={(e) => { e.stopPropagation(); setIdVerificationOpen(true); }}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Verify now
                  </Button>
                </>
              )}
            </div>
            <div
              role="button"
              tabIndex={0}
              className={`rounded-md border border-border/50 bg-muted/20 p-3 sm:p-3.5 ${!mfaFactors.some((f) => f.factor_type === "totp") ? "cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20" : ""}`}
              onClick={() => { if (!mfaFactors.some((f) => f.factor_type === "totp")) { setMfaEnrollDialogOpen(true); setMfaEnrollSecret(null); setMfaEnrollCode(""); } }}
              onKeyDown={(e) => { if (!mfaFactors.some((f) => f.factor_type === "totp") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setMfaEnrollDialogOpen(true); setMfaEnrollSecret(null); setMfaEnrollCode(""); } }}
            >
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">Two-factor authentication</span>
                {mfaLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                ) : mfaFactors.some((f) => f.factor_type === "totp") ? (
                  <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-0 text-xs">Enabled</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Not enabled</Badge>
                )}
                {!mfaFactors.some((f) => f.factor_type === "totp") && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {mfaFactors.some((f) => f.factor_type === "totp")
                  ? "Your account is protected with an authenticator app."
                  : "Add an authenticator app (e.g. Google Authenticator) for extra security."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                {mfaFactors.some((f) => f.factor_type === "totp") ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={mfaUnenrollingId != null}
                    onClick={async () => {
                      const factor = mfaFactors.find((f) => f.factor_type === "totp");
                      if (!factor || !confirm("Disable two-factor authentication? Your account will be less secure.")) return;
                      setMfaUnenrollingId(factor.id);
                      try {
                        const mfa = (supabase.auth as { mfa?: { unenroll: (opts: { factorId: string }) => Promise<{ error: { message: string } | null }> } }).mfa;
                        const { error } = await mfa?.unenroll?.({ factorId: factor.id }) ?? { error: null };
                        if (error) throw new Error(error.message);
                        setMfaFactors((prev) => prev.filter((f) => f.id !== factor.id));
                        toast.success("Two-factor authentication disabled.");
                      } catch (e: unknown) {
                        toast.error(e instanceof Error ? e.message : "Failed to disable 2FA");
                      } finally {
                        setMfaUnenrollingId(null);
                      }
                    }}
                  >
                    {mfaUnenrollingId != null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Disable 2FA
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => { setMfaEnrollDialogOpen(true); setMfaEnrollSecret(null); setMfaEnrollCode(""); }}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Enable 2FA
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded-md border border-border/50 bg-muted/20 p-3 sm:p-3.5">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold text-foreground">Linked accounts</span>
                {identitiesLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Connect Google, GitHub, or LinkedIn to sign in with them.
              </p>
              <ul className="mt-3 space-y-2">
                {(["google", "github", "linkedin_oidc"] as const).map((provider) => {
                  const label = provider === "linkedin_oidc" ? "LinkedIn" : provider.charAt(0).toUpperCase() + provider.slice(1);
                  const connected = linkedIdentities.some((i) => i.provider === provider);
                  const handleConnect = async () => {
                    setLinkingProvider(provider);
                    try {
                      const auth = supabase.auth as { linkIdentity?: (opts: { provider: string }) => Promise<{ error: { message: string } | null }> };
                      const { error } = await auth.linkIdentity?.({ provider }) ?? { error: null };
                      if (error) throw new Error(error.message);
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed to connect");
                    } finally {
                      setLinkingProvider(null);
                    }
                  };
                  return (
                    <li
                      key={provider}
                      role={connected ? undefined : "button"}
                      tabIndex={connected ? undefined : 0}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 bg-background/50 px-3 py-2 ${!connected ? "cursor-pointer transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20" : ""}`}
                      onClick={!connected ? handleConnect : undefined}
                      onKeyDown={!connected ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleConnect(); } } : undefined}
                    >
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      {connected ? (
                        <Badge className="bg-green-600/10 text-green-700 dark:text-green-400 border-0 text-xs">Connected</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={linkingProvider != null}
                          onClick={(e) => { e.stopPropagation(); handleConnect(); }}
                        >
                          {linkingProvider === provider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          Connect
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <Dialog
              open={phoneDialogOpen}
              onOpenChange={(o) => {
                if (!o) { setPhoneOtpSent(false); setPhoneOtpCode(""); setPhoneValue(profilePhone ?? ""); setPhoneLastSentCode(null); }
                setPhoneDialogOpen(o);
              }}
            >
              <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">{profilePhone ? "Edit & verify phone" : "Add phone"}</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Use E.164 format (e.g. +1234567890). We&apos;ll send a verification code via SMS.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!phoneOtpSent ? (
                    <>
                      <div>
                        <Label htmlFor="phone-input">Phone number</Label>
                        <Input
                          id="phone-input"
                          type="tel"
                          value={phoneValue}
                          onChange={(e) => setPhoneValue(e.target.value)}
                          placeholder="+1234567890"
                          className="mt-1"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setPhoneDialogOpen(false)}>Cancel</Button>
                        <Button
                          disabled={phoneSubmitting || !phoneValue.trim()}
                          onClick={async () => {
                            const raw = phoneValue.trim().replace(/\D/g, "");
                            const normalized = raw.startsWith("1") && raw.length === 11 ? `+${raw}` : raw.length === 10 ? `+1${raw}` : `+${raw}`;
                            setPhoneSubmitting(true);
                            try {
                              const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
                              await invokeEdgeFunction(supabase, "send-otp", {
                                body: { phone: normalized, code: otpCode, method: "sms" },
                              });
                              await supabase.from("profiles").update({ phone: normalized, phone_verified: false }).eq("id", user.id);
                              setProfilePhone(normalized);
                              setProfilePhoneVerified(false);
                              setPhoneOtpSent(true);
                              setPhoneValue(normalized);
                              setPhoneLastSentCode(otpCode);
                              toast.success("Verification code sent to your phone.");
                            } catch (e: unknown) {
                              const msg = e instanceof Error ? e.message : "Failed to send code";
                              toast.error(typeof msg === "string" ? msg : "Failed to send code");
                            } finally {
                              setPhoneSubmitting(false);
                            }
                          }}
                        >
                          {phoneSubmitting ? "Sending…" : "Send verification code"}
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {phoneValue}</p>
                      {import.meta.env.DEV && phoneLastSentCode && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5">
                          Dev only (SMS may not arrive): your code is <strong>{phoneLastSentCode}</strong>
                        </p>
                      )}
                      <div>
                        <Label htmlFor="phone-otp">Verification code</Label>
                        <Input
                          id="phone-otp"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={phoneOtpCode}
                          onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          className="mt-1"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setPhoneOtpSent(false); setPhoneLastSentCode(null); }}>Back</Button>
                        <Button
                          disabled={phoneVerifying || phoneOtpCode.length !== 6}
                          onClick={async () => {
                            setPhoneVerifying(true);
                            try {
                              const result = await invokeEdgeFunction<{ success?: boolean }>(supabase, "verify-custom-otp", {
                                body: { phone: phoneValue, code: phoneOtpCode.trim() },
                              });
                              if (!result?.success) {
                                throw new Error("Invalid or expired verification code.");
                              }
                              await supabase.from("profiles").update({ phone: phoneValue, phone_verified: true }).eq("id", user.id);
                              setProfilePhone(phoneValue);
                              setProfilePhoneVerified(true);
                              setPhoneDialogOpen(false);
                              setPhoneOtpSent(false);
                              setPhoneOtpCode("");
                              setPhoneLastSentCode(null);
                              toast.success("Phone verified.");
                            } catch (e: unknown) {
                              const msg = e instanceof Error ? e.message : "Verification failed";
                              toast.error(typeof msg === "string" ? msg : "Verification failed");
                            } finally {
                              setPhoneVerifying(false);
                            }
                          }}
                        >
                          {phoneVerifying ? "Verifying…" : "Verify"}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={mfaEnrollDialogOpen}
              onOpenChange={(o) => {
                if (!o) { setMfaEnrollSecret(null); setMfaEnrollCode(""); }
                setMfaEnrollDialogOpen(o);
              }}
            >
              <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Enable two-factor authentication</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Scan the QR code with your authenticator app (e.g. Google Authenticator), then enter the 6-digit code.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!mfaEnrollSecret ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-center">
                        <img src={mfaEnrollSecret.qr_code} alt="TOTP QR code" className="h-40 w-40 rounded border border-border object-contain" />
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        Or enter this secret manually: <code className="break-all rounded bg-muted px-1">{mfaEnrollSecret.secret}</code>
                      </p>
                      <div>
                        <Label htmlFor="mfa-code">Verification code</Label>
                        <Input
                          id="mfa-code"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={mfaEnrollCode}
                          onChange={(e) => setMfaEnrollCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          className="mt-1"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setMfaEnrollDialogOpen(false)}>Cancel</Button>
                        <Button
                          disabled={mfaEnrolling || mfaEnrollCode.length !== 6}
                          onClick={async () => {
                            if (!mfaEnrollSecret) return;
                            setMfaEnrolling(true);
                            try {
                              const mfa = supabase.auth as { mfa?: { challenge: (opts: { factorId: string }) => Promise<{ data: { id: string } | null; error: { message: string } | null }>; verify: (opts: { factorId: string; challengeId: string; code: string }) => Promise<{ error: { message: string } | null }> } };
                              const { data: challengeData, error: challengeError } = await mfa.mfa?.challenge?.({ factorId: mfaEnrollSecret.factorId }) ?? { data: null, error: null };
                              if (challengeError || !challengeData?.id) throw new Error(challengeError?.message ?? "Failed to create challenge");
                              const { error: verifyError } = await mfa.mfa?.verify?.({ factorId: mfaEnrollSecret.factorId, challengeId: challengeData.id, code: mfaEnrollCode }) ?? { error: null };
                              if (verifyError) throw new Error(verifyError.message);
                              setMfaFactors((prev) => [...prev, { id: mfaEnrollSecret.factorId, friendly_name: "Authenticator app", factor_type: "totp" }]);
                              setMfaEnrollDialogOpen(false);
                              setMfaEnrollSecret(null);
                              setMfaEnrollCode("");
                              toast.success("Two-factor authentication enabled.");
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : "Verification failed");
                            } finally {
                              setMfaEnrolling(false);
                            }
                          }}
                        >
                          {mfaEnrolling ? "Verifying…" : "Verify and enable"}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex flex-wrap gap-2 min-h-[44px] items-center">
              <Dialog open={passwordDialogOpen} onOpenChange={(o) => { setPasswordDialogOpen(o); if (!o) { setNewPassword(""); setConfirmPassword(""); } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Change password</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">
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
            <div className="border-t border-border/50 pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 min-h-[44px] sm:min-h-0 shrink-0"
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                      toast.success("Signed out.");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "Failed to sign out");
                    }
                  }}
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Sign out
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground min-h-[44px] sm:min-h-0 shrink-0"
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
            <IdVerificationDialog
              open={idVerificationOpen}
              onOpenChange={setIdVerificationOpen}
              userName={profileIdentity ? [profileIdentity.first_name, profileIdentity.last_name].filter(Boolean).join(" ") || undefined : undefined}
              onSuccess={async () => {
                if (!user) return;
                setIdVerified(true);
                setIdVerificationPendingReview(false);
                setProfileRefreshKey((k) => k + 1);
                toast.success("Identity verified. Your profile and address have been updated.");
              }}
              onPendingReview={() => {
                setIdVerificationPendingReview(true);
                setProfileRefreshKey((k) => k + 1);
              }}
            />
          </CardContent>
        </Card>

        {/* Name & address (ID verification) */}
        <Card id="name-address" className="border-border/60 scroll-mt-24 transition-colors hover:bg-muted/50">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium sm:text-base">
              <User className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
              Name & address
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Legal name and location. Changes require admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
            {(() => {
              const hasAny = !!(
                (profileIdentity?.first_name?.trim()) ||
                (profileIdentity?.last_name?.trim()) ||
                (profileIdentity?.address?.trim()) ||
                (profileIdentity?.city?.trim()) ||
                (profileIdentity?.state?.trim()) ||
                (profileIdentity?.zip_postal?.trim()) ||
                (profileIdentity?.country?.trim())
              );
              return (
                <div
                  className={`rounded-md border border-border/50 p-3 space-y-2.5 sm:p-3.5 sm:space-y-3 ${
                    hasAny ? "bg-muted/30" : "bg-muted/20"
                  }`}
                >
                  {hasAny && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground pb-1.5 border-b border-border/50">
                      Use &quot;Request edit&quot; to change.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-y-2.5">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">First name</p>
                      <p className="text-sm font-medium text-foreground truncate">{profileIdentity?.first_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Last name</p>
                      <p className="text-sm font-medium text-foreground truncate">{profileIdentity?.last_name || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Address</p>
                      <p className="text-sm font-medium text-foreground break-words">{profileIdentity?.address || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">City</p>
                      <p className="text-sm font-medium text-foreground truncate">{profileIdentity?.city || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">State</p>
                      <p className="text-sm font-medium text-foreground truncate">{profileIdentity?.state || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">ZIP</p>
                      <p className="text-sm font-medium text-foreground truncate">{profileIdentity?.zip_postal || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Country</p>
                      <p className="text-sm font-medium text-foreground truncate">{profileIdentity?.country || "—"}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
            {pendingIdentityRequest && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Pending request. Admin will review shortly.
              </p>
            )}
            <Dialog
              open={identityDialogOpen}
              onOpenChange={(open) => {
                setIdentityDialogOpen(open);
                if (open && profileIdentity) {
                  setIdentityForm({
                    first_name: profileIdentity.first_name ?? "",
                    last_name: profileIdentity.last_name ?? "",
                    address: profileIdentity.address ?? "",
                    city: profileIdentity.city ?? "",
                    state_region: profileIdentity.state ?? "",
                    zip_postal: profileIdentity.zip_postal ?? "",
                    country: profileIdentity.country ?? "",
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 min-h-[44px] sm:min-h-0 touch-manipulation" disabled={pendingIdentityRequest}>
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Request edit
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Request name & address update</DialogTitle>
                  <DialogDescription>
                    Submit the details you want on file. An admin will review and apply them for ID verification.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!identityForm.first_name?.trim() && !identityForm.last_name?.trim() &&
                        !identityForm.address?.trim() && !identityForm.city?.trim() &&
                        !identityForm.state_region?.trim() && !identityForm.zip_postal?.trim() &&
                        !identityForm.country?.trim()) {
                      toast.error("Fill at least one field.");
                      return;
                    }
                    setIdentitySubmitting(true);
                    try {
                      await invokeEdgeFunction(supabase, "submit-profile-identity-request", {
                        method: "POST",
                        body: {
                          first_name: identityForm.first_name.trim() || null,
                          last_name: identityForm.last_name.trim() || null,
                          address: identityForm.address.trim() || null,
                          city: identityForm.city.trim() || null,
                          state_region: identityForm.state_region.trim() || null,
                          zip_postal: identityForm.zip_postal.trim() || null,
                          country: identityForm.country.trim() || null,
                        },
                      });
                      toast.success("Request submitted. An admin will review it.");
                      setPendingIdentityRequest(true);
                      setIdentityDialogOpen(false);
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : "Failed to submit request");
                    } finally {
                      setIdentitySubmitting(false);
                    }
                  }}
                  className="space-y-4 pt-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="id-first-name">First name</Label>
                      <Input
                        id="id-first-name"
                        value={identityForm.first_name}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, first_name: e.target.value }))}
                        placeholder="Legal first name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="id-last-name">Last name</Label>
                      <Input
                        id="id-last-name"
                        value={identityForm.last_name}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, last_name: e.target.value }))}
                        placeholder="Legal last name"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="id-address">Street address</Label>
                    <Input
                      id="id-address"
                      value={identityForm.address}
                      onChange={(e) => setIdentityForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Street address"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="id-city">City / Town</Label>
                      <Input
                        id="id-city"
                        value={identityForm.city}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, city: e.target.value }))}
                        placeholder="City or town"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="id-state">State / Region</Label>
                      <Input
                        id="id-state"
                        value={identityForm.state_region}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, state_region: e.target.value }))}
                        placeholder="State or region"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="id-zip">ZIP / Postal code</Label>
                      <Input
                        id="id-zip"
                        value={identityForm.zip_postal}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, zip_postal: e.target.value }))}
                        placeholder="ZIP or postal code"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="id-country">Country</Label>
                      <Input
                        id="id-country"
                        value={identityForm.country}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, country: e.target.value }))}
                        placeholder="Country"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIdentityDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={identitySubmitting}>
                      {identitySubmitting ? "Submitting…" : "Submit request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {isDigger && (
          <section id="payout-account" className="scroll-mt-24 transition-colors hover:bg-muted/50 rounded-lg">
            <StripeConnectBanner />
          </section>
        )}

        {/* Payments */}
        <Card id="payments" className="border-border/60 scroll-mt-24 transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
            <CardTitle className="text-sm font-medium sm:text-base">Payments</CardTitle>
            <CardDescription className="text-xs sm:text-sm hidden sm:block">
              {""}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
            {paymentMethodsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading payment methods…
              </div>
            ) : paymentMethods.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connected payment methods</p>
                {paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">
                        {pm.type === "us_bank_account" ? (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          getCardBrandIcon(pm.card?.brand ?? "card")
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {pm.type === "us_bank_account"
                              ? `${pm.us_bank_account?.bank_name ?? "Bank"} •••• ${pm.us_bank_account?.last4 ?? "****"}`
                              : `${pm.card?.brand?.charAt(0).toUpperCase()}${pm.card?.brand?.slice(1) ?? ""} •••• ${pm.card?.last4 ?? ""}`}
                          </span>
                          {pm.is_default && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pm.type === "us_bank_account" ? "US bank account" : pm.card && `Expires ${formatExpiry(pm.card.exp_month, pm.card.exp_year)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!pm.is_default && (
                        <Button variant="outline" size="sm" onClick={() => handlePaymentSetDefault(pm.id)}>
                          Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePaymentDelete(pm.id)}
                        disabled={paymentDeletingId === pm.id}
                      >
                        {paymentDeletingId === pm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {paymentLinks.map(renderLink)}
            <Dialog open={addPaymentDialogOpen} onOpenChange={setAddPaymentDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Payment methods</DialogTitle>
                  <DialogDescription>
                    Your saved payment methods. Add a card or bank account for checkout.
                  </DialogDescription>
                </DialogHeader>
                {paymentMethodsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods.length > 0 && (
                      <div className="space-y-2">
                        {paymentMethods.map((pm) => (
                          <div
                            key={pm.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl">
                                {pm.type === "us_bank_account" ? (
                                  <Building2 className="h-6 w-6 text-muted-foreground" />
                                ) : (
                                  getCardBrandIcon(pm.card?.brand ?? "card")
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">
                                    {pm.type === "us_bank_account"
                                      ? `${pm.us_bank_account?.bank_name ?? "Bank"} •••• ${pm.us_bank_account?.last4 ?? "****"}`
                                      : `${pm.card?.brand?.charAt(0).toUpperCase()}${pm.card?.brand?.slice(1) ?? ""} •••• ${pm.card?.last4 ?? ""}`}
                                  </span>
                                  {pm.is_default && (
                                    <Badge variant="secondary" className="gap-1 text-xs">
                                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {pm.type === "us_bank_account" ? "US bank account" : pm.card && `Expires ${formatExpiry(pm.card.exp_month, pm.card.exp_year)}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              {!pm.is_default && (
                                <Button variant="outline" size="sm" onClick={() => handlePaymentSetDefault(pm.id)}>
                                  Default
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePaymentDelete(pm.id)}
                                disabled={paymentDeletingId === pm.id}
                              >
                                {paymentDeletingId === pm.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAddFormInDialog ? (
                      <div className="border-t border-border/60 pt-4">
                        <PaymentMethodForm
                          onSuccess={() => {
                            loadPaymentMethods();
                            setShowAddFormInDialog(false);
                          }}
                          onCancel={() => setShowAddFormInDialog(false)}
                        />
                      </div>
                    ) : (
                      <Button onClick={() => setShowAddFormInDialog(true)} className="w-full gap-2">
                        <Plus className="h-4 w-4" />
                        Add Payment Method
                      </Button>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card id="preferences" className="border-border/60 scroll-mt-24 transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
            <CardTitle className="text-sm font-medium sm:text-base">Preferences</CardTitle>
            <CardDescription className="text-xs sm:text-sm hidden sm:block">Email, notifications, limits.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current settings</p>
              {emailPrefsSummary && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Email reports</span>
                  </div>
                  <span className="text-sm font-medium truncate">{emailPrefsSummary.enabled ? emailPrefsSummary.frequency : "Off"}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Notifications</span>
                </div>
                <span className="text-sm font-medium truncate">
                  {notificationUnreadCount > 0 ? `${notificationUnreadCount} unread` : "All caught up"}
                </span>
              </div>
              {isDigger && leadLimitsSummary && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Lead limits</span>
                  </div>
                  <span className="text-sm font-medium truncate">
                    {leadLimitsSummary.enabled ? `${leadLimitsSummary.limit} per ${leadLimitsSummary.period}` : "Off"}
                  </span>
                </div>
              )}
            </div>
            {preferenceLinks.map(renderLink)}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card id="danger-zone" className="border-destructive/40 scroll-mt-24 transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-destructive sm:text-base">
              <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Danger zone
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Request account deletion. Admin approval required.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) setDeleteConfirmText(""); }}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2 min-h-[44px] sm:min-h-0 touch-manipulation">
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Request account deletion
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-destructive text-base sm:text-lg">Request account deletion</DialogTitle>
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
      </div>
    </PageLayout>
  );
}

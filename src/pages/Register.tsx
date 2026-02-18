import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Eye, EyeOff, Home, ArrowRight, ArrowLeft, CheckCircle2, Mail, AlertCircle } from "lucide-react";
import { z } from "zod";
import SEOHead from "@/components/SEOHead";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { useRedditPixel } from "@/hooks/useRedditPixel";
import { PasswordRequirements, GoogleSignInButton, AuthLogo } from "@/components/auth";
import { getHandleForFirstProfile } from "@/lib/generateHandle";
import { PageLayout } from "@/components/layout";

// SECURITY: Input validation schemas - phone is now optional
const basicInfoSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z.string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  email: z.string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
});

// Schema for gig posting flow - EMAIL ONLY, no password required (hybrid passwordless)
const gigPostingSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  phone: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Use international format (e.g., +1234567890)")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .optional()
    .or(z.literal("")),
});

type UserAppRole = 'digger' | 'gigger' | 'admin';

interface RoleFormData {
  digger?: {
    companyName: string;
    selectedIndustries: string[];
    allowGiggerContact?: boolean;
    businessInfo?: any;
  };
  gigger?: {
    profileTitle?: string;
    country?: string | null;
    state?: string | null;
    location?: string;
    preferences?: any;
  };
}

const Register = () => {
  const navigate = useNavigate();
  const isNavigatingRef = useRef(false); // Prevent race conditions with useProtectedRoute
  const isInSignInOtpFlowRef = useRef(false); // Prevent redirect during sign-in OTP flow
  const hasInitializedSignInModeRef = useRef(false); // Track if we've initialized sign-in mode
  const isSendingOtpRef = useRef(false); // Prevent multiple simultaneous OTP requests
  // Check if user is coming from gig posting flow (Craigslist model - no OTP required)
  const isFromGigPosting = new URLSearchParams(window.location.search).get('returnTo') === '/post-gig';
  
  // Check if user is completing registration from dashboard (has no roles)
  // MUST be declared before useProtectedRoute and useEffect that use it
  const isCompletingRegistration = new URLSearchParams(window.location.search).get('complete') === 'true';
  
  const { user, loading: authLoading, userRoles } = useProtectedRoute({ 
    redirectIfAuthenticated: true,
    requireVerified: false // Allow unverified users to complete registration
  });
  
  // Check if user just completed registration (bypass role check temporarily)
  const justRegistered = new URLSearchParams(window.location.search).get('registered') === 'true';
  
  // Redirect legacy "create first profile" flow to dedicated page
  useEffect(() => {
    if (!user || authLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('complete') === 'true' && params.get('type') === 'digger') {
      navigate('/create-first-profile', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Immediate redirect for users with roles - don't wait for other checks
  // This ensures users with roles (like admin) can access the platform immediately
  // BUT: Skip redirect if user is completing registration (has no roles) OR just registered
  // ALSO: Skip if we're already on role-dashboard (prevents redirect loops)
  useEffect(() => {
    const isOnDashboard = window.location.pathname === '/role-dashboard';
    if (!authLoading && user && userRoles && userRoles.length > 0 && !isCompletingRegistration && !justRegistered && !isOnDashboard) {
      console.log('User has roles, redirecting to dashboard:', userRoles);
      // Use immediate redirect for users with roles
      window.location.href = '/role-dashboard';
    }
  }, [authLoading, user, userRoles, isCompletingRegistration, justRegistered]);
  
  // Get gig title from sessionStorage for display (safe parse - invalid JSON must not crash the page)
  const pendingGigData = (() => {
    if (!isFromGigPosting) return {};
    try {
      const raw = sessionStorage.getItem('pendingGigData');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();
  const gigTitle = pendingGigData?.title || 'Your Gig';
  
  const [isSignInMode, setIsSignInMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    // If we're in OTP flow, ensure we're in sign-in mode
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    return params.get('mode') === 'signin' || isInOtpFlow;
  });
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'reset-password';
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [existingAccountError, setExistingAccountError] = useState(false);
  
  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Step 1: Basic Info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Helper to get full name from first + last
  const fullName = `${firstName} ${lastName}`.trim();
  const setFullName = (name: string) => {
    const parts = name.split(' ');
    setFirstName(parts[0] || '');
    setLastName(parts.slice(1).join(' ') || '');
  };
  
  // Initialize email from sessionStorage if in OTP flow
  const [email, setEmail] = useState(() => {
    // Check sessionStorage first for OTP flow
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (isInOtpFlow || isSignInMode) {
      const savedEmail = sessionStorage.getItem('signInEmail');
      return savedEmail || "";
    }
    return "";
  });
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  // SMS verification removed - email only
  const verificationMethod = 'email';

  // Step 1.5: Verification
  const [verificationCode, setVerificationCode] = useState(""); // User-entered code
  const [sentOtpCode, setSentOtpCode] = useState(""); // OTP code we sent
  
  // Initialize userId from sessionStorage if in OTP flow
  const [userId, setUserId] = useState<string | null>(() => {
    if (isSignInMode) {
      return sessionStorage.getItem('signInUserId');
    }
    return null;
  });
  
  const [otpSent, setOtpSent] = useState(false); // Track if OTP was sent to show input field
  
  // Initialize signInOtpSent from sessionStorage if in OTP flow
  const [signInOtpSent, setSignInOtpSent] = useState(() => {
    // Check sessionStorage first, regardless of isSignInMode (which might not be set yet)
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (isInOtpFlow) {
      // If in OTP flow, ensure we're in sign-in mode
      return true;
    }
    return false;
  });
  
  // SMS verification removed - email only
  const signInVerificationMethod = 'email';
  
  const [userPhone, setUserPhone] = useState<string | null>(null); // Store user's phone for sign-in
  const [pendingDiggerVerification, setPendingDiggerVerification] = useState(false); // Track if we're verifying for Digger role
  const [isDiggerLogin, setIsDiggerLogin] = useState(false); // Track if login is for Digger (requires OTP every time)

  // Step 2: Role Selection - pre-select based on URL params (e.g., ?type=digger from /apply-digger or ?role=digger)
  const [selectedRoles, setSelectedRoles] = useState<Set<UserAppRole>>(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedType = params.get('type') || params.get('role') as UserAppRole | null;
    if (preselectedType === 'digger' || preselectedType === 'gigger') {
      return new Set([preselectedType]);
    }
    return new Set();
  });

  // Step 3+: Role-specific forms data
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({});
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [existingDiggerLocation, setExistingDiggerLocation] = useState<{ country: string; state?: string | null } | null>(null);

  // Freelancer flow: opt-in for helpful emails (job leads, tips)
  const [diggerEmailOptIn, setDiggerEmailOptIn] = useState(true);

  // UTM and campaign tracking
  const { getCampaignData, clearUTMData } = useUTMTracking();
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  const { trackConversion: trackGAConversion, isConfigured: gaConfigured } = useGoogleAdsConversion();
  const { trackEvent: trackRedditEvent, isConfigured: redditConfigured } = useRedditPixel();

  // Track page view for funnel analytics on mount (non-blocking)
  useEffect(() => {
    // Fire-and-forget: Don't await to avoid blocking page load
    const campaignData = getCampaignData();
    supabase.functions.invoke('log-campaign-event', {
      body: {
        conversion_type: 'signup_page_view',
        ...campaignData,
      },
    }).catch(error => {
      // Silently fail - don't log errors for missing functions to avoid console spam
      // Only log if it's not a 404 (function not deployed)
      if (error?.status !== 404 && error?.code !== '404') {
        console.warn("Failed to track signup page view (non-critical):", error);
      }
    });
  }, []);

  // Handle expired password reset tokens - but delay check to allow Supabase to process token first
  useEffect(() => {
    if (isPasswordResetMode) {
      // Delay the expired token check to give Supabase time to process the token
      const timeoutId = setTimeout(() => {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const errorCode = hashParams.get('error_code');
        const error = hashParams.get('error');
        
        if (errorCode === 'otp_expired' || error === 'access_denied') {
          toast.error('Password reset link expired. Please request a new one.');
          setTimeout(() => {
            setIsPasswordResetMode(false);
            setIsSignInMode(true);
            navigate('/register?mode=signin');
          }, 2000);
        }
      }, 1000); // Wait 1 second for Supabase to process
      
      return () => clearTimeout(timeoutId);
    }
  }, [isPasswordResetMode, navigate]);

  // Restore OTP flow state from sessionStorage on mount (runs immediately)
  useEffect(() => {
    // Check if we're in the middle of an OTP flow (restore from sessionStorage)
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (isInOtpFlow) {
      const savedUserId = sessionStorage.getItem('signInUserId');
      const savedEmail = sessionStorage.getItem('signInEmail');
      
      if (savedUserId && savedEmail) {
        // State is already initialized from useState, but ensure flags are set
        isInSignInOtpFlowRef.current = true;
        hasInitializedSignInModeRef.current = true;
        // Ensure we're in sign-in mode
        setIsSignInMode(true);
        // Ensure state is set (in case useState didn't pick it up)
        setUserId(savedUserId);
        setEmail(savedEmail);
        setSignInOtpSent(true);
        // OTP flow state restored from sessionStorage
      }
    }
  }, []); // Run only on mount

  // Reset registration state when switching TO sign-in mode (not when already in sign-in mode)
  useEffect(() => {
    // Check if we're restoring OTP flow FIRST - if so, don't reset
    const isInOtpFlow = sessionStorage.getItem('signInOtpFlow') === 'true';
    if (isInOtpFlow && isSignInMode) {
      // We're in OTP flow, don't reset
      hasInitializedSignInModeRef.current = true;
      return;
    }
    
    // Only reset if we're switching TO sign-in mode, not if we're already in it
    if (isSignInMode && !hasInitializedSignInModeRef.current) {
      hasInitializedSignInModeRef.current = true;
      
      // Normal reset only when first switching to sign-in mode
      setStep(1);
      setFullName("");
      setConfirmPassword("");
      setPhone("");
      setVerificationCode("");
      setUserId(null);
      setSelectedRoles(new Set());
      setRoleFormData({});
      setCurrentRoleIndex(0);
      setOtpSent(false);
      setSignInOtpSent(false);
      setUserPhone(null);
    } else if (!isSignInMode) {
      // Reset flag when switching away from sign-in mode
      hasInitializedSignInModeRef.current = false;
    }
  }, [isSignInMode]);

  // Auto-advance logged-in users who are completing registration from the dashboard.
  // Key rule: If you're already authenticated, we should never force OTP/email re-verification just to add roles.
  // (New signups still go through OTP verification before roles.)
  useEffect(() => {
    // Don't run redirect logic if we're in the middle of sign-in OTP flow
    if (isInSignInOtpFlowRef.current) return;

    if (authLoading || isSignInMode || isPasswordResetMode || !user) return;

    // If user is logged in and came from the dashboard completion flow, skip OTP entirely.
    // This fixes cases where email_confirmed_at may be null (custom OTP / legacy users),
    // but the user is already authenticated and should be allowed to finish role setup.
    if (isCompletingRegistration && (step === 1 || step === 2)) {
      setUserId(user.id);
      setEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || '');
      setPhone(user.user_metadata?.phone || '');

      // If a role was preselected via URL (?type=digger), jump straight to the role form.
      if (selectedRoles.size > 0) {
        setCurrentRoleIndex(0);
        const profileRoles = Array.from(selectedRoles).filter(role => role === 'digger');
        setStep(profileRoles.length > 0 ? 4 : 3);
      } else {
        setStep(3);
      }
      return;
    }

    // Verified users (email_confirmed_at set) without roles should skip OTP and go to role selection.
    if (user.email_confirmed_at && (step === 1 || step === 2)) {
      // If coming from gig posting flow and already logged in, ensure gigger role and redirect
      if (isFromGigPosting) {
        const ensureGiggerRoleAndRedirect = async () => {
          // Check if user already has gigger role using RPC function
          let hasGiggerRole = false;
          try {
            const { data: rpcRoles, error: rpcError } = await (supabase.rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
            if (!rpcError && rpcRoles) {
              hasGiggerRole = (rpcRoles as any[]).some((r: any) => r.app_role === 'gigger');
            }
          } catch (rpcException) {
            console.warn('RPC function not available:', rpcException);
          }

          // If no gigger role, create one using RPC function
          if (!hasGiggerRole) {
            try {
              const { error: insertError } = await (supabase.rpc as any)('insert_user_app_role', {
                p_user_id: user.id,
                p_app_role: 'gigger',
              });

              if (insertError) {
                console.error('Error creating gigger role:', insertError);
                // Continue anyway - user can still post gig
              } else {
                const { ensureGiggerProfile } = await import('@/lib/ensureGiggerProfile');
                await ensureGiggerProfile(user.id);
              }
            } catch (rpcException) {
              console.warn('RPC function not available:', rpcException);
              // Continue anyway - user can still post gig
            }
          }

          toast.success("You're ready to post your gig!");
          isNavigatingRef.current = true;
          navigate('/post-gig');
        };

        ensureGiggerRoleAndRedirect();
        return;
      }

      // Check if user has roles (via RPC to bypass RLS)
      const checkUserRoles = async () => {
        let hasRoles = false;
        let error = null;

        try {
          const { data: rpcRoles, error: rpcError } = await (supabase.rpc as any)('get_user_app_roles_safe', { _user_id: user.id });

          if (!rpcError && rpcRoles && (rpcRoles as any[]).length > 0) {
            hasRoles = true;
          } else if (rpcError) {
            console.warn('Error checking user roles (non-fatal):', rpcError);
            error = rpcError;
          }
        } catch (rpcException) {
          console.warn('RPC function not available:', rpcException);
          error = rpcException as any;
        }

        if (!error && !hasRoles) {
          setUserId(user.id);
          setEmail(user.email || '');
          setFullName(user.user_metadata?.full_name || '');
          setPhone(user.user_metadata?.phone || '');
          setStep(3);
          toast.info('Please select your role(s) to complete registration');
        }
      };

      checkUserRoles();
    }
  }, [
    authLoading,
    isSignInMode,
    isPasswordResetMode,
    user,
    step,
    isFromGigPosting,
    isCompletingRegistration,
    selectedRoles,
    navigate,
  ]);

  // Derived values and hooks MUST run before any conditional return (Rules of Hooks)
  const roleArray = Array.from(selectedRoles);
  const profileSetupRoles: UserAppRole[] = roleArray.filter((role): role is UserAppRole => role === 'digger' || role === 'gigger');

  // Fetch digger location when showing Gigger form (one user = one location, lock if Digger has location)
  useEffect(() => {
    const role = profileSetupRoles[currentRoleIndex];
    if (!user?.id || step <= 3 || role !== 'gigger') {
      setExistingDiggerLocation(null);
      return;
    }
    const fetchDiggerLocation = async () => {
      try {
        const { data } = await supabase
          .from('digger_profiles')
          .select('country, state')
          .eq('user_id', user.id)
          .not('country', 'is', null)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (data?.country) {
          setExistingDiggerLocation({ country: data.country, state: data.state ?? null });
        } else {
          setExistingDiggerLocation(null);
        }
      } catch {
        setExistingDiggerLocation(null);
      }
    };
    void fetchDiggerLocation();
  }, [user?.id, step, profileSetupRoles, currentRoleIndex]);

  // Don't show loading spinner in password reset mode - show the form immediately
  if (authLoading && !isPasswordResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Steps: 1=Basic Info, 2=OTP Verification, 3=Role Selection, 4+=Role Forms
  const totalSteps = 3 + profileSetupRoles.length; // Basic Info + OTP + Role Selection + Role Forms
  const progressPercentage = (step / totalSteps) * 100;

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (loading || isSendingOtpRef.current) {
      return;
    }
    
    isSendingOtpRef.current = true;
    setLoading(true);

    try {
      // SECURITY: Validate inputs before proceeding - use different schema for gig posting
      if (isFromGigPosting) {
        gigPostingSchema.parse({
          email,
          phone: phone || "",
        });
      } else {
        basicInfoSchema.parse({
          firstName,
          lastName,
          email,
          password,
          phone: phone || "",
        });
      }

      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;

      // Hybrid passwordless flow for gig posting - send OTP, no account creation
      if (isFromGigPosting) {
        
        // Generate OTP code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Send OTP via unified edge function
        await invokeEdgeFunction(supabase, 'send-otp', {
          body: {
            email,
            phone: formattedPhone,
            code: otpCode,
            name: 'Guest User',
            method: verificationMethod,
          },
        });
        // OTP sent successfully - move to verification step
        setOtpSent(true);
        const methodText = verificationMethod === 'email' ? 'email' : 'phone';
        toast.success(`Verification code sent! Please check your ${methodText}.`);
        setStep(2); // Move to verification step
        setLoading(false);
        isSendingOtpRef.current = false;
        return;
      }

      // SIGNUP VERIFICATION: send OTP for new registrations (no confirmation email)
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      try {
        await invokeEdgeFunction(supabase, 'send-otp', {
          body: {
            email,
            phone: formattedPhone,
            code: otpCode,
            name: fullName || 'User',
            method: verificationMethod,
          },
        });
      } catch (otpErr: any) {
        console.error("OTP send error:", otpErr);
        let errorMessage = "Failed to send verification code. Please try again.";
        const msg = otpErr?.message ?? "";
        if (msg.includes('RESEND_API_KEY') || msg.includes('not configured')) {
          errorMessage = "Email service is not configured. Please contact support.";
        } else if (msg) {
          errorMessage = msg;
        }
        toast.error(errorMessage);
        setLoading(false);
        isSendingOtpRef.current = false;
        return;
      }

      setOtpSent(true);
      toast.success("Verification code sent! Please check your email.");
      setStep(2);
      setLoading(false);
      isSendingOtpRef.current = false;
      return;

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Signup error:", error);
        toast.error(error.message || "An error occurred");
      }
    } finally {
      setLoading(false);
      // Ensure ref is always reset
      setTimeout(() => {
        isSendingOtpRef.current = false;
      }, 100);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate code format
      if (!verificationCode || verificationCode.length !== 6) {
        toast.error("Please enter the 6-digit verification code.");
        setLoading(false);
        return;
      }

      // Format phone number for verification (E.164)
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
      const verifyBody: { email?: string; phone?: string; code: string } = {
        code: String(verificationCode).trim(),
      };
      if (email?.trim()) verifyBody.email = email.trim();
      if (formattedPhone) verifyBody.phone = formattedPhone;

      let verifyData: { success?: boolean } | undefined;
      try {
        verifyData = await invokeEdgeFunction<{ success?: boolean }>(supabase, 'verify-custom-otp', {
          body: verifyBody,
        });
      } catch (verifyError: any) {
        console.error("OTP verification error:", verifyError);
        const msg = verifyError?.message ?? "";
        const errorMessage = msg.includes('expired')
          ? "Verification code has expired. Please request a new code."
          : msg.includes('Invalid')
          ? "Invalid verification code. Please check your code and try again."
          : msg || "Invalid or expired verification code. Please try again.";
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      if (!verifyData?.success) {
        toast.error("Invalid or expired verification code. Please check your code and try again.");
        setLoading(false);
        return;
      }

      // HYBRID PASSWORDLESS: For gig posting flow, store verified email and redirect
      if (isFromGigPosting) {
        // Store verified email/phone in sessionStorage for guest gig posting
        sessionStorage.setItem('verifiedGiggerEmail', email);
        if (formattedPhone) {
          sessionStorage.setItem('verifiedGiggerPhone', formattedPhone);
        }
        
        toast.success("Email verified! Completing your gig posting...");
        isNavigatingRef.current = true;
        navigate('/post-gig');
        return;
      }

      // Handle Digger login OTP verification
      if (isDiggerLogin) {
        // Sign in the user after OTP verification
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          toast.error(signInError.message || "Failed to sign in after verification");
          setLoading(false);
          return;
        }

        setIsDiggerLogin(false);
        toast.success("Verification successful! Welcome back!");
        navigate('/role-dashboard');
        return;
      }

      // Handle Digger registration verification (after role selection)
      if (pendingDiggerVerification) {
        setPendingDiggerVerification(false);
        toast.success("Email verified! Continue with your Digger registration.");
        setStep(4); // Go to role forms
        setCurrentRoleIndex(0);
        setLoading(false);
        return;
      }
      
      // Code is verified for signup: create the auth user without sending a confirmation email
      try {
        let createUserData: { userId?: string } | undefined;
        try {
          createUserData = await invokeEdgeFunction<{ userId?: string }>(supabase, 'create-auth-user', {
            body: {
              email,
              password,
              fullName,
              phone: formattedPhone,
            },
          });
        } catch (createUserErr: any) {
          console.error("Create user error:", createUserErr);
          const msg = createUserErr?.message ?? "";
          const errorMessage = msg.includes('already exists')
            ? "This email is already registered. Please sign in instead."
            : msg || "Failed to create account. Please try again.";
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        if (!createUserData?.userId) {
          toast.error("Failed to create account. Please try again.");
          setLoading(false);
          return;
        }

        // Sign in the newly created user so role setup works
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError || !signInData.session) {
          toast.error(signInError?.message || "Account created, but sign-in failed. Please sign in.");
          setLoading(false);
          setIsSignInMode(true);
          return;
        }

        setUserId(createUserData.userId);

        // Update profiles table with phone number if provided
        if (formattedPhone) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ phone: formattedPhone })
            .eq('id', createUserData.userId);

          if (profileError) {
            console.error("Error updating profile phone:", profileError);
          }
        }

        toast.success("Email verified! Your account is ready.");
        setStep(3);

        // Track the successful signup
        try {
          if (fbConfigured) {
            trackFBEvent('CompleteRegistration', { currency: 'USD', value: 0 });
          }
          if (gaConfigured) {
            trackGAConversion(0, 'USD');
          }
          if (redditConfigured) {
            trackRedditEvent('SignUp');
          }
        } catch (trackError) {
          console.warn("Tracking error (non-critical):", trackError);
        }
      } catch (createError: any) {
        console.error("Create user exception:", createError);
        toast.error(createError.message || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);

    try {
      // Generate new 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Format phone number
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
      
      await invokeEdgeFunction(supabase, 'send-otp', {
        body: {
          email,
          phone: formattedPhone,
          code: otpCode,
          name: fullName,
          method: verificationMethod,
        },
      });

      setVerificationCode("");
      toast.success("Verification code resent! Please check your email.");
    } catch (error: any) {
      console.error("Resend error:", error);
      const msg = error?.message ?? "";
      if (msg.includes('RESEND_API_KEY') || msg.includes('not configured')) {
        toast.error("Email service is not configured. Please contact support.");
      } else {
        toast.error(msg || "Failed to resend verification code");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = async () => {
    if (selectedRoles.size === 0) {
      toast.error("Please select at least one role");
      return;
    }

    // If Digger or Gigger selected, persist roles and redirect to /create-first-profile page
    if (profileSetupRoles.length > 0) {
      setLoading(true);
      try {
        let verifiedUserId = userId;
        let currentUser = null;

        try {
          const { data: authUser, error: authError } = await supabase.auth.getUser();
          if (!authError && authUser?.user) {
            currentUser = authUser;
            verifiedUserId = authUser.user.id;
            if (authUser.user.id !== userId) {
              setUserId(authUser.user.id);
              verifiedUserId = authUser.user.id;
            }
          }
        } catch {
          /* not authenticated yet */
        }

        if (!currentUser) {
          if (!email || !password) {
            toast.error("Session expired. Please sign in again.");
            setLoading(false);
            setStep(1);
            return;
          }
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) {
            toast.error("Unable to authenticate. Please try signing in again.");
            setLoading(false);
            setStep(1);
            return;
          }
          if (!signInData.user) {
            toast.error("Authentication failed. Please try again.");
            setLoading(false);
            return;
          }
          verifiedUserId = signInData.user.id;
          setUserId(verifiedUserId);
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", verifiedUserId)
          .single();
        if (profileError || !profile) {
          toast.error("Account setup incomplete. The profile was not created. Please contact support.");
          setLoading(false);
          setStep(1);
          return;
        }

        let rolesError: any = null;
        try {
          for (const role of roleArray) {
            const { error: rpcError } = await (supabase.rpc as any)("insert_user_app_role", {
              p_user_id: verifiedUserId,
              p_app_role: role,
            });
            if (rpcError) {
              if (rpcError.code === "23503" || rpcError.message?.includes("foreign key constraint")) {
                toast.error("Account setup incomplete. Please complete account creation first.");
                setStep(1);
              } else if (rpcError.code === "42883" || rpcError.message?.includes("does not exist") || rpcError.message?.includes("function")) {
                rolesError = rpcError;
                break;
              } else {
                rolesError = rpcError;
                break;
              }
              setLoading(false);
              return;
            }
          }
        } catch (rpcException) {
          rolesError = rpcException as any;
        }

        if (rolesError && (rolesError.code === "42883" || rolesError.message?.includes("does not exist") || rolesError.message?.includes("function"))) {
          const roleInserts = roleArray.map((role) => ({
            user_id: verifiedUserId,
            app_role: role,
            is_active: true,
          }));
          const { error: directInsertError } = await supabase.from("user_app_roles").insert(roleInserts);
          if (directInsertError) {
            toast.error(directInsertError.code === "23503" ? "Account setup incomplete. Please complete account creation first." : "Roles setup failed. Please contact support.");
            setLoading(false);
            setStep(1);
            return;
          }
        } else if (rolesError) {
          toast.error(rolesError.code === "23503" ? "Account setup incomplete. Please complete account creation first." : "Roles setup failed. Please contact support.");
          setLoading(false);
          return;
        }

        navigate("/create-first-profile", { state: { fromRegistration: true, setupRoles: profileSetupRoles }, replace: true });
      } catch (err) {
        console.error("Role persist and redirect error:", err);
        toast.error("Something went wrong. Please try again.");
        setLoading(false);
      }
      return;
    }

    completeRegistration();
  };

  const handleRoleFormComplete = (role: UserAppRole, data: any) => {
    const mergedRoleFormData = { ...roleFormData, [role]: data };
    setRoleFormData(mergedRoleFormData);

    // Move to next role form or complete registration
    if (currentRoleIndex < roleArray.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
      setStep(step + 1);
    } else {
      // All forms completed, proceed to account creation with latest form data
      completeRegistration(mergedRoleFormData);
    }
  };

  const completeRegistration = async (overrideRoleFormData?: RoleFormData) => {
    const effectiveRoleFormData = overrideRoleFormData ?? roleFormData;
    if (!userId) {
      toast.error("Session expired. Please start over.");
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      // CRITICAL: Verify user exists before inserting roles
      // This prevents foreign key constraint violations
      // Try to get authenticated user first, but fall back to verifying userId exists
      let verifiedUserId = userId;
      let currentUser = null;
      
      // Try to get authenticated user (may not have session during registration)
      try {
        const { data: authUser, error: authError } = await supabase.auth.getUser();
        if (!authError && authUser?.user) {
          currentUser = authUser;
          verifiedUserId = authUser.user.id;
          
          // If userId from state doesn't match authenticated user, use authenticated user
          if (authUser.user.id !== userId) {
            console.warn("UserId mismatch. Using authenticated user ID instead.");
            setUserId(authUser.user.id);
            verifiedUserId = authUser.user.id;
          }
        }
      } catch (authException) {
        // User may not be authenticated yet (e.g., during registration before email verification)
        console.log("User not authenticated (this is OK during registration):", authException);
      }

      // CRITICAL: Ensure user is authenticated before checking profile
      // RLS policy requires authentication to read profiles
      if (!currentUser) {
        // User is not authenticated - sign them in first
        if (!email || !password) {
          console.error("Cannot authenticate: email or password missing");
          toast.error("Session expired. Please sign in again.");
          setLoading(false);
          setStep(1);
          return;
        }

        console.log("User not authenticated, signing in...");
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error("Sign in error:", signInError);
          toast.error("Unable to authenticate. Please try signing in again.");
          setLoading(false);
          setStep(1);
          return;
        }

        if (!signInData.user) {
          console.error("Sign in succeeded but no user returned");
          toast.error("Authentication failed. Please try again.");
          setLoading(false);
          setStep(1);
          return;
        }

        // Update verified user ID from sign-in
        verifiedUserId = signInData.user.id;
        setUserId(verifiedUserId);
        currentUser = { user: signInData.user };
        console.log("User authenticated successfully:", verifiedUserId);
      }

      // Verify user exists by checking profile
      // CRITICAL: digger_profiles.user_id references profiles(id), so profile MUST exist
      // Note: Profile is created automatically by trigger when user is created in auth.users
      // Now that we're authenticated, RLS should allow us to read the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', verifiedUserId)
        .single();

      if (profileError || !profile) {
        console.error("Profile does not exist for user:", verifiedUserId, profileError);
        // Profile is required - cannot create digger_profile without it
        // This should never happen if the trigger is working correctly
        toast.error("Account setup incomplete. The profile was not created. Please contact support.");
        setLoading(false);
        setStep(1); // Go back to account creation
        return;
      }

      console.log("Profile verified successfully:", profile.id);

      // Update userId to verified ID if we got one from auth
      if (verifiedUserId !== userId && currentUser) {
        setUserId(verifiedUserId);
      }

      // Create user_app_roles entries (account verified to exist)
      // Use RPC function first to bypass RLS and prevent 500 errors
      // Fallback to direct INSERT only if RPC function doesn't exist
      let rolesError = null;
      
      // Try RPC function first (preferred method - bypasses RLS)
      try {
        for (const role of roleArray) {
          const { error: rpcError } = await (supabase
            .rpc as any)('insert_user_app_role', {
            p_user_id: verifiedUserId, // Use verified user ID
            p_app_role: role
          });
          
          if (rpcError) {
            console.error(`RPC error inserting role ${role}:`, rpcError);
            
            // Check if it's a foreign key constraint error
            if (rpcError.code === '23503' || rpcError.message?.includes('foreign key constraint')) {
              console.error("User does not exist in auth.users. Account may not be fully created.");
              toast.error("Account setup incomplete. Please complete account creation first.");
              setLoading(false);
              setStep(1); // Go back to account creation
              return;
            }
            
            // Check if RPC function doesn't exist (migrations not applied)
            if (rpcError.code === '42883' || rpcError.message?.includes('does not exist') || rpcError.message?.includes('function')) {
              console.warn("RPC function not available, falling back to direct INSERT");
              // Fall through to direct INSERT fallback
              rolesError = rpcError;
              break;
            }
            
            rolesError = rpcError;
            break;
          }
        }
        
        // If RPC succeeded, skip direct INSERT fallback
        if (!rolesError) {
          console.log("Roles created successfully using RPC function");
        }
      } catch (rpcException) {
        console.warn("RPC function not available, falling back to direct INSERT:", rpcException);
        // Fall through to direct INSERT fallback
        rolesError = rpcException as any;
      }
      
      // Fallback: Try direct INSERT only if RPC function doesn't exist
      if (rolesError && (rolesError.code === '42883' || rolesError.message?.includes('does not exist') || rolesError.message?.includes('function'))) {
        console.warn("Using direct INSERT as fallback (RPC function not available)");
        const roleInserts = roleArray.map(role => ({
          user_id: verifiedUserId,
          app_role: role,
          is_active: true,
        }));
        
        const { error: directInsertError } = await supabase
          .from('user_app_roles')
          .insert(roleInserts);
        
        if (directInsertError) {
          // Check if it's a foreign key constraint error
          if (directInsertError.code === '23503' || directInsertError.message?.includes('foreign key constraint')) {
            console.error("User does not exist in auth.users. Account may not be fully created.");
            toast.error("Account setup incomplete. Please complete account creation first.");
            setLoading(false);
            setStep(1); // Go back to account creation
            return;
          }
          
          // Check if it's a recursion error
          if (directInsertError.code === '42P17' || directInsertError.message?.includes('infinite recursion')) {
            console.error("Infinite recursion error - RPC function must be used. Please apply database migrations.");
            toast.error("Database configuration error. Please contact support.");
            setLoading(false);
            return;
          }
          
          rolesError = directInsertError;
        } else {
          // Direct INSERT succeeded
          rolesError = null;
          console.log("Roles created successfully using direct INSERT (fallback)");
        }
      }

      if (rolesError) {
        console.error("Error creating roles:", rolesError);
        
        // Provide more specific error message
        if (rolesError.code === '23503') {
          toast.error("Account setup incomplete. Please complete account creation first.");
          setStep(1);
        } else {
          toast.error("Roles setup failed. Please contact support.");
        }
        setLoading(false);
        return;
      }

      if (selectedRoles.has('gigger')) {
        const { ensureGiggerProfile } = await import('@/lib/ensureGiggerProfile');
        await ensureGiggerProfile(verifiedUserId);
        // Save Gigger profile data (profile_title, country, state) to profiles
        if (effectiveRoleFormData.gigger) {
          const updates: Record<string, unknown> = {};
          if (effectiveRoleFormData.gigger.profileTitle) updates.profile_title = effectiveRoleFormData.gigger.profileTitle;
          if (effectiveRoleFormData.gigger.country) updates.country = effectiveRoleFormData.gigger.country;
          if (effectiveRoleFormData.gigger.state != null) updates.state = effectiveRoleFormData.gigger.state;
          if (Object.keys(updates).length > 0) {
            await (supabase.from('profiles') as any).update(updates).eq('id', verifiedUserId);
          }
        }
      }

      // Create role-specific profiles
      if (selectedRoles.has('digger') && effectiveRoleFormData.digger) {
        try {
          // CRITICAL: digger_profiles.user_id references profiles(id), not auth.users(id)
          // Profile was already verified above - if we reach here, it exists

          // CRITICAL: Verify user_id matches auth.uid() for RLS policy
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser && authUser.id !== verifiedUserId) {
            console.error("CRITICAL: user_id mismatch!", {
              verifiedUserId,
              authUid: authUser.id,
              message: "user_id must equal auth.uid() for RLS policy to work"
            });
            toast.error("Authentication mismatch. Please refresh and try again.");
            setLoading(false);
            return;
          }
          
          console.log("Creating digger profile with user_id:", verifiedUserId, "auth.uid():", authUser?.id);
          
          // Generate unique handle from real name (e.g. jackson_chen)
          const { data: existingHandles } = await supabase
            .from('digger_profiles')
            .select('handle')
            .not('handle', 'is', null);
          const handle = getHandleForFirstProfile(
            fullName,
            (existingHandles || []).map((r) => r.handle).filter(Boolean) as string[]
          );
          
          // Use Gigger's location if user also selected Gigger (one user = one location)
          const giggerLoc = effectiveRoleFormData.gigger;
          const locCountry = giggerLoc?.country ?? null;
          const locState = giggerLoc?.state ?? null;
          const locParts = [locState, locCountry].filter(Boolean);
          const locationString = locParts.length > 0 ? locParts.join(", ") : "Not specified";

          // Prepare digger profile data with proper defaults and required fields
          const diggerProfileData: any = {
            user_id: verifiedUserId, // References profiles(id) - must match auth.uid() for RLS
            handle, // Auto-generated from real name (e.g. jackson_chen), unique identity
            business_name: effectiveRoleFormData.digger.companyName || 'Not specified',
            profile_name: effectiveRoleFormData.digger.companyName || 'My Profile', // Set profile name for display
            phone: phone || 'Not provided',
            location: locationString,
            country: locCountry,
            state: locState,
            city: null,
            registration_status: effectiveRoleFormData.digger.selectedIndustries && effectiveRoleFormData.digger.selectedIndustries.length > 0 ? 'complete' : 'incomplete',
            subscription_tier: 'free',
            subscription_status: 'inactive',
            allow_gigger_contact: effectiveRoleFormData.digger.allowGiggerContact || false, // Save the opt-in preference
            keywords: effectiveRoleFormData.digger.selectedIndustries || [], // Save selected industries as keywords
            is_primary: true, // Mark as primary profile (first profile created)
          };

          // Add profession if available (nullable field, but good to have)
          // Note: profession was made nullable in later migrations, but it's good practice to set it
          if (effectiveRoleFormData.digger.selectedIndustries && effectiveRoleFormData.digger.selectedIndustries.length > 0) {
            // Extract profession from selectedIndustries - handle "Category: Subcategory" format
            const firstIndustry = effectiveRoleFormData.digger.selectedIndustries[0];
            if (firstIndustry.includes(':')) {
              // If format is "Category: Subcategory", extract just the category part
              diggerProfileData.profession = firstIndustry.split(':')[0].trim();
            } else {
              diggerProfileData.profession = firstIndustry;
            }
          } else {
            // Set a default profession to avoid issues
            diggerProfileData.profession = 'General Services';
          }

          // CRITICAL: Check if user already has a profile FIRST to avoid unique constraint errors
          const { data: existingProfiles, error: checkError } = await supabase
            .from('digger_profiles')
            .select('id, is_primary')
            .eq('user_id', verifiedUserId)
            .limit(1);
          
          if (checkError && checkError.code !== 'PGRST116') {
            // Error checking (unless it's just "no rows" which is fine)
            console.error("Error checking for existing profile:", checkError);
          }

          // If user already has a profile, UPDATE it instead of inserting
          if (existingProfiles && existingProfiles.length > 0) {
            console.log("Profile already exists, updating instead of creating new one");
            const { data: existingDigger } = await supabase.from('digger_profiles').select('handle').eq('user_id', verifiedUserId).single();
            const { data: updatedProfile, error: updateError } = await supabase
              .from('digger_profiles')
              .update({
                business_name: diggerProfileData.business_name,
                profile_name: diggerProfileData.profile_name,
                profession: diggerProfileData.profession,
                keywords: diggerProfileData.keywords,
                allow_gigger_contact: diggerProfileData.allow_gigger_contact,
                registration_status: diggerProfileData.registration_status,
                // Don't update is_primary - preserve existing value
              })
              .eq('user_id', verifiedUserId)
              .select('id, business_name, profession, keywords, profile_name')
              .single();
            
            if (updateError) {
              console.error("Error updating existing digger profile:", updateError);
              toast.error(`Failed to update profile: ${updateError.message}. You can update it later from your dashboard.`, {
                duration: 8000
              });
            } else {
              if (existingDigger?.handle) {
                await (supabase.from('profiles') as any).update({ handle: existingDigger.handle }).eq('id', verifiedUserId);
              }
              console.log("Digger profile updated successfully:", updatedProfile?.id);
              // Treat update as success - continue with registration
            }
          } else {
            // No existing profile - INSERT new one
            // Set is_primary based on whether this is the first profile
            diggerProfileData.is_primary = true; // First profile is always primary

            // Ensure user is authenticated for RLS policy (user_id = auth.uid())
            console.log("Creating new digger profile with data:", diggerProfileData);
            const { data: diggerProfile, error: diggerError } = await supabase
              .from('digger_profiles')
              .insert(diggerProfileData)
              .select('id, business_name, profession, keywords, profile_name')
              .single();

            if (diggerError) {
              console.error("Error creating digger profile:", diggerError);
              
              // Provide specific error messages and handle accordingly
              if (diggerError.code === '23503') {
                // Foreign key violation - profile doesn't exist
                console.error("Profile does not exist for user_id:", verifiedUserId);
                toast.error("Account setup incomplete. Please complete account creation first.");
                setStep(1);
                setLoading(false);
                return;
              } else if (diggerError.code === '23505') {
                // Unique constraint violation - this shouldn't happen since we checked first, but handle it
                console.warn("Unique constraint violation - profile may have been created by another process");
                toast.error("Profile already exists. Please refresh and try again.");
                // Continue with registration - profile exists, just not created in this flow
              } else if (diggerError.message?.includes('permission denied') || diggerError.message?.includes('RLS')) {
                // RLS policy violation - user might not be authenticated
                console.error("RLS policy violation - user may not be authenticated:", diggerError);
                toast.error("Authentication required. Please sign in and try again.");
                setLoading(false);
                setStep(1);
                return;
              } else {
                // Other error - log details and show specific error
                console.error("Digger profile creation error details:", {
                  code: diggerError.code,
                  message: diggerError.message,
                  details: diggerError.details,
                  hint: diggerError.hint,
                  data: diggerProfileData
                });
                
                // Show more specific error message with recovery option
                const errorMsg = diggerError.message || "Unknown error";
                toast.error(`Profile creation failed: ${errorMsg}. You can create it manually from your dashboard.`, {
                  duration: 10000
                });
                
                // Log to console for debugging
                console.error("Failed to create digger profile. User can create it manually from dashboard.");
                // Continue with registration - don't block user, but they'll need to create profile manually
              }
            } else if (diggerProfile && diggerProfile.id) {
              // Successfully created digger profile - sync handle to profiles for /profile/:handle
              await (supabase.from('profiles') as any).update({ handle: diggerProfileData.handle }).eq('id', verifiedUserId);
              console.log("Digger profile created successfully:", diggerProfile.id);
              console.log("Profile data saved:", {
                id: diggerProfile.id,
                business_name: diggerProfile.business_name || diggerProfileData.business_name,
                profession: diggerProfile.profession || diggerProfileData.profession,
                keywords: diggerProfile.keywords || diggerProfileData.keywords,
                profile_name: diggerProfile.profile_name || diggerProfileData.profile_name,
                allow_gigger_contact: diggerProfileData.allow_gigger_contact
              });
              
              // Verify the profile can be queried by user_id (same query MyProfiles uses)
              // This ensures RLS is working and the profile will be visible in My Profiles
              const { data: verifyProfile, error: verifyError } = await supabase
                .from('digger_profiles')
                .select('id, business_name, profession, keywords, profile_name, user_id')
                .eq('user_id', verifiedUserId)
                .order('is_primary', { ascending: false })
                .order('created_at', { ascending: true });
              
              if (verifyError) {
                console.error("ERROR: Profile created but cannot be queried by user_id:", verifyError);
                console.error("This means the profile won't appear in My Profiles!");
                toast.error("Profile created but may not be visible. Please refresh the page.", {
                  duration: 8000
                });
              } else if (!verifyProfile || verifyProfile.length === 0) {
                console.error("ERROR: Profile created but query by user_id returned no results!");
                console.error("Profile ID:", diggerProfile.id, "User ID:", verifiedUserId);
                toast.error("Profile created but not found. Please contact support.", {
                  duration: 10000
                });
              } else {
                console.log("✅ Profile verified and accessible by user_id:", verifyProfile);
                const createdProfile = verifyProfile.find(p => p.id === diggerProfile.id);
                if (createdProfile) {
                  console.log("✅ Created profile found in query results:", createdProfile);
                } else {
                  console.warn("⚠️ Created profile not found in query results, but other profiles exist");
                }
              }
            } else {
              // Profile creation returned no data but no error - this shouldn't happen
              console.error("Profile creation returned no data and no error - unexpected state");
              toast.error("Profile creation may have failed. Please check your dashboard.");
            }
          }
        } catch (diggerException) {
          console.error("Exception creating digger profile:", diggerException);
          // Don't fail registration - user can create profile later
          toast.error("Digger profile creation encountered an error. You can complete it later from your dashboard.");
          // Continue with registration - don't block user
        }
      }

      // Telemarketer role removed - feature discontinued

      // Track campaign conversion for signup and notify admins (non-blocking)
      const campaignData = getCampaignData();
      const conversionType = selectedRoles.has('digger') ? 'digger_registered' : 'gigger_registered';
      
      // Fire tracking events (non-blocking)
      Promise.all([
        // Log to campaign_conversions table
        supabase.functions.invoke('log-campaign-event', {
          body: {
            conversion_type: conversionType,
            email,
            user_id: verifiedUserId,
            ...campaignData,
          },
        }).catch(err => console.warn('Campaign event logging failed (non-critical):', err)),
        
        // Notify admins of new signup
        supabase.functions.invoke('notify-new-signup', {
          body: {
            user_email: email,
            user_name: fullName,
            user_id: verifiedUserId,
            role: selectedRoles.has('digger') ? 'digger' : 'gigger',
            ...campaignData,
          },
        }).catch(err => console.warn('Admin notification failed (non-critical):', err)),
      ]).catch(err => console.warn('Background tasks failed (non-critical):', err));
      
      // Fire Facebook Pixel CompleteRegistration event
      if (fbConfigured) {
        try {
          trackFBEvent('CompleteRegistration', {
            content_name: conversionType,
            value: 1,
            ...campaignData,
          });
        } catch (err) {
          console.warn('Facebook Pixel tracking failed (non-critical):', err);
        }
      }
      
      // Fire Google Ads conversion
      if (gaConfigured) {
        try {
          trackGAConversion(1);
        } catch (err) {
          console.warn('Google Ads tracking failed (non-critical):', err);
        }
      }
      
      // Fire GA4 signup conversion event
      if (typeof window !== 'undefined' && window.gtag) {
        try {
          window.gtag('event', 'sign_up', {
            method: conversionType,
            value: 1,
            currency: 'USD',
          });
        } catch (err) {
          console.warn('GA4 tracking failed (non-critical):', err);
        }
      }
      
      // Fire Reddit Pixel SignUp conversion event
      if (redditConfigured) {
        try {
          trackRedditEvent('SignUp', {
            currency: 'USD',
            value: 1,
          });
        } catch (err) {
          console.warn('Reddit Pixel tracking failed (non-critical):', err);
        }
      }
      
      // Clear UTM data after successful conversion
      try {
        clearUTMData();
      } catch (err) {
        console.warn('UTM data clearing failed (non-critical):', err);
      }

      toast.success("Registration complete! Redirecting to your dashboard...", { duration: 3000 });

      // Send one role-specific welcome email per selected role (Digger and/or Gigger)
      const campaign = getCampaignData();
      const basePayload = {
        userId: verifiedUserId,
        email,
        name: fullName,
        utmSource: campaign?.utm_source,
        utmMedium: campaign?.utm_medium,
        utmCampaign: campaign?.utm_campaign,
      };
      const rolesToEmail = Array.from(selectedRoles).filter((r): r is 'digger' | 'gigger' => r === 'digger' || r === 'gigger');
      const welcomeEmailPromises = rolesToEmail.map((role) =>
        supabase.functions.invoke('send-welcome-email', { body: { ...basePayload, role } })
      );
      const welcomeEmailTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Welcome email timeout')), 15000)
      );
      try {
        await Promise.race([Promise.all(welcomeEmailPromises), welcomeEmailTimeout]);
        console.log('Welcome email(s) sent for role(s):', rolesToEmail.join(', ') || 'none');
      } catch (err: any) {
        if (err?.message !== 'Welcome email timeout') {
          console.error('Welcome email failed (non-critical):', err?.message ?? err);
        }
      }
      
      // Wait for roles to be created and verified, then refresh auth context and navigate
      // Use a longer delay to ensure database operations complete
      setTimeout(async () => {
        try {
          // Verify roles were created by checking database directly
          let rolesVerified = false;
          let retryCount = 0;
          const maxRetries = 8; // Increased retries
          
          while (!rolesVerified && retryCount < maxRetries) {
            try {
              const { data: rpcRoles, error: rpcError } = await (supabase
                .rpc as any)('get_user_app_roles_safe', { _user_id: verifiedUserId });
              
              if (!rpcError && rpcRoles && (rpcRoles as any[]).length > 0) {
                rolesVerified = true;
                console.log('Roles verified, redirecting to dashboard');
                break;
              } else {
                console.log(`Roles not found yet, retrying... (${retryCount + 1}/${maxRetries})`);
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (err) {
              console.warn('Error verifying roles:', err);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          // Always redirect to dashboard, even if roles aren't verified yet
          // The dashboard will handle refreshing roles via the ?registered=true parameter
          console.log('Redirecting to dashboard (roles verified:', rolesVerified, ')');
          
          // If digger profile was created, redirect to My Profiles to show it
          // Check if profile was created by looking for digger role and profile data
          if (selectedRoles.has('digger') && effectiveRoleFormData.digger) {
            // Wait a bit longer to ensure profile is fully committed and RLS policies are ready
            // Also wait for any pending database operations
            setTimeout(() => {
              console.log('Redirecting to My Profiles to show created profile');
              window.location.href = '/my-profiles?registered=true';
            }, 1000);
          } else {
            window.location.href = '/role-dashboard?registered=true';
          }
        } catch (error) {
          console.error('Error during redirect preparation:', error);
          // Fallback: redirect anyway - dashboard will handle role refresh
          if (selectedRoles.has('digger') && effectiveRoleFormData.digger) {
            window.location.href = '/my-profiles?registered=true';
          } else {
            window.location.href = '/role-dashboard?registered=true';
          }
        }
      }, 1500); // Reduced delay slightly - dashboard will handle role refresh
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    console.log("handleSignIn");
    e.preventDefault();
    
    // If OTP was already sent (shouldn't happen in normal flow, but handle it), verify the code instead
    if (signInOtpSent) {
      await handleSignInVerification(e);
      return;
    }

    console.log("Sign in started");
    setLoading(true);

    try {
      console.log("Attempting sign in with email:", email);
      
      // Sign in with password - standard sign-in flow (NO OTP required)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Sign in error:", signInError);
        toast.error(signInError.message || "Failed to sign in. Please check your credentials.");
        setLoading(false);
        return;
      }

      if (!signInData.user) {
        console.error("No user data returned");
        toast.error("No user data returned from sign in");
        setLoading(false);
        return;
      }

      // User authenticated successfully - sign them in immediately
      // No OTP required for regular sign-ins (only for sign-up)
      
      // Check if user has roles to determine where to redirect using RPC function
      let roles: any[] = [];
      let rolesError = null;
      
      try {
        const { data: rpcRoles, error: rpcError } = await (supabase
          .rpc as any)('get_user_app_roles_safe', { _user_id: signInData.user.id });
        
        if (!rpcError && rpcRoles) {
          roles = (rpcRoles as any[]).map((r: any) => ({ app_role: r.app_role }));
        } else {
          rolesError = rpcError || new Error('RPC function not available');
        }
      } catch (rpcException) {
        console.warn('RPC function not available:', rpcException);
        rolesError = rpcException as any;
      }

      if (rolesError) {
        console.error("Error checking roles:", rolesError);
        // On error, default to dashboard (users signing in likely have roles)
        // This prevents redirecting registered users to register page
        toast.success("Welcome back!");
        window.location.href = '/role-dashboard';
        return;
      }

      // Successfully signed in - redirect to dashboard
      toast.success("Welcome back!");
      
      // Use full page refresh to ensure AuthContext picks up updated session and roles
      // Always redirect to dashboard after successful sign-in
      window.location.href = '/role-dashboard';
    } catch (error: any) {
      console.error("Sign in error caught:", error);
      toast.error(error.message || "Failed to sign in. Please check your credentials and try again.");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate code format
      if (!verificationCode || verificationCode.length !== 6) {
        toast.error("Please enter the 6-digit verification code.");
        setLoading(false);
        return;
      }

      const verifyBody: { email?: string; phone?: string; code: string } = {
        code: String(verificationCode).trim(),
      };
      if (email?.trim()) verifyBody.email = email.trim();
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
      if (formattedPhone) verifyBody.phone = formattedPhone;

      let verifyData: { success?: boolean } | undefined;
      try {
        verifyData = await invokeEdgeFunction<{ success?: boolean }>(supabase, 'verify-custom-otp', {
          body: verifyBody,
        });
      } catch (verifyError: any) {
        console.error("OTP verification error:", verifyError);
        const msg = verifyError?.message ?? "";
        const errorMessage = msg.includes('expired')
          ? "Verification code has expired. Please request a new code."
          : msg.includes('Invalid')
          ? "Invalid verification code. Please check your code and try again."
          : msg || "Invalid or expired verification code. Please try again.";
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      if (!verifyData?.success) {
        toast.error("Invalid or expired verification code. Please check your code and try again.");
        setLoading(false);
        return;
      }

      // Code verified! Now sign in again
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast.error(signInError.message || "Failed to complete sign in. Please try again.");
        setLoading(false);
        return;
      }

      if (!signInData.user) {
        toast.error("Failed to complete sign in");
        setLoading(false);
        return;
      }

      // Refresh the session to get updated user data (including email_confirmed_at)
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.warn("Failed to refresh session, but continuing with sign-in:", refreshError);
      }

      // Successfully signed in - wait for roles to be fetched before navigation
      isInSignInOtpFlowRef.current = false; // Clear flag
      
      // Clear sessionStorage
      sessionStorage.removeItem('signInOtpFlow');
      sessionStorage.removeItem('signInUserId');
      sessionStorage.removeItem('signInEmail');
      sessionStorage.removeItem('signInVerificationMethod');
      
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        toast.success("Welcome back!");
        
        // Wait for roles to be fetched and session to update before navigating
        // Use full page refresh to ensure AuthContext picks up updated session and roles
        const checkRolesAndNavigate = async () => {
          try {
            // Wait longer for auth state and roles to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if user has roles using RPC function
            let roles: any[] = [];
            let rolesError = null;
            
            try {
              const { data: rpcRoles, error: rpcError } = await (supabase
                .rpc as any)('get_user_app_roles_safe', { _user_id: signInData.user.id });
              
              if (!rpcError && rpcRoles) {
                roles = (rpcRoles as any[]).map((r: any) => ({ app_role: r.app_role }));
              } else {
                rolesError = rpcError || new Error('RPC function not available');
              }
            } catch (rpcException) {
              console.warn('RPC function not available:', rpcException);
              rolesError = rpcException as any;
            }
            
            if (rolesError) {
              console.error("Error checking roles:", rolesError);
              // On error, default to dashboard (users signing in likely have roles)
              // This prevents redirecting registered users to register page
              window.location.href = '/role-dashboard';
              return;
            }
            
            // Use full page refresh to ensure AuthContext picks up updated session and roles
            // This prevents redirect loops caused by stale auth state
            if (roles && roles.length > 0) {
              // User has roles - registration complete, go to dashboard
              window.location.href = '/role-dashboard';
            } else {
              // User has no roles - registration incomplete, go to role selection
              window.location.href = '/register';
            }
          } catch (error) {
            console.error("Error checking roles:", error);
            // Default to dashboard on error (use full page refresh)
            window.location.href = '/role-dashboard';
          }
        };
        
        checkRolesAndNavigate();
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Invalid verification code");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/register?mode=reset-password`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast.error("Password update timed out. The reset link may have expired. Please request a new one.");
    }, 15000); // 15 second timeout

    try {
      // Ensure we have a valid session from the reset token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        clearTimeout(timeoutId);
        toast.error("Invalid or expired reset link. Please request a new password reset.");
        setLoading(false);
        setTimeout(() => {
          setIsPasswordResetMode(false);
          setIsSignInMode(true);
          navigate('/register?mode=signin');
        }, 2000);
        return;
      }

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      clearTimeout(timeoutId);
      // Password update response received

      if (error) {
        console.error('Password update error:', error);
        throw error;
      }

      toast.success("Password updated successfully!");
      
      // Redirect to sign-in mode
      setTimeout(() => {
        setIsPasswordResetMode(false);
        setIsSignInMode(true);
        setNewPassword("");
        setConfirmNewPassword("");
        navigate('/register?mode=signin');
      }, 1500);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Password update error:", error);
      toast.error(error.message || "Failed to update password. The reset link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: UserAppRole) => {
    const newRoles = new Set(selectedRoles);
    if (newRoles.has(role)) {
      newRoles.delete(role);
    } else {
      newRoles.add(role);
    }
    setSelectedRoles(newRoles);
  };

  const currentRole = profileSetupRoles[currentRoleIndex];

  return (
    <>
      <SEOHead
        title="Register - DigsandGigs"
        description="Create your DigsandGigs account and start connecting with opportunities. Choose to be a Digger or Gigger."
        canonical="/register"
      />
      
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center pb-4">
              {/* Logo */}
              <AuthLogo />
              
              <CardTitle className="text-2xl font-bold">
                {isPasswordResetMode ? "Set New Password" : isSignInMode ? "Welcome back" : step === 1
                  ? selectedRoles.has('gigger')
                    ? "Sign up to hire talent"
                    : selectedRoles.has('digger')
                      ? "Sign up to find work you love"
                      : "Create a new account"
                  : step === 3 ? "Select Your Role" : currentRole === 'digger' ? "Complete Your Profile" : "Complete Your Profile"}
              </CardTitle>
              <CardDescription className="text-base">
                {isPasswordResetMode ? "Enter your new password below" : isSignInMode ? "Sign in to your account" : step === 1
                  ? selectedRoles.has('gigger')
                    ? "Post projects for free, review tailored proposals, and hire the best talent for your team."
                    : selectedRoles.has('digger')
                      ? "Get matched with jobs tailored to your skills, passions, and experience – all for free."
                      : ""
                  : step === 3 ? "What would you like to do on DigsandGigs?" : `Set up your ${currentRole} profile`}
              </CardDescription>
            </CardHeader>


          <CardContent>
            {/* Password Reset Form */}
            {isPasswordResetMode && (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Updating Password..." : "Update Password"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => {
                      setIsPasswordResetMode(false);
                      setIsSignInMode(true);
                      setNewPassword("");
                      setConfirmNewPassword("");
                      navigate('/register?mode=signin');
                    }}
                  >
                    Sign in instead
                  </Button>
                </p>
              </form>
            )}

            {/* Sign In Form */}
            {!isPasswordResetMode && isSignInMode && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Google Sign In Button */}
                {!signInOtpSent && (
                  <div className="space-y-4 mb-2">
                    <GoogleSignInButton className="h-11" label="Sign in with Google" />
                    
                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {!signInOtpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="pr-10"
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Signing In..." : "Sign In"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-4 p-4 border rounded-lg bg-accent/10">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">Verification Code Sent!</h4>
                          <p className="text-sm text-muted-foreground">
                            Check your email for the 6-digit code
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-verification-code">Enter Verification Code *</Label>
                        <Input
                          id="signin-verification-code"
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          required
                          className="text-center text-2xl tracking-widest font-mono"
                          disabled={loading}
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || verificationCode.length !== 6}
                        className="w-full"
                      >
                        {loading ? "Verifying..." : "Verify & Sign In"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          isInSignInOtpFlowRef.current = false; // Clear flag when going back
                          setSignInOtpSent(false);
                          setVerificationCode("");
                          
                          // Clear sessionStorage when going back
                          sessionStorage.removeItem('signInOtpFlow');
                          sessionStorage.removeItem('signInUserId');
                          sessionStorage.removeItem('signInEmail');
                          sessionStorage.removeItem('signInVerificationMethod');
                        }}
                        disabled={loading}
                        className="w-full"
                      >
                        Back
                      </Button>
                    </div>
                  </>
                )}

                <div className="text-center text-sm space-y-2">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-primary hover:underline"
                    disabled={loading}
                  >
                    Forgot your password?
                  </button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => {
                      setIsSignInMode(false);
                      setPassword("");
                      setConfirmPassword("");
                      setFullName("");
                      setPhone("");
                      setVerificationCode("");
                      setUserId(null);
                      setStep(1);
                      setSelectedRoles(new Set());
                      setRoleFormData({});
                      setCurrentRoleIndex(0);
                    }}
                  >
                    Create new account
                  </Button>
                </p>
              </form>
            )}

            {/* Step 1: Basic Information */}
            {!isSignInMode && !isPasswordResetMode && step === 1 && (
              <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
                {/* Show Gig Title when coming from gig posting */}
                {isFromGigPosting && (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Posting:</p>
                    <h3 className="font-semibold text-lg text-foreground">{gigTitle}</h3>
                  </div>
                )}

                {existingAccountError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-destructive">This Account Already Exists</h4>
                        <p className="text-sm text-muted-foreground">
                          The email <strong>{email}</strong> is already registered. Please choose an option below:
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setIsSignInMode(true);
                              setExistingAccountError(false);
                              setPassword("");
                            }}
                            className="flex-1"
                          >
                            Sign In Instead
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigate('/register?reset=true');
                              setExistingAccountError(false);
                            }}
                            className="flex-1"
                          >
                            Reset Password
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setExistingAccountError(false);
                              setEmail("");
                              setPassword("");
                              setConfirmPassword("");
                            }}
                            className="flex-1"
                          >
                            Use Different Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Google Sign Up Button - same flow as traditional: land on Register to complete role selection */}
                {!isFromGigPosting && (
                  <div className="space-y-4 mb-6">
                    <GoogleSignInButton
                      label="Sign up with Google"
                      redirectTo={`${window.location.origin}/register?complete=true`}
                    />
                    
                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Name Fields - First name and Last name */}
                {!isFromGigPosting && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="First name"
                        value={firstName}
                        autoComplete="given-name"
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        maxLength={50}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Last name"
                        value={lastName}
                        autoComplete="family-name"
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        maxLength={50}
                        className="h-11"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">
                    {selectedRoles.has('gigger') ? "Work email address" : "Email"}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={selectedRoles.has('gigger') ? "work@company.com" : "your@email.com"}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (existingAccountError) {
                        setExistingAccountError(false);
                      }
                    }}
                    required
                    autoComplete="username"
                    maxLength={255}
                    className="h-11"
                  />
                </div>

                {/* Phone Number - Optional */}
                {!isFromGigPosting && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      maxLength={15}
                      className="h-11"
                    />
                  </div>
                )}
                
                {/* Phone for gig posting flow */}
                {isFromGigPosting && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number <span className="text-muted-foreground text-xs">(for Diggers to contact you)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      maxLength={15}
                      className="h-11"
                    />
                  </div>
                )}

                {/* Password field */}
                {!isFromGigPosting && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        maxLength={100}
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {/* Password Requirements */}
                    <PasswordRequirements password={password} />
                  </div>
                )}

                {/* Freelancer flow: opt-in for helpful emails */}
                {!isFromGigPosting && selectedRoles.has('digger') && (
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="digger-email-optin"
                      checked={diggerEmailOptIn}
                      onCheckedChange={(checked) => setDiggerEmailOptIn(!!checked)}
                    />
                    <Label htmlFor="digger-email-optin" className="text-sm font-normal leading-relaxed cursor-pointer">
                      Send me helpful emails to find rewarding work and job leads.
                    </Label>
                  </div>
                )}

                {/* Sign Up Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : (selectedRoles.has('gigger') || selectedRoles.has('digger') ? "Create my account" : "Sign up")}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold text-foreground"
                    onClick={() => {
                      setIsSignInMode(true);
                      setFirstName("");
                      setLastName("");
                      setConfirmPassword("");
                      setPhone("");
                      setPassword("");
                      setVerificationCode("");
                      setUserId(null);
                      setStep(1);
                      setSelectedRoles(new Set());
                      setRoleFormData({});
                      setCurrentRoleIndex(0);
                    }}
                  >
                    Log in
                  </Button>
                </p>

                {/* Terms and Privacy */}
                <p className="text-center text-xs text-muted-foreground">
                  By clicking 'Sign up', you acknowledge that you have read and accepted the{" "}
                  <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                </p>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {!isPasswordResetMode && step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Verify Your Email</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a 6-digit verification code to
                  </p>
                  <p className="font-medium">{email}</p>
                </div>

                <form onSubmit={handleVerification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      required
                      className="text-center text-2xl tracking-widest font-mono"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full"
                  >
                    {loading ? "Verifying..." : "Verify Email"}
                  </Button>
                </form>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?
                  </p>
                  <Button
                    variant="link"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="h-auto p-0"
                  >
                    Resend Code
                  </Button>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Basic Info
                </Button>
              </div>
            )}

            {/* Step 3: Role Selection */}
            {!isPasswordResetMode && step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {isFromGigPosting 
                      ? "You're registering as a Gigger to post your gig."
                      : "Select one or more roles. You can always add more later."}
                  </p>

                  {/* Only show Gigger role when coming from gig posting, otherwise show all roles */}
                  {!isFromGigPosting && (
                    <>
                      {/* Digger Role */}
                      <Card
                        className={`cursor-pointer transition-all ${
                          selectedRoles.has('digger')
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => toggleRole('digger')}
                      >
                        <CardContent className="flex items-start space-x-4 p-4">
                          <Checkbox
                            checked={selectedRoles.has('digger')}
                            onCheckedChange={() => toggleRole('digger')}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">Find Work as a Professional (Digger)</h3>
                              <Badge variant="secondary">🔧</Badge>
                            </div>
                            <p className="text-sm text-foreground/85 mt-1">
                              Get matched with gigs, purchase leads, bid on projects, and grow your business.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {/* Gigger Role - Always show */}
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedRoles.has('gigger')
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleRole('gigger')}
                  >
                    <CardContent className="flex items-start space-x-4 p-4">
                      <Checkbox
                        checked={selectedRoles.has('gigger')}
                        onCheckedChange={() => toggleRole('gigger')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Hire Professionals (Gigger)</h3>
                          <Badge variant="secondary">📋</Badge>
                        </div>
                        <p className="text-sm text-foreground/85 mt-1">
                          Post gigs, receive bids from qualified professionals, and hire the best talent.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {!isFromGigPosting && (
                    <>
                      {/* Telemarketer role has been removed */}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleRoleSelection}
                    disabled={selectedRoles.size === 0 || loading || isSendingOtpRef.current}
                    className="flex-1"
                  >
                    {(loading || isSendingOtpRef.current) ? "Sending..." : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4+ profile setup is done on /create-first-profile page */}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  );
};

export default Register;




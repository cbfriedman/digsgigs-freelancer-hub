import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import DiggerRoleForm from "@/components/registration/DiggerRoleForm";
import GiggerRoleForm from "@/components/registration/GiggerRoleForm";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { Footer } from "@/components/Footer";

// SECURITY: Input validation schemas
const basicInfoSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
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
  confirmPassword: z.string(),
  phone: z.string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Use international format (e.g., +1234567890)")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
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

type UserAppRole = 'digger' | 'gigger';

interface RoleFormData {
  digger?: {
    companyName: string;
    selectedIndustries: string[];
    businessInfo?: any;
  };
  gigger?: {
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
  
  // Get gig title from sessionStorage for display
  const pendingGigData = isFromGigPosting ? JSON.parse(sessionStorage.getItem('pendingGigData') || '{}') : {};
  const gigTitle = pendingGigData.title || 'Your Gig';
  
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
  const [fullName, setFullName] = useState("");
  
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

  // Step 2: Role Selection - pre-select based on URL params (e.g., ?type=digger from /apply-digger)
  const [selectedRoles, setSelectedRoles] = useState<Set<UserAppRole>>(() => {
    const params = new URLSearchParams(window.location.search);
    const preselectedType = params.get('type') as UserAppRole | null;
    if (preselectedType === 'digger' || preselectedType === 'gigger') {
      return new Set([preselectedType]);
    }
    return new Set();
  });

  // Step 3+: Role-specific forms data
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({});
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  // UTM and campaign tracking
  const { getCampaignData, clearUTMData } = useUTMTracking();
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  const { trackConversion: trackGAConversion, isConfigured: gaConfigured } = useGoogleAdsConversion();

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

  // Auto-advance verified users without roles to role selection, or redirect to post-gig if coming from gig posting
  useEffect(() => {
    // Don't run redirect logic if we're in the middle of sign-in OTP flow
    if (isInSignInOtpFlowRef.current) {
      return;
    }
    
    if (!authLoading && !isSignInMode && !isPasswordResetMode && user && user.email_confirmed_at && step === 1) {
      // If coming from gig posting flow and already logged in, ensure gigger role and redirect
      if (isFromGigPosting) {
        const ensureGiggerRoleAndRedirect = async () => {
          // Check if user already has gigger role using RPC function
          let hasGiggerRole = false;
          try {
            const { data: rpcRoles, error: rpcError } = await (supabase
              .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
            
            if (!rpcError && rpcRoles) {
              hasGiggerRole = (rpcRoles as any[]).some((r: any) => r.app_role === 'gigger');
            }
          } catch (rpcException) {
            console.warn('RPC function not available:', rpcException);
          }
          
          // If no gigger role, create one using RPC function
          if (!hasGiggerRole) {
            try {
              const { error: insertError } = await (supabase
                .rpc as any)('insert_user_app_role', {
                p_user_id: user.id,
                p_app_role: 'gigger'
              });
              
              if (insertError) {
                console.error('Error creating gigger role:', insertError);
                // Continue anyway - user can still post gig
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
      
      // Check if user has roles
      // Use RPC function to bypass RLS and avoid 500 errors
      const checkUserRoles = async () => {
        let hasRoles = false;
        let error = null;
        
        try {
          const { data: rpcRoles, error: rpcError } = await (supabase
            .rpc as any)('get_user_app_roles_safe', { _user_id: user.id });
          
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
          // User is verified but has no roles - advance to role selection
          setUserId(user.id);
          setEmail(user.email || '');
          setFullName(user.user_metadata?.full_name || '');
          setPhone(user.user_metadata?.phone || '');
          setStep(3); // Jump to role selection
          toast.info("Please select your role(s) to complete registration");
        }
      };
      
      checkUserRoles();
    }
  }, [authLoading, isSignInMode, isPasswordResetMode, user, step, isFromGigPosting, navigate]);


  // Don't show loading spinner in password reset mode - show the form immediately
  if (authLoading && !isPasswordResetMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const roleArray = Array.from(selectedRoles);
  const totalSteps = 2 + roleArray.length; // Basic Info + Role Selection + Role Forms (skip verification)
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
          fullName,
          email,
          password,
          confirmPassword,
          phone: phone || "",
        });
      }

      // Hybrid passwordless flow for gig posting - send OTP, no account creation
      if (isFromGigPosting) {
        const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
        
        // Generate OTP code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Send OTP via unified edge function
        const { data: otpData, error: otpError } = await supabase.functions.invoke('send-otp', {
          body: {
            email,
            phone: formattedPhone,
            code: otpCode,
            name: 'Guest User',
            method: verificationMethod,
          },
        });

      if (otpError) {
        console.error("OTP send error:", otpError);
        console.error("OTP error details:", {
          name: otpError.name,
          message: otpError.message,
          context: otpError.context
        });
        
        let errorMessage = "Failed to send verification code. Please try again.";
        
        // Provide more specific error messages
        if (otpError.message?.includes('RESEND_API_KEY') || otpError.message?.includes('not configured')) {
          errorMessage = "Email service is not configured. Please contact support.";
        } else if (otpError.message?.includes('500') || otpError.message?.includes('non-2xx')) {
          errorMessage = "Server error. Please check that the send-otp function is deployed and RESEND_API_KEY is set.";
        } else if (otpError.message) {
          errorMessage = otpError.message;
        }
        
        toast.error(errorMessage, {
          description: "Check browser console for details",
          duration: 5000
        });
        setLoading(false);
        isSendingOtpRef.current = false;
        return;
      }

        // OTP sent successfully - move to verification step
        setOtpSent(true);
        const methodText = verificationMethod === 'email' ? 'email' : 'phone';
        toast.success(`Verification code sent! Please check your ${methodText}.`);
        setStep(2); // Move to verification step
        setLoading(false);
        isSendingOtpRef.current = false;
        return;
      }

      // PREFERRED WORKFLOW: Create account FIRST (pending verification), then send verification email
      
      // Format phone number (ensure it starts with +)
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
      
      // Step 1: Create account in "pending verification" state
      // Supabase will automatically set email_confirmed_at to NULL for unverified accounts
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone,
          },
          emailRedirectTo: `${window.location.origin}/`,
          // Don't send default Supabase email - we'll send custom OTP email instead
        },
      });

      if (authError) {
        // Server-side validation: Check if email already exists
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          setExistingAccountError(true);
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(authError.message || "Failed to create account. Please try again.");
        }
        setLoading(false);
        isSendingOtpRef.current = false;
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create account. Please try again.");
        setLoading(false);
        isSendingOtpRef.current = false;
        return;
      }

      // Store user ID for later use
      setUserId(authData.user.id);

      // Update profiles table with phone number if needed
      if (formattedPhone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone: formattedPhone })
          .eq('id', authData.user.id);
        
        if (profileError) {
          console.error("Error updating profile phone:", profileError);
          // Don't fail registration if profile update fails
        }
      }

      // Step 2: Generate OTP code and send verification email AFTER account creation
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Send OTP via unified edge function (supports both email and SMS)
      let otpData, otpError;
      try {
        const result = await supabase.functions.invoke('send-otp', {
          body: {
            email,
            phone: formattedPhone,
            code: otpCode,
            name: fullName,
            method: verificationMethod,
          },
        });
        otpData = result.data;
        otpError = result.error;
      } catch (err: any) {
        console.error("Exception calling send-otp:", err);
        otpError = err;
      }

      if (otpError) {
        console.error("=== OTP SEND ERROR ===");
        console.error("Error object:", otpError);
        console.error("Error name:", otpError?.name);
        console.error("Error message:", otpError?.message);
        console.error("Error context:", otpError?.context);
        
        // Try to extract error message from response
        let errorMessage = "Failed to send verification code. Please try again.";
        let errorDetails = "";
        let retryAfter = 300; // Default 5 minutes
        
        // Check if we can get the actual error from the function response
        if (otpError?.context?.body) {
          try {
            const errorBody = typeof otpError.context.body === 'string' 
              ? JSON.parse(otpError.context.body) 
              : otpError.context.body;
            
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
            if (errorBody?.message) {
              errorMessage = errorBody.message;
            }
            if (errorBody?.details) {
              errorDetails = errorBody.details;
            }
            if (errorBody?.retryAfter) {
              retryAfter = errorBody.retryAfter;
            }
          } catch (e) {
            console.error("Could not parse error body:", e);
          }
        }
        
        // Check for 429 status code
        const errorStatus = otpError.status || (otpError as any)?.context?.status || (otpError as any)?.response?.status;
        
        // Fallback to error message if available
        if (otpError?.message && !errorMessage.includes(otpError.message)) {
          errorMessage = otpError.message;
        }
        
        // Handle rate limiting (429) specifically
        if (errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('Too many')) {
          const minutes = Math.ceil(retryAfter / 60);
          errorMessage = `Too many verification requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`;
          toast.error(errorMessage, {
            duration: 10000,
          });
          setLoading(false);
          isSendingOtpRef.current = false;
          return;
        }
        
        // Provide specific error messages for other errors
        if (errorMessage.includes('RESEND_API_KEY') || errorMessage.includes('not configured') || errorMessage.includes('Email service')) {
          errorMessage = "Email service is not configured. The send-otp function needs RESEND_API_KEY to be set in Supabase secrets.";
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error') || errorMessage.includes('non-2xx')) {
          errorMessage = "Server error: The send-otp function returned an error. Please check Supabase function logs for details.";
          errorDetails = "Go to Supabase Dashboard → Edge Functions → send-otp → Logs tab to see the exact error.";
        } else if (errorMessage.includes('Database') || errorMessage.includes('verification_codes')) {
          errorMessage = "Database error: Unable to store verification code. Please check database configuration.";
        }
        
        console.error("Final error message:", errorMessage);
        if (errorDetails) {
          console.error("Error details:", errorDetails);
        }
        
        toast.error(errorMessage, {
          description: errorDetails || "Check browser console and Supabase function logs for details",
          duration: 7000
        });
        setLoading(false);
        isSendingOtpRef.current = false;
        return;
      }

      // OTP sent successfully - move to verification step
      setOtpSent(true);
      toast.success("Verification code sent! Please check your email.");
      setStep(2); // Move to verification step
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

      // Format phone number for verification
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
      
      // Verify OTP code using edge function (checks database)
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-custom-otp', {
        body: {
          email: email,
          code: verificationCode,
        },
      });

      if (verifyError) {
        console.error("OTP verification error:", verifyError);
        const errorMessage = verifyError.message?.includes('expired') 
          ? "Verification code has expired. Please request a new code."
          : verifyError.message?.includes('Invalid') 
          ? "Invalid verification code. Please check your code and try again."
          : verifyError.message || "Invalid or expired verification code. Please try again.";
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      if (!verifyData || !verifyData.success) {
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
      
      // Code is verified! Account was already created in pending state
      // Now we just need to confirm the email address
      
      if (!userId) {
        toast.error("Account not found. Please start registration again.");
        setLoading(false);
        return;
      }

      // Confirm email verification (update email_confirmed_at in auth.users)
      // This is handled automatically by Supabase when we mark the verification code as verified
      // The verify-custom-otp function should handle this, but we can also manually confirm if needed
      
      toast.success("Email verified successfully! Account activated.");
      setStep(3); // Go to role selection
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
      
      // Send OTP via unified edge function
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          email,
          phone: formattedPhone,
          code: otpCode,
          name: fullName,
          method: verificationMethod,
        },
      });

      if (error) {
        console.error("Resend OTP error:", error);
        // Check if it's a configuration error
        if (error.message?.includes('RESEND_API_KEY') || error.message?.includes('not configured')) {
          toast.error("Email service is not configured. Please contact support.");
        } else {
          toast.error(error.message || "Failed to resend verification code");
        }
        setLoading(false);
        return;
      }

      // Clear old verification code input
      setVerificationCode("");
      toast.success("Verification code resent! Please check your email.");
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message || "Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = async () => {
    if (selectedRoles.size === 0) {
      toast.error("Please select at least one role");
      return;
    }

    // Prevent multiple simultaneous calls - check both loading state and ref
    if (loading || isSendingOtpRef.current) {
      console.log("Prevented duplicate OTP request - already in progress");
      return;
    }

    // If Digger is selected, require email verification before proceeding
    if (selectedRoles.has('digger') && !pendingDiggerVerification) {
      // Set ref and loading state IMMEDIATELY to prevent duplicate clicks
      isSendingOtpRef.current = true;
      setLoading(true);
      
      try {
        // Generate and send OTP for Digger verification
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const { data, error: otpError } = await supabase.functions.invoke('send-otp-email', {
          body: {
            email,
            code: otpCode,
            name: fullName,
          },
        });

        if (otpError) {
          console.error("OTP send error:", otpError);
          
          // Handle rate limiting specifically
          const errorMessage = otpError.message || '';
          const errorStatus = otpError.status || (otpError as any)?.context?.status || (otpError as any)?.response?.status;
          
          // Check response body for retry-after info
          let retryAfter = 300; // Default 5 minutes
          try {
            if ((otpError as any)?.context?.body) {
              const errorBody = typeof (otpError as any).context.body === 'string' 
                ? JSON.parse((otpError as any).context.body) 
                : (otpError as any).context.body;
              if (errorBody?.retryAfter) {
                retryAfter = errorBody.retryAfter;
              }
            }
          } catch (e) {
            // Ignore parsing errors
          }
          
          if (errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('Too many')) {
            const minutes = Math.ceil(retryAfter / 60);
            toast.error(`Too many verification requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''} before trying again.`, {
              duration: 10000,
            });
          } else {
            toast.error("Failed to send verification code. Please try again.", {
              duration: 5000,
            });
          }
          return;
        }

        // Success - OTP sent
        setPendingDiggerVerification(true);
        setOtpSent(true);
        toast.success("Verification code sent! Please check your email.", {
          duration: 5000,
        });
        setStep(2); // Go to verification step
      } catch (error: any) {
        console.error("Error sending OTP:", error);
        
        // Handle rate limiting in catch block too
        const errorMessage = error?.message || '';
        const errorStatus = error?.status || (error as any)?.response?.status;
        
        if (errorStatus === 429 || errorMessage.includes('429') || errorMessage.includes('Too many')) {
          toast.error("Too many verification requests. Please wait a few minutes before trying again.", {
            duration: 10000,
          });
        } else {
          toast.error("Failed to send verification code. Please try again.", {
            duration: 5000,
          });
        }
      } finally {
        // Always reset loading state and ref
        setLoading(false);
        // Use setTimeout to ensure ref is reset after state update completes
        setTimeout(() => {
          isSendingOtpRef.current = false;
        }, 100);
      }
      return;
    }

    // Move to first role form (step 4) - no OTP needed for non-digger roles
    setStep(4);
    setCurrentRoleIndex(0);
  };

  const handleRoleFormComplete = (role: UserAppRole, data: any) => {
    // Save role-specific form data
    setRoleFormData(prev => ({
      ...prev,
      [role]: data,
    }));

    // Move to next role form or complete registration
    if (currentRoleIndex < roleArray.length - 1) {
      setCurrentRoleIndex(currentRoleIndex + 1);
      setStep(step + 1);
    } else {
      // All forms completed, proceed to account creation
      completeRegistration();
    }
  };

  const completeRegistration = async () => {
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

      // Create role-specific profiles
      if (selectedRoles.has('digger') && roleFormData.digger) {
        try {
          // CRITICAL: digger_profiles.user_id references profiles(id), not auth.users(id)
          // Profile was already verified above - if we reach here, it exists

          // Prepare digger profile data with proper defaults and required fields
          const diggerProfileData: any = {
            user_id: verifiedUserId, // References profiles(id) - must match auth.uid() for RLS
            business_name: roleFormData.digger.companyName || 'Not specified',
            phone: phone || 'Not provided',
            location: 'Not specified', // Required field (NOT NULL), can't be empty string
            registration_status: roleFormData.digger.selectedIndustries && roleFormData.digger.selectedIndustries.length > 0 ? 'complete' : 'incomplete',
            subscription_tier: 'free',
            subscription_status: 'inactive',
          };

          // Add profession if available (nullable field, but good to have)
          // Note: profession was made nullable in later migrations, but it's good practice to set it
          if (roleFormData.digger.selectedIndustries && roleFormData.digger.selectedIndustries.length > 0) {
            // Use first selected industry as profession
            diggerProfileData.profession = roleFormData.digger.selectedIndustries[0];
          } else {
            // Set a default profession to avoid issues
            diggerProfileData.profession = 'General Services';
          }

          // Ensure user is authenticated for RLS policy (user_id = auth.uid())
          // If not authenticated, we'll get an RLS error which we'll handle
          const { data: diggerProfile, error: diggerError } = await supabase
            .from('digger_profiles')
            .insert(diggerProfileData)
            .select('id')
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
              // Unique constraint violation - profile already exists
              console.warn("Digger profile already exists for this user - this is OK");
              // This is OK - profile was already created, continue with registration
            } else if (diggerError.message?.includes('permission denied') || diggerError.message?.includes('RLS')) {
              // RLS policy violation - user might not be authenticated
              console.error("RLS policy violation - user may not be authenticated:", diggerError);
              toast.error("Authentication required. Please sign in and try again.");
              setLoading(false);
              setStep(1);
              return;
            } else {
              // Other error - log details but don't fail registration
              console.error("Digger profile creation error details:", {
                code: diggerError.code,
                message: diggerError.message,
                details: diggerError.details,
                hint: diggerError.hint
              });
              toast.error("Digger profile creation failed. You can create it later from your dashboard.");
              // Continue with registration - don't block user
            }
          } else if (diggerProfile && diggerProfile.id) {
            // Successfully created digger profile
            console.log("Digger profile created successfully:", diggerProfile.id);
            
            // Note: keywords field doesn't exist in digger_profiles table
            // Selected industries are stored in registration_status and profession
            // User can add more details later in their profile
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
      
      // Clear UTM data after successful conversion
      try {
        clearUTMData();
      } catch (err) {
        console.warn('UTM data clearing failed (non-critical):', err);
      }

      toast.success("Registration complete! Redirecting to your dashboard...", { duration: 3000 });
      
      // Send welcome email in the background (non-blocking)
      // Wrap in try-catch to prevent CORS errors from blocking registration
      const primaryRole = selectedRoles.has('digger') ? 'digger' : 'gigger';
      Promise.resolve().then(async () => {
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              userId: verifiedUserId,
              email,
              name: fullName,
              role: primaryRole,
              utmSource: getCampaignData()?.utm_source,
              utmMedium: getCampaignData()?.utm_medium,
              utmCampaign: getCampaignData()?.utm_campaign,
            },
          });
        } catch (err: any) {
          // Silently handle CORS and other errors - don't block registration
          console.warn('Welcome email failed (non-critical):', err?.message || err);
        }
      });
      
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
          window.location.href = '/role-dashboard?registered=true';
        } catch (error) {
          console.error('Error during redirect preparation:', error);
          // Fallback: redirect anyway - dashboard will handle role refresh
          window.location.href = '/role-dashboard?registered=true';
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

      // Successfully signed in - redirect to appropriate page
      toast.success("Welcome back!");
      
      // Use full page refresh to ensure AuthContext picks up updated session and roles
      if (roles && roles.length > 0) {
        // User has roles - registration complete, go to dashboard
        window.location.href = '/role-dashboard';
      } else {
        // User doesn't have roles yet - complete registration
        // window.location.href = '/register';
      }
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

      // Verify OTP code
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-custom-otp', {
        body: {
          email: email,
          code: verificationCode,
        },
      });

      if (verifyError) {
        console.error("OTP verification error:", verifyError);
        const errorMessage = verifyError.message?.includes('expired') 
          ? "Verification code has expired. Please request a new code."
          : verifyError.message?.includes('Invalid') 
          ? "Invalid verification code. Please check your code and try again."
          : verifyError.message || "Invalid or expired verification code. Please try again.";
        toast.error(errorMessage);
        setLoading(false);
        return;
      }

      if (!verifyData || !verifyData.success) {
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

  const currentRole = roleArray[currentRoleIndex];

  return (
    <>
      <SEOHead
        title="Register - DigsandGigs"
        description="Create your DigsandGigs account and start connecting with opportunities. Choose to be a Digger or Gigger."
        canonical="/register"
      />
      
      <div className="min-h-screen bg-gradient-primary">
        {/* Top Navigation */}
        <div className="w-full bg-card border-b-2 border-primary/20 shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate("/")}
              className="font-medium hover:bg-primary/10 hover:border-primary"
            >
              <Home className="h-5 w-5 mr-2" />
              Home
            </Button>
            
            <h1 
              className="text-2xl font-bold text-primary cursor-pointer hover:text-primary/80 transition-colors"
              onClick={() => navigate("/")}
            >
              Digs and Gigs
            </h1>
            
            <div className="w-28" /> {/* Spacer for balance */}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex items-center justify-center p-4 pt-8">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
              {isPasswordResetMode ? (
                <Badge variant="outline" className="text-base px-3 py-1">
                  Reset Password
                </Badge>
              ) : isSignInMode ? (
                <Badge variant="outline" className="text-base px-3 py-1">
                  Sign In
                </Badge>
              ) : (
                <Badge variant="default" className="text-base px-3 py-1">
                  Register
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl font-bold">
              {isPasswordResetMode ? "Set New Password" : isSignInMode ? "Welcome Back" : (step === 1 && isFromGigPosting) ? "Register your Gig" : step === 1 ? "Create your Account" : step === 2 ? "Verify Your Email" : step === 3 ? "Select Your Roles" : currentRole === 'digger' ? "Create Your Digger Profile" : "Create Your Gigger Profile"}
            </CardTitle>
            <CardDescription>
              {isPasswordResetMode ? "Enter your new password below" : isSignInMode ? "Sign in to your account" : (step === 1 && isFromGigPosting) ? "Create an account to post and manage your gig" : step === 1 ? "Let's start with your basic information" : step === 2 ? "Enter the 6-digit code sent to your email" : step === 3 ? "What would you like to do on DigsandGigs?" : `Set up your ${currentRole} profile`}
            </CardDescription>

            {/* Progress Bar - Only show during registration */}
            {!isSignInMode && !isPasswordResetMode && (
              <div className="mt-4 space-y-2">
                <Progress value={progressPercentage} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  Step {step} of {totalSteps}
                </p>
              </div>
            )}
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
                {!signInOtpSent ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email Address</Label>
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

                {/* Hide full name for gig posting flow - not needed */}
                {!isFromGigPosting && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      autoComplete="name"
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone Number * {isFromGigPosting ? "(for Diggers to contact you)" : ""}
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use international format (e.g., +1234567890). Required for account verification.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-accent/50">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">Email Verification</div>
                      <div className="text-xs text-muted-foreground">
                        We'll send a verification code to your email
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hide password fields for gig posting flow (hybrid passwordless) */}
                {!isFromGigPosting && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                          maxLength={100}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {/* Password Strength Indicator */}
                      {password && <PasswordStrengthIndicator password={password} />}
                      {!password && (
                        <p className="text-xs text-muted-foreground">
                          Must be 8+ characters with uppercase, lowercase, and number
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          autoComplete="new-password"
                          maxLength={100}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Show verification code input after OTP is sent */}
                {otpSent && (
                  <div className="space-y-4 p-4 border rounded-lg bg-accent/10">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium">Verification Code Sent!</h4>
                        <p className="text-sm text-muted-foreground">Check your email for the 6-digit code</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Enter Verification Code *</Label>
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
                      onClick={handleVerification}
                      disabled={loading || verificationCode.length !== 6}
                      className="w-full"
                      type="button"
                    >
                      {loading 
                        ? (isFromGigPosting ? "Verifying..." : "Creating Account...") 
                        : (isFromGigPosting ? "Verify & Post Gig" : "Create Account")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendCode}
                      disabled={loading}
                      className="w-full"
                    >
                      Resend Code
                    </Button>
                  </div>
                )}

                {/* Only show this button if OTP hasn't been sent yet */}
                {!otpSent && (
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading 
                      ? "Sending Code..." 
                      : (isFromGigPosting 
                          ? "Verify Email & Post Gig" 
                          : verificationMethod === 'email' 
                            ? "Verify my Email" 
                            : "Send SMS Code")} 
                  </Button>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => {
                      setIsSignInMode(true);
                      setFullName("");
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
                    Sign in
                  </Button>
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
                            <p className="text-sm text-muted-foreground mt-1">
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
                        <p className="text-sm text-muted-foreground mt-1">
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
                    onClick={() => setStep(2)}
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

            {/* Step 4+: Role-specific Forms */}
            {!isPasswordResetMode && step > 3 && currentRole && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                  <Badge>
                    {currentRoleIndex + 1} of {roleArray.length}
                  </Badge>
                  <span className="text-sm font-medium">
                    Setting up your {currentRole} profile
                  </span>
                </div>

                {/* Skip to dropdown when multiple roles selected */}
                {roleArray.length > 1 && (
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                    <Label className="text-sm font-medium whitespace-nowrap">Skip to:</Label>
                    <Select
                      value={currentRole}
                      onValueChange={(value) => {
                        const roleIndex = roleArray.indexOf(value as UserAppRole);
                        if (roleIndex !== -1) {
                          setCurrentRoleIndex(roleIndex);
                          setStep(4 + roleIndex);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleArray.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role === 'digger' ? '🔧 Digger Profile' : '📋 Gigger Profile'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentRole === 'digger' && (
                  <DiggerRoleForm
                    onComplete={(data) => handleRoleFormComplete('digger', data)}
                    onBack={() => {
                      if (currentRoleIndex === 0) {
                        setStep(3); // Back to role selection
                      } else {
                        setCurrentRoleIndex(currentRoleIndex - 1);
                        setStep(step - 1);
                      }
                    }}
                  />
                )}

                {currentRole === 'gigger' && (
                  <GiggerRoleForm
                    onComplete={(data) => handleRoleFormComplete('gigger', data)}
                    onBack={() => {
                      if (currentRoleIndex === 0) {
                        setStep(3); // Back to role selection
                      } else {
                        setCurrentRoleIndex(currentRoleIndex - 1);
                        setStep(step - 1);
                      }
                    }}
                  />
                )}

                {/* Telemarketer role removed */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
    </>
  );
};

export default Register;




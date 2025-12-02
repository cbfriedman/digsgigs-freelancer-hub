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
import { Eye, EyeOff, Home, ArrowRight, ArrowLeft, CheckCircle2, Mail, Smartphone, AlertCircle } from "lucide-react";
import { z } from "zod";
import SEOHead from "@/components/SEOHead";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DiggerRoleForm from "@/components/registration/DiggerRoleForm";
import GiggerRoleForm from "@/components/registration/GiggerRoleForm";
import TelemarketerRoleForm from "@/components/registration/TelemarketerRoleForm";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Use international format (e.g., +1234567890)")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .optional()
    .or(z.literal("")),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type UserAppRole = 'digger' | 'gigger' | 'telemarketer';

interface RoleFormData {
  digger?: {
    companyName: string;
    selectedIndustries: string[];
    businessInfo?: any;
  };
  gigger?: {
    preferences?: any;
  };
  telemarketer?: {
    businessInfo: any;
    compensationPreference: 'percentage' | 'flat_fee';
  };
}

const Register = () => {
  const navigate = useNavigate();
  const isNavigatingRef = useRef(false); // Prevent race conditions with useProtectedRoute
  const { user, loading: authLoading } = useProtectedRoute({ 
    redirectIfAuthenticated: true,
    requireVerified: false // Allow unverified users to complete registration
  });
  
  const [isSignInMode, setIsSignInMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'signin';
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'sms'>('email');

  // Step 1.5: Verification
  const [verificationCode, setVerificationCode] = useState(""); // User-entered code
  const [sentOtpCode, setSentOtpCode] = useState(""); // OTP code we sent
  const [userId, setUserId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false); // Track if OTP was sent to show input field

  // Step 2: Role Selection
  const [selectedRoles, setSelectedRoles] = useState<Set<UserAppRole>>(new Set());

  // Step 3+: Role-specific forms data
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({});
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

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

  // Reset registration state when switching to sign-in mode
  useEffect(() => {
    if (isSignInMode) {
      setStep(1);
      setFullName("");
      setConfirmPassword("");
      setPhone("");
      setVerificationMethod('email');
      setVerificationCode("");
      setUserId(null);
      setSelectedRoles(new Set());
      setRoleFormData({});
      setCurrentRoleIndex(0);
    }
  }, [isSignInMode]);

  // Auto-advance verified users without roles to role selection
  useEffect(() => {
    if (!authLoading && !isSignInMode && !isPasswordResetMode && user && user.email_confirmed_at && step === 1) {
      // Check if user has roles
      const checkUserRoles = async () => {
        const { data, error } = await supabase
          .from('user_app_roles')
          .select('id')
          .eq('user_id', user.id);
        
        if (!error && (!data || data.length === 0)) {
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
  }, [authLoading, isSignInMode, isPasswordResetMode, user, step]);


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
    setLoading(true);

    try {
      // SECURITY: Validate inputs before proceeding
      basicInfoSchema.parse({
        fullName,
        email,
        password,
        confirmPassword,
        phone: phone || "",
      });

      // With auto-confirm enabled, create account directly without OTP
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return;
      }

      // Store user ID for role creation
      setUserId(authData.user.id);

      toast.success("Account created successfully!");
      setStep(3); // Skip verification, go directly to role selection
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Signup error:", error);
        toast.error(error.message || "An error occurred");
      }
    } finally {
      setLoading(false);
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

      // Verify OTP code using edge function (checks database)
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-custom-otp', {
        body: {
          email,
          code: verificationCode,
        },
      });

      if (verifyError) {
        console.error("OTP verification error:", verifyError);
        toast.error(verifyError.message || "Invalid or expired verification code. Please try again.");
        setLoading(false);
        return;
      }

      if (!verifyData || !verifyData.success) {
        toast.error("Invalid or expired verification code. Please try again.");
        setLoading(false);
        return;
      }
      
      // Code is verified! Now create the Supabase account
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return;
      }

      // Store user ID for role creation
      setUserId(authData.user.id);

      toast.success("Email verified and account created successfully!");
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
      
      // Send OTP via Resend edge function (now stores code in database)
      const { data, error } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email,
          code: otpCode,
          name: fullName,
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

  const handleRoleSelection = () => {
    if (selectedRoles.size === 0) {
      toast.error("Please select at least one role");
      return;
    }

    // Move to first role form (step 4)
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
      // Create user_app_roles entries (account already created)
      const roleInserts = roleArray.map(role => ({
        user_id: userId,
        app_role: role,
        is_active: true,
      }));

      const { error: rolesError } = await supabase
        .from('user_app_roles')
        .insert(roleInserts);

      if (rolesError) {
        console.error("Error creating roles:", rolesError);
        toast.error("Roles setup failed. Please contact support.");
        setLoading(false);
        return;
      }

      // Create role-specific profiles
      if (selectedRoles.has('digger') && roleFormData.digger) {
        const { error: diggerError } = await supabase
          .from('digger_profiles')
          .insert({
            user_id: userId,
            business_name: roleFormData.digger.companyName,
            phone: phone || '',
            location: '',
            keywords: roleFormData.digger.selectedIndustries,
            registration_status: roleFormData.digger.selectedIndustries.length > 0 ? 'complete' : 'incomplete',
          });

        if (diggerError) {
          console.error("Error creating digger profile:", diggerError);
        }
      }

      if (selectedRoles.has('telemarketer') && roleFormData.telemarketer) {
        const isPercentage = roleFormData.telemarketer.compensationPreference === 'percentage';
        const { error: telemarketerError } = await supabase
          .from('telemarketer_profiles')
          .insert({
            user_id: userId,
            email: email,
            phone: phone || '',
            business_name: roleFormData.telemarketer.businessInfo?.companyName || fullName,
            compensation_type: isPercentage ? 'percentage' : 'flat_fee',
            commission_percentage: isPercentage ? 35 : null,
            flat_fee_amount: !isPercentage ? 25 : null,
          });

        if (telemarketerError) {
          console.error("Error creating telemarketer profile:", telemarketerError);
        }
      }

      toast.success("Registration complete! Redirecting to your dashboard...", { duration: 3000 });
      
      // Redirect to role dashboard
      setTimeout(() => {
        navigate('/role-dashboard');
      }, 1500);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sign in started");
    setLoading(true);

    try {
      console.log("Attempting sign in with email:", email);
      
      // Sign in with password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Sign in response received");

      if (signInError) {
        console.error("Sign in error:", signInError);
        toast.error(signInError.message || "Failed to sign in. Please check your credentials.");
        return;
      }

      if (!signInData.user) {
        console.error("No user data returned");
        toast.error("No user data returned from sign in");
        return;
      }

      console.log("User authenticated:", signInData.user.email);

      // Check if email is verified
      if (!signInData.user.email_confirmed_at) {
        console.log("Email not verified, sending OTP");
        await supabase.auth.signOut();
        toast.error("Please verify your email first. We'll send you a new code.");
        
        // Send OTP for verification
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false
          }
        });

        if (otpError) {
          toast.error(otpError.message);
          return;
        }

        toast.success("Verification code sent! Please check your email.");
        setStep(2);
        return;
      }

      // Email is verified - navigate directly to dashboard
      console.log("Email verified, navigating to dashboard");
      
      // Prevent race condition with useProtectedRoute
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        toast.success("Welcome back!");
        navigate('/role-dashboard');
      }
    } catch (error: any) {
      console.error("Sign in error caught:", error);
      toast.error(error.message || "Failed to sign in. Please check your credentials and try again.");
    } finally {
      // ALWAYS reset loading state
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
      console.log('Attempting to update password...');
      
      // Ensure we have a valid session from the reset token
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session ? 'Valid' : 'None');
      
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
      console.log('Update password response:', { data, error });

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
        description="Create your DigsandGigs account and start connecting with opportunities. Choose to be a Digger, Gigger, or Telemarketer."
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
              {isPasswordResetMode ? "Set New Password" : isSignInMode ? "Welcome Back" : step === 1 ? "Create Your Account" : step === 2 ? "Verify Your Email" : step === 3 ? "Select Your Roles" : currentRole === 'digger' ? "Create Your Dig" : currentRole === 'gigger' ? "Create Your Gig" : "Telemarketer Registration"}
            </CardTitle>
            <CardDescription>
              {isPasswordResetMode ? "Enter your new password below" : isSignInMode ? "Sign in to your account" : step === 1 ? "Let's start with your basic information" : step === 2 ? "Enter the 6-digit code sent to your email" : step === 3 ? "What would you like to do on DigsandGigs?" : `Set up your ${currentRole} profile`}
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
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email Address</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
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
                      className="pr-10"
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
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => {
                      setIsSignInMode(false);
                      setPassword("");
                      setConfirmPassword("");
                      setFullName("");
                      setPhone("");
                      setVerificationMethod('email');
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

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>

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
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required={false}
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use international format (e.g., +1234567890)
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-accent/50">
                    <Mail className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium">Instant Account Creation</div>
                      <div className="text-xs text-muted-foreground">
                        Your account will be created immediately
                      </div>
                    </div>
                  </div>
                </div>

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
                  <p className="text-xs text-muted-foreground">
                    Must be 8+ characters with uppercase, lowercase, and number
                  </p>
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
                      {loading ? "Creating Account..." : "Create Account"}
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
                    {loading ? "Sending Code..." : "Verify my Email"} 
                    <ArrowRight className="ml-2 h-4 w-4" />
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
                      setVerificationMethod('email');
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
                    Select one or more roles. You can always add more later.
                  </p>

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

                  {/* Gigger Role */}
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

                  {/* Telemarketer Role */}
                  <Card
                    className={`cursor-pointer transition-all ${
                      selectedRoles.has('telemarketer')
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleRole('telemarketer')}
                  >
                    <CardContent className="flex items-start space-x-4 p-4">
                      <Checkbox
                        checked={selectedRoles.has('telemarketer')}
                        onCheckedChange={() => toggleRole('telemarketer')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Upload Leads & Earn Commissions (Telemarketer)</h3>
                          <Badge variant="secondary">📞</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload verified leads and earn commission when they're awarded to professionals.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
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
                    disabled={selectedRoles.size === 0}
                    className="flex-1"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
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
                            {role === 'digger' ? '🔧 Digger Profile' : 
                             role === 'gigger' ? '📋 Gigger Profile' : 
                             '📞 Telemarketer Profile'}
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

                {currentRole === 'telemarketer' && (
                  <TelemarketerRoleForm
                    onComplete={(data) => handleRoleFormComplete('telemarketer', data)}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Register;

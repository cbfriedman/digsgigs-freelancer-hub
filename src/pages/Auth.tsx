import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Home } from "lucide-react";
import { z } from "zod";

// SECURITY: Input validation schemas
const authSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters"),
});

const signUpSchema = authSchema.extend({
  fullName: z.string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
});

const phoneSchema = z.object({
  phone: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Use international format (e.g., +1234567890)")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const redirectTo = searchParams.get("redirect") || "/";
  const defaultUserType = searchParams.get("type") as "digger" | "consumer" || "consumer";
  const [userType, setUserType] = useState<"digger" | "consumer">(defaultUserType);
  
  const pageTitle = defaultUserType === "digger" ? "Digger Portal" : 
                    redirectTo === "/post-gig" ? "Post a Gig" : 
                    "DiggsAndGiggs";

  useEffect(() => {
    // If already authenticated (and not in recovery), redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      const isRecovery = typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
      if (session && !isRecovery) {
        navigate(redirectTo);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Show new password form instead of redirecting
        setShowNewPasswordForm(true);
        return;
      }
      if (session) {
        navigate(redirectTo);
      }
    });

    // Also detect recovery via URL hash (fallback)
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setShowNewPasswordForm(true);
    }

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // SECURITY: Validate inputs before submission
      const validated = signUpSchema.parse({
        email: email,
        password: password,
        fullName: fullName,
      });

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validated.fullName,
            user_type: userType,
          },
        },
      });

      if (error) {
        // User-friendly error messages
        if (error.message.includes('already registered')) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success("Account created! Redirecting...");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Show validation errors
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "An error occurred during sign up");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // SECURITY: Validate inputs before submission
      const validated = authSchema.parse({
        email: email,
        password: password,
      });

      // SECURITY: Check rate limit before attempting login
      const { data: isRateLimited, error: rateLimitError } = await supabase.rpc(
        'check_rate_limit',
        {
          p_identifier: validated.email,
          p_attempt_type: 'email',
          p_max_attempts: 5,
          p_window_minutes: 15
        }
      );

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
      }

      if (isRateLimited) {
        toast.error("Too many login attempts. Please try again in 15 minutes.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      // Log the login attempt
      const attemptSuccess = !error;
      await supabase.from('login_attempts').insert({
        identifier: validated.email,
        attempt_type: 'email',
        success: attemptSuccess
      });

      if (error) {
        // User-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          toast.error("Invalid email or password. Please try again.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      
      toast.success("Signed in successfully!");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Show validation errors
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "An error occurred during sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // SECURITY: Validate phone number
      const validated = phoneSchema.parse({ phone });

      const { error } = await supabase.auth.signInWithOtp({
        phone: validated.phone,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setOtpSent(true);
      setResendCountdown(30);
      toast.success("Verification code sent to your phone!");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "An error occurred during phone sign in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const otpValidation = z.string().trim().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must contain only digits");
      const validatedOtp = otpValidation.parse(otp);

      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: validatedOtp,
        type: 'sms',
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Phone verified successfully!");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "An error occurred during verification");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 6);
    setOtp(sanitized);
    
    // Auto-submit when 6 digits are entered
    if (sanitized.length === 6) {
      setTimeout(() => {
        handleVerifyOtp();
      }, 100);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const validated = phoneSchema.parse({ phone });

      const { error } = await supabase.auth.signInWithOtp({
        phone: validated.phone,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setResendCountdown(30);
      toast.success("New verification code sent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // SECURITY: Validate phone number and full name
      const validatedPhone = phoneSchema.parse({ phone });
      const validatedName = z.string().trim().min(2).max(100).parse(fullName);

      const { error } = await supabase.auth.signInWithOtp({
        phone: validatedPhone.phone,
        options: {
          data: {
            full_name: validatedName,
            user_type: userType,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setOtpSent(true);
      setResendCountdown(30);
      toast.success("Verification code sent! Enter it to complete signup.");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "An error occurred during phone sign up");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // SECURITY: Validate email format
      const emailValidation = z.string().trim().email("Invalid email format").max(255);
      const validatedEmail = emailValidation.parse(resetEmail);

      const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;
      toast.success("Password reset email sent! Check your inbox.");
      setShowResetForm(false);
      setResetEmail("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "An error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const schema = z.object({
        newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
        confirmNewPassword: z.string(),
      }).refine((data) => data.newPassword === data.confirmNewPassword, {
        message: "Passwords do not match",
        path: ["confirmNewPassword"],
      });

      schema.parse({ newPassword, confirmNewPassword });

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password updated! Please sign in with your new password.");
      // Clear fields and hide form
      setShowNewPasswordForm(false);
      setNewPassword("");
      setConfirmNewPassword("");
      // Remove recovery hash to avoid re-trigger
      if (typeof window !== 'undefined') {
        window.location.hash = '';
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to update password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin_oidc') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: userType === 'digger' ? {
            user_type: 'digger'
          } : undefined,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={() => navigate("/")}
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <CardTitle className="text-3xl font-bold cursor-pointer" onClick={() => navigate("/")}>
            {pageTitle}
          </CardTitle>
          <CardDescription>
            {defaultUserType === "digger" 
              ? "Build your professional profile and get discovered by clients"
              : redirectTo === "/post-gig"
              ? "Sign in or create an account to post your gig"
              : "Welcome back! Sign in to your account or create a new one."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              {showNewPasswordForm ? (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setShowNewPasswordForm(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : showResetForm ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setShowResetForm(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">For both Diggers and Consumers</span>
                      <br />
                      Service providers and clients use the same login
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin('google')}
                      disabled={loading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin('github')}
                      disabled={loading}
                    >
                      <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      Continue with GitHub
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSocialLogin('linkedin_oidc')}
                      disabled={loading}
                    >
                      <svg className="mr-2 h-4 w-4" fill="#0A66C2" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      Continue with LinkedIn
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="email">Email</TabsTrigger>
                      <TabsTrigger value="phone">Phone</TabsTrigger>
                    </TabsList>

                    <TabsContent value="email">
                      <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="you@example.com"
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
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Signing in..." : "Sign In"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="link" 
                          className="w-full text-sm" 
                          onClick={() => setShowResetForm(true)}
                        >
                          Forgot password?
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="phone">
                      {!otpSent ? (
                        <form onSubmit={handlePhoneSignIn} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="signin-phone">Phone Number</Label>
                            <Input
                              id="signin-phone"
                              type="tel"
                              placeholder="+1234567890"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              required
                            />
                            <p className="text-xs text-muted-foreground">
                              Include country code (e.g., +1 for US)
                            </p>
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Sending code..." : "Send verification code"}
                          </Button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="otp-code">Verification Code</Label>
                            <Input
                              id="otp-code"
                              type="text"
                              placeholder="123456"
                              value={otp}
                              onChange={(e) => handleOtpChange(e.target.value)}
                              required
                              maxLength={6}
                              className="text-center text-lg tracking-widest"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the 6-digit code sent to {phone}
                            </p>
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Verifying..." : "Verify Code"}
                          </Button>
                          <div className="flex items-center justify-between text-sm">
                            <Button
                              type="button"
                              variant="link"
                              className="p-0 h-auto"
                              onClick={handleResendOtp}
                              disabled={loading || resendCountdown > 0}
                            >
                              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => {
                                setOtpSent(false);
                                setOtp("");
                              }}
                            >
                              Change number
                            </Button>
                          </div>
                        </form>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <RadioGroup value={userType} onValueChange={(value: "digger" | "consumer") => setUserType(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="consumer" id="consumer-social" />
                      <Label htmlFor="consumer-social" className="cursor-pointer">Consumer (Looking for services)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="digger" id="digger-social" />
                      <Label htmlFor="digger-social" className="cursor-pointer">Digger (Service provider)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSocialLogin('google')}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign up with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSocialLogin('github')}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Sign up with GitHub
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSocialLogin('linkedin_oidc')}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" fill="#0A66C2" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    Sign up with LinkedIn
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="phone">Phone</TabsTrigger>
                  </TabsList>

                  <TabsContent value="email">
                    <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creating account..." : "Sign Up"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="phone">
                    {!otpSent ? (
                      <form onSubmit={handlePhoneSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name-phone">Full Name</Label>
                          <Input
                            id="signup-name-phone"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-phone">Phone Number</Label>
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="+1234567890"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Include country code (e.g., +1 for US)
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Sending code..." : "Sign Up with Phone"}
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="otp-code-signup">Verification Code</Label>
                          <Input
                            id="otp-code-signup"
                            type="text"
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => handleOtpChange(e.target.value)}
                            required
                            maxLength={6}
                            className="text-center text-lg tracking-widest"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter the 6-digit code sent to {phone}
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Verifying..." : "Complete Sign Up"}
                        </Button>
                        <div className="flex items-center justify-between text-sm">
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={handleResendOtp}
                            disabled={loading || resendCountdown > 0}
                          >
                            {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
                          </Button>
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => {
                              setOtpSent(false);
                              setOtp("");
                            }}
                          >
                            Change number
                          </Button>
                        </div>
                      </form>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

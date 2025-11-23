import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
  
  const redirectTo = searchParams.get("redirect") || "/role-dashboard";
  const defaultUserType = searchParams.get("type") as "digger" | "consumer" | "telemarketer" || "consumer";
  const [userType, setUserType] = useState<"digger" | "consumer" | "telemarketer">(defaultUserType);
  const [selectedRoles, setSelectedRoles] = useState<("digger" | "consumer" | "telemarketer")[]>([defaultUserType]);
  const recoveryModeRef = useRef(false);
  
  const pageTitle = defaultUserType === "digger" ? "Digger Portal" : 
                    redirectTo === "/post-gig" ? "Post a Gig" : 
                    "Digs and Gigs";

  useEffect(() => {
    // Initialize recovery mode from URL and handle expired links
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery');
      if (isRecovery) {
        recoveryModeRef.current = true;
        setShowNewPasswordForm(true);
      }
      if (hash.includes('error=') || search.includes('error=')) {
        const errorDescription = new URLSearchParams(hash.substring(1)).get('error_description') || 
                                new URLSearchParams(search).get('error_description') || '';
        const errorCode = new URLSearchParams(hash.substring(1)).get('error') || 
                         new URLSearchParams(search).get('error') || '';
        
        // Handle password reset specific errors
        if (hash.includes('type=recovery') || errorDescription.toLowerCase().includes('expired')) {
          setShowResetForm(true);
          toast.error('Reset link expired. Please request a new one.');
        }
        // Handle OAuth errors (Google, etc.) - check for common OAuth error codes
        else if (
          errorCode === 'access_denied' || 
          errorCode === 'server_error' ||
          errorCode === 'temporarily_unavailable' ||
          errorCode === 'invalid_request' ||
          errorCode === 'unauthorized_client' ||
          errorDescription.toLowerCase().includes('oauth') ||
          errorDescription.toLowerCase().includes('google')
        ) {
          toast.error('Authentication with Google failed. Please check your Google OAuth configuration or try email signup.');
        }
        // Generic fallback
        else {
          toast.error('Authentication error. Please try again or contact support.');
        }
      }
    }

    // If already authenticated (and not in recovery), redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !recoveryModeRef.current) {
        navigate(redirectTo);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        recoveryModeRef.current = true;
        setShowNewPasswordForm(true);
        return;
      }

      // Fallback: also check URL for recovery param
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        const search = window.location.search || '';
        if (hash.includes('type=recovery') || search.includes('type=recovery')) {
          recoveryModeRef.current = true;
          setShowNewPasswordForm(true);
          return;
        }
      }

      if (session && !recoveryModeRef.current) {
        navigate(redirectTo);
      }
    });

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

      toast.success("Password updated! You're all set.");
      // Exit recovery mode and clean URL, then redirect
      recoveryModeRef.current = false;
      setShowNewPasswordForm(false);
      setNewPassword("");
      setConfirmNewPassword("");
      if (typeof window !== 'undefined') {
        const { pathname } = window.location;
        window.history.replaceState({}, document.title, pathname);
      }
      navigate(redirectTo);
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

  const handleMagicLink = async () => {
    setLoading(true);
    try {
      const emailValidation = z.string().trim().email("Invalid email format").max(255);
      const validatedEmail = emailValidation.parse(email);
      const { error } = await supabase.auth.signInWithOtp({
        email: validatedEmail,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success("Magic sign-in link sent! Check your inbox.");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to send magic link");
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin_oidc') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            selected_roles: selectedRoles.join(','),
          },
          skipBrowserRedirect: true, // Prevent automatic redirect
        },
      });
      
      if (error) throw error;
      
      // Open OAuth URL in a popup window
      if (data?.url) {
        const width = 500;
        const height = 600;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
          data.url,
          'oauth-popup',
          `width=${width},height=${height},left=${left},top=${top},popup=yes`
        );
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
      {/* Fixed Home Button - Always Visible */}
      <Link to="/" className="fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="shadow-lg"
          type="button"
        >
          <Home className="w-4 h-4 mr-2" />
          Home
        </Button>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="block">
            <CardTitle className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity">
              {pageTitle}
            </CardTitle>
          </Link>
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
            {(() => {
              if (typeof window === 'undefined') return null;
              
              const hash = window.location.hash;
              const search = window.location.search;
              
              if (!hash.includes('error=') && !search.includes('error=')) return null;
              
              const errorDescription = new URLSearchParams(hash.substring(1)).get('error_description') || 
                                      new URLSearchParams(search).get('error_description') || '';
              const errorCode = new URLSearchParams(hash.substring(1)).get('error') || 
                               new URLSearchParams(search).get('error') || '';
              
              // Password reset error
              if (hash.includes('type=recovery') || errorDescription.toLowerCase().includes('expired')) {
                return (
                  <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm font-semibold text-destructive mb-1">Reset Link Expired</p>
                    <p className="text-xs text-muted-foreground">
                      Your password reset link has expired. Click "Forgot password?" below to request a new one.
                    </p>
                  </div>
                );
              }
              
              // OAuth error (Google, etc.) - check for common OAuth error codes
              if (
                errorCode === 'access_denied' || 
                errorCode === 'server_error' ||
                errorCode === 'temporarily_unavailable' ||
                errorCode === 'invalid_request' ||
                errorCode === 'unauthorized_client' ||
                errorDescription.toLowerCase().includes('oauth') ||
                errorDescription.toLowerCase().includes('google')
              ) {
                return (
                  <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm font-semibold text-destructive mb-1">Google Authentication Failed</p>
                    <p className="text-xs text-muted-foreground">
                      Unable to sign in with Google. Please check your Google OAuth configuration in the backend or try email signup below.
                    </p>
                  </div>
                );
              }
              
              // Generic error
              return (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm font-semibold text-destructive mb-1">Authentication Error</p>
                  <p className="text-xs text-muted-foreground">
                    Something went wrong. Please try again or contact support.
                  </p>
                </div>
              );
            })()}
              
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
                      <span className="font-semibold text-foreground">For Diggers, Consumers & Telemarketers</span>
                      <br />
                      All users share the same login portal
                    </p>
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
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-md mb-4">
                  <p className="text-sm font-semibold mb-2">Create Your Account</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Our new registration process lets you select multiple roles and customize your experience.
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => navigate("/register")}
                  >
                    Go to Registration →
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

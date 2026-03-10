import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { navigateToLogin } from "@/lib/navigateToLogin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import SEOHead from "@/components/SEOHead";
import { Eye, EyeOff, ArrowRight, Crown, Loader2, CheckCircle2 } from "lucide-react";
import { PasswordRequirements, GoogleSignInButton, AuthLogo } from "@/components/auth";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useRedditPixel } from "@/hooks/useRedditPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";

// Validation schema
const signupSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
  email: z.string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(255, "Email must be less than 255 characters"),
  phone: z.string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(20, "Phone number must be less than 20 digits"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export default function ProDiggerSignup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Conversion tracking
  const { trackEvent: trackFBEvent } = useFacebookPixel();
  const { trackEvent: trackRedditEvent } = useRedditPixel();
  const { trackConversion: trackGAConversion } = useGoogleAdsConversion();

  // Pre-fill from sessionStorage (from become-a-digger flow)
  useEffect(() => {
    const prefillData = sessionStorage.getItem("digger_prefill");
    if (prefillData) {
      try {
        const parsed = JSON.parse(prefillData);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
      } catch (e) {
        console.error("Error parsing prefill data:", e);
      }
    }
  }, []);

  // Store intent for post-OAuth redirect
  useEffect(() => {
    sessionStorage.setItem("pro_digger_signup", "true");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    // Validate form
    try {
      signupSchema.parse({ fullName, email, phone, password });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/my-profiles`,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create account");
      }

      // Track conversion
      trackFBEvent("CompleteRegistration", {
        content_name: "pro_digger_signup",
        content_category: "digger",
        value: 29,
        currency: "USD",
      });
      trackRedditEvent("SignUp", {
        conversionType: "pro_digger",
      });
      trackGAConversion(29, "USD");

      // Clear prefill data
      sessionStorage.removeItem("digger_prefill");
      
      // Store signup intent for profile completion
      sessionStorage.setItem("pro_digger_signup", "true");

      // Check if email confirmation is required
      if (authData.user && !authData.session) {
        toast.success("Please check your email to verify your account!");
        navigateToLogin();
      } else {
        toast.success("Account created! Let's complete your profile.");
        navigate("/my-profiles");
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      
      if (error.message?.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(error.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const proBenefits = [
    "Appear in our searchable directory",
    "Showcase your portfolio & reviews",
    "Clients can contact you directly",
    "Priority lead matching",
  ];

  return (
    <>
      <SEOHead
        title="Pro Digger Sign Up | Digs & Gigs"
        description="Create your Pro Digger account to appear in our directory and get discovered by clients."
        canonical="/pro-digger-signup"
        noindex={true}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-6">
            <AuthLogo />
          </div>

          <Card className="shadow-lg border-primary/20">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-3">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-xl">Create Your Pro Account</CardTitle>
              <CardDescription>
                $29/month — Get discovered by clients
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Pro Benefits */}
              <div className="bg-muted rounded-lg p-3 space-y-2">
                {proBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Google Sign-In */}
              <GoogleSignInButton 
                label="Sign up with Google"
                redirectTo={`${window.location.origin}/my-profiles`}
                disabled={isLoading}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email Sign-Up Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
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
                  <PasswordRequirements password={password} />
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground">
                    I agree to the{" "}
                    <Link to="/terms" className="underline hover:text-primary">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="underline hover:text-primary">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Pro Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/register?mode=signin" reloadDocument className="underline hover:text-primary">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

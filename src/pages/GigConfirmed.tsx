import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { navigateToLogin } from "@/lib/navigateToLogin";
import { CheckCircle, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Password validation schema
const passwordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const GigConfirmed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gigId = searchParams.get("gigId");
  
  // Account creation state
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [guestPhone, setGuestPhone] = useState<string | null>(null);

  // Check if user is already logged in and get guest info
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
      // Get guest email/phone from sessionStorage if available
      const verifiedEmail = sessionStorage.getItem('verifiedGiggerEmail');
      const verifiedPhone = sessionStorage.getItem('verifiedGiggerPhone');
      setGuestEmail(verifiedEmail);
      setGuestPhone(verifiedPhone);
    };
    checkAuth();
  }, []);

  // Force document body to white background on mount
  useEffect(() => {
    console.log("GigConfirmed mounted, gigId:", gigId);
    document.body.style.backgroundColor = "#f3e8ff";
    document.documentElement.style.backgroundColor = "#f3e8ff";
    
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, [gigId]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestEmail) {
      toast.error("No email found. Please try posting your gig again.");
      return;
    }
    
    setLoading(true);
    
    try {
      // Validate password
      passwordSchema.parse({ password, confirmPassword });
      
      // Create Supabase account with the verified email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: guestEmail,
        password,
        options: {
          data: {
            phone: guestPhone,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error("This email is already registered. Please sign in instead.");
          navigateToLogin();
        } else {
          toast.error(authError.message || "Failed to create account");
        }
        setLoading(false);
        return;
      }
      
      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return;
      }
      
      // Create gigger role for the new user
      const { error: roleError } = await supabase
        .from('user_app_roles')
        .insert({ user_id: authData.user.id, app_role: 'gigger' });
      
      if (roleError) {
        console.error("Error creating Gigger role:", roleError);
      } else {
        const { ensureGiggerProfile } = await import('@/lib/ensureGiggerProfile');
        await ensureGiggerProfile(authData.user.id);
      }
      
      // Link existing guest gigs to the new account
      const { error: linkError } = await supabase
        .from('gigs')
        .update({ consumer_id: authData.user.id })
        .eq('consumer_email', guestEmail)
        .is('consumer_id', null);
      
      if (linkError) {
        console.error("Error linking gigs:", linkError);
      }
      
      // Clear guest session data
      sessionStorage.removeItem('verifiedGiggerEmail');
      sessionStorage.removeItem('verifiedGiggerPhone');
      
      toast.success("Account created! Your gig has been linked to your account.");
      setIsLoggedIn(true);
      setShowAccountCreation(false);
      
      // Redirect to dashboard after a moment
      setTimeout(() => {
        navigate('/role-dashboard');
      }, 2000);
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Account creation error:", error);
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: '100vh', 
        width: '100vw',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%)',
        padding: '16px',
        zIndex: 9999,
        overflow: 'auto',
      }}
    >
      <Card className="max-w-md w-full shadow-2xl" style={{ background: 'white' }}>
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: '#1f2937' }}>Gig Confirmed!</h1>
            <p style={{ color: '#6b7280' }}>
              Your gig has been successfully confirmed and is now live. Qualified professionals in your area will be notified and can start sending you proposals.
            </p>
          </div>

          <p className="text-sm" style={{ color: '#9ca3af' }}>
            You will receive notifications when professionals purchase your lead and reach out to you.
          </p>

          {/* Optional Account Creation CTA - Only show for guest users */}
          {!isLoggedIn && guestEmail && !showAccountCreation && (
            <div className="border-t pt-6 mt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <User className="h-5 w-5" />
                  <span className="font-medium">Want to manage your gig?</span>
                </div>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Create an account to track responses, communicate with professionals, and post more gigs.
                </p>
                <Button 
                  onClick={() => setShowAccountCreation(true)}
                  variant="outline"
                  className="w-full"
                >
                  Create Account (Optional)
                </Button>
              </div>
            </div>
          )}

          {/* Account Creation Form */}
          {showAccountCreation && guestEmail && (
            <div className="border-t pt-6 mt-6">
              <form onSubmit={handleCreateAccount} className="space-y-4 text-left">
                <div className="text-center mb-4">
                  <h3 className="font-semibold" style={{ color: '#1f2937' }}>Create Your Account</h3>
                  <p className="text-sm" style={{ color: '#6b7280' }}>
                    Using: {guestEmail}
                  </p>
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
                  <p className="text-xs" style={{ color: '#9ca3af' }}>
                    8+ characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    maxLength={100}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAccountCreation(false)}
                    className="flex-1"
                    disabled={loading}
                  >
                    Skip
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create Account"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {gigId && (
              <Link to={`/gig/${gigId}`}>
                <Button variant="outline" className="w-full">
                  View Your Gig
                </Button>
              </Link>
            )}
            <Link to="/">
              <Button className="w-full">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GigConfirmed;

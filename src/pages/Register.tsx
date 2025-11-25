import { useState, useEffect } from "react";
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
  const { user, loading: authLoading } = useProtectedRoute({ 
    redirectIfAuthenticated: true,
    requireVerified: false // Allow unverified users to complete registration
  });
  
  const [isSignInMode, setIsSignInMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'signin';
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [existingAccountError, setExistingAccountError] = useState(false);

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'sms'>('email');

  // Step 1.5: Verification
  const [verificationCode, setVerificationCode] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Step 2: Role Selection
  const [selectedRoles, setSelectedRoles] = useState<Set<UserAppRole>>(new Set());

  // Step 3+: Role-specific forms data
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({});
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

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


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const roleArray = Array.from(selectedRoles);
  const totalSteps = 2 + roleArray.length; // Basic Info + Role Selection + Role Forms (no verification step)
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

      // Format phone if provided
      const formattedPhone = phone && phone.startsWith('+') ? phone : phone ? `+${phone}` : null;

      // Create Supabase account with auto-confirmation enabled
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone,
          },
          emailRedirectTo: `${window.location.origin}/role-dashboard`,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists') || authError.message.includes('User already registered')) {
          setExistingAccountError(true);
          setLoading(false);
          return;
        } else {
          toast.error(authError.message);
          setLoading(false);
          return;
        }
      }

      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return;
      }

      // Store user ID for later use
      setUserId(authData.user.id);

      // With auto-confirm enabled, user should have immediate session
      toast.success("Account created successfully!");
      setStep(2); // Go directly to role selection (was step 3, now step 2)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Account creation error:", error);
        toast.error(error.message || "An error occurred during account creation");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);

    try {
      // Get stored OTP
      const storedOtp = sessionStorage.getItem('pending_otp');
      const storedEmail = sessionStorage.getItem('pending_otp_email');
      const storedTime = sessionStorage.getItem('pending_otp_time');

      // Validate OTP hasn't expired (10 minutes)
      if (!storedOtp || !storedEmail || !storedTime) {
        toast.error("Verification session expired. Please try again.");
        setLoading(false);
        return;
      }

      const otpAge = Date.now() - parseInt(storedTime);
      if (otpAge > 10 * 60 * 1000) {
        toast.error("Verification code expired. Please request a new one.");
        sessionStorage.removeItem('pending_otp');
        sessionStorage.removeItem('pending_otp_email');
        sessionStorage.removeItem('pending_otp_time');
        setLoading(false);
        return;
      }

      // Verify OTP matches
      if (verificationCode !== storedOtp || email !== storedEmail) {
        toast.error("Invalid verification code");
        setLoading(false);
        return;
      }

      // Clear OTP from storage
      sessionStorage.removeItem('pending_otp');
      sessionStorage.removeItem('pending_otp_email');
      sessionStorage.removeItem('pending_otp_time');

      // Sign in the user with their credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast.error("Failed to verify: " + signInError.message);
        setLoading(false);
        return;
      }

      if (isSignInMode) {
        toast.success("Signed in successfully!");
        navigate('/role-dashboard');
      } else {
        toast.success("Account verified successfully!");
        setStep(3);
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);

    try {
      // Generate new 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in session storage
      sessionStorage.setItem('pending_otp', otp);
      sessionStorage.setItem('pending_otp_email', email);
      sessionStorage.setItem('pending_otp_time', Date.now().toString());

      // Send OTP via custom email
      const { error } = await supabase.functions.invoke('send-otp-email', {
        body: { email, code: otp, name: fullName }
      });
      
      if (error) throw error;

      toast.success("Verification code resent!");
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error(error.message || "Failed to resend email");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = () => {
    if (selectedRoles.size === 0) {
      toast.error("Please select at least one role");
      return;
    }

    // Move to first role form (was step 4, now step 3 without verification)
    setStep(3);
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
    setLoading(true);

    try {
      // Use Supabase's native password authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        toast.success("Signed in successfully!");
        navigate('/role-dashboard');
      }
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Failed to sign in");
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
              {isSignInMode ? (
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
              {isSignInMode && step === 1 ? "Welcome Back" : isSignInMode && step === 2 ? "Verify Your Email" : !isSignInMode && step === 1 ? "Create Your Account" : step === 2 ? "Verify Your Account" : step === 3 ? "Select Your Roles" : currentRole === 'digger' ? "Create Your Dig" : currentRole === 'gigger' ? "Create Your Gig" : "Telemarketer Registration"}
            </CardTitle>
            <CardDescription>
              {isSignInMode && step === 1 ? "We'll send a verification code to your email" : isSignInMode && step === 2 ? "Enter the code sent to your email" : !isSignInMode && step === 1 ? "Let's start with your basic information" : step === 2 ? "Enter the 6-digit code from your email" : step === 3 ? "What would you like to do on DigsandGigs?" : `Set up your ${currentRole} profile`}
            </CardDescription>

            {/* Progress Bar - Only show during registration */}
            {!isSignInMode && (
              <div className="mt-4 space-y-2">
                <Progress value={progressPercentage} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  Step {step} of {totalSteps}
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* Sign In Form */}
            {isSignInMode && step === 1 && (
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
                  <p className="text-xs text-muted-foreground">
                    We'll send a verification code to this email
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? "Sending Code..." : "Send Verification Code"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

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
            {!isSignInMode && step === 1 && (
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
                      <div className="font-medium">Email Verification</div>
                      <div className="text-xs text-muted-foreground">
                        You'll receive a verification code via email
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Save and Continue"} 
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

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

            {/* Step 2: Role Selection (was Step 3 with verification) */}
            {step === 2 && (
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
                    onClick={() => setStep(1)}
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

            {/* Step 3+: Role-specific Forms (was Step 4+ with verification) */}
            {step > 2 && currentRole && (
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
                          setStep(3 + roleIndex);
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
                        setStep(3);
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
                        setStep(3);
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
                        setStep(3);
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

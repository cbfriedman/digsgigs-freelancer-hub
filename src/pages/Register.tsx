import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Home, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import SEOHead from "@/components/SEOHead";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DiggerRoleForm from "@/components/registration/DiggerRoleForm";
import GiggerRoleForm from "@/components/registration/GiggerRoleForm";
import TelemarketerRoleForm from "@/components/registration/TelemarketerRoleForm";

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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: Role Selection
  const [selectedRoles, setSelectedRoles] = useState<Set<UserAppRole>>(new Set());

  // Step 3+: Role-specific forms data
  const [roleFormData, setRoleFormData] = useState<RoleFormData>({});
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  // Check if user is already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/role-dashboard");
      }
    });
  }, [navigate]);

  const roleArray = Array.from(selectedRoles);
  const totalSteps = 2 + roleArray.length; // Basic Info + Role Selection + Role Forms
  const progressPercentage = (step / totalSteps) * 100;

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // SECURITY: Validate inputs before proceeding
      basicInfoSchema.parse({
        fullName,
        email,
        password,
        confirmPassword,
        phone: phone || "",
      });

      // No verification needed - just move to next step
      setStep(2); // Move to role selection
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Please fill in all required fields correctly");
      }
    }
  };

  const handleRoleSelection = () => {
    if (selectedRoles.size === 0) {
      toast.error("Please select at least one role");
      return;
    }

    // Move to first role form
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
    setLoading(true);

    try {
      // Create auth account with Supabase's built-in email verification
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/role-dashboard`,
          data: {
            full_name: fullName,
            phone: phone || null,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
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

      // Create user_app_roles entries
      const roleInserts = roleArray.map(role => ({
        user_id: authData.user.id,
        app_role: role,
        is_active: true,
      }));

      const { error: rolesError } = await supabase
        .from('user_app_roles')
        .insert(roleInserts);

      if (rolesError) {
        console.error("Error creating roles:", rolesError);
        toast.error("Account created but roles setup failed. Please contact support.");
        setLoading(false);
        return;
      }

      // Create role-specific profiles
      if (selectedRoles.has('digger') && roleFormData.digger) {
        const { error: diggerError } = await supabase
          .from('digger_profiles')
          .insert({
            user_id: authData.user.id,
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
            user_id: authData.user.id,
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

      // Show appropriate message based on email confirmation requirement
      toast.success(
        "Registration complete! Check your email to confirm your account.",
        { duration: 6000 }
      );
      
      // Redirect to auth page (they'll need to confirm email first)
      navigate('/auth');
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "An error occurred during registration");
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
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center relative">
            <Button
              variant="outline"
              size="sm"
              className="absolute left-4 top-4 z-10"
              onClick={() => navigate("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            
            <h1 
              className="absolute left-1/2 -translate-x-1/2 top-4 text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/")}
            >
              digsandgigs
            </h1>
            
            <CardTitle className="text-2xl font-bold mt-8">
              {step === 1 && "Create Your Account"}
              {step === 2 && "Create Your Account"}
              {step > 2 && currentRole === 'digger' && "Create Your Dig"}
              {step > 2 && currentRole === 'gigger' && "Create Your Gig"}
              {step > 2 && currentRole === 'telemarketer' && "Telemarketer Registration"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Let's start with your basic information"}
              {step === 2 && "What would you like to do on DigsandGigs?"}
              {step > 2 && `Set up your ${currentRole} profile`}
            </CardDescription>

            {/* Progress Bar */}
            <div className="mt-4 space-y-2">
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-xs text-muted-foreground">
                Step {step} of {totalSteps}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
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
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use international format (e.g., +1234567890)
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
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => navigate("/auth")}
                  >
                    Sign in
                  </Button>
                </p>
              </form>
            )}

            {/* Step 2: Role Selection */}
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

            {/* Step 3+: Role-specific Forms */}
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
                        setStep(2);
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
                        setStep(2);
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
                        setStep(2);
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
    </>
  );
};

export default Register;

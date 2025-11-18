import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, User, Mail, Phone } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { z } from "zod";

const registrationSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().regex(/^\+?[\d\s\-()]+$/, "Invalid phone number").min(10, "Phone number must be at least 10 digits").max(20, "Phone number must be less than 20 digits").optional().or(z.literal("")),
});

const PreDemoRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demoType = searchParams.get("type");
  const isDiggerDemo = demoType === "digger";
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast.error("Please accept the Terms of Service to continue");
      return;
    }

    try {
      const validatedData = registrationSchema.parse({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
      });

      // Store the demo user info in localStorage for later conversion
      const demoUserInfo = {
        ...validatedData,
        phone: validatedData.phone || "",
        timestamp: new Date().toISOString(),
        demoType: isDiggerDemo ? "digger" : "gig",
      };
      localStorage.setItem("demo_user_info", JSON.stringify(demoUserInfo));

      toast.success("Great! Let's try out the demo");
      
      // Navigate to the appropriate demo page
      if (isDiggerDemo) {
        navigate("/digger-registration");
      } else {
        navigate("/gig-registration-demo");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Please check your information and try again");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {isDiggerDemo ? "Try Digger Registration" : "Try Posting a Gig"}
                </CardTitle>
                <CardDescription>
                  First, let us know who you are so we can help you get started
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  <User className="inline-block h-4 w-4 mr-1" />
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="inline-block h-4 w-4 mr-1" />
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We'll use this to save your demo progress and help you create an account later
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="inline-block h-4 w-4 mr-1" />
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, acceptTerms: checked as boolean })
                  }
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms-of-service" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                </Label>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <strong>Why we ask:</strong> This information helps us personalize your demo experience 
                  and makes it easy to convert to a full account when you're ready. Your information is 
                  stored securely and will not be shared.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Continue to Demo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PreDemoRegistration;

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Shield, Phone, CheckCircle2, AlertTriangle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";

// TCPA-compliant consent text - DO NOT MODIFY without legal review
const CONSENT_TEXT = `By checking this box and clicking "Get My Free Quote", I expressly consent to receive telemarketing calls and text messages, including calls made using an automatic telephone dialing system or an artificial or prerecorded voice, from DigsandGigs and its partners at the telephone number I provided above. I understand that my consent is not a condition of purchase. Message and data rates may apply. I can opt out at any time by replying STOP or by contacting us at support@digsandgigs.com.`;

const CONSENT_VERSION = "1.0";

export default function GetFreeQuote() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    propertyAddress: "",
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSmsVerification, setShowSmsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [consentRecordId, setConsentRecordId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Capture UTM parameters
  const utmSource = searchParams.get("utm_source");
  const utmMedium = searchParams.get("utm_medium");
  const utmCampaign = searchParams.get("utm_campaign");

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return `+1${digits}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consentChecked) {
      toast({
        title: "Consent Required",
        description: "You must agree to the consent terms to continue.",
        variant: "destructive",
      });
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("store-pewc-consent", {
        body: {
          fullName: formData.fullName,
          phone: normalizePhone(formData.phone),
          email: formData.email,
          propertyAddress: formData.propertyAddress,
          consentText: CONSENT_TEXT,
          consentVersion: CONSENT_VERSION,
          ipAddress: "captured-server-side",
          userAgent: navigator.userAgent,
          pageUrl: window.location.href,
          utmSource,
          utmMedium,
          utmCampaign,
        },
      });

      if (error) throw error;

      setConsentRecordId(data.consentRecordId);
      setShowSmsVerification(true);
      
      toast({
        title: "Verification Code Sent",
        description: "Please check your phone for a verification code.",
      });
    } catch (error: any) {
      console.error("Error submitting consent:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!consentRecordId || verificationCode.length !== 6) return;

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-sms", {
        body: {
          consentRecordId,
          code: verificationCode,
        },
      });

      if (error) throw error;

      toast({
        title: "Phone Verified!",
        description: "Thank you! A specialist will call you soon.",
      });

      // Redirect to success page
      navigate("/gig-confirmed?source=pewc");
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Invalid Code",
        description: error.message || "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Get a Free Quote | DigsandGigs"
        description="Get a free, no-obligation quote from local professionals. Fast, easy, and completely free."
      />
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Get Your Free Quote</CardTitle>
              <CardDescription>
                Tell us about your project and we'll connect you with local experts
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {!showSmsVerification ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="John Smith"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="(555) 123-4567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="propertyAddress">Property Address (Optional)</Label>
                    <Input
                      id="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                      placeholder="123 Main St, City, State"
                    />
                  </div>

                  {/* TCPA Consent Checkbox - MUST NOT BE PRE-CHECKED */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="consent"
                        checked={consentChecked}
                        onCheckedChange={(checked) => setConsentChecked(checked === true)}
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <label htmlFor="consent" className="cursor-pointer leading-relaxed text-muted-foreground">
                          {CONSENT_TEXT}
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-4 h-4" />
                      <span>Your information is secure and will never be sold.</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold"
                    disabled={isSubmitting || !consentChecked}
                  >
                    {isSubmitting ? "Submitting..." : "Get My Free Quote"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Verify Your Phone</h3>
                    <p className="text-sm text-muted-foreground">
                      We sent a 6-digit code to {formData.phone}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Enter Verification Code</Label>
                    <Input
                      id="verificationCode"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="text-center text-2xl tracking-widest"
                      maxLength={6}
                    />
                  </div>

                  <Button
                    onClick={handleVerifyCode}
                    className="w-full"
                    disabled={isVerifying || verificationCode.length !== 6}
                  >
                    {isVerifying ? "Verifying..." : "Verify & Continue"}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Didn't receive the code? Wait 60 seconds and try again.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
            <div>
              <div className="text-2xl font-bold text-foreground">100%</div>
              <div>Free Service</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">24hr</div>
              <div>Response Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">1000+</div>
              <div>Local Pros</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

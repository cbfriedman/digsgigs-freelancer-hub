import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Shield, Phone, CheckCircle2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { getIndustryConfig } from "@/config/industryConfig";
import { SUPPORT_EMAIL } from "@/config/siteContact";

// TCPA-compliant consent text - DO NOT MODIFY without legal review. Support contact from siteContact.
const getConsentText = () => `By checking this box and clicking "Get My Free Quote", I expressly consent to receive telemarketing calls and text messages, including calls made using an automatic telephone dialing system or an artificial or prerecorded voice, from DigsandGigs and its partners at the telephone number I provided above. I understand that my consent is not a condition of purchase. Message and data rates may apply. I can opt out at any time by replying STOP or by contacting us at ${SUPPORT_EMAIL}.`;

const CONSENT_VERSION = "1.0";

export default function GetFreeQuote() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trackEvent } = useFacebookPixel();
  const { trackConversion: trackGoogleConversion } = useGoogleAdsConversion();
  
  // Get industry from URL parameter
  const industry = searchParams.get("industry");
  const industryConfig = getIndustryConfig(industry);
  
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
  const [hasTrackedViewContent, setHasTrackedViewContent] = useState(false);

  // Capture UTM parameters
  const utmSource = searchParams.get("utm_source");
  const utmMedium = searchParams.get("utm_medium");
  const utmCampaign = searchParams.get("utm_campaign");

  // Track ViewContent when user starts interacting with form
  useEffect(() => {
    if (!hasTrackedViewContent && (formData.fullName || formData.phone)) {
      trackEvent('ViewContent', {
        content_name: 'Free Quote Form',
        content_category: utmCampaign || 'organic',
        content_type: 'lead_form',
        industry: industryConfig.slug,
      });
      setHasTrackedViewContent(true);
    }
  }, [formData.fullName, formData.phone, hasTrackedViewContent, trackEvent, utmCampaign, industryConfig.slug]);

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
      const data = await invokeEdgeFunction<{ consentRecordId: string; alreadyVerified?: boolean }>(
        supabase,
        "store-pewc-consent",
        {
          body: {
            fullName: formData.fullName,
            phone: normalizePhone(formData.phone),
            email: formData.email,
            propertyAddress: formData.propertyAddress,
            consentText: getConsentText(),
            consentVersion: CONSENT_VERSION,
            ipAddress: "captured-server-side",
            userAgent: navigator.userAgent,
            pageUrl: window.location.href,
            utmSource: utmSource ?? undefined,
            utmMedium: utmMedium ?? undefined,
            utmCampaign: utmCampaign ?? undefined,
          },
        }
      );

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
        description: error?.message ?? "Failed to submit. Please try again.",
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
      await invokeEdgeFunction(supabase, "verify-phone-sms", {
        body: {
          consentRecordId,
          code: verificationCode,
        },
      });

      // Track Lead conversion on successful SMS verification
      trackEvent('Lead', {
        content_name: 'PEWC Consent Verified',
        content_category: utmCampaign || 'organic',
        value: 25.00, // Estimated lead value for optimization
        currency: 'USD',
      });

      // Track Google Ads conversion
      trackGoogleConversion(25.00, 'USD');

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

  // Open Graph optimized image URL
  const ogImageUrl = "https://digsgigs-freelancer-hub.lovable.app/og-image.jpg";
  
  // Build canonical URL with industry param if present
  const canonicalUrl = industry 
    ? `https://digsgigs-freelancer-hub.lovable.app/get-free-quote?industry=${industry}`
    : "https://digsgigs-freelancer-hub.lovable.app/get-free-quote";

  return (
    <>
      <SEOHead
        title={industryConfig.seo.title}
        description={industryConfig.seo.description}
        canonical={canonicalUrl}
        ogImage={ogImageUrl}
        keywords={industryConfig.seo.keywords}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": `Free ${industryConfig.name} Quote Service`,
          "description": industryConfig.seo.description,
          "provider": {
            "@type": "Organization",
            "name": "DigsandGigs",
            "url": "https://digsgigs-freelancer-hub.lovable.app"
          },
          "areaServed": "United States",
          "serviceType": industryConfig.structuredDataType,
          "hasOfferCatalog": {
            "@type": "OfferCatalog",
            "name": industryConfig.structuredDataType,
            "itemListElement": [
              {
                "@type": "Offer",
                "itemOffered": {
                  "@type": "Service",
                  "name": `Free ${industryConfig.name} Quote Request`
                },
                "price": "0",
                "priceCurrency": "USD"
              }
            ]
          }
        }}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">{industryConfig.headline}</CardTitle>
              <CardDescription>
                {industryConfig.subheadline}
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
                          {getConsentText()}
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

          {/* Trust Indicators - Dynamic based on industry */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
            <div>
              <div className="text-2xl font-bold text-foreground">{industryConfig.trustStats.stat1.value}</div>
              <div>{industryConfig.trustStats.stat1.label}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{industryConfig.trustStats.stat2.value}</div>
              <div>{industryConfig.trustStats.stat2.label}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{industryConfig.trustStats.stat3.value}</div>
              <div>{industryConfig.trustStats.stat3.label}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

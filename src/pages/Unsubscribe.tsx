import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { PhoneOff, CheckCircle2, MailMinus } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get("email")?.trim() || null;

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(emailFromUrl || "");
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [successPhone, setSuccessPhone] = useState(false);
  const [successEmail, setSuccessEmail] = useState(false);

  useEffect(() => {
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [emailFromUrl]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingPhone(true);
    try {
      const { error } = await supabase.functions.invoke("revoke-consent", {
        body: { phone: `+1${phoneDigits}`, method: "web_form" },
      });
      if (error) throw error;
      setSuccessPhone(true);
      toast({
        title: "Unsubscribed Successfully",
        description: "You will no longer receive calls from us.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toUnsubscribe = (email || emailFromUrl || "").trim().toLowerCase();
    if (!toUnsubscribe || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toUnsubscribe)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("record-email-unsubscribe", {
        body: { email: toUnsubscribe, source: "link" },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setSuccessEmail(true);
      setEmail(toUnsubscribe);
      toast({
        title: "Unsubscribed from marketing emails",
        description: "You will no longer receive marketing or welcome emails from Digs & Gigs.",
      });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: (err as Error)?.message || "Failed to unsubscribe. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const showEmailSection = true;
  const showPhoneSection = !emailFromUrl;

  return (
    <>
      <SEOHead
        title="Unsubscribe | Digs & Gigs"
        description="Opt out of marketing emails or telemarketing calls from Digs & Gigs."
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Email unsubscribe */}
          {showEmailSection && (
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                  <MailMinus className="w-8 h-8 text-amber-600" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  {emailFromUrl ? "Unsubscribe from marketing emails" : "Unsubscribe from emails"}
                </CardTitle>
                <CardDescription>
                  {emailFromUrl
                    ? `Confirm that you want to stop marketing emails to ${emailFromUrl}.`
                    : "Enter your email to stop receiving marketing and welcome emails from us."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!successEmail ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={!!emailFromUrl}
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="w-full"
                      disabled={isSubmittingEmail}
                    >
                      {isSubmittingEmail ? "Processing..." : "Unsubscribe from emails"}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">You're unsubscribed</h3>
                      <p className="text-sm text-muted-foreground">
                        We've stopped sending marketing and welcome emails to this address.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Phone unsubscribe */}
          {showPhoneSection && (
            <Card className="shadow-lg border-0">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <PhoneOff className="w-8 h-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl font-bold">Unsubscribe from calls</CardTitle>
                <CardDescription>
                  Enter your phone number to stop receiving calls from us.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!successPhone ? (
                  <form onSubmit={handlePhoneSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="w-full"
                      disabled={isSubmittingPhone}
                    >
                      {isSubmittingPhone ? "Processing..." : "Stop all calls"}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      You can also text STOP to any message we send, or reply STOP during any call.
                    </p>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">You're unsubscribed</h3>
                      <p className="text-sm text-muted-foreground">
                        We've removed your number from our calling list.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      It may take up to 24 hours for this change to take effect.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

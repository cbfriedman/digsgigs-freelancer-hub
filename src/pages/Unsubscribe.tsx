import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { PhoneOff, CheckCircle2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function Unsubscribe() {
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("revoke-consent", {
        body: {
          phone: `+1${phoneDigits}`,
          method: "web_form",
        },
      });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Unsubscribed Successfully",
        description: "You will no longer receive calls from us.",
      });
    } catch (error: any) {
      console.error("Unsubscribe error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Unsubscribe | DigsandGigs"
        description="Opt out of telemarketing calls from DigsandGigs."
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-12 px-4">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <PhoneOff className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold">Unsubscribe from Calls</CardTitle>
              <CardDescription>
                Enter your phone number to stop receiving calls from us
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {!success ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
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
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Processing..." : "Stop All Calls"}
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
                    <h3 className="text-lg font-semibold mb-2">You're Unsubscribed</h3>
                    <p className="text-sm text-muted-foreground">
                      We've removed your number from our calling list. You will no longer receive calls from DigsandGigs.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    It may take up to 24 hours for this change to take effect across all systems.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

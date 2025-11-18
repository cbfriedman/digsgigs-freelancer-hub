import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, Check, Loader2 } from "lucide-react";

interface VerificationFormProps {
  onVerified: (data: { email?: string; phone?: string }) => void;
}

export const VerificationForm = ({ onVerified }: VerificationFormProps) => {
  const [step, setStep] = useState<"input" | "verify">("input");
  const [verificationType, setVerificationType] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const sendVerificationCode = async () => {
    if (verificationType === "email" && !email) {
      toast.error("Please enter your email address");
      return;
    }

    if (verificationType === "phone" && !phone) {
      toast.error("Please enter your phone number");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: {
          email: verificationType === "email" ? email : undefined,
          phone: verificationType === "phone" ? phone : undefined,
          type: verificationType,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`Verification code sent to your ${verificationType}!`);
        setCodeSent(true);
        setStep("verify");
      }
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      toast.error(error.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: {
          email: verificationType === "email" ? email : undefined,
          phone: verificationType === "phone" ? phone : undefined,
          code: verificationCode,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Verification successful!");
        onVerified({
          email: verificationType === "email" ? email : undefined,
          phone: verificationType === "phone" ? phone : undefined,
        });
      } else {
        toast.error(data?.error || "Invalid verification code");
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = () => {
    setVerificationCode("");
    setCodeSent(false);
    sendVerificationCode();
  };

  if (step === "input") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Verify Your Information</CardTitle>
          <CardDescription>
            We need to verify your contact information before you can post a gig.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button
              variant={verificationType === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => setVerificationType("email")}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              variant={verificationType === "phone" ? "default" : "outline"}
              size="sm"
              onClick={() => setVerificationType("phone")}
              className="flex-1"
            >
              <Phone className="w-4 h-4 mr-2" />
              Phone
            </Button>
          </div>

          {verificationType === "email" ? (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}

          <Button
            onClick={sendVerificationCode}
            disabled={loading || (verificationType === "email" ? !email : !phone)}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Send Verification Code
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Enter Verification Code</CardTitle>
        <CardDescription>
          We sent a 6-digit code to your {verificationType === "email" ? "email" : "phone number"}.
          {verificationType === "email" && email && (
            <span className="block mt-1 font-medium">{email}</span>
          )}
          {verificationType === "phone" && phone && (
            <span className="block mt-1 font-medium">{phone}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-widest"
            required
          />
        </div>

        <Button
          onClick={verifyCode}
          disabled={loading || verificationCode.length !== 6}
          className="w-full"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {!loading && <Check className="w-4 h-4 mr-2" />}
          Verify
        </Button>

        <div className="text-center">
          <Button variant="link" onClick={resendCode} disabled={loading} size="sm">
            Resend Code
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setStep("input");
              setCodeSent(false);
              setVerificationCode("");
            }}
            disabled={loading}
            size="sm"
          >
            Change {verificationType === "email" ? "Email" : "Phone"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

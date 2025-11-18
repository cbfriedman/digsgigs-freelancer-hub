import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Check, Loader2 } from "lucide-react";

interface VerificationFormProps {
  onVerified: (data: { email: string }) => void;
}

export const VerificationForm = ({ onVerified }: VerificationFormProps) => {
  const [step, setStep] = useState<"input" | "verify">("input");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);

  const sendVerificationCode = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: {
          email,
          type: "email",
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Verification code sent to your email!");
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
          email,
          code: verificationCode,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Verification successful!");
        onVerified({ email });
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
    sendVerificationCode();
  };

  if (step === "input") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We'll send you a verification code to confirm your email address before you can post a gig.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            onClick={sendVerificationCode}
            disabled={loading || !email}
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
          We sent a 6-digit code to:
          <span className="block mt-1 font-medium text-foreground">{email}</span>
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
          <p className="text-xs text-muted-foreground text-center">
            Code expires in 15 minutes
          </p>
        </div>

        <Button
          onClick={verifyCode}
          disabled={loading || verificationCode.length !== 6}
          className="w-full"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {!loading && <Check className="w-4 h-4 mr-2" />}
          Verify Email
        </Button>

        <div className="flex flex-col gap-2 text-center">
          <Button variant="link" onClick={resendCode} disabled={loading} size="sm">
            Resend Code
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setStep("input");
              setVerificationCode("");
            }}
            disabled={loading}
            size="sm"
          >
            Change Email Address
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

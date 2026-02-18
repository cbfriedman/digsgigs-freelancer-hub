import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Footer } from "@/components/Footer";

export default function VerifyReference() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification link.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await invokeEdgeFunction<{ success?: boolean; error?: string }>(
          supabase,
          "verify-reference",
          { body: { token } }
        );
        if (cancelled) return;
        if (data?.success) {
          setStatus("success");
          setMessage("Thank you! This reference has been verified.");
        } else {
          setStatus("error");
          setMessage((data as { error?: string })?.error || "Invalid or expired link.");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setMessage(e instanceof Error ? e.message : "Something went wrong. The link may have expired.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
              {status === "success" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
              {status === "loading" && "Verifying..."}
              {status === "success" && "Reference verified"}
              {status === "error" && "Verification failed"}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Please wait."}
              {status === "success" && message}
              {status === "error" && message}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild variant="default">
              <Link to="/">Back to home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

const UnsubscribeCold = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not_found'>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const leadId = searchParams.get('id');
    if (leadId) {
      processUnsubscribe(leadId);
    } else {
      setStatus('not_found');
    }
  }, [searchParams]);

  const processUnsubscribe = async (leadId: string) => {
    try {
      // Get the lead to show the email
      const { data: lead, error: fetchError } = await supabase
        .from("cold_email_leads")
        .select("email, status")
        .eq("id", leadId)
        .single();

      if (fetchError || !lead) {
        console.error("Lead not found:", fetchError);
        setStatus('not_found');
        return;
      }

      setEmail(lead.email);

      // Check if already unsubscribed
      if (lead.status === 'unsubscribed') {
        setStatus('success');
        return;
      }

      // Update the lead status
      const { error: updateError } = await supabase
        .from("cold_email_leads")
        .update({ status: 'unsubscribed' })
        .eq("id", leadId);

      if (updateError) {
        console.error("Error unsubscribing:", updateError);
        setStatus('error');
        return;
      }

      setStatus('success');
      toast.success("Successfully unsubscribed");

    } catch (error) {
      console.error("Error processing unsubscribe:", error);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <CardTitle>Processing...</CardTitle>
              <CardDescription>Please wait while we process your request</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
              <CardTitle>You've Been Unsubscribed</CardTitle>
              <CardDescription>
                {email && (
                  <span className="block mt-2">
                    <strong>{email}</strong> has been removed from our mailing list.
                  </span>
                )}
              </CardDescription>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
              <CardTitle>Something Went Wrong</CardTitle>
              <CardDescription>
                We couldn't process your unsubscribe request. Please try again or contact support.
              </CardDescription>
            </>
          )}

          {status === 'not_found' && (
            <>
              <Mail className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <CardTitle>Link Not Found</CardTitle>
              <CardDescription>
                This unsubscribe link is invalid or has expired.
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'success' && (
            <p className="text-sm text-center text-muted-foreground">
              You won't receive any more marketing emails from us. 
              If you change your mind, you can always sign up again at digsandgigs.com.
            </p>
          )}

          <div className="flex justify-center">
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Homepage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnsubscribeCold;

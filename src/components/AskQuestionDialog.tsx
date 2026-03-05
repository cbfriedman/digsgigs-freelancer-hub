import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageBlockedAlert } from "@/components/MessageBlockedAlert";
import { ViolationType } from "@/types/messageModeration";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Send, AlertTriangle } from "lucide-react";

interface AskQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bidderNumber: number;
  gigId: string;
  bidId: string;
  diggerId: string;
}

// Client-side pattern detection for inline warnings
const CONTACT_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|[0-9]{7,}/g,
  url: /(?:https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9-]+\.(com|net|org|io|co|dev|app|me|biz|info)/gi,
  social: /@[a-zA-Z0-9_]+|(?:instagram|twitter|linkedin|facebook|tiktok|snapchat)[\s.:/@]+[a-zA-Z0-9_]+/gi,
};

export const AskQuestionDialog = ({
  open,
  onOpenChange,
  bidderNumber,
  gigId,
  bidId,
  diggerId,
}: AskQuestionDialogProps) => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [clientWarning, setClientWarning] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [violations, setViolations] = useState<ViolationType[]>([]);

  const checkForPatterns = useCallback((text: string) => {
    if (CONTACT_PATTERNS.email.test(text)) {
      return "This message may be blocked: appears to contain an email address";
    }
    if (CONTACT_PATTERNS.phone.test(text)) {
      return "This message may be blocked: appears to contain a phone number";
    }
    if (CONTACT_PATTERNS.url.test(text)) {
      return "This message may be blocked: appears to contain a website URL";
    }
    if (CONTACT_PATTERNS.social.test(text)) {
      return "This message may be blocked: appears to contain a social media handle";
    }
    return null;
  }, []);

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setBlocked(false);
    setViolations([]);
    setClientWarning(checkForPatterns(value));
  };

  const handleSend = async () => {
    if (!message.trim() || message.length < 10) {
      toast({
        title: "Message too short",
        description: "Please enter a message with at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setBlocked(false);
    setViolations([]);

    try {
      const data = await invokeEdgeFunction<{ blocked?: boolean; violations?: string[] }>(
        supabase,
        'send-anonymous-question',
        {
          body: {
            gigId,
            bidId,
            diggerId,
            message: message.trim(),
          },
        }
      );

      if (data.blocked) {
        setBlocked(true);
        // Cast violations to ViolationType[] - edge function returns known violation types
        setViolations((data.violations || ['contact_email']) as ViolationType[]);
        return;
      }

      toast({
        title: "Question sent!",
        description: `Your anonymous question has been sent to Bidder #${bidderNumber}.`,
      });

      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending question:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleEdit = () => {
    setBlocked(false);
    setViolations([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Ask Bidder #{bidderNumber} a Question
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            Your identity is protected. They will see "Project Owner" — not your name or email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {blocked ? (
            <MessageBlockedAlert 
              violations={violations} 
              onEdit={handleEdit}
            />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="question">Your question</Label>
                <Textarea
                  id="question"
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  placeholder="What is your timeline for starting this project? Do you have experience with similar work?"
                  className="min-h-[120px] resize-none"
                  maxLength={1000}
                  disabled={sending}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{message.length}/1000 characters</span>
                  {message.length < 10 && message.length > 0 && (
                    <span className="text-destructive">Minimum 10 characters</span>
                  )}
                </div>
              </div>

              {clientWarning && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {clientWarning}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          {!blocked && (
            <Button onClick={handleSend} disabled={sending || message.length < 10}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Anonymous Question
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

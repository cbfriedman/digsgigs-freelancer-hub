import { AlertTriangle, Edit2, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VIOLATION_LABELS, ViolationType } from "@/types/messageModeration";

interface MessageBlockedAlertProps {
  violations: ViolationType[];
  onEdit?: () => void;
  onLearnMore?: () => void;
}

export const MessageBlockedAlert = ({ 
  violations, 
  onEdit, 
  onLearnMore 
}: MessageBlockedAlertProps) => {
  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="font-semibold">Message Not Sent</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>Your message was blocked because it appears to contain:</p>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {violations.map((violation) => (
            <li key={violation}>{VIOLATION_LABELS[violation]}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Pre-award messages cannot include contact information. 
          Contact details are revealed after job award.
        </p>
        <div className="flex gap-2 pt-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Message
            </Button>
          )}
          {onLearnMore && (
            <Button variant="ghost" size="sm" onClick={onLearnMore}>
              <HelpCircle className="h-4 w-4 mr-2" />
              Learn Why
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

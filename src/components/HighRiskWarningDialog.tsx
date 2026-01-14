import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { HIGH_RISK_WARNING_MESSAGE } from "@/config/techCategories";

interface HighRiskWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchedKeywords: string[];
  onContinue: () => void;
  onCancel: () => void;
}

export const HighRiskWarningDialog = ({
  open,
  onOpenChange,
  matchedKeywords,
  onContinue,
  onCancel,
}: HighRiskWarningDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Heads Up
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{HIGH_RISK_WARNING_MESSAGE}</p>
            
            {matchedKeywords.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                  Detected terms:
                </p>
                <div className="flex flex-wrap gap-1">
                  {matchedKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded text-xs"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-sm">
              You can still submit your project. Would you like to continue?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Edit Project
          </AlertDialogCancel>
          <AlertDialogAction onClick={onContinue}>
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

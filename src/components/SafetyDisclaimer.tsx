import { Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SafetyDisclaimerProps {
  variant?: 'default' | 'compact' | 'footer';
  className?: string;
}

export const SafetyDisclaimer = ({ variant = 'default', className = '' }: SafetyDisclaimerProps) => {
  if (variant === 'footer') {
    return (
      <div className={`text-xs text-muted-foreground text-center py-2 border-t ${className}`}>
        <Shield className="h-3 w-3 inline-block mr-1" />
        Digs & Gigs supports unlicensed, creative, and business support services only. 
        Licensed legal, medical, mortgage, real estate, and contractor services are not permitted.
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm ${className}`}>
        <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-amber-700 dark:text-amber-300">
          <strong>Platform Policy:</strong> We support unlicensed, creative, and business support services only. 
          Licensed professions (legal, medical, mortgage, real estate) are not permitted.
        </p>
      </div>
    );
  }

  return (
    <Alert variant="default" className={`border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 ${className}`}>
      <Shield className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">Platform Guidelines</AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <p className="mb-2">
          <strong>Digs & Gigs</strong> is a marketplace for unlicensed, creative, and business support services.
        </p>
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-1">
            <span className="text-green-600">✓</span> Allowed: Virtual assistants, designers, developers, tutors, handymen, pet services, etc.
          </p>
          <p className="flex items-center gap-1">
            <span className="text-red-600">✗</span> Not Allowed: Attorneys, CPAs, licensed contractors, mortgage brokers, real estate agents, therapists, medical professionals
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export const LicensedProfessionWarning = () => (
  <Alert variant="destructive" className="border-red-500">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Restricted Profession Detected</AlertTitle>
    <AlertDescription>
      This profession requires a professional license and is not permitted on our platform. 
      Please select an unlicensed support service instead.
    </AlertDescription>
  </Alert>
);

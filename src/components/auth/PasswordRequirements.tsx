import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordRequirements = ({ password }: PasswordRequirementsProps) => {
  const requirements: Requirement[] = [
    {
      label: "Must contain a number",
      met: /\d/.test(password),
    },
    {
      label: "Must contain a lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "Must contain an uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Must be at least 8 characters long",
      met: password.length >= 8,
    },
  ];

  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-3">
      {requirements.map((req, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-2 text-sm transition-colors",
            req.met ? "text-success" : "text-destructive"
          )}
        >
          {req.met ? (
            <Check className="h-4 w-4 flex-shrink-0" />
          ) : (
            <X className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
};

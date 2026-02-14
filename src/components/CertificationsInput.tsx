import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Award } from "lucide-react";
import { toast } from "sonner";

interface CertificationsInputProps {
  certifications: string[];
  onCertificationsChange: (certifications: string[]) => void;
}

export const CertificationsInput = ({ 
  certifications, 
  onCertificationsChange 
}: CertificationsInputProps) => {
  const [certName, setCertName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [year, setYear] = useState("");

  const handleAddCertification = () => {
    const trimmed = certName.trim();
    if (!trimmed) {
      toast.error("Enter certification name");
      return;
    }

    const issuerPart = issuer.trim() ? ` - ${issuer.trim()}` : "";
    const yearPart = year.trim() ? ` (${year.trim()})` : "";
    const nextCertification = `${trimmed}${issuerPart}${yearPart}`;

    if (certifications.some(c => c.toLowerCase() === nextCertification.toLowerCase())) {
      toast.error("This certification is already added");
      return;
    }
    onCertificationsChange([...certifications, nextCertification]);
    setCertName("");
    setIssuer("");
    setYear("");
  };

  const handleRemoveCertification = (index: number) => {
    const newCerts = certifications.filter((_, i) => i !== index);
    onCertificationsChange(newCerts);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCertification();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add verifiable certifications. Include issuer and year when possible.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
        <Input
          value={certName}
          onChange={(e) => setCertName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Certification name (required)"
          className="sm:col-span-5"
        />
        <Input
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Issuer (optional)"
          className="sm:col-span-3"
        />
        <Input
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
          onKeyDown={handleKeyDown}
          placeholder="Year"
          className="sm:col-span-2 min-w-0"
        />
        <Button
          type="button"
          onClick={handleAddCertification}
          variant="outline"
          className="w-full whitespace-nowrap sm:col-span-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </div>

      {certifications.length > 0 ? (
        <div className="space-y-2">
          {certifications.map((cert, index) => (
            <div key={index} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span>{cert}</span>
              </div>
              <Button
                type="button"
                onClick={() => handleRemoveCertification(index)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No certifications added yet.
        </p>
      )}
    </div>
  );
};

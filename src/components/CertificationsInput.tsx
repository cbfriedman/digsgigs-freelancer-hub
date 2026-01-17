import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  const [newCertification, setNewCertification] = useState("");

  const handleAddCertification = () => {
    const trimmed = newCertification.trim();
    if (!trimmed) {
      toast.error("Please enter a certification name");
      return;
    }
    if (certifications.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("This certification is already added");
      return;
    }
    onCertificationsChange([...certifications, trimmed]);
    setNewCertification("");
    toast.success("Certification added");
  };

  const handleRemoveCertification = (index: number) => {
    const newCerts = certifications.filter((_, i) => i !== index);
    onCertificationsChange(newCerts);
    toast.success("Certification removed");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCertification();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Certification Input */}
      <div className="flex gap-2">
        <Input
          value={newCertification}
          onChange={(e) => setNewCertification(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., AWS Certified Developer, PMP, CISSP..."
          className="flex-1"
        />
        <Button 
          type="button" 
          onClick={handleAddCertification}
          variant="outline"
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Current Certifications */}
      {certifications.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {certifications.map((cert, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="flex items-center gap-1 px-3 py-1.5"
            >
              <Award className="h-3 w-3" />
              <span>{cert}</span>
              <button
                type="button"
                onClick={() => handleRemoveCertification(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No certifications added yet. Add your professional certifications to increase credibility.
        </p>
      )}
    </div>
  );
};

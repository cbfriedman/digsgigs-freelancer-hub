import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { MultiCategorySubcategorySelector, CategorySelection } from "@/components/MultiCategorySubcategorySelector";

const diggerSchema = z.object({
  companyName: z.string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
});

interface DiggerRoleFormProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const DiggerRoleForm = ({ onComplete, onBack }: DiggerRoleFormProps) => {
  const [companyName, setCompanyName] = useState("");
  const [selectedServices, setSelectedServices] = useState<CategorySelection[]>([]);
  const [skillsSummary, setSkillsSummary] = useState("");
  const [allowGiggerContact, setAllowGiggerContact] = useState(false);

  // Memoize the callback to prevent infinite loops
  const handleSelectionChange = useCallback((items: CategorySelection[]) => {
    setSelectedServices(items);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      diggerSchema.parse({ companyName });

      if (selectedServices.length === 0) {
        toast.error("Please select at least one service category");
        return;
      }

      onComplete({
        companyName,
        // Backwards-compatible field name used by Register.tsx + backend writes
        selectedIndustries: selectedServices.map(
          (s) => `${s.categoryName}: ${s.subcategoryName}`
        ),
        // Keep full structured selection for future use
        selectedServices,
        skillsSummary,
        allowGiggerContact,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Please fill in all required fields correctly");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Join Free Banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
        <p className="font-semibold text-primary">Join free.</p>
        <p className="text-sm text-muted-foreground">
          Pay only when you choose to unlock a lead.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyName">Company/Business Name *</Label>
        <Input
          id="companyName"
          type="text"
          placeholder="Your Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          maxLength={100}
        />
      </div>

      {/* Multi-Select Category & Subcategory Selector */}
      <MultiCategorySubcategorySelector
        selectedItems={selectedServices}
        onSelectionChange={handleSelectionChange}
        maxSelections={5}
        required
      />

      {/* Optional Skills Summary */}
      <div className="space-y-2">
        <Label htmlFor="skillsSummary">Short Skills Summary (Optional)</Label>
        <Textarea
          id="skillsSummary"
          placeholder="Briefly describe your skills and experience..."
          value={skillsSummary}
          onChange={(e) => setSkillsSummary(e.target.value)}
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {skillsSummary.length}/500 characters
        </p>
      </div>

      {/* Direct Contact Option */}
      <div className="bg-accent/30 border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="allowGiggerContact" className="text-base font-medium cursor-pointer">
              Allow Direct Contact
            </Label>
            <p className="text-sm text-muted-foreground">
              Let Giggers request your contact information to reach you directly. You'll be charged $20 each time a Gigger requests your info.
            </p>
          </div>
          <Switch
            id="allowGiggerContact"
            checked={allowGiggerContact}
            onCheckedChange={setAllowGiggerContact}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="flex-1">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default DiggerRoleForm;

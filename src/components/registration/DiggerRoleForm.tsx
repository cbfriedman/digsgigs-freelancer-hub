import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { CategorySubcategorySelector } from "@/components/CategorySubcategorySelector";

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
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState("");
  const [skillsSummary, setSkillsSummary] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      diggerSchema.parse({ companyName });

      if (!selectedCategoryId || !selectedSubcategorySlug) {
        toast.error("Please select your primary category and subcategory");
        return;
      }

      onComplete({
        companyName,
        selectedCategoryId,
        selectedSubcategorySlug,
        skillsSummary,
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

      {/* Category & Subcategory Selector */}
      <CategorySubcategorySelector
        selectedCategoryId={selectedCategoryId}
        selectedSubcategorySlug={selectedSubcategorySlug}
        onCategoryChange={setSelectedCategoryId}
        onSubcategoryChange={setSelectedSubcategorySlug}
        categoryLabel="Primary Category *"
        subcategoryLabel="Primary Subcategory *"
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

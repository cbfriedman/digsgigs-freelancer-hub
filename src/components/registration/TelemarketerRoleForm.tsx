import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const telemarketerSchema = z.object({
  companyName: z.string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
});

interface TelemarketerRoleFormProps {
  onComplete: (data: any) => void;
  onBack: () => void;
}

const TelemarketerRoleForm = ({ onComplete, onBack }: TelemarketerRoleFormProps) => {
  const [companyName, setCompanyName] = useState("");
  const [compensationPreference, setCompensationPreference] = useState<'percentage' | 'flat_fee'>('percentage');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      telemarketerSchema.parse({ companyName });

      onComplete({
        businessInfo: { companyName },
        compensationPreference,
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="telemarketerCompany">Company/Business Name (Optional)</Label>
        <Input
          id="telemarketerCompany"
          type="text"
          placeholder="Your Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="space-y-3">
        <Label>Commission Preference *</Label>
        <p className="text-sm text-muted-foreground">
          Choose how you want to be compensated for awarded exclusive leads
        </p>

        <RadioGroup
          value={compensationPreference}
          onValueChange={(value) => setCompensationPreference(value as 'percentage' | 'flat_fee')}
        >
          <Card className="cursor-pointer hover:bg-accent/50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="percentage" id="percentage" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="percentage" className="cursor-pointer font-semibold">
                    35% of Lead Cost
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Earn 35% of the exclusive lead price when it's awarded to a digger.
                    Higher potential earnings on premium leads.
                  </p>
                  <div className="mt-2 text-xs bg-primary/10 text-primary p-2 rounded">
                    <strong>Example:</strong> For a $100 exclusive lead, you earn $35
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="flat_fee" id="flat_fee" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="flat_fee" className="cursor-pointer font-semibold">
                    Flat Fee of $25
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Earn a consistent $25 for every awarded exclusive lead, regardless of the lead price.
                    Predictable income per lead.
                  </p>
                  <div className="mt-2 text-xs bg-primary/10 text-primary p-2 rounded">
                    <strong>Example:</strong> Every awarded exclusive lead = $25 for you
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>
      </div>

      <Alert>
        <AlertDescription className="text-xs">
          <strong>Note:</strong> You earn commission only on awarded exclusive leads. 
          Non-exclusive leads and leads that expire without award do not generate commission.
          You can change your preference later in your dashboard settings.
        </AlertDescription>
      </Alert>

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
          Complete Registration <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default TelemarketerRoleForm;

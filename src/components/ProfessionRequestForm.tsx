import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const existingIndustries = [
  "Legal Services",
  "Insurance",
  "Mortgage & Financing",
  "Financial Services & Accounting",
  "Construction & Home Services",
  "Medical & Healthcare",
  "Technology Services",
  "Business Services",
  "Automotive Services",
  "Pet Care",
  "Education & Tutoring",
  "Fitness & Wellness",
  "Event Services",
  "Cleaning & Maintenance",
  "Moving & Storage",
  "Beauty & Personal Care"
];

export const ProfessionRequestForm = () => {
  const [industryType, setIndustryType] = useState<"new" | "existing">("existing");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [profession, setProfession] = useState("");
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const addSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setSpecialties(specialties.filter(s => s !== specialty));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const industry = industryType === "new" ? newIndustry.trim() : selectedIndustry;
    
    if (!industry) {
      toast({
        title: "Error",
        description: "Please select or enter an industry",
        variant: "destructive",
      });
      return;
    }

    if (!profession.trim()) {
      toast({
        title: "Error",
        description: "Please enter a profession name",
        variant: "destructive",
      });
      return;
    }

    // Parse comma-separated specialties from input field if any
    let finalSpecialties = [...specialties];
    if (specialtyInput.trim()) {
      const inputSpecialties = specialtyInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s && !finalSpecialties.includes(s));
      finalSpecialties = [...finalSpecialties, ...inputSpecialties];
    }

    if (finalSpecialties.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one specialty",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Add timeout to prevent indefinite hanging
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const invokePromise = supabase.functions.invoke('request-keyword-suggestions', {
        body: { 
          industry: industry,
          profession: profession.trim(),
          specialties: finalSpecialties,
          isNewIndustry: industryType === "new"
        }
      });

      const { data, error } = await Promise.race([invokePromise, timeout]) as any;

      if (error) {
        console.error("Function returned error:", error);
        throw error;
      }

      toast({
        title: "Request Submitted",
        description: "Thank you! We'll review your industry/profession request and add it to our system.",
      });
      
      // Reset form
      setSelectedIndustry("");
      setNewIndustry("");
      setProfession("");
      setSpecialties([]);
      setSpecialtyInput("");
    } catch (error: any) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PlusCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Create New Industry/Profession</CardTitle>
        </div>
        <CardDescription>
          Add a new industry category with professions and specialties, or add to an existing industry
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Industry Selection */}
          <div className="space-y-2">
            <Label>Industry Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="existing"
                  checked={industryType === "existing"}
                  onChange={(e) => setIndustryType(e.target.value as "existing")}
                  disabled={isSubmitting}
                />
                <span>Existing Industry</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="new"
                  checked={industryType === "new"}
                  onChange={(e) => setIndustryType(e.target.value as "new")}
                  disabled={isSubmitting}
                />
                <span>New Industry</span>
              </label>
            </div>
          </div>

          {industryType === "existing" ? (
            <div className="space-y-2">
              <Label>Select Industry</Label>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry} disabled={isSubmitting}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose an existing industry..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[200px] overflow-y-auto">
                  {existingIndustries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="newIndustry">New Industry Name</Label>
              <Input
                id="newIndustry"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                placeholder="e.g., Marine Services, Aerospace"
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Profession Name */}
          <div className="space-y-2">
            <Label htmlFor="profession">Profession Name</Label>
            <Input
              id="profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g., Yacht Maintenance, Drone Photography"
              disabled={isSubmitting}
            />
          </div>

          {/* Specialties */}
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialties/Keywords</Label>
            <div className="flex gap-2">
              <Input
                id="specialty"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                placeholder="e.g., hull cleaning, engine repair"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                onClick={addSpecialty}
                disabled={isSubmitting || !specialtyInput.trim()}
                variant="outline"
              >
                Add
              </Button>
            </div>
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="gap-1">
                    {specialty}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeSpecialty(specialty)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Add multiple specialties by typing and clicking "Add" or pressing Enter. You can also use commas to separate multiple specialties.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

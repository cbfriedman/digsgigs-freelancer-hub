import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, AlertTriangle, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Only pre-approved, safe industries (unlicensed/support services)
const existingIndustries = [
  "Construction & Home Services",
  "Technology Services",
  "Business Services",
  "Automotive Services",
  "Pet Care",
  "Education & Tutoring",
  "Fitness & Wellness",
  "Event Services",
  "Cleaning & Maintenance",
  "Moving & Storage",
  "Beauty & Personal Care",
  "Digital & Creative Services",
  "Coaching & Training",
  "Customer Support & Admin"
];

export const ProfessionRequestForm = () => {
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [profession, setProfession] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedIndustry) {
      toast({
        title: "Error",
        description: "Please select an industry category",
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

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Add timeout to prevent indefinite hanging
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const invokePromise = supabase.functions.invoke('request-keyword-suggestions', {
        body: { 
          industry: selectedIndustry,
          profession: profession.trim(),
          specialties: [profession.trim()], // Use profession as the specialty
          isNewIndustry: false,
          description: description.trim()
        }
      });

      const { data, error } = await Promise.race([invokePromise, timeout]) as any;

      if (error) {
        console.error("Function returned error:", error);
        throw error;
      }

      toast({
        title: "Request Submitted",
        description: "Thank you! Our team will review your profession request. You'll be notified once it's approved.",
      });
      
      // Reset form
      setSelectedIndustry("");
      setProfession("");
      setDescription("");
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
          <Send className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Request New Profession</CardTitle>
        </div>
        <CardDescription>
          Can't find your profession in our list? Submit a request and our team will review it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Important Notice */}
        <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Important Notice</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
            <p className="mb-2">
              All profession requests are manually reviewed to ensure compliance with platform guidelines.
            </p>
            <p className="font-medium">
              Note: We do not support licensed/regulated professions including attorneys, architects, 
              licensed contractors, mortgage brokers, real estate agents, CPAs, therapists, or medical professionals.
            </p>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Industry Selection */}
          <div className="space-y-2">
            <Label>Industry Category *</Label>
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry} disabled={isSubmitting}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select an industry category..." />
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

          {/* Profession Name */}
          <div className="space-y-2">
            <Label htmlFor="profession">Profession Name *</Label>
            <Input
              id="profession"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g., Pet Groomer, Virtual Assistant, Event Photographer"
              disabled={isSubmitting}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Enter the specific profession or service you provide
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe the services you provide..."
              disabled={isSubmitting}
              maxLength={500}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Submit Request for Review"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Requests are typically reviewed within 1-2 business days
          </p>
        </form>
      </CardContent>
    </Card>
  );
};
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProfessions, useSubmitProfessionRequest } from "@/hooks/useProfessions";

export const ProfessionRequestForm = () => {
  const { categories, loading: categoriesLoading } = useProfessions();
  const { submitRequest, submitting } = useSubmitProfessionRequest();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [profession, setProfession] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) {
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

    const result = await submitRequest({
      requestedProfession: profession.trim(),
      industryCategory: selectedCategory,
      description: description.trim() || undefined,
    });

    if (result.success) {
      toast({
        title: "Request Submitted",
        description: "Thank you! Our team will review your profession request. You'll be notified once it's approved.",
      });
      
      // Reset form
      setSelectedCategory("");
      setProfession("");
      setDescription("");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
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
        <Alert variant="warning">
          <Shield className="h-4 w-4" />
          <AlertTitle>Important Notice</AlertTitle>
          <AlertDescription className="text-sm">
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
          {/* Industry Selection - Now from database */}
          <div className="space-y-2">
            <Label>Industry Category *</Label>
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory} 
              disabled={submitting || categoriesLoading}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select an industry category..."} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-[200px] overflow-y-auto">
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
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
              disabled={submitting}
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
              disabled={submitting}
              maxLength={500}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Request for Review"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Requests are typically reviewed within 1-2 business days
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

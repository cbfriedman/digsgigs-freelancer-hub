import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SpecialtyRequestFormProps {
  industry: string;
  profession: string;
  onSuccess?: () => void;
}

export const SpecialtyRequestForm = ({ industry, profession, onSuccess }: SpecialtyRequestFormProps) => {
  const [specialtyName, setSpecialtyName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!specialtyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a specialty name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to request a specialty",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('specialty_requests')
        .insert({
          user_id: user.id,
          industry,
          profession,
          specialty_name: specialtyName.trim(),
          description: description.trim() || null,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already Requested",
            description: "This specialty has already been requested and is pending approval.",
            variant: "default",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Request Submitted",
          description: "Your specialty request has been submitted for admin approval. You can still add keywords for this specialty while it's pending.",
        });
        
        setSpecialtyName("");
        setDescription("");
        onSuccess?.();
      }
    } catch (error: any) {
      console.error("Error submitting specialty request:", error);
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
          <CardTitle className="text-lg">Request Custom Specialty</CardTitle>
        </div>
        <CardDescription>
          Can't find your specialty? Request it here. You can add keywords for it right away, even while it's pending approval.
        </CardDescription>
        <div className="flex gap-2 mt-2">
          <Badge variant="secondary">{industry}</Badge>
          <Badge variant="secondary">{profession}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="specialtyName">Specialty Name *</Label>
            <Input
              id="specialtyName"
              value={specialtyName}
              onChange={(e) => setSpecialtyName(e.target.value)}
              placeholder="e.g., Commercial HVAC, Residential Plumbing"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe this specialty and what makes it unique..."
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Submitting..." : "Request Specialty"}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            * Your request will be reviewed by our team. You can start adding keywords for this specialty immediately.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

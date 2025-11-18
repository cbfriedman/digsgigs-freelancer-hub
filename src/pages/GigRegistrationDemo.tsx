import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, MapPin } from "lucide-react";
import { GigCategorySelector } from "@/components/GigCategorySelector";
import { Navigation } from "@/components/Navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GigRegistrationDemo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    timeline: "",
    budget_min: "",
    budget_max: "",
    category_id: "",
    deadline: "",
    contact_preferences: "",
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast.error("Please accept the Terms of Service to continue");
      return;
    }
    
    if (!formData.title || !formData.description || !formData.location || !formData.category_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.title.length < 10) {
      toast.error("Title must be at least 10 characters");
      return;
    }

    if (formData.description.length < 50) {
      toast.error("Description must be at least 50 characters");
      return;
    }
    
    setLoading(true);

    // Simulate submission delay
    setTimeout(() => {
      setLoading(false);
      toast.success("Demo submission successful! In the real app, this would create a gig post.");
      
      // Clear form
      setFormData({
        title: "",
        description: "",
        location: "",
        timeline: "",
        budget_min: "",
        budget_max: "",
        category_id: "",
        deadline: "",
        contact_preferences: "",
        acceptTerms: false,
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Alert className="mb-6 bg-primary/10 border-primary/30">
          <AlertDescription className="text-center font-medium">
            🧪 Demo Mode - This is a preview of the gig posting form. No data will be saved.
          </AlertDescription>
        </Alert>

        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Post a Gig (Demo)</CardTitle>
                <CardDescription>
                  Try out the gig posting form without creating an account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Gig Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Need help with bathroom renovation"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you need in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[150px]"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 50 characters. Be specific about your requirements.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <GigCategorySelector
                  value={formData.category_id}
                  onChange={(value) => setFormData({ ...formData, category_id: value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="inline-block h-4 w-4 mr-1" />
                  Location *
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., 123 Main St, New York, NY"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full address where the work will be performed
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_min">Budget Min ($)</Label>
                  <Input
                    id="budget_min"
                    type="number"
                    placeholder="500"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max">Budget Max ($)</Label>
                  <Input
                    id="budget_max"
                    type="number"
                    placeholder="2000"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline (Optional)</Label>
                <Input
                  id="timeline"
                  placeholder="e.g., 2-3 weeks"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline (Optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_preferences">Contact Preferences (Optional)</Label>
                <Textarea
                  id="contact_preferences"
                  placeholder="e.g., Best time to call, preferred communication method"
                  value={formData.contact_preferences}
                  onChange={(e) => setFormData({ ...formData, contact_preferences: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={formData.acceptTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, acceptTerms: checked as boolean })
                  }
                />
                <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <a href="/terms-of-service" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{" "}
                  and understand that this is a demo submission
                </Label>
              </div>

              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Submitting..." : "Post Gig (Demo)"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GigRegistrationDemo;

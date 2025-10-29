import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Briefcase } from "lucide-react";
import { z } from "zod";

const gigSchema = z.object({
  title: z.string().trim().min(10, "Title must be at least 10 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().min(50, "Description must be at least 50 characters").max(2000, "Description must be less than 2000 characters"),
  budget_min: z.number().min(0, "Budget must be positive").optional(),
  budget_max: z.number().min(0, "Budget must be positive").optional(),
  category_id: z.string().uuid("Please select a category"),
  deadline: z.string().optional(),
});

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const PostGig = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
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
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Please sign in to post a gig");
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", session.user.id)
      .single();

    if (profile?.user_type === "digger") {
      toast.error("Only consumers can post gigs");
      navigate("/");
      return;
    }

    const { data: categoriesData, error } = await supabase
      .from("categories")
      .select("id, name, description")
      .is("parent_category_id", null)
      .order("name");

    if (error) {
      toast.error("Failed to load categories");
      return;
    }

    setCategories(categoriesData || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = gigSchema.parse({
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
        deadline: formData.deadline || undefined,
      });

      if (validatedData.budget_min && validatedData.budget_max && validatedData.budget_min > validatedData.budget_max) {
        toast.error("Minimum budget cannot be greater than maximum budget");
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth");
        return;
      }

      const { error } = await supabase.from("gigs").insert({
        consumer_id: session.user.id,
        title: validatedData.title,
        description: validatedData.description,
        location: formData.location,
        timeline: formData.timeline,
        budget_min: validatedData.budget_min,
        budget_max: validatedData.budget_max,
        category_id: validatedData.category_id,
        deadline: validatedData.deadline,
        contact_preferences: formData.contact_preferences || null,
        status: "open",
      });

      if (error) throw error;

      toast.success("Gig posted successfully!");
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to post gig. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgiggs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl">Post a Gig</CardTitle>
                <CardDescription className="text-base mt-1">
                  Find skilled freelancers for your project
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Build a responsive e-commerce website"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your project in detail, including requirements, deliverables, and expectations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={8}
                  maxLength={2000}
                  className="resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  {formData.description.length}/2000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="City, State or Zip Code"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Project Timeline *</Label>
                <Input
                  id="timeline"
                  placeholder="e.g., 2-3 weeks, ASAP, Flexible"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_min">Min Budget ($)</Label>
                  <Input
                    id="budget_min"
                    type="number"
                    placeholder="500"
                    value={formData.budget_min}
                    onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                    min="0"
                    step="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget_max">Max Budget ($)</Label>
                  <Input
                    id="budget_max"
                    type="number"
                    placeholder="1000"
                    value={formData.budget_max}
                    onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Project Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_preferences">Contact Preferences</Label>
                <Input
                  id="contact_preferences"
                  placeholder="e.g., Email only, Phone preferred, Text messages OK"
                  value={formData.contact_preferences}
                  onChange={(e) => setFormData({ ...formData, contact_preferences: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Posting..." : "Post Gig"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostGig;
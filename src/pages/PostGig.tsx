import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { GigCategorySelector } from "@/components/GigCategorySelector";
import { geocodeAddress } from "@/utils/geocoding";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";

const gigSchema = z.object({
  title: z.string().trim().min(10, "Title must be at least 10 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().min(50, "Description must be at least 50 characters").max(2000, "Description must be less than 2000 characters"),
  budget_min: z.number().min(0, "Budget must be positive").optional(),
  budget_max: z.number().min(0, "Budget must be positive").optional(),
  category_id: z.string().uuid("Please select a category"),
  deadline: z.string().optional(),
});

const PostGig = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // TEMPORARILY DISABLED FOR SCREENSHOTS
    return;
    
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast.error("Please accept the Terms of Service to continue");
      return;
    }
    
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

      // Show preview instead of submitting directly
      setLoading(false);
      setShowPreview(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to validate form");
      }
      setLoading(false);
    }
  };

  const handleApproveAndPost = async () => {
    setShowPreview(false);
    setLoading(true);

    try {
      const validatedData = gigSchema.parse({
        ...formData,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
        budget_max: formData.budget_max ? parseFloat(formData.budget_max) : undefined,
        deadline: formData.deadline || undefined,
      });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth");
        return;
      }

      // Geocode the location
      let locationLat: number | undefined;
      let locationLng: number | undefined;
      
      if (formData.location) {
        setGeocoding(true);
        const geocodeResult = await geocodeAddress(formData.location);
        setGeocoding(false);
        
        if (geocodeResult) {
          locationLat = geocodeResult.latitude;
          locationLng = geocodeResult.longitude;
          toast.success("Location geocoded successfully");
        } else {
          toast.error("Could not geocode location. Gig will be posted without map coordinates.");
        }
      }

      const { data: gigData, error } = await supabase
        .from("gigs")
        .insert({
          consumer_id: session.user.id,
          title: validatedData.title,
          description: validatedData.description,
          location: formData.location,
          location_lat: locationLat,
          location_lng: locationLng,
          timeline: formData.timeline,
          budget_min: validatedData.budget_min,
          budget_max: validatedData.budget_max,
          category_id: validatedData.category_id,
          deadline: validatedData.deadline,
          contact_preferences: formData.contact_preferences || null,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Match diggers using AI semantic matching
      toast.info("Analyzing gig and matching with relevant professionals...");
      
      try {
        // Get category name for better matching
        let categoryName = "";
        if (validatedData.category_id) {
          const { data: categoryData } = await supabase
            .from("categories")
            .select("name")
            .eq("id", validatedData.category_id)
            .single();
          categoryName = categoryData?.name || "";
        }

        const { data: matchData, error: matchError } = await supabase.functions.invoke(
          "match-diggers-semantic",
          {
            body: {
              gig_title: validatedData.title,
              gig_description: validatedData.description,
              gig_category: categoryName,
            },
          }
        );

        if (!matchError && matchData?.matches && matchData.matches.length > 0) {
          console.log(`AI semantic matching found ${matchData.matches.length} relevant diggers`);
          
          // Send notifications to matched diggers
          for (const match of matchData.matches) {
            try {
              await supabase.rpc('create_notification', {
                p_user_id: match.user_id,
                p_title: 'New Gig Match',
                p_message: `${match.business_name}, we found a gig that matches your expertise! "${validatedData.title}"`,
                p_type: 'new_gig',
                p_link: `/gig/${gigData.id}`,
                p_metadata: {
                  gig_id: gigData.id,
                  confidence: match.confidence,
                  reasoning: match.reasoning
                }
              });
            } catch (notifError) {
              console.error('Error sending notification:', notifError);
            }
          }
        }
      } catch (matchError) {
        console.error("Error matching diggers:", matchError);
        // Don't fail the gig posting if matching fails
      }

      toast.success("Gig posted and matched with relevant professionals!");
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

  const handleEdit = () => {
    setShowPreview(false);
    toast.info("Edit your gig details below");
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
  };

  const formatBudget = () => {
    if (formData.budget_min && formData.budget_max) {
      return `$${formData.budget_min} - $${formData.budget_max}`;
    } else if (formData.budget_min) {
      return `Starting at $${formData.budget_min}`;
    } else if (formData.budget_max) {
      return `Up to $${formData.budget_max}`;
    }
    return "Budget not specified";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Post a Gig - Find Qualified Service Professionals"
        description="Post your project and connect with skilled service professionals. Get competitive bids from verified contractors, freelancers, and service providers. Free to post, only pay when you hire."
        keywords="post project, hire contractor, find professional, post job, get quotes, service request"
      />
      <Navigation showBackButton backLabel="Back to Home" />

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
                  <Label htmlFor="location" className="flex items-center gap-2">
                    Location *
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </Label>
                  <Input
                    id="location"
                    placeholder="City, State or Zip Code"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    We'll convert this to map coordinates for location-based filtering
                  </p>
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

              <GigCategorySelector
                value={formData.category_id}
                onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
              />

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

              {/* Terms Acceptance */}
              <div className="space-y-4 pt-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked as boolean })}
                    required
                  />
                  <Label htmlFor="acceptTerms" className="cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => window.open("/terms", "_blank")}
                      className="text-primary hover:underline"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={() => window.open("/privacy", "_blank")}
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </button>
                    . I understand that DiggsAndGiggs is a marketplace platform and all work agreements are between me and the service provider directly.
                  </Label>
                </div>
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

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Your Gig Post</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <Alert>
              <AlertDescription>
                This is how your gig will appear to Diggers. Review it carefully before posting.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline">{formData.category_id || "Uncategorized"}</Badge>
                </div>
                <CardTitle className="text-2xl">{formData.title}</CardTitle>
                <CardDescription className="text-base mt-2">
                  {formData.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{formData.location}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <span className="font-semibold">{formatBudget()}</span>
                  </div>
                  {formData.timeline && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{formData.timeline}</span>
                    </div>
                  )}
                </div>

                {formData.deadline && (
                  <div className="text-sm">
                    <span className="font-semibold">Deadline:</span> {new Date(formData.deadline).toLocaleDateString()}
                  </div>
                )}

                {formData.contact_preferences && (
                  <div className="text-sm">
                    <span className="font-semibold">Contact Preferences:</span>
                    <p className="mt-1 text-muted-foreground">{formData.contact_preferences}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleCancelPreview}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleEdit}>
                Edit Post
              </Button>
              <Button onClick={handleApproveAndPost} disabled={loading}>
                {loading ? "Posting..." : "Approve & Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostGig;
import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Globe } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { TIMELINE_OPTIONS } from "@/config/giggerProblems";
import { formatSelectionDisplay } from "@/config/regionOptions";
import { RegionCountrySelector } from "@/components/RegionCountrySelector";

const GigEdit = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  useEffect(() => {
    const loadGig = async () => {
      if (!id) {
        toast.error("No project ID provided");
        navigate("/");
        return;
      }

      try {
        // Fetch the gig
        const { data: gig, error } = await supabase
          .from("gigs")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !gig) {
          toast.error("Project not found");
          navigate("/");
          return;
        }

        // Check authorization - either logged in user owns it, or email matches
        const { data: { session } } = await supabase.auth.getSession();
        
        const isOwner = session?.user?.id && gig.consumer_id === session.user.id;
        
        // Allow if user's email matches (for email link access)
        const emailMatch = session?.user?.email && gig.consumer_email === session.user.email;

        if (!isOwner && !emailMatch) {
          // If not logged in, redirect to login with return URL
          if (!session) {
            toast.error("Please sign in to edit this project");
            navigate(`/register?mode=signin&returnTo=/gig/${id}/edit`);
            return;
          }
          toast.error("You don't have permission to edit this project");
          navigate("/");
          return;
        }

        setAuthorized(true);
        
        // Populate form
        setTitle(gig.title || "");
        setDescription(gig.description || "");
        setBudgetMin(gig.budget_min?.toString() || "");
        setBudgetMax(gig.budget_max?.toString() || "");
        setTimeline(gig.timeline || "");
        setPreferredRegions(gig.preferred_regions || []);
        setClientName(gig.client_name || "");
        setClientPhone(gig.consumer_phone || "");
        
      } catch (err) {
        console.error("Error loading gig:", err);
        toast.error("Failed to load project");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadGig();
  }, [id, token, navigate]);

  const formatCurrency = (value: string): string => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    const number = parseInt(numericValue);
    if (isNaN(number)) return '';
    return number.toLocaleString('en-US');
  };

  const parseCurrency = (value: string): number => {
    return parseInt(value.replace(/[^0-9]/g, '')) || 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a project description");
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("gigs")
        .update({
          title: title.trim(),
          description: description.trim(),
          budget_min: parseCurrency(budgetMin) || null,
          budget_max: parseCurrency(budgetMax) || null,
          timeline: timeline || null,
          preferred_regions: preferredRegions.length > 0 ? preferredRegions : null,
          client_name: clientName.trim() || null,
          consumer_phone: clientPhone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Project updated successfully!");
      navigate(`/gig/${id}`);
    } catch (error: any) {
      console.error("Error updating gig:", error);
      toast.error(error.message || "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return null; // Redirect happens in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Edit Project | Digs & Gigs"
        description="Update your project details."
      />
      <Navigation showBackButton backLabel="Back" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`/gig/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Project
              </Button>
            </div>
            <CardTitle className="text-2xl">Edit Project</CardTitle>
            <CardDescription>
              Update your project details below
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Website redesign"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need..."
                  rows={5}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Budget Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="budgetMin" className="text-xs text-muted-foreground">Minimum ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="budgetMin"
                        placeholder="1,000"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(formatCurrency(e.target.value))}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="budgetMax" className="text-xs text-muted-foreground">Maximum ($)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="budgetMax"
                        placeholder="2,500"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(formatCurrency(e.target.value))}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeline">Timeline</Label>
                <Select value={timeline} onValueChange={setTimeline}>
                  <SelectTrigger id="timeline">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Region Preference */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Preferred Freelancer Location
                </Label>
                <p className="text-xs text-muted-foreground">
                  Select regions or specific countries where you'd prefer freelancers to be located.
                  Leave empty for all regions. Click a region to expand and select individual countries.
                </p>
                {preferredRegions.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    Selected: {formatSelectionDisplay(preferredRegions)}
                  </p>
                )}
                <RegionCountrySelector
                  selectedValues={preferredRegions}
                  onChange={setPreferredRegions}
                />
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="font-medium">Contact Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="clientName">Name</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Phone (optional)</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/gig/${id}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default GigEdit;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface Reference {
  name: string;
  email: string;
  phone: string;
  description: string;
}

const DiggerRegistration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [references, setReferences] = useState<Reference[]>([{ name: "", email: "", phone: "", description: "" }]);
  
  const [formData, setFormData] = useState({
    profession: "",
    bio: "",
    portfolio_url: "",
    hourly_rate: "",
    years_experience: "",
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Check if user is a digger
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", session.user.id)
      .single();

    if (profile?.user_type !== "digger") {
      toast.error("Only diggers can access this page");
      navigate("/");
      return;
    }

    // Load categories
    const { data: categoriesData, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load categories");
    } else {
      setCategories(categoriesData || []);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const addReference = () => {
    setReferences([...references, { name: "", email: "", phone: "", description: "" }]);
  };

  const updateReference = (index: number, field: keyof Reference, value: string) => {
    const newReferences = [...references];
    newReferences[index][field] = value;
    setReferences(newReferences);
  };

  const removeReference = (index: number) => {
    if (references.length > 1) {
      setReferences(references.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Create digger profile
      const { data: diggerProfile, error: profileError } = await supabase
        .from("digger_profiles")
        .insert({
          user_id: session.user.id,
          profession: formData.profession,
          bio: formData.bio,
          portfolio_url: formData.portfolio_url || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // Add selected categories
      const categoryInserts = selectedCategories.map((categoryId) => ({
        digger_id: diggerProfile.id,
        category_id: categoryId,
      }));

      const { error: categoriesError } = await supabase
        .from("digger_categories")
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;

      // Add references
      const validReferences = references.filter(
        (ref) => ref.name && ref.email
      );

      if (validReferences.length > 0) {
        const referenceInserts = validReferences.map((ref) => ({
          digger_id: diggerProfile.id,
          reference_name: ref.name,
          reference_email: ref.email,
          reference_phone: ref.phone || null,
          project_description: ref.description || null,
        }));

        const { error: referencesError } = await supabase
          .from("references")
          .insert(referenceInserts);

        if (referencesError) throw referencesError;
      }

      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Digger Registration</CardTitle>
            <CardDescription>
              Complete your profile to start receiving gig opportunities. You can register under multiple categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Basic Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="profession">Primary Profession *</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                    placeholder="e.g., Licensed Electrician, Attorney, Web Developer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio *</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Describe your skills, experience, and what makes you stand out..."
                    required
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="years_experience">Years of Experience</Label>
                    <Input
                      id="years_experience"
                      type="number"
                      value={formData.years_experience}
                      onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio_url">Portfolio/Website URL</Label>
                  <Input
                    id="portfolio_url"
                    type="url"
                    value={formData.portfolio_url}
                    onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <Separator />

              {/* Categories */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">Select Categories *</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select all categories you want to register under. Each category will be a separate "Dig".
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto border rounded-md p-4">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={category.id}
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => handleCategoryToggle(category.id)}
                      />
                      <div className="grid gap-1 leading-none">
                        <Label
                          htmlFor={category.id}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {category.name}
                        </Label>
                        {category.description && (
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected categories: {selectedCategories.length}
                </p>
              </div>

              <Separator />

              {/* References */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">Verifiable References</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add references with contact information. This information is private and only visible to you.
                  </p>
                </div>
                {references.map((ref, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Reference {index + 1}</h4>
                        {references.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeReference(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={ref.name}
                            onChange={(e) => updateReference(index, "name", e.target.value)}
                            placeholder="John Smith"
                            required={index === 0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={ref.email}
                            onChange={(e) => updateReference(index, "email", e.target.value)}
                            placeholder="john@example.com"
                            required={index === 0}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input
                          type="tel"
                          value={ref.phone}
                          onChange={(e) => updateReference(index, "phone", e.target.value)}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Project Description</Label>
                        <Textarea
                          value={ref.description}
                          onChange={(e) => updateReference(index, "description", e.target.value)}
                          placeholder="Describe the project you worked on with this reference..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={addReference} className="w-full">
                  Add Another Reference
                </Button>
              </div>

              <Separator />

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Creating Profile..." : "Create Digger Profile"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/")} className="flex-1">
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

export default DiggerRegistration;

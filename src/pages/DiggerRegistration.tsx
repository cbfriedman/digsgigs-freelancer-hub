import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RegistrationCategorySelector } from "@/components/RegistrationCategorySelector";
import { Loader2, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";

const DiggerRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [profession, setProfession] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [keywordsInput, setKeywordsInput] = useState("");
  
  // Parse keywords from input
  const keywords = keywordsInput
    .split(/[,;]/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!businessName || !profession || !location || !phone || selectedCategories.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("digger_profiles").insert({
        user_id: user.id,
        business_name: businessName,
        profession,
        location,
        phone,
        bio: bio || null,
        keywords: keywords.length > 0 ? keywords : null,
      });

      if (error) throw error;

      // Insert selected categories
      if (selectedCategories.length > 0) {
        const { data: profileData } = await supabase
          .from("digger_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profileData) {
          const categoryInserts = selectedCategories.map((categoryId) => ({
            digger_id: profileData.id,
            category_id: categoryId,
          }));

          await supabase.from("digger_categories").insert(categoryInserts);
        }
      }

      toast.success("Profile created successfully!");
      navigate("/profile-completion");
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  // Highlight keywords in real-time
  const highlightKeywords = (text: string): { text: string; isKeyword: boolean }[] => {
    const parts: { text: string; isKeyword: boolean }[] = [];
    
    if (keywords.length === 0) {
      return [{ text, isKeyword: false }];
    }
    
    let currentIndex = 0;
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    while (currentIndex < text.length) {
      let foundKeyword = false;
      
      for (const keyword of sortedKeywords) {
        const remaining = text.slice(currentIndex);
        if (remaining.toLowerCase().startsWith(keyword.toLowerCase())) {
          parts.push({ text: text.slice(currentIndex, currentIndex + keyword.length), isKeyword: true });
          currentIndex += keyword.length;
          foundKeyword = true;
          break;
        }
      }
      
      if (!foundKeyword) {
        parts.push({ text: text[currentIndex], isKeyword: false });
        currentIndex++;
      }
    }
    
    return parts;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Create Your Digger Profile</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profession">Profession *</Label>
              <Input
                id="profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g., Plumber, Electrician"
                required
              />
            </div>

            <RegistrationCategorySelector
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your experience and expertise..."
                rows={4}
              />
              {keywords.length > 0 && bio && (
                <Card className="p-3 mt-2 bg-accent/30">
                  <p className="text-sm text-muted-foreground mb-2">Keyword matches in your bio:</p>
                  <p className="text-sm">
                    {highlightKeywords(bio).map((part, index) => (
                      <span
                        key={index}
                        className={part.isKeyword ? "bg-primary/20 text-primary font-semibold px-1 rounded" : ""}
                      >
                        {part.text}
                      </span>
                    ))}
                  </p>
                </Card>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="keywords">Keywords</Label>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Badge variant={keywords.length > 0 ? "default" : "secondary"}>
                    {keywords.length} {keywords.length === 1 ? "keyword" : "keywords"}
                  </Badge>
                </div>
              </div>
              <Textarea
                id="keywords"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="Enter keywords separated by commas or semicolons (e.g., residential plumbing, emergency repairs, water heaters)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Add relevant keywords to improve matching with gigs. Use commas or semicolons to separate keywords.
              </p>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                "Create Profile"
              )}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DiggerRegistration;

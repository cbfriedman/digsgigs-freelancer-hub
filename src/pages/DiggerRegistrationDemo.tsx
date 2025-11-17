import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { KeywordSuggestions } from "@/components/KeywordSuggestions";
import { generateEnhancedKeywordSuggestions } from "@/utils/enhancedKeywordSuggestions";

export default function DiggerRegistrationDemo() {
  const [businessName, setBusinessName] = useState("");
  const [profession, setProfession] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [servicesDescription, setServicesDescription] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [bio, setBio] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profession || categoryNames.length > 0) {
      generateEnhancedKeywordSuggestions(profession, categoryNames).then(suggestions => {
        setKeywordSuggestions(suggestions);
      });
    }
  }, [profession, categoryNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate a delay
    setTimeout(() => {
      toast.success("Demo Mode: Form submitted successfully! (No data saved)", {
        description: "In production, this would create your digger profile.",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  const highlightKeywords = (text: string) => {
    if (!keywords.length) return text;
    
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, `**${keyword}**`);
    });
    
    return highlightedText;
  };

  const handleAddKeyword = (keyword: string) => {
    const lowerKeyword = keyword.toLowerCase().trim();
    
    if (!keywords.some(k => k.toLowerCase() === lowerKeyword)) {
      setKeywords([...keywords, lowerKeyword]);
      toast.success(`Added keyword: "${lowerKeyword}"`, {
        description: "Demo mode - keyword usage not tracked",
      });
    }
  };

  const handleKeywordInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      handleAddKeyword(keywordInput);
      setKeywordInput("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              🧪 Demo Mode
            </h2>
            <p className="text-yellow-700">
              This is a test version of the registration page. You can interact with all fields, but no data will be saved to the database.
            </p>
          </div>

          <h1 className="text-4xl font-bold mb-2">Create Your Digger Profile</h1>
          <p className="text-muted-foreground mb-8">
            Tell us about your business and expertise
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium mb-2">
                Business Name *
              </label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label htmlFor="profession" className="block text-sm font-medium mb-2">
                Primary Profession *
              </label>
              <Input
                id="profession"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                required
                placeholder="e.g., Plumber, Electrician, Carpenter"
              />
            </div>

            <div>
              <label htmlFor="servicesDescription" className="block text-sm font-medium mb-2">
                Describe Your Services in Detail
              </label>
              <Textarea
                id="servicesDescription"
                value={servicesDescription}
                onChange={(e) => setServicesDescription(e.target.value)}
                placeholder="Detail the specific services you offer, your specialties, and what makes your work unique..."
                className="min-h-[120px]"
              />
            </div>

            {profession && (
              <>
                <div>
                  <label htmlFor="keywordInput" className="block text-sm font-medium mb-2">
                    Add Keywords
                  </label>
                  <div className="space-y-2">
                    <Input
                      id="keywordInput"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={handleKeywordInputKeyPress}
                      placeholder="Type a keyword and press Enter"
                    />
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm"
                          >
                            {keyword}
                            <button
                              type="button"
                              onClick={() => setKeywords(keywords.filter((_, i) => i !== index))}
                              className="hover:text-destructive"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} added
                    </p>
                  </div>
                </div>

                {keywordSuggestions.length > 0 && (
                  <KeywordSuggestions
                    suggestions={keywordSuggestions}
                    currentKeywords={keywords}
                    onAddKeyword={handleAddKeyword}
                  />
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Service Categories (Demo)
              </label>
              <p className="text-sm text-muted-foreground">
                In the full version, you would select your service categories here.
              </p>
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-2">
                Service Location *
              </label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="City, State"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">
                Phone Number *
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-2">
                Bio & Additional Information
              </label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Add any additional information about your business, experience, or credentials..."
                className="min-h-[100px]"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Create Profile (Demo)"}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

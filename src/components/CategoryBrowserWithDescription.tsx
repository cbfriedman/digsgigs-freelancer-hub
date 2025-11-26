import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { generateKeywordSuggestions } from "@/utils/keywordSuggestions";

const DEFAULT_CATEGORIES = [
  "Legal Services",
  "Insurance & Financial Services",
  "Construction & Home Services",
  "Medical & Healthcare",
  "Technology Services",
  "Business Services",
  "Automotive Services",
  "Pet Care",
  "Education & Tutoring",
  "Fitness & Wellness",
  "Event Services",
  "Cleaning & Maintenance",
  "Moving & Storage",
  "Beauty & Personal Care"
].sort();

interface CustomCategory {
  id: string;
  name: string;
  user_id: string;
}

export const CategoryBrowserWithDescription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [newKeyword, setNewKeyword] = useState("");
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);

  // Fetch user's custom categories
  useEffect(() => {
    if (user?.id) {
      fetchCustomCategories();
    }
  }, [user?.id]);

  const fetchCustomCategories = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('custom_categories')
      .select('*')
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error fetching custom categories:", error);
      return;
    }
    
    setCustomCategories(data || []);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to create custom categories");
      return;
    }

    setIsCreatingCategory(true);

    try {
      const { data, error } = await supabase
        .from('custom_categories')
        .insert({
          name: newCategoryName.trim(),
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setCustomCategories(prev => [...prev, data]);
      setNewCategoryName("");
      setIsAddingCategory(false);
      toast.success("Custom category created!");
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleContinue = async () => {
    if (!description.trim()) {
      toast.error("Please describe your specialties");
      return;
    }

    setIsProcessing(true);

    try {
      // Try AI-powered edge function with 10-second timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const edgeFunctionPromise = supabase.functions.invoke('suggest-keywords-from-description', {
        body: { description: description.trim() }
      });

      const { data, error } = await Promise.race([edgeFunctionPromise, timeoutPromise]) as any;

      if (error) throw error;

      if (data?.keywords && data.keywords.length > 0) {
        setSuggestedKeywords(data.keywords);
        setSelectedKeywords(new Set(data.keywords));
        toast.success(`AI found ${data.keywords.length} relevant keywords!`);
        return;
      }
    } catch (error: any) {
      console.log("Edge function failed, using local keyword suggestions:", error);
      
      // Fallback to local keyword generation
      const categoryToprofession: Record<string, string> = {
        "Construction & Home Services": "contractor",
        "Legal Services": "lawyer",
        "Medical & Healthcare": "consultant",
        "Automotive Services": "mechanic",
        "Cleaning & Maintenance": "cleaner",
        "Technology Services": "designer",
        "Business Services": "consultant",
        "Event Services": "photographer"
      };

      const profession = categoryToprofession[selectedCategory] || "contractor";
      const localKeywords = generateKeywordSuggestions(profession, [selectedCategory.toLowerCase()]);

      if (localKeywords.length > 0) {
        setSuggestedKeywords(localKeywords);
        setSelectedKeywords(new Set(localKeywords));
        toast.success(`Found ${localKeywords.length} relevant keywords from our database!`);
      } else {
        toast.error("No keywords found. Please try a more detailed description.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map(c => c.name)
  ].sort();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <CardTitle>Browse Categories</CardTitle>
        </div>
        <CardDescription>
          Select your industry category and describe your specialties
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category">Select Industry Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger id="category" className="bg-background">
              <SelectValue placeholder="Choose a category..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-[300px] overflow-y-auto">
              {allCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                  {customCategories.some(c => c.name === category) && (
                    <span className="ml-2 text-xs text-muted-foreground">(Custom)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add Custom Category */}
        {user && (
          <div className="space-y-2">
            {!isAddingCategory ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingCategory(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Category
              </Button>
            ) : (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <Label htmlFor="newCategory">New Category Name</Label>
                <Input
                  id="newCategory"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name..."
                  className="bg-background"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isCreatingCategory}
                    size="sm"
                  >
                    {isCreatingCategory ? "Creating..." : "Create"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This category will only be visible to you
                </p>
              </div>
            )}
          </div>
        )}

        {/* Specialty Description */}
        {selectedCategory && (
          <div className="space-y-2">
            <Label htmlFor="description">Describe Your Specialties</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you do within this category, your specific services, expertise, and specializations..."
              className="min-h-[150px] bg-background"
            />
            <p className="text-sm text-muted-foreground">
              Be specific about your services and expertise within {selectedCategory}
            </p>
          </div>
        )}

        {/* Info Box and Continue Button */}
        {selectedCategory && description && !suggestedKeywords.length && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Next Steps</h4>
              <p className="text-sm text-muted-foreground">
                Your description will be used to match you with relevant leads in the {selectedCategory} category.
                The more specific you are, the better your matches will be.
              </p>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleContinue}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing your specialties...
                </>
              ) : (
                'Continue to Keyword Selection'
              )}
            </Button>
          </div>
        )}

        {/* Suggested Keywords Display */}
        {suggestedKeywords.length > 0 && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Suggested Keywords ({suggestedKeywords.length})</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Click keywords to select/deselect them, or click the X to remove them.
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedKeywords.map((keyword, index) => {
                  const isSelected = selectedKeywords.has(keyword);
                  return (
                    <div
                      key={index}
                      className={`group relative px-3 py-1.5 rounded-md text-sm cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-2 border-primary text-primary font-medium'
                          : 'bg-background border-2 border-dashed border-border text-muted-foreground hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedKeywords);
                        if (isSelected) {
                          newSelected.delete(keyword);
                        } else {
                          newSelected.add(keyword);
                        }
                        setSelectedKeywords(newSelected);
                      }}
                    >
                      {isSelected && <span className="mr-1">✓</span>}
                      {keyword}
                      <button
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newKeywords = suggestedKeywords.filter((k) => k !== keyword);
                          setSuggestedKeywords(newKeywords);
                          const newSelected = new Set(selectedKeywords);
                          newSelected.delete(keyword);
                          setSelectedKeywords(newSelected);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {/* Add Custom Keyword */}
              <div className="mt-4 pt-4 border-t border-border">
                {!isAddingKeyword ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingKeyword(true)}
                    className="w-full"
                  >
                    + Add Custom Keyword
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter keyword..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKeyword.trim()) {
                          const trimmed = newKeyword.trim();
                          if (!suggestedKeywords.includes(trimmed)) {
                            setSuggestedKeywords([...suggestedKeywords, trimmed]);
                            setSelectedKeywords(new Set([...selectedKeywords, trimmed]));
                          }
                          setNewKeyword("");
                          setIsAddingKeyword(false);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        const trimmed = newKeyword.trim();
                        if (trimmed) {
                          if (!suggestedKeywords.includes(trimmed)) {
                            setSuggestedKeywords([...suggestedKeywords, trimmed]);
                            setSelectedKeywords(new Set([...selectedKeywords, trimmed]));
                          }
                          setNewKeyword("");
                          setIsAddingKeyword(false);
                        }
                      }}
                      disabled={!newKeyword.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewKeyword("");
                        setIsAddingKeyword(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1" 
                size="lg"
                onClick={async () => {
                  const selected = Array.from(selectedKeywords);
                  sessionStorage.setItem('selectedKeywords', JSON.stringify({
                    category: selectedCategory,
                    description: description,
                    keywords: selected
                  }));
                  toast.success(`Saved ${selected.length} keyword${selected.length !== 1 ? 's' : ''}!`);
                  
                  // Check if user has a digger profile
                  if (user) {
                    const { data: diggerProfile } = await supabase
                      .from('digger_profiles')
                      .select('id')
                      .eq('user_id', user.id)
                      .maybeSingle();
                    
                    if (diggerProfile) {
                      navigate('/edit-digger-profile');
                    } else {
                      navigate('/digger-registration');
                    }
                  } else {
                    navigate('/register');
                  }
                }}
                disabled={selectedKeywords.size === 0}
              >
                Use {selectedKeywords.size} Selected Keyword{selectedKeywords.size !== 1 ? 's' : ''}
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => {
                  setSuggestedKeywords([]);
                  setSelectedKeywords(new Set());
                  setIsAddingKeyword(false);
                  setNewKeyword("");
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

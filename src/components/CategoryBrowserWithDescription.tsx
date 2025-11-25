import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

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

        {/* Info Box */}
        {selectedCategory && description && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Next Steps</h4>
            <p className="text-sm text-muted-foreground">
              Your description will be used to match you with relevant leads in the {selectedCategory} category.
              The more specific you are, the better your matches will be.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

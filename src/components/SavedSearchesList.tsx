import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Bell, BellOff, Search } from "lucide-react";

interface SavedSearch {
  id: string;
  name: string;
  search_type: string;
  filters: any;
  email_alerts_enabled: boolean;
  created_at: string;
}

interface SavedSearchesListProps {
  searchType: 'gigs' | 'diggers';
  onApplySearch: (filters: any) => void;
}

export const SavedSearchesList = ({ searchType, onApplySearch }: SavedSearchesListProps) => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedSearches();
  }, [searchType]);

  const loadSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .eq('search_type', searchType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearches(data || []);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailAlerts = async (searchId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ email_alerts_enabled: enabled })
        .eq('id', searchId);

      if (error) throw error;

      setSearches(searches.map(s => 
        s.id === searchId ? { ...s, email_alerts_enabled: enabled } : s
      ));

      toast.success(enabled ? "Email alerts enabled" : "Email alerts disabled");
    } catch (error) {
      console.error('Error updating search:', error);
      toast.error("Failed to update search");
    }
  };

  const deleteSearch = async (searchId: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', searchId);

      if (error) throw error;

      setSearches(searches.filter(s => s.id !== searchId));
      toast.success("Search deleted");
    } catch (error) {
      console.error('Error deleting search:', error);
      toast.error("Failed to delete search");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Loading saved searches...</p>
        </CardContent>
      </Card>
    );
  }

  if (searches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No saved searches yet. Use the advanced filters to create one!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Saved Searches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {searches.map((search) => (
          <div
            key={search.id}
            className="p-4 border rounded-lg space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold flex items-center gap-2">
                  {search.name}
                  {search.email_alerts_enabled && (
                    <Bell className="h-4 w-4 text-primary" />
                  )}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Created {new Date(search.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApplySearch(search.filters)}
                >
                  <Search className="h-4 w-4 mr-1" />
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSearch(search.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`alerts-${search.id}`}
                checked={search.email_alerts_enabled}
                onCheckedChange={(checked) => toggleEmailAlerts(search.id, checked)}
              />
              <Label htmlFor={`alerts-${search.id}`} className="text-sm cursor-pointer">
                Email alerts for matching results
              </Label>
            </div>

            {/* Display applied filters */}
            <div className="flex flex-wrap gap-2">
              {search.filters.selectedCategories?.length > 0 && (
                <Badge variant="secondary">
                  {search.filters.selectedCategories.length} categories
                </Badge>
              )}
              {search.filters.budgetRange && (
                <Badge variant="secondary">
                  ${search.filters.budgetRange[0]} - ${search.filters.budgetRange[1]}
                </Badge>
              )}
              {search.filters.hourlyRateRange && (
                <Badge variant="secondary">
                  ${search.filters.hourlyRateRange[0]}-${search.filters.hourlyRateRange[1]}/hr
                </Badge>
              )}
              {search.filters.locationRadius && (
                <Badge variant="secondary">
                  {search.filters.locationRadius}mi radius
                </Badge>
              )}
              {search.filters.minRating && (
                <Badge variant="secondary">
                  {search.filters.minRating}+ stars
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

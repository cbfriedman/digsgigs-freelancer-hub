import { useState, useEffect, useCallback } from "react";
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
  /** Register refetch so parent can refresh list when a new search is saved elsewhere (e.g. Refine panel). */
  onRegisterRefetch?: (refetch: () => void) => void;
}

export const SavedSearchesList = ({ searchType, onApplySearch, onRegisterRefetch }: SavedSearchesListProps) => {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSavedSearches = useCallback(async () => {
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
  }, [searchType]);

  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  useEffect(() => {
    onRegisterRefetch?.(loadSavedSearches);
  }, [onRegisterRefetch, loadSavedSearches]);

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

      toast.success(enabled ? "Alerts on" : "Alerts off");
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
      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs text-muted-foreground text-center">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (searches.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs text-muted-foreground text-center">
            No saved searches yet. Use Refine to set filters, then save to get email alerts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
        <CardTitle className="text-sm font-medium">Saved searches</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2.5">
        {searches.map((search) => (
          <div
            key={search.id}
            className="p-2.5 sm:p-3 border border-border/50 rounded-md space-y-2 bg-muted/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium flex items-center gap-1.5 truncate">
                  {search.name}
                  {search.email_alerts_enabled && (
                    <Bell className="h-3 w-3 text-primary shrink-0" />
                  )}
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(search.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onApplySearch(search.filters)}
                >
                  <Search className="h-3 w-3 mr-0.5" />
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteSearch(search.id)}
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id={`alerts-${search.id}`}
                checked={search.email_alerts_enabled}
                onCheckedChange={(checked) => toggleEmailAlerts(search.id, checked)}
                className="scale-75 origin-left"
              />
              <Label htmlFor={`alerts-${search.id}`} className="text-[10px] text-muted-foreground cursor-pointer">
                Email when new {searchType === "gigs" ? "gigs" : "diggers"} match
              </Label>
            </div>

            <div className="flex flex-wrap gap-1">
              {search.filters.selectedCategories?.length > 0 && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1">{(search.filters.selectedCategories as string[]).length} cat.</Badge>
              )}
              {search.filters.budgetRange && ((search.filters.budgetRange as number[])[0] !== 0 || (search.filters.budgetRange as number[])[1] !== 50000) && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1">${(search.filters.budgetRange as number[])[0]}–${(search.filters.budgetRange as number[])[1]}</Badge>
              )}
              {search.filters.hourlyRateRange && ((search.filters.hourlyRateRange as number[])[0] !== 0 || (search.filters.hourlyRateRange as number[])[1] !== 500) && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1">${(search.filters.hourlyRateRange as number[])[0]}-${(search.filters.hourlyRateRange as number[])[1]}/hr</Badge>
              )}
              {search.filters.locationRadius != null && search.filters.locationRadius !== (searchType === "gigs" ? 50 : 25) && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1">{(search.filters.locationRadius as number)}mi</Badge>
              )}
              {search.filters.minRating != null && Number(search.filters.minRating) > 0 && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1">{(search.filters.minRating as number)}+ ★</Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

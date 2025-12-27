import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profession {
  id: string;
  name: string;
  slug: string;
  industry_category_id: string;
  lead_tier: 'low' | 'mid' | 'high';
  lead_price_cents: number;
  is_active: boolean;
  description: string | null;
  keywords: string[];
}

export interface IndustryCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
}

export interface ProfessionWithCategory extends Profession {
  industry_category: IndustryCategory | null;
}

export interface CategoryWithProfessions extends IndustryCategory {
  professions: Profession[];
}

export const useProfessions = () => {
  const [professions, setProfessions] = useState<ProfessionWithCategory[]>([]);
  const [categories, setCategories] = useState<IndustryCategory[]>([]);
  const [categoriesWithProfessions, setCategoriesWithProfessions] = useState<CategoryWithProfessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("industry_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (categoriesError) {
        console.error("Error fetching industry_categories:", categoriesError);
        throw new Error(`Failed to load categories: ${categoriesError.message}. Please ensure database migrations have been run.`);
      }

      // Fetch professions
      const { data: professionsData, error: professionsError } = await supabase
        .from("professions")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (professionsError) {
        console.error("Error fetching professions:", professionsError);
        throw new Error(`Failed to load professions: ${professionsError.message}. Please ensure database migrations have been run.`);
      }

      // Type assertions for the data
      const typedCategories = (categoriesData || []) as IndustryCategory[];
      const typedProfessions = (professionsData || []) as Profession[];

      // Map professions with their categories
      const professionsWithCategories: ProfessionWithCategory[] = typedProfessions.map(prof => ({
        ...prof,
        industry_category: typedCategories.find(cat => cat.id === prof.industry_category_id) || null
      }));

      // Group professions by category
      const categoriesWithProfs: CategoryWithProfessions[] = typedCategories.map(cat => ({
        ...cat,
        professions: typedProfessions.filter(prof => prof.industry_category_id === cat.id)
      }));

      if (!categoriesData || categoriesData.length === 0) {
        console.warn("No industry categories found in database. Ensure migration 20251227040752 has been run.");
      }
      if (!professionsData || professionsData.length === 0) {
        console.warn("No professions found in database. Ensure migration 20251227040752 has been run.");
      }

      setCategories(typedCategories);
      setProfessions(professionsWithCategories);
      setCategoriesWithProfessions(categoriesWithProfs);
    } catch (err: any) {
      console.error("Error fetching professions:", err);
      const errorMessage = err.message || "Failed to load professions";
      setError(errorMessage);
      
      // Log additional debugging info
      if (err.code === 'PGRST116') {
        console.error("Table not found. Please run database migrations:");
        console.error("1. supabase/migrations/20251227035532_2be4521d-55ef-4008-ad0e-2b067faedd94.sql");
        console.error("2. supabase/migrations/20251227040752_a66c2ef9-4c3c-4575-9916-950e0f688a2b.sql");
        console.error("3. supabase/migrations/20251228000000_fix_taxonomy_rls_policies.sql");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getProfessionById = (id: string): ProfessionWithCategory | undefined => {
    return professions.find(p => p.id === id);
  };

  const getProfessionsByCategory = (categoryId: string): Profession[] => {
    return professions.filter(p => p.industry_category_id === categoryId);
  };

  const getLeadPriceForProfession = (professionId: string): number => {
    const profession = professions.find(p => p.id === professionId);
    return profession ? profession.lead_price_cents / 100 : 15; // Default to $15
  };

  const getLeadTierLabel = (tier: 'low' | 'mid' | 'high'): string => {
    switch (tier) {
      case 'low': return 'Low Value ($10/lead)';
      case 'mid': return 'Mid Value ($15/lead)';
      case 'high': return 'High Value ($25/lead)';
    }
  };

  const getLeadTierBadgeColor = (tier: 'low' | 'mid' | 'high'): string => {
    switch (tier) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'mid': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'high': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
    }
  };

  return {
    professions,
    categories,
    categoriesWithProfessions,
    loading,
    error,
    refetch: fetchData,
    getProfessionById,
    getProfessionsByCategory,
    getLeadPriceForProfession,
    getLeadTierLabel,
    getLeadTierBadgeColor
  };
};

export const useSubmitProfessionRequest = () => {
  const [submitting, setSubmitting] = useState(false);

  const submitRequest = async (data: {
    requestedProfession: string;
    industryCategory: string;
    description?: string;
    email?: string;
  }) => {
    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("profession_requests")
        .insert({
          user_id: user?.user?.id || null,
          requested_profession: data.requestedProfession,
          industry_category: data.industryCategory,
          description: data.description || null,
          email: data.email || user?.user?.email || null,
          status: 'pending'
        });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("Error submitting profession request:", err);
      return { success: false, error: err.message };
    } finally {
      setSubmitting(false);
    }
  };

  return { submitRequest, submitting };
};

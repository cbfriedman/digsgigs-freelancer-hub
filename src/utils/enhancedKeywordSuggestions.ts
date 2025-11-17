import { supabase } from "@/integrations/supabase/client";
import { generateKeywordSuggestions } from "./keywordSuggestions";

// Fetch popular keywords from analytics
export const fetchPopularKeywords = async (
  profession?: string,
  categoryName?: string,
  limit: number = 10
): Promise<string[]> => {
  try {
    let query = supabase
      .from("keyword_analytics")
      .select("keyword, times_used")
      .order("times_used", { ascending: false })
      .limit(limit);

    // Filter by profession if provided
    if (profession) {
      query = query.or(`profession.eq.${profession},profession.is.null`);
    }

    // Filter by category if provided
    if (categoryName) {
      query = query.or(`category_name.eq.${categoryName},category_name.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching popular keywords:", error);
      return [];
    }

    return data?.map((item) => item.keyword) || [];
  } catch (error) {
    console.error("Error in fetchPopularKeywords:", error);
    return [];
  }
};

// Generate enhanced suggestions combining static and analytics-based keywords
export const generateEnhancedKeywordSuggestions = async (
  profession: string,
  categoryNames: string[]
): Promise<string[]> => {
  // Get base suggestions
  const baseSuggestions = generateKeywordSuggestions(profession, categoryNames);

  // Fetch popular keywords from analytics
  const popularKeywords = await fetchPopularKeywords(
    profession,
    categoryNames[0],
    15
  );

  // Combine and deduplicate
  const combined = new Set([...popularKeywords, ...baseSuggestions]);

  // Return as array, prioritizing popular keywords
  return Array.from(combined).slice(0, 20);
};

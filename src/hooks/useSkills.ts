import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Skill {
  id: string;
  name: string;
  slug: string;
  skill_category_id: string | null;
  display_order: number;
}

export interface SkillWithCategory extends Skill {
  skill_categories: { name: string; slug: string } | null;
}

/** Fetch all skills, optionally grouped by category. Used for autocomplete, selection. */
export function useSkills() {
  const [skills, setSkills] = useState<SkillWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("skills")
        .select(`
          id,
          name,
          slug,
          skill_category_id,
          display_order,
          skill_categories (name, slug)
        `)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (!error) setSkills((data as SkillWithCategory[]) || []);
      setLoading(false);
    })();
  }, []);

  return { skills, loading };
}

/** Skills grouped by category for UI (e.g. dropdown sections). */
export function useSkillsByCategory() {
  const { skills, loading } = useSkills();

  const byCategory = skills.reduce<Record<string, SkillWithCategory[]>>((acc, s) => {
    const catName = (s.skill_categories as { name: string } | null)?.name ?? "Other";
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(s);
    return acc;
  }, {});

  return {
    skillsByCategory: byCategory,
    allSkills: skills,
    loading,
  };
}

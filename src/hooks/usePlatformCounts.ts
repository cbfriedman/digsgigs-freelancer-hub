import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const MINIMUM_COUNT = 100;

export function usePlatformCounts() {
  const [hasEnoughDiggers, setHasEnoughDiggers] = useState(false);
  const [hasEnoughGigs, setHasEnoughGigs] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCounts = async () => {
      try {
        // Check digger count
        const { count: diggerCount, error: diggerError } = await supabase
          .from("digger_profiles")
          .select("", { count: "exact", head: true });

        // Check gig count
        const { count: gigCount, error: gigError } = await supabase
          .from("gigs")
          .select("", { count: "exact", head: true });

        // Only set counts if queries succeeded
        if (!diggerError) {
          setHasEnoughDiggers((diggerCount ?? 0) >= MINIMUM_COUNT);
        }
        if (!gigError) {
          setHasEnoughGigs((gigCount ?? 0) >= MINIMUM_COUNT);
        }
      } catch (error) {
        console.error("Error checking platform counts:", error);
        // Set defaults on error to prevent UI breaking
        setHasEnoughDiggers(false);
        setHasEnoughGigs(false);
      } finally {
        setLoading(false);
      }
    };

    checkCounts();
  }, []);

  return {
    hasEnoughDiggers,
    hasEnoughGigs,
    showBrowseButtons: hasEnoughDiggers && hasEnoughGigs,
    loading,
  };
}

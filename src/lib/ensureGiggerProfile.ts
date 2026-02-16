import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures the user has a gigger_profiles row (for Gigger role).
 * Call after adding the Gigger role so Diggers can see client info and stats.
 */
export async function ensureGiggerProfile(userId: string): Promise<void> {
  await supabase
    .from("gigger_profiles")
    .upsert(
      { user_id: userId, show_to_diggers: true },
      { onConflict: "user_id" }
    );
}

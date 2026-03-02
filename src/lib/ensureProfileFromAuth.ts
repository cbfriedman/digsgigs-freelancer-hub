import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Ensures the current user has a profiles row (id, email, full_name, avatar_url).
 * Uses upsert so we don't overwrite existing data. Call when the owner might not
 * have a profile yet (e.g. edge case where auth trigger didn't run).
 */
export async function ensureProfileFromAuth(user: User): Promise<{ error: unknown }> {
  const id = user?.id;
  if (!id) return { error: new Error("No user id") };

  const email = user.email ?? user.user_metadata?.email ?? "";
  const fullName = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ??
    (user.user_metadata?.picture as string) ??
    null;
  const parts = fullName ? fullName.split(/\s+/) : [];
  const firstName = parts[0] ?? null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      email: email || "unknown@temp.local",
      full_name: fullName || null,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl || null,
      user_type: "consumer",
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  return { error };
}

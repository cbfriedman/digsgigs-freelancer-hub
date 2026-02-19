import { supabase } from "@/integrations/supabase/client";
import { getHandleForFirstProfile } from "@/lib/generateHandle";

/**
 * Ensures the user has a gigger_profiles row and a profiles.handle (for Gigger role).
 * Call after adding the Gigger role so Diggers can see client info and /profile/:handle works.
 */
export async function ensureGiggerProfile(userId: string): Promise<void> {
  await (supabase
    .from("gigger_profiles" as any))
    .upsert(
      { user_id: userId, show_to_diggers: true },
      { onConflict: "user_id" }
    );

  // Ensure profiles.handle is set (same as Digger mode) so /profile/:handle works
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("handle, full_name")
    .eq("id", userId)
    .single();
  if (profile?.handle) return;

  // If user has digger_profiles with handle, sync that to profiles
  const { data: diggerProfile } = await supabase
    .from("digger_profiles")
    .select("handle")
    .eq("user_id", userId)
    .not("handle", "is", null)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (diggerProfile?.handle) {
    await (supabase.from("profiles") as any).update({ handle: diggerProfile.handle }).eq("id", userId);
    return;
  }

  const { data: diggerHandles } = await supabase
    .from("digger_profiles")
    .select("handle")
    .not("handle", "is", null);
  const { data: profileHandles } = await (supabase.from("profiles") as any)
    .select("handle")
    .not("handle", "is", null);
  const allHandles = [
    ...(diggerHandles || []).map((r) => r.handle).filter(Boolean),
    ...(profileHandles || []).map((r: { handle?: string }) => r.handle).filter(Boolean),
  ] as string[];
  const handle = getHandleForFirstProfile(profile?.full_name ?? null, allHandles);
  await (supabase.from("profiles") as any).update({ handle }).eq("id", userId);
}

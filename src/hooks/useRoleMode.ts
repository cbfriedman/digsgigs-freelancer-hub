import { useAuth } from "@/contexts/AuthContext";

/** Current role mode for Gigger vs Digger UX (see docs/GIGGER_DIGGER_UX_AND_TONE.md). */
export type RoleMode = "gigger" | "digger" | "";

export function useRoleMode(): {
  activeRole: RoleMode;
  isGigger: boolean;
  isDigger: boolean;
  /** Use for role-specific accent (Gigger = accent, Digger = primary). */
  roleAccentClass: string;
} {
  const { activeRole } = useAuth();
  const mode: RoleMode =
    activeRole === "digger" || activeRole === "gigger" ? activeRole : "";
  return {
    activeRole: mode,
    isGigger: mode === "gigger",
    isDigger: mode === "digger",
    roleAccentClass: mode === "gigger" ? "text-accent" : mode === "digger" ? "text-primary" : "",
  };
}

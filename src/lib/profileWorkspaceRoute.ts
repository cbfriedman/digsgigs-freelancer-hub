export type ProfileWorkspaceMode = "create" | "edit";
type NavigateFn = (to: string, options?: { replace?: boolean; state?: unknown }) => void;

interface ProfileWorkspaceOptions {
  mode?: ProfileWorkspaceMode;
  profileId?: string | null;
}

/**
 * Canonical route builder for profile workspace flows.
 * Keeps all create/edit entry points consistent across the app.
 */
export function getProfileWorkspacePath(options: ProfileWorkspaceOptions = {}): string {
  const params = new URLSearchParams();

  if (options.mode) {
    params.set("mode", options.mode);
  }

  if (options.profileId) {
    params.set("profileId", options.profileId);
  }

  const query = params.toString();
  return query ? `/my-profiles?${query}` : "/my-profiles";
}

export function goToProfileWorkspace(
  navigate: NavigateFn,
  options: ProfileWorkspaceOptions = {},
  navOptions?: { replace?: boolean; state?: unknown }
): void {
  navigate(getProfileWorkspacePath(options), navOptions);
}

export function goToCreateProfile(
  navigate: NavigateFn,
  navOptions?: { replace?: boolean; state?: unknown }
): void {
  goToProfileWorkspace(navigate, { mode: "create" }, navOptions);
}

export function goToEditProfile(
  navigate: NavigateFn,
  profileId: string,
  navOptions?: { replace?: boolean; state?: unknown }
): void {
  goToProfileWorkspace(navigate, { mode: "edit", profileId }, navOptions);
}


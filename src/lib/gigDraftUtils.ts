/**
 * Gig draft payload builder for gig_drafts table (testable).
 */

export interface GigDraftFormState {
  sessionId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  projectTypes: string[];
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  timeline: string | null;
  source: string;
}

export interface GigDraftPayload {
  session_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  project_types: string[];
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  timeline: string | null;
  source: string;
}

/**
 * Build the payload for inserting/updating a row in gig_drafts.
 */
export function buildGigDraftPayload(state: GigDraftFormState): GigDraftPayload {
  return {
    session_id: state.sessionId,
    email: state.email?.trim() || null,
    name: state.name?.trim() || null,
    phone: state.phone?.trim() || null,
    project_types: state.projectTypes,
    description: state.description?.trim() || null,
    budget_min: state.budgetMin,
    budget_max: state.budgetMax,
    timeline: state.timeline,
    source: state.source,
  };
}

/**
 * Whether the form has enough content to save a draft (avoid empty saves).
 */
export function hasDraftContent(description: string, email: string): boolean {
  return description.trim().length > 0 || email.trim().length > 0;
}

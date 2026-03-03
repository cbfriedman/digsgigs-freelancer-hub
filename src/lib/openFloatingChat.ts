/**
 * Open the floating message widget with a specific gig+digger conversation.
 * Dispatches a custom event that FloatingMessageWidget listens for.
 */
export const OPEN_FLOATING_CHAT_EVENT = "open-floating-chat";

export interface OpenFloatingChatDetail {
  gigId: string;
  diggerId: string;
}

export function openFloatingChat(gigId: string, diggerId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenFloatingChatDetail>(OPEN_FLOATING_CHAT_EVENT, {
      detail: { gigId, diggerId },
    })
  );
}

/** Fired when digger accepts an award (e.g. from Gig Detail) so floating chat can disable Accept/Decline without refresh. */
export const AWARD_ACCEPTED_EVENT = "award-accepted";

export interface AwardAcceptedDetail {
  gigId: string;
  bidId?: string;
}

export function dispatchAwardAccepted(gigId: string, bidId?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AwardAcceptedDetail>(AWARD_ACCEPTED_EVENT, { detail: { gigId, bidId } })
  );
}

/** Fired after Gigger returns from Checkout so floating chat refetches messages and shows the award bubble. */
export const REFETCH_GIG_CHAT_MESSAGES_EVENT = "refetch-gig-chat-messages";

export interface RefetchGigChatMessagesDetail {
  gigId: string;
  diggerId: string;
}

export function dispatchRefetchGigChatMessages(gigId: string, diggerId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RefetchGigChatMessagesDetail>(REFETCH_GIG_CHAT_MESSAGES_EVENT, {
      detail: { gigId, diggerId },
    })
  );
}

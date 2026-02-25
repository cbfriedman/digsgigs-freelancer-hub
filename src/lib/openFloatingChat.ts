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

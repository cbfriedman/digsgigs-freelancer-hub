/**
 * Cross-component message sync: main Messages page, floating widget, and bubble chats
 * stay in sync when any of them sends or receives a message.
 */
export const MESSAGES_SYNC_EVENT = "messages:sync";

export interface MessagesSyncDetail {
  conversationId: string;
  message?: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    read_at: string | null;
    attachments?: { name: string; path: string; type: string }[];
  };
}

export function dispatchMessagesSync(detail: MessagesSyncDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MESSAGES_SYNC_EVENT, { detail }));
}

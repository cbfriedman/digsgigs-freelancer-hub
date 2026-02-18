/**
 * Contact methods giggers can offer for a project (WhatsApp, Telegram, Teams, etc.).
 * Used when posting a gig so diggers can reach them via preferred channels.
 */

export interface ContactMethodOption {
  id: string;
  label: string;
  placeholder: string;
  /** Link prefix for building clickable links (e.g. https://wa.me/ for WhatsApp). Optional. */
  linkPrefix?: string;
  /** Input type hint */
  inputType?: "text" | "email" | "tel";
}

export const GIGGER_CONTACT_METHODS: ContactMethodOption[] = [
  { id: "email", label: "Email", placeholder: "you@example.com", inputType: "email" },
  { id: "phone", label: "Phone", placeholder: "+1 (555) 123-4567", inputType: "tel" },
  { id: "whatsapp", label: "WhatsApp", placeholder: "+1234567890", linkPrefix: "https://wa.me/", inputType: "tel" },
  { id: "telegram", label: "Telegram", placeholder: "@username or +1234567890", linkPrefix: "https://t.me/", inputType: "text" },
  { id: "teams", label: "Microsoft Teams", placeholder: "email@company.com or team link", inputType: "text" },
  { id: "slack", label: "Slack", placeholder: "workspace or email", inputType: "text" },
  { id: "signal", label: "Signal", placeholder: "+1234567890", inputType: "tel" },
  { id: "skype", label: "Skype", placeholder: "username or live:.cid.xxx", inputType: "text" },
  { id: "zoom", label: "Zoom", placeholder: "email or meeting link", inputType: "text" },
  { id: "google_meet", label: "Google Meet", placeholder: "meet link or email", inputType: "text" },
  { id: "discord", label: "Discord", placeholder: "username or server invite", inputType: "text" },
  { id: "wechat", label: "WeChat", placeholder: "WeChat ID", inputType: "text" },
  { id: "line", label: "Line", placeholder: "Line ID", inputType: "text" },
  { id: "viber", label: "Viber", placeholder: "+1234567890", inputType: "tel" },
  { id: "other", label: "Other", placeholder: "Contact details", inputType: "text" },
];

export interface ContactItem {
  type: string;
  value: string;
}

export function parseContactPreferences(json: string | null): ContactItem[] {
  if (!json?.trim()) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed)
      ? (parsed as ContactItem[]).filter((x) => x && typeof x.type === "string" && typeof x.value === "string" && x.value.trim())
      : [];
  } catch {
    return [];
  }
}

export function serializeContactPreferences(items: ContactItem[]): string | null {
  const filtered = items.filter((x) => x.value?.trim());
  return filtered.length ? JSON.stringify(filtered) : null;
}

/** Build a clickable link for a contact item if the method has a linkPrefix (e.g. WhatsApp, Telegram). */
export function getContactLink(item: ContactItem): string | null {
  const option = GIGGER_CONTACT_METHODS.find((m) => m.id === item.type);
  if (!option?.linkPrefix || !item.value?.trim()) return null;
  const value = item.value.trim().replace(/^@/, "");
  if (option.id === "telegram" && item.value.startsWith("@")) return `${option.linkPrefix}${value}`;
  if (option.id === "whatsapp" || option.id === "signal" || option.id === "viber") {
    const digits = item.value.replace(/\D/g, "");
    return digits ? `${option.linkPrefix}${digits}` : null;
  }
  return `${option.linkPrefix}${encodeURIComponent(value)}`;
}

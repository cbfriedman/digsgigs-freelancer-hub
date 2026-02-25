import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notificationSound";
import type { Notification } from "@/hooks/useNotifications";

const AWARD_TYPES = ["lead_awarded_exclusive", "lead_awarded"];

/**
 * Listens for award notifications and shows a prominent toast with sound
 * so diggers immediately see "You're awarded" when a gigger awards them.
 */
export function AwardNotificationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = (e: Event) => {
      const n = (e as CustomEvent<Notification>).detail;
      if (!n?.type || !AWARD_TYPES.includes(n.type)) return;

      const gigId = n.metadata?.gig_id;
      const link = n.link || (gigId ? `/gig/${gigId}` : "/messages");

      playNotificationSound();
      toast.success("You're awarded!", {
        description: n.message || "You've been awarded this gig. Check your messages to accept.",
        duration: 10000,
        action: {
          label: "View",
          onClick: () => navigate(link),
        },
      });
    };
    window.addEventListener("app:new-notification", handle);
    return () => window.removeEventListener("app:new-notification", handle);
  }, [navigate]);

  return null;
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Notification } from "@/hooks/useNotifications";

/**
 * Listens for real-time new-gig notifications and shows a toast so diggers
 * see an in-app alert as soon as a gigger posts a project (no refresh).
 */
export function NewGigAlertListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handle = (e: Event) => {
      const n = (e as CustomEvent<Notification>).detail;
      if (n?.type !== "new_gig") return;
      const gigId = n.metadata?.gig_id;
      const link = n.link || (gigId ? `/gig/${gigId}` : "/browse-gigs");
      toast.success(n.title || "New project posted", {
        description: n.message || "A new gig matching your skills is available.",
        duration: 8000,
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

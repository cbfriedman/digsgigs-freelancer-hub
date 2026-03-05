import { useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import { GigLandingForm } from "@/components/hire-pro/GigLandingForm";

const EMBED_RESIZE_MESSAGE_TYPE = "digs-gigs-resize";
/** Polling interval for height updates (ResizeObserver handles most changes; this catches layout shifts) */
const EMBED_RESIZE_POLL_MS = 300;

/**
 * Embeddable gig posting widget - designed to be loaded in an iframe.
 * Usage: <iframe src="https://digsandgigs.net/embed-widget?ref=YOUR_CODE" width="100%" height="800" />
 */
export default function EmbedWidget() {
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("referral_code", ref);
    }
    // Add source tracking
    sessionStorage.setItem("gig_source", "embed_widget");
  }, [searchParams]);

  // Notify parent iframe of content height for auto-resize
  useEffect(() => {
    const sendHeight = () => {
      if (typeof window === "undefined" || !window.parent) return;
      const height = document.documentElement.scrollHeight || document.body.scrollHeight;
      window.parent.postMessage({ type: EMBED_RESIZE_MESSAGE_TYPE, height }, "*");
    };

    // Initial send after layout (next frame + small delay so form has rendered)
    const initialTimer = setTimeout(sendHeight, 50);
    sendHeight();

    const observer = new ResizeObserver(() => {
      sendHeight();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    observer.observe(document.body);

    const interval = setInterval(sendHeight, EMBED_RESIZE_POLL_MS);
    return () => {
      clearTimeout(initialTimer);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <GigLandingForm />
      </div>
    </div>
  );
}

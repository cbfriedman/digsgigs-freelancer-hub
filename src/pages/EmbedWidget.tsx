import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { GigLandingForm } from "@/components/hire-pro/GigLandingForm";

/**
 * Embeddable gig posting widget - designed to be loaded in an iframe.
 * Usage: <iframe src="https://digsandgigs.net/embed-widget?ref=YOUR_CODE" width="100%" height="800" />
 */
export default function EmbedWidget() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("referral_code", ref);
    }
    // Add source tracking
    sessionStorage.setItem("gig_source", "embed_widget");
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <GigLandingForm />
      </div>
    </div>
  );
}

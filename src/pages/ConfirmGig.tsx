import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { supabase, supabaseAnonKey } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";

/**
 * One-click gig confirmation from email link.
 * Uses app domain so we can send Authorization header; direct Supabase function URL returns 401.
 * On success → /gig-confirmed; on failure → /review-gig (user can click button there).
 */
const ConfirmGig = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gigId = searchParams.get("gigId");
  const ranRef = useRef(false);

  useEffect(() => {
    if (!gigId || ranRef.current) return;
    ranRef.current = true;

    const confirm = async () => {
      try {
        const { error } = await supabase.functions.invoke("verify-gig-confirmation", {
          body: { gigId },
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        });

        if (error) throw error;
        navigate(`/gig-confirmed?gigId=${gigId}`, { replace: true });
      } catch {
        navigate(`/review-gig?gigId=${gigId}`, { replace: true });
      }
    };

    confirm();
  }, [gigId, navigate]);

  if (!gigId) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <>
      <SEOHead
        title="Confirming your project | Digs and Gigs"
        description="Confirming your project..."
      />
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-amber-50 via-white to-blue-50 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Confirming your project...</p>
      </div>
    </>
  );
};

export default ConfirmGig;

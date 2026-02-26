import { useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase, supabaseAnonKey } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

const ReviewGigConfirmation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gigId = searchParams.get("gigId");
  
  const [gig, setGig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gigId) {
      setError("Missing gig ID");
      setLoading(false);
      return;
    }

    const fetchGig = async () => {
      try {
        // Use service role or public access to fetch gig details
        const { data, error: fetchError } = await supabase
          .from("gigs")
          .select("*")
          .eq("id", gigId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError("Gig not found");
          return;
        }

        // Check if already confirmed
        if (data.confirmation_status === "confirmed") {
          navigate(`/gig-confirmed?gigId=${gigId}`);
          return;
        }

        setGig(data);
      } catch (err: any) {
        console.error("Error fetching gig:", err);
        setError(err.message || "Failed to load gig details");
      } finally {
        setLoading(false);
      }
    };

    fetchGig();
  }, [gigId, navigate]);

  const handleConfirm = async () => {
    if (!gigId) return;

    setConfirming(true);
    try {
      // Always send Authorization so it works when user opens review page from email link (no session).
      await invokeEdgeFunction(supabase, "verify-gig-confirmation", {
        body: { gigId },
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      toast.success("Project confirmed! Redirecting...");

      setTimeout(() => {
        navigate(`/gig-confirmed?gigId=${gigId}`);
      }, 500);
    } catch (err: any) {
      console.error("Error confirming gig:", err);
      toast.error(err?.message || "Failed to confirm gig. Please try again.");
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !gig) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Error</h2>
              <p className="text-muted-foreground">{error || "Gig not found"}</p>
              <Button onClick={() => navigate("/")}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const budgetText = gig.budget_min && gig.budget_max
    ? `$${gig.budget_min.toLocaleString()} - $${gig.budget_max.toLocaleString()}`
    : gig.budget_min
    ? `$${gig.budget_min.toLocaleString()}+`
    : "Budget not specified";

  return (
    <>
      <SEOHead
        title="Confirm Your Project | Digs & Gigs"
        description="Review and confirm your project details"
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-blue-50 p-4">
        <div className="max-w-2xl mx-auto py-8">
          <Card className="shadow-lg">
            <CardHeader className="text-center bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="text-2xl">Review Your Project</CardTitle>
              <p className="text-muted-foreground mt-2">
                Please review the details below and confirm to make your project live
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4">Gig Details</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Title:</span>
                    <p className="font-medium">{gig.title || "Untitled Project"}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Location:</span>
                    <p>{gig.location || "Remote"}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Budget:</span>
                    <p>{budgetText}</p>
                  </div>
                  
                  {gig.description && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Description:</span>
                      <p className="whitespace-pre-wrap">{gig.description}</p>
                    </div>
                  )}
                  
                  {gig.requirements && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Requirements:</span>
                      <p className="whitespace-pre-wrap text-sm">{gig.requirements}</p>
                    </div>
                  )}
                  
                  {gig.timeline && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Timeline:</span>
                      <p>{gig.timeline}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Important:</p>
                    <p>
                      By confirming this project, you agree that the information provided is accurate. 
                      Confirmed projects will be matched with qualified professionals in your area.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleConfirm}
                disabled={confirming || !gigId}
                size="lg"
                className="w-full"
              >
                {confirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm and Post Gig
                  </>
                )}
              </Button>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Your project goes live and is visible to qualified freelancers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Diggers (freelancers) can unlock your contact and reach out directly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>You'll receive a management email with links to edit or cancel your project</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ReviewGigConfirmation;

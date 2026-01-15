import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Loader2, XCircle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GigCancel = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const [gigTitle, setGigTitle] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [hasUnlocks, setHasUnlocks] = useState(false);
  const [unlockCount, setUnlockCount] = useState(0);

  useEffect(() => {
    const loadGig = async () => {
      if (!id) {
        toast.error("No project ID provided");
        navigate("/");
        return;
      }

      try {
        // Fetch the gig
        const { data: gig, error } = await supabase
          .from("gigs")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !gig) {
          toast.error("Project not found");
          navigate("/");
          return;
        }

        // Check if already cancelled
        if (gig.status === "cancelled") {
          toast.error("This project has already been cancelled");
          navigate("/");
          return;
        }

        // Check authorization
        const { data: { session } } = await supabase.auth.getSession();
        
        const isOwner = session?.user?.id && gig.consumer_id === session.user.id;
        const emailMatch = session?.user?.email && gig.consumer_email === session.user.email;

        if (!isOwner && !emailMatch) {
          if (!session) {
            toast.error("Please sign in to cancel this project");
            navigate(`/register?mode=signin&returnTo=/gig/${id}/cancel`);
            return;
          }
          toast.error("You don't have permission to cancel this project");
          navigate("/");
          return;
        }

        setAuthorized(true);
        setGigTitle(gig.title || "Untitled Project");

        // Check for lead unlocks - use contact_reveals table
        const gigIdToCheck: string = id;
        const { data: unlockData } = await supabase
          .from("contact_reveals")
          .select("id")
          .eq("gig_id", gigIdToCheck)
          .limit(100);
        
        const unlockCountNum = (unlockData || []).length;

        if (unlockCountNum > 0) {
          setHasUnlocks(true);
          setUnlockCount(unlockCountNum);
        }
        
      } catch (err) {
        console.error("Error loading gig:", err);
        toast.error("Failed to load project");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadGig();
  }, [id, token, navigate]);

  const handleCancel = async () => {
    setCancelling(true);
    
    try {
      // Update gig status to cancelled
      const { error: updateError } = await supabase
        .from("gigs")
        .update({
          status: "cancelled",
          cancellation_reason: cancellationReason.trim() || null,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // If there were unlocks, notify the diggers who unlocked
      if (hasUnlocks) {
        try {
          await supabase.functions.invoke("notify-gig-cancelled", {
            body: { gigId: id, reason: cancellationReason.trim() || "No reason provided" }
          });
        } catch (notifyErr) {
          console.error("Error notifying diggers:", notifyErr);
          // Don't fail the cancellation for notification errors
        }
      }

      toast.success("Project cancelled successfully");
      navigate("/");
    } catch (error: any) {
      console.error("Error cancelling gig:", error);
      toast.error(error.message || "Failed to cancel project");
    } finally {
      setCancelling(false);
      setShowConfirmDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Cancel Project | Digs & Gigs"
        description="Cancel your project posting."
      />
      <Navigation showBackButton backLabel="Back" />

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card className="shadow-lg border-destructive/20">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate(`/gig/${id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Project
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-xl">Cancel Project</CardTitle>
                <CardDescription>
                  {gigTitle}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {hasUnlocks && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">
                      {unlockCount} freelancer{unlockCount !== 1 ? 's have' : ' has'} already unlocked this lead
                    </p>
                    <p>
                      They will be notified that this project has been cancelled. 
                      Depending on the circumstances, they may be eligible for a refund credit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Project requirements changed, found another solution, etc."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This helps us improve and may be shared with freelancers who unlocked this lead.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">What happens when you cancel:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Your project will no longer be visible to freelancers</li>
                <li>You won't receive any new quote requests</li>
                <li>Freelancers who paid to unlock will be notified</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate(`/gig/${id}`)}
              >
                Keep Project
              </Button>
              <Button 
                type="button" 
                variant="destructive"
                className="flex-1"
                onClick={() => setShowConfirmDialog(true)}
              >
                Cancel Project
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently cancel your project "{gigTitle}". 
              {hasUnlocks && ` ${unlockCount} freelancer${unlockCount !== 1 ? 's' : ''} who unlocked this lead will be notified.`}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Project"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GigCancel;

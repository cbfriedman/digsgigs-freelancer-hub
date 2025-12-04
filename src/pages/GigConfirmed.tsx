import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const GigConfirmed = () => {
  const [searchParams] = useSearchParams();
  const gigId = searchParams.get("gigId");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="max-w-md w-full shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Gig Confirmed!</h1>
            <p className="text-muted-foreground">
              Your gig has been successfully confirmed and is now live. Qualified professionals in your area will be notified and can start sending you proposals.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            You will receive notifications when professionals purchase your lead and reach out to you.
          </p>

          <div className="flex flex-col gap-3">
            {gigId && (
              <Link to={`/gig/${gigId}`}>
                <Button variant="outline" className="w-full">
                  View Your Gig
                </Button>
              </Link>
            )}
            <Link to="/">
              <Button className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GigConfirmed;

import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const GigConfirmed = () => {
  const [searchParams] = useSearchParams();
  const gigId = searchParams.get("gigId");

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f3e8ff 0%, #ffffff 50%, #dbeafe 100%)',
        padding: '16px'
      }}
    >
      <Card className="max-w-md w-full shadow-2xl" style={{ background: 'white' }}>
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: '#1f2937' }}>Gig Confirmed!</h1>
            <p style={{ color: '#6b7280' }}>
              Your gig has been successfully confirmed and is now live. Qualified professionals in your area will be notified and can start sending you proposals.
            </p>
          </div>

          <p className="text-sm" style={{ color: '#9ca3af' }}>
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

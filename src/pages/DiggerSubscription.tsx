// Component disabled - subscription tiers eliminated in exclusivity-based pricing model
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DiggerSubscription() {
  const navigate = useNavigate();
  
  useEffect(() => {
    toast.info("Subscription tiers have been replaced with exclusivity-based pricing.");
    navigate("/pricing");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

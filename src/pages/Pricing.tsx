// Component disabled - being redesigned for exclusivity-based pricing model
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Pricing() {
  const navigate = useNavigate();
  
  useEffect(() => {
    toast.info("The pricing page is being updated for the new exclusivity-based model.");
    // Redirect to home for now
    navigate("/");
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

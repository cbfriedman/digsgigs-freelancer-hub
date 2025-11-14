import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronRight, Sparkles } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  link: string;
}

export const DiggerOnboardingChecklist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChecklistItem[]>([
    {
      id: "profile",
      label: "Complete Your Profile",
      description: "Add your business info, skills, and portfolio",
      completed: false,
      link: "/digger-registration",
    },
    {
      id: "lead_limits",
      label: "Set Your Lead Limits",
      description: "Control your budget and workload",
      completed: false,
      link: "/lead-limits",
    },
    {
      id: "browse_gigs",
      label: "Browse Available Gigs",
      description: "Discover projects that match your skills",
      completed: false,
      link: "/browse-gigs",
    },
    {
      id: "purchase_lead",
      label: "Purchase Your First Lead",
      description: "Get client contact info to submit a bid",
      completed: false,
      link: "/browse-gigs",
    },
    {
      id: "submit_bid",
      label: "Submit Your First Bid",
      description: "Send your proposal and timeline",
      completed: false,
      link: "/my-leads",
    },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProgress();
  }, []);

  const checkProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if digger profile is complete
      const { data: profile } = await supabase
        .from('digger_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Check if lead limits are set
      const leadLimitsSet = profile && (profile as any).lead_limit_enabled;

      // Check if they've purchased any leads
      let hasPurchasedLeads = false;
      try {
        const { data: purchases } = await supabase
          .from('lead_purchases')
          .select('id')
          .eq('digger_id', profile?.id || '')
          .limit(1);
        hasPurchasedLeads = !!purchases?.length;
      } catch (e) {
        console.error('Error checking purchases:', e);
      }

      setItems(prev => prev.map(item => {
        if (item.id === "profile") return { ...item, completed: !!profile };
        if (item.id === "lead_limits") return { ...item, completed: !!leadLimitsSet };
        if (item.id === "browse_gigs") return { ...item, completed: true }; // Always available
        if (item.id === "purchase_lead") return { ...item, completed: hasPurchasedLeads };
        if (item.id === "submit_bid") return { ...item, completed: false }; // Manual check required
        return item;
      }));
    } catch (error) {
      console.error('Error checking progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = items.filter(item => item.completed).length;
  const progress = (completedCount / items.length) * 100;

  if (loading) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Get Started as a Digger
            </CardTitle>
            <CardDescription>
              Complete these steps to start winning gigs
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completedCount}/{items.length}</div>
            <div className="text-xs text-muted-foreground">completed</div>
          </div>
        </div>
        <Progress value={progress} className="h-2 mt-4" />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className="w-full justify-start h-auto py-3 px-4 hover:bg-accent/50"
            onClick={() => navigate(item.link)}
          >
            <div className="flex items-start gap-3 w-full">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 text-left">
                <div className={`font-medium ${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                  {item.label}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {item.description}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};

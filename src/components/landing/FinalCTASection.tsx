import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";

export const FinalCTASection = () => {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();

  return (
    <section className="section-padding bg-muted/30">
      <div className="container-wide">
        <div className="max-w-xl mx-auto text-center home-fade-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="mb-4">Start getting leads</h2>
          <p className="text-muted-foreground mb-8">
            Join Digs & Gigs as a Digger or post your first gig as a Gigger. Free to join.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
              onClick={() => {
                trackButtonClick('Become a Digger', 'final-cta');
                navigate("/register?mode=signup&type=digger");
              }}
            >
              Get leads (Digger)
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 px-6"
              onClick={() => {
                trackButtonClick('Post a Project', 'final-cta');
                navigate("/post-gig");
              }}
            >
              Post a gig (Gigger)
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">No credit card required.</p>
        </div>
      </div>
    </section>
  );
};

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();

  return (
    <section className="relative overflow-hidden section-padding bg-gradient-hero">
      <div className="container-wide relative">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="mb-6 text-foreground">
            Where tech talent meets opportunity.
          </h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed">
            Connect with software developers, designers, and digital experts. Post gigs or find leads—no subscriptions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-6"
              onClick={() => {
                trackButtonClick('Post a Project', 'hero');
                navigate("/post-gig");
              }}
            >
              Post a Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 px-6"
              onClick={() => {
                trackButtonClick('Become a Digger', 'hero');
                navigate("/register?mode=signup&type=digger");
              }}
            >
              Become a Digger
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Free to join · Pay only for leads you unlock
          </p>
        </div>
      </div>
    </section>
  );
};

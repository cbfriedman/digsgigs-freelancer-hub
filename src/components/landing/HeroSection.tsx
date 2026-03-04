import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";

export const HeroSection = () => {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();

  return (
    <section className="relative overflow-hidden section-padding min-h-[85vh] flex items-center">
      {/* Background: animated gradient (always) + optional video on top (add /public/hero-video.mp4) */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 home-hero-bg-shift opacity-95 dark:opacity-90"
          style={{
            background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--primary-muted)) 30%, hsl(var(--accent-muted)) 70%, hsl(var(--background)) 100%)",
            backgroundSize: "200% 200%",
          }}
        />
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25 dark:opacity-15 pointer-events-none"
          aria-hidden
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="container-wide relative z-10">
        <div className="max-w-2xl mx-auto text-center home-fade-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="mb-6 text-foreground">
            Leads in your inbox. Pay only for what you unlock.
          </h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto leading-relaxed home-fade-up" style={{ animationDelay: "0.25s" }}>
            Giggers post projects. Diggers get leads by email. Unlock contacts or bid and pay when you win. No subscriptions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4 home-fade-up" style={{ animationDelay: "0.4s" }}>
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-6"
              onClick={() => {
                trackButtonClick('Post a Project', 'hero');
                navigate("/post-gig");
              }}
            >
              Post a gig (Gigger)
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 px-6 bg-background/80 backdrop-blur-sm"
              onClick={() => {
                trackButtonClick('Become a Digger', 'hero');
                navigate("/register?mode=signup&type=digger");
              }}
            >
              Get leads (Digger)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground home-fade-up" style={{ animationDelay: "0.55s" }}>
            Free to join · Pay per lead or 8% when awarded
          </p>
        </div>
      </div>
    </section>
  );
};

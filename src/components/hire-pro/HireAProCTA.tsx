import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";

interface HireAProCTAProps {
  onPostProject: () => void;
}

export function HireAProCTA({ onPostProject }: HireAProCTAProps) {
  return (
    <section className="section-padding relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl opacity-50" />

      <div className="container-wide relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent text-white mb-8 shadow-accent-lg animate-float">
            <Zap className="h-8 w-8" />
          </div>

          <h2 className="mb-6">Ready to Find Your Perfect Pro?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Post your project in 2 minutes. Get proposals today.
            <span className="text-accent font-medium"> Free to post.</span>
          </p>

          <Button
            size="lg"
            className="text-lg px-12 py-6 bg-gradient-accent text-accent-foreground shadow-accent-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            onClick={onPostProject}
          >
            Post Your Project — It's Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-sm text-muted-foreground mt-6">
            No credit card required • Proposals in hours
          </p>
        </div>
      </div>
    </section>
  );
}

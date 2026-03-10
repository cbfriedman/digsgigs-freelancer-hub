import { useNavigate } from "react-router-dom";
import { navigateToSignUp } from "@/lib/navigateToLogin";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";

export const FinalCTASection = () => {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-50" />
      
      <div className="container-wide relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary text-white mb-8 shadow-primary-lg">
            <Sparkles className="h-8 w-8" />
          </div>
          
          <h2 className="mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
            Join as a <span className="font-medium text-foreground">Digger</span> to get project leads by email, unlock the ones you want, and get paid when you win. Or <span className="font-medium text-foreground">post a project</span> as a client. 
            <span className="text-primary font-medium"> Free to join.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-gradient-primary text-primary-foreground shadow-primary-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              onClick={() => {
                trackButtonClick('Become a Digger', 'final-cta');
                navigateToSignUp({ type: "digger" });
              }}
            >
              Become a Digger — It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-10 py-6 border-2 hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all duration-300"
              onClick={() => {
                trackButtonClick('Post a Project', 'final-cta');
                navigate("/post-gig");
              }}
            >
              Post a Project
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-8">
            No credit card required • Setup takes 2 minutes
          </p>
        </div>
      </div>
    </section>
  );
};

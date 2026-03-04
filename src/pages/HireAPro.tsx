import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Users, 
  Zap,
  Star,
  MessageSquare,
  FileCheck,
  DollarSign,
  TrendingUp,
  Code
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import SEOHead from "@/components/SEOHead";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";
import { HireAProHero } from "@/components/hire-pro/HireAProHero";
import { HireAProBenefits } from "@/components/hire-pro/HireAProBenefits";
import { HireAProHowItWorks } from "@/components/hire-pro/HireAProHowItWorks";
import { HireAProTestimonials } from "@/components/hire-pro/HireAProTestimonials";
import { HireAProCTA } from "@/components/hire-pro/HireAProCTA";

export default function HireAPro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { trackButtonClick } = useGA4Tracking();

  // Track referral code
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      sessionStorage.setItem("referral_code", ref);
    }
  }, [searchParams]);

  const handlePostProject = () => {
    trackButtonClick('Post a Project', 'hire-a-pro');
    navigate("/post-gig");
  };

  return (
    <PageLayout showFooter={true} maxWidth="wide" padded={false}>
      <SEOHead
        title="Post a Project Free - Get Proposals in Hours"
        description="Post your project for free and get proposals from vetted US-based freelancers in hours. Web dev, design, marketing, AI & more. No upfront costs."
        keywords="post project free, hire freelancer, find developer, find designer, tech talent, freelance marketplace"
      />

      <HireAProHero onPostProject={handlePostProject} />
      <HireAProBenefits />
      <HireAProHowItWorks />
      <HireAProTestimonials />
      <HireAProCTA onPostProject={handlePostProject} />
    </PageLayout>
  );
}

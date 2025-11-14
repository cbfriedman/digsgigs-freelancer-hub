import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";

interface DiggerOnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

export const DiggerOnboardingTour = ({ run, onComplete }: DiggerOnboardingTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Welcome to digsandgiggs! 🎉</h3>
          <p>Let's take a quick tour to help you get started as a digger and land your first gig.</p>
        </div>
      ),
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[href="/digger-registration"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Complete Your Profile</h3>
          <p>First, build your professional profile to showcase your skills and experience to potential clients.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[href="/lead-limits"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Set Your Lead Limits</h3>
          <p>Control how many leads you receive per day/week/month to manage your budget and workload.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[href="/browse-gigs"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Browse Available Gigs</h3>
          <p>Discover gigs that match your skills. Free tier: $3/lead, Pro: $2/lead, Premium: FREE leads!</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Purchase Leads & Submit Bids</h3>
          <p>When you find a gig you like, purchase the lead to get client contact info, then submit your bid with your proposal and timeline.</p>
        </div>
      ),
      placement: "center",
    },
    {
      target: '[href="/my-leads"]',
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">Manage Your Leads & Bids</h3>
          <p>Track all your purchased leads and submitted bids in one place. Monitor your progress and follow up with clients.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: "body",
      content: (
        <div>
          <h3 className="text-lg font-bold mb-2">You're All Set! 🚀</h3>
          <p>Start browsing gigs, submit your first bid, and grow your business. Need help? Check out the Digger Guide anytime!</p>
        </div>
      ),
      placement: "center",
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      onComplete();
    }

    setStepIndex(index);
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          arrowColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 20,
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: 6,
          padding: "8px 16px",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: 10,
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
    />
  );
};

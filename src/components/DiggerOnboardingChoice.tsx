import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ListChecks, PlayCircle, X } from "lucide-react";
import { DiggerOnboardingTour } from "./DiggerOnboardingTour";

interface DiggerOnboardingChoiceProps {
  onDismiss: () => void;
}

export const DiggerOnboardingChoice = ({ onDismiss }: DiggerOnboardingChoiceProps) => {
  const navigate = useNavigate();
  const [startTour, setStartTour] = useState(false);

  const handleTourComplete = () => {
    setStartTour(false);
    onDismiss();
  };

  if (startTour) {
    return <DiggerOnboardingTour run={startTour} onComplete={handleTourComplete} />;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Welcome to digsandgiggs! 🎉</CardTitle>
            <CardDescription className="mt-2">
              Choose how you'd like to learn about getting started as a digger
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => setStartTour(true)}>
          <CardContent className="p-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10">
                <PlayCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Interactive Tour</h3>
            <p className="text-sm text-muted-foreground">
              Follow guided tooltips that show you around the platform step-by-step
            </p>
            <Button className="w-full">Start Tour</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer" onClick={() => navigate('/digger-guide')}>
          <CardContent className="p-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-accent/10">
                <BookOpen className="h-8 w-8 text-accent" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Complete Guide</h3>
            <p className="text-sm text-muted-foreground">
              Read detailed instructions with expandable sections for each step
            </p>
            <Button variant="outline" className="w-full">View Guide</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
          <CardContent className="p-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-secondary/10">
                <ListChecks className="h-8 w-8 text-foreground" />
              </div>
            </div>
            <h3 className="font-semibold text-lg">Quick Checklist</h3>
            <p className="text-sm text-muted-foreground">
              Track your progress with a simple checklist widget on your dashboard
            </p>
            <Button variant="secondary" className="w-full" onClick={onDismiss}>
              Show Checklist
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

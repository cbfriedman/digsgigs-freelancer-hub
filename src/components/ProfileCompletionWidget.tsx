import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Award } from "lucide-react";

interface ProfileField {
  name: string;
  label: string;
  completed: boolean;
  weight: number;
  section: string;
}

interface ProfileCompletionWidgetProps {
  profile: {
    bio: string | null;
    profile_image_url: string | null;
    work_photos: string[] | null;
    pricing_model: string | null;
    certifications: string[] | null;
    hourly_rate_min: number | null;
    hourly_rate_max: number | null;
    years_experience: number | null;
    is_insured: boolean | null;
    is_bonded: boolean | null;
    is_licensed: string | null;
    keywords: string[] | null;
    skills: string[] | null;
    portfolio_url: string | null;
  };
  profileId: string;
  onNavigateToSection?: (section: string) => void;
}

export const ProfileCompletionWidget = ({ 
  profile, 
  profileId,
  onNavigateToSection 
}: ProfileCompletionWidgetProps) => {
  const fields: ProfileField[] = useMemo(() => [
    {
      name: "bio",
      label: "Service Description",
      completed: !!profile.bio && profile.bio.length > 50,
      weight: 15,
      section: "bio"
    },
    {
      name: "profile_image",
      label: "Profile Photo",
      completed: !!profile.profile_image_url,
      weight: 10,
      section: "photos"
    },
    {
      name: "work_photos",
      label: "Work Samples (3+ photos)",
      completed: !!profile.work_photos && profile.work_photos.length >= 3,
      weight: 12,
      section: "photos"
    },
    {
      name: "pricing",
      label: "Pricing Options",
      completed: !!profile.pricing_model && profile.pricing_model !== "commission",
      weight: 10,
      section: "pricing"
    },
    {
      name: "hourly_rate",
      label: "Hourly Rate Range",
      completed: !!profile.hourly_rate_min && !!profile.hourly_rate_max,
      weight: 8,
      section: "pricing"
    },
    {
      name: "certifications",
      label: "Certifications",
      completed: !!profile.certifications && profile.certifications.length > 0,
      weight: 10,
      section: "certifications"
    },
    {
      name: "experience",
      label: "Years of Experience",
      completed: !!profile.years_experience && profile.years_experience > 0,
      weight: 8,
      section: "experience"
    },
    {
      name: "insurance",
      label: "Insurance Status",
      completed: profile.is_insured === true || profile.is_bonded === true,
      weight: 10,
      section: "credentials"
    },
    {
      name: "license",
      label: "License Information",
      completed: !!profile.is_licensed && profile.is_licensed !== "not_required",
      weight: 7,
      section: "credentials"
    },
    {
      name: "keywords",
      label: "Keywords (5+ terms)",
      completed: !!profile.keywords && profile.keywords.length >= 5,
      weight: 8,
      section: "keywords"
    },
    {
      name: "skills",
      label: "Skills List",
      completed: !!profile.skills && profile.skills.length >= 3,
      weight: 7,
      section: "skills"
    },
    {
      name: "portfolio",
      label: "Portfolio Website",
      completed: !!profile.portfolio_url,
      weight: 5,
      section: "portfolio"
    }
  ], [profile]);

  const completionScore = useMemo(() => {
    const totalWeight = fields.reduce((sum, field) => sum + field.weight, 0);
    const completedWeight = fields
      .filter(field => field.completed)
      .reduce((sum, field) => sum + field.weight, 0);
    return Math.round((completedWeight / totalWeight) * 100);
  }, [fields]);

  const incompleteFields = useMemo(() => 
    fields.filter(field => !field.completed).slice(0, 5),
    [fields]
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: "Expert", variant: "default" as const };
    if (score >= 70) return { label: "Strong", variant: "secondary" as const };
    if (score >= 50) return { label: "Good", variant: "secondary" as const };
    return { label: "Getting Started", variant: "outline" as const };
  };

  const scoreBadge = getScoreBadge(completionScore);

  const handleSectionClick = (section: string) => {
    if (onNavigateToSection) {
      onNavigateToSection(section);
    } else {
      // Scroll to section on current page
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-primary" />
              Profile Completion
            </CardTitle>
            <CardDescription>
              Complete your profile to attract more clients
            </CardDescription>
          </div>
          <Badge variant={scoreBadge.variant} className="text-base px-3 py-1">
            {scoreBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className={`text-2xl font-bold ${getScoreColor(completionScore)}`}>
              {completionScore}%
            </span>
          </div>
          <Progress value={completionScore} className="h-3" />
          {completionScore === 100 ? (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Your profile is complete! Great job!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {100 - completionScore}% away from a complete profile
            </p>
          )}
        </div>

        {incompleteFields.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-semibold">Next Steps</h4>
            <div className="space-y-2">
              {incompleteFields.map((field) => (
                <Button
                  key={field.name}
                  variant="ghost"
                  className="w-full justify-between h-auto py-3 px-3 hover:bg-primary/5"
                  onClick={() => handleSectionClick(field.section)}
                >
                  <div className="flex items-center gap-3">
                    <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-xs text-muted-foreground">
                        +{field.weight}% completion
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-semibold text-lg">{fields.filter(f => f.completed).length}</p>
              <p className="text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{fields.filter(f => !f.completed).length}</p>
              <p className="text-muted-foreground">Remaining</p>
            </div>
            <div>
              <p className="font-semibold text-lg">{fields.length}</p>
              <p className="text-muted-foreground">Total Items</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

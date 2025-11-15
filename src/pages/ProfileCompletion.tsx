import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowLeft, Edit } from "lucide-react";
import { toast } from "sonner";

interface ProfileField {
  name: string;
  label: string;
  category: string;
  isComplete: boolean;
  description?: string;
}

const ProfileCompletion = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    checkProfileCompletion();
  }, []);

  const checkProfileCompletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      if (profile?.user_type !== "digger") {
        toast.error("This page is only for diggers");
        navigate("/");
        return;
      }

      const { data: diggerProfile } = await supabase
        .from("digger_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!diggerProfile) {
        toast.error("Please create your digger profile first");
        navigate("/digger-registration");
        return;
      }

      const profileFields: ProfileField[] = [
        // Basic Information
        {
          name: "business_name",
          label: "Business Name",
          category: "Basic Information",
          isComplete: !!diggerProfile.business_name,
          description: "Your business or professional name"
        },
        {
          name: "phone",
          label: "Phone Number",
          category: "Basic Information",
          isComplete: !!diggerProfile.phone,
          description: "Contact phone number"
        },
        {
          name: "location",
          label: "Location",
          category: "Basic Information",
          isComplete: !!diggerProfile.location,
          description: "Your service area or location"
        },
        {
          name: "bio",
          label: "Professional Bio",
          category: "Basic Information",
          isComplete: !!diggerProfile.bio,
          description: "Tell clients about yourself and your expertise"
        },
        
        // Professional Details
        {
          name: "profession",
          label: "Profession",
          category: "Professional Details",
          isComplete: !!diggerProfile.profession,
          description: "Your primary profession or trade"
        },
        {
          name: "hourly_rate",
          label: "Hourly Rate Range",
          category: "Professional Details",
          isComplete: !!(diggerProfile.hourly_rate_min && diggerProfile.hourly_rate_max),
          description: "Your minimum and maximum hourly rates"
        },
        {
          name: "years_experience",
          label: "Years of Experience",
          category: "Professional Details",
          isComplete: diggerProfile.years_experience !== null && diggerProfile.years_experience !== undefined,
          description: "How many years you've been working in your field"
        },
        {
          name: "availability",
          label: "Availability",
          category: "Professional Details",
          isComplete: !!diggerProfile.availability,
          description: "When you're available for work"
        },
        
        // Portfolio & Work
        {
          name: "portfolio_urls",
          label: "Portfolio URLs",
          category: "Portfolio & Work",
          isComplete: !!(diggerProfile.portfolio_urls && diggerProfile.portfolio_urls.length > 0),
          description: "Links to your portfolio or previous work"
        },
        {
          name: "skills",
          label: "Skills",
          category: "Portfolio & Work",
          isComplete: !!(diggerProfile.skills && diggerProfile.skills.length > 0),
          description: "List of your professional skills"
        },
        {
          name: "work_photos",
          label: "Work Photos",
          category: "Portfolio & Work",
          isComplete: !!(diggerProfile.work_photos && diggerProfile.work_photos.length > 0),
          description: "Photos showcasing your work"
        },
        
        // Credentials & Certifications
        {
          name: "certifications",
          label: "Certifications",
          category: "Credentials & Certifications",
          isComplete: !!(diggerProfile.certifications && diggerProfile.certifications.length > 0),
          description: "Professional certifications you hold"
        },
        {
          name: "is_insured",
          label: "Insurance Status",
          category: "Credentials & Certifications",
          isComplete: diggerProfile.is_insured !== null,
          description: "Whether you carry professional insurance"
        },
        {
          name: "is_bonded",
          label: "Bonding Status",
          category: "Credentials & Certifications",
          isComplete: diggerProfile.is_bonded !== null,
          description: "Whether you are bonded"
        },
        {
          name: "is_licensed",
          label: "License Status",
          category: "Credentials & Certifications",
          isComplete: !!diggerProfile.is_licensed && diggerProfile.is_licensed !== 'not_required',
          description: "Professional licensing information"
        },
        
        // Industry Classification
        {
          name: "industry_code",
          label: "Industry Code (SIC/NAICS)",
          category: "Industry Classification",
          isComplete: !!(diggerProfile.sic_code || diggerProfile.naics_code),
          description: "Standard industry classification code"
        },
        {
          name: "custom_occupation",
          label: "Custom Occupation Title",
          category: "Industry Classification",
          isComplete: !!diggerProfile.custom_occupation_title,
          description: "Your specific occupation title"
        },
      ];

      setFields(profileFields);
      
      const completedCount = profileFields.filter(f => f.isComplete).length;
      const percentage = Math.round((completedCount / profileFields.length) * 100);
      setCompletionPercentage(percentage);
      
    } catch (error) {
      console.error("Error checking profile completion:", error);
      toast.error("Failed to load profile completion status");
    } finally {
      setLoading(false);
    }
  };

  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ProfileField[]>);

  const getCategoryCompletion = (categoryFields: ProfileField[]) => {
    const completed = categoryFields.filter(f => f.isComplete).length;
    return Math.round((completed / categoryFields.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl">Profile Completion</CardTitle>
                  <CardDescription className="mt-2">
                    Complete your profile to attract more clients and increase your visibility
                  </CardDescription>
                </div>
                <Badge 
                  variant={completionPercentage === 100 ? "default" : "secondary"}
                  className="text-2xl px-4 py-2"
                >
                  {completionPercentage}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={completionPercentage} className="h-3" />
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-muted-foreground">
                  {fields.filter(f => f.isComplete).length} of {fields.length} fields completed
                </p>
                <Button onClick={() => navigate("/edit-profile")}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Category Cards */}
          {Object.entries(groupedFields).map(([category, categoryFields]) => {
            const categoryCompletion = getCategoryCompletion(categoryFields);
            const isComplete = categoryCompletion === 100;

            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{category}</CardTitle>
                    <Badge variant={isComplete ? "default" : "secondary"}>
                      {categoryCompletion}%
                    </Badge>
                  </div>
                  <Progress value={categoryCompletion} className="h-2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryFields.map((field) => (
                      <div
                        key={field.name}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        {field.isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`font-medium ${field.isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {field.label}
                          </p>
                          {field.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {field.description}
                            </p>
                          )}
                        </div>
                        {field.isComplete && (
                          <Badge variant="outline" className="text-xs">
                            Complete
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* CTA Card */}
          {completionPercentage < 100 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-semibold">
                    Complete your profile to stand out!
                  </h3>
                  <p className="text-muted-foreground">
                    Profiles with 100% completion get 3x more client views and inquiries
                  </p>
                  <Button size="lg" onClick={() => navigate("/edit-profile")}>
                    <Edit className="mr-2 h-4 w-4" />
                    Complete Profile Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {completionPercentage === 100 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">
                    Your profile is 100% complete! 🎉
                  </h3>
                  <p className="text-muted-foreground">
                    Great job! You're now maximizing your visibility and attracting more clients.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletion;
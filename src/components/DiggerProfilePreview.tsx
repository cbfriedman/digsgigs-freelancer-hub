import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, DollarSign } from "lucide-react";
import { OptimizedImage } from "./OptimizedImage";

interface DiggerProfilePreviewProps {
  businessName: string;
  assignedUserName: string;
  profession: string;
  location: string;
  country: string;
  bio: string | null;
  keywords: string[];
  categoryNames: string[];
  pricingModel: string | null;
  profileImagePreview: string;
  workPhotoPreviews: string[];
  onApprove: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export const DiggerProfilePreview = ({
  businessName,
  assignedUserName,
  profession,
  location,
  country,
  bio,
  keywords,
  categoryNames,
  pricingModel,
  profileImagePreview,
  workPhotoPreviews,
  onApprove,
  onEdit,
  onCancel,
}: DiggerProfilePreviewProps) => {
  // Helper function to get country flag emoji
  const getCountryFlag = (countryName: string): string => {
    const flags: { [key: string]: string } = {
      "United States": "🇺🇸",
      "Canada": "🇨🇦",
      "United Kingdom": "🇬🇧",
      "Australia": "🇦🇺",
      "Germany": "🇩🇪",
      "France": "🇫🇷",
      "Spain": "🇪🇸",
      "Italy": "🇮🇹",
      "Mexico": "🇲🇽",
      "Brazil": "🇧🇷",
      "India": "🇮🇳",
      "China": "🇨🇳",
      "Japan": "🇯🇵",
      "South Korea": "🇰🇷",
      "Netherlands": "🇳🇱",
      "Sweden": "🇸🇪",
      "Norway": "🇳🇴",
      "Denmark": "🇩🇰",
      "Finland": "🇫🇮",
      "Poland": "🇵🇱",
      "Ireland": "🇮🇪",
      "Switzerland": "🇨🇭",
      "Austria": "🇦🇹",
      "Belgium": "🇧🇪",
      "Portugal": "🇵🇹",
      "Greece": "🇬🇷",
      "New Zealand": "🇳🇿",
      "Singapore": "🇸🇬",
      "South Africa": "🇿🇦",
      "Argentina": "🇦🇷",
      "Chile": "🇨🇱",
      "Colombia": "🇨🇴",
      "Peru": "🇵🇪",
      "Israel": "🇮🇱",
      "UAE": "🇦🇪",
      "Saudi Arabia": "🇸🇦",
      "Turkey": "🇹🇷",
      "Thailand": "🇹🇭",
      "Vietnam": "🇻🇳",
      "Philippines": "🇵🇭",
      "Indonesia": "🇮🇩",
      "Malaysia": "🇲🇾",
      "Egypt": "🇪🇬",
      "Nigeria": "🇳🇬",
      "Kenya": "🇰🇪",
      "Other": "🌍"
    };
    return flags[countryName] || "🌍";
  };
  const getPricingBadge = () => {
    if (pricingModel === 'commission') return 'Fixed Price Contracts';
    if (pricingModel === 'hourly') return 'Time & Materials';
    if (pricingModel === 'both') return 'Both Models';
    return 'Free Estimates';
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Card className="mb-6 border-primary">
          <CardHeader className="bg-accent/10">
            <CardTitle className="text-2xl text-center">Profile Preview</CardTitle>
            <CardDescription className="text-center">
              This is how clients will see your profile
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-hover)] border-border/50">
          <CardHeader className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                {profileImagePreview && (
                  <AvatarImage src={profileImagePreview} alt={assignedUserName} />
                )}
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {assignedUserName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl mb-1">{assignedUserName}</CardTitle>
                <CardDescription className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {profession}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {location}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span className="text-base">{getCountryFlag(country)}</span>
                  {country}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-sm">
                {getPricingBadge()}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {bio && (
              <div>
                <h3 className="font-semibold mb-2">About</h3>
                <p className="text-muted-foreground">{bio}</p>
              </div>
            )}

            {categoryNames.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categoryNames.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {keywords.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Skills & Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {workPhotoPreviews.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Work Samples</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {workPhotoPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <OptimizedImage
                        src={preview}
                        alt={`Work sample ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4 justify-center">
          <Button onClick={onCancel} variant="outline" size="lg">
            Cancel
          </Button>
          <Button onClick={onEdit} variant="secondary" size="lg">
            Edit Profile
          </Button>
          <Button onClick={onApprove} size="lg">
            Approve & Create Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

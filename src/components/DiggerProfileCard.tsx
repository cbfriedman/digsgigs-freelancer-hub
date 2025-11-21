import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, User, Briefcase } from "lucide-react";

interface DiggerProfileCardProps {
  photoUrl?: string;
  title?: string;
  tagline?: string;
  companyName?: string;
  location?: string;
  keywords?: string[];
  profession?: string;
}

export const DiggerProfileCard = ({
  photoUrl,
  title,
  tagline,
  companyName,
  location,
  keywords,
  profession
}: DiggerProfileCardProps) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Profile Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          This is how your profile will appear to potential clients
        </p>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg p-6 bg-gradient-to-br from-background to-accent/5">
          {/* Header Section */}
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={companyName} />
              ) : (
                <AvatarFallback className="bg-primary/10">
                  <User className="h-10 w-10 text-primary" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <h4 className="text-xl font-bold text-foreground">
                {title || companyName || 'Your Business Name'}
              </h4>
              {profession && (
                <p className="text-sm text-muted-foreground mt-1">{profession}</p>
              )}
              {location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" />
                  {location}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-muted-foreground ml-1">5.0 (New)</span>
              </div>
            </div>
          </div>

          {/* Tagline */}
          {tagline && (
            <div className="mb-4 p-3 bg-primary/5 rounded-md border border-primary/10">
              <p className="text-sm italic text-foreground">{tagline}</p>
            </div>
          )}

          {/* Keywords/Specialties */}
          {keywords && keywords.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">SPECIALTIES</p>
              <div className="flex flex-wrap gap-2">
                {keywords.slice(0, 6).map((keyword, index) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
                {keywords.length > 6 && (
                  <Badge variant="outline">+{keywords.length - 6} more</Badge>
                )}
              </div>
            </div>
          )}

          {/* Sample Info */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground">Jobs Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">100%</p>
              <p className="text-xs text-muted-foreground">Response Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">&lt; 1hr</p>
              <p className="text-xs text-muted-foreground">Response Time</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

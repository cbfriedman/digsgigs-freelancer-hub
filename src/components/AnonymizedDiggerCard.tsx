import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  Shield, 
  Clock, 
  CheckCircle2, 
  Award, 
  Briefcase,
  MapPin,
  Users,
  FileCheck
} from "lucide-react";

interface AnonymizedDiggerCardProps {
  /** Shown when displayName is not provided */
  bidderNumber: number;
  /** When provided, shown instead of "Bidder #N" and avatar uses profileImageUrl */
  displayName?: string | null;
  profileImageUrl?: string | null;
  profession?: string;
  yearsExperience?: number;
  averageRating?: number;
  totalRatings?: number;
  completionRate?: number;
  responseTimeHours?: number;
  isVerified?: boolean;
  isInsured?: boolean;
  isBonded?: boolean;
  isLicensed?: string;
  skills?: string[];
  certifications?: string[];
  referenceCount?: number;
  city?: string;
  state?: string;
  offersFreeBEstimates?: boolean;
  /** When true, hide the "Identity revealed after..." footer (e.g. when showing real identity) */
  showRealIdentity?: boolean;
}

export const AnonymizedDiggerCard = ({
  bidderNumber,
  displayName,
  profileImageUrl,
  profession,
  yearsExperience,
  averageRating,
  totalRatings,
  completionRate,
  responseTimeHours,
  isVerified,
  isInsured,
  isBonded,
  isLicensed,
  skills,
  certifications,
  referenceCount,
  city,
  state,
  offersFreeBEstimates,
  showRealIdentity = false,
}: AnonymizedDiggerCardProps) => {
  const nameToShow = (displayName && displayName.trim()) || `Bidder #${bidderNumber}`;
  const useRealIdentity = showRealIdentity || (displayName && displayName.trim().length > 0);

  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            {profileImageUrl ? (
              <AvatarImage src={profileImageUrl} alt={nameToShow} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {useRealIdentity && nameToShow !== `Bidder #${bidderNumber}` 
                ? nameToShow.slice(0, 2).toUpperCase() 
                : `#${bidderNumber}`}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-lg font-semibold text-foreground">
                {nameToShow}
              </h4>
              {isVerified && (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            
            {profession && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Briefcase className="w-3.5 h-3.5" />
                {profession}
              </p>
            )}
            
            {(city || state) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {[city, state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Rating */}
          <div className="text-center p-2 bg-accent/30 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-foreground">
                {averageRating?.toFixed(1) || "New"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRatings || 0} reviews
            </p>
          </div>
          
          {/* Experience */}
          {yearsExperience !== undefined && yearsExperience > 0 && (
            <div className="text-center p-2 bg-accent/30 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Award className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{yearsExperience}</span>
              </div>
              <p className="text-xs text-muted-foreground">Years exp.</p>
            </div>
          )}
          
          {/* Completion Rate */}
          {completionRate !== undefined && completionRate > 0 && (
            <div className="text-center p-2 bg-accent/30 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-bold text-foreground">{completionRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Completion</p>
            </div>
          )}
          
          {/* Response Time */}
          {responseTimeHours !== undefined && responseTimeHours > 0 && (
            <div className="text-center p-2 bg-accent/30 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-foreground">
                  {responseTimeHours < 24 ? `${responseTimeHours}h` : `${Math.round(responseTimeHours / 24)}d`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Response</p>
            </div>
          )}
        </div>
        
        {/* Trust Badges */}
        {(isInsured || isBonded || isLicensed) && (
          <div className="flex flex-wrap gap-2">
            {isInsured && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Insured
              </Badge>
            )}
            {isBonded && (
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Bonded
              </Badge>
            )}
            {isLicensed && (
              <Badge variant="outline" className="text-xs">
                <FileCheck className="w-3 h-3 mr-1" />
                Licensed
              </Badge>
            )}
            {offersFreeBEstimates && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                Free Estimates
              </Badge>
            )}
          </div>
        )}
        
        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">CERTIFICATIONS</p>
            <div className="flex flex-wrap gap-1.5">
              {certifications.slice(0, 4).map((cert, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {cert}
                </Badge>
              ))}
              {certifications.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{certifications.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* Skills */}
        {skills && skills.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">SKILLS</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 6).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {skills.length > 6 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{skills.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {/* References */}
        {referenceCount !== undefined && referenceCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Users className="w-4 h-4" />
            <span>{referenceCount} verified client reference{referenceCount !== 1 ? "s" : ""} available</span>
          </div>
        )}
        
        {/* Privacy Notice - only when showing anonymous placeholder */}
        {!useRealIdentity && (
          <div className="text-xs text-muted-foreground italic pt-2 border-t">
            Identity revealed after lead purchase or award acceptance
          </div>
        )}
      </CardContent>
    </Card>
  );
};

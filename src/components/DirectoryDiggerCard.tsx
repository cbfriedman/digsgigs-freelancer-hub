import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, Star, Briefcase, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfileCallTracking } from "@/hooks/useProfileCallTracking";
import { useProfileEmailTracking } from "@/hooks/useProfileEmailTracking";

interface DirectoryDiggerCardProps {
  id: string;
  profession: string | null;
  customOccupationTitle?: string | null;
  categories: string[];
  rating: number;
  reviewCount: number;
  profileImageUrl?: string | null;
  yearsExperience?: number | null;
  hourlyRateMin?: number | null;
  hourlyRateMax?: number | null;
  isInsured?: boolean;
  isBonded?: boolean;
  isLicensed?: string | null;
  offersFreeEstimates?: boolean | null;
  isOnline?: boolean;
}

export const DirectoryDiggerCard = ({
  id,
  profession,
  customOccupationTitle,
  categories,
  rating,
  reviewCount,
  profileImageUrl,
  yearsExperience,
  hourlyRateMin,
  hourlyRateMax,
  isInsured,
  isBonded,
  isLicensed,
  offersFreeEstimates,
  isOnline,
}: DirectoryDiggerCardProps) => {
  const navigate = useNavigate();
  const { recordCall, isRecording: isCallingDigger } = useProfileCallTracking();
  const { recordEmail, isRecording: isEmailingDigger } = useProfileEmailTracking();
  const [isProcessing, setIsProcessing] = useState(false);

  const displayProfession = customOccupationTitle || profession || "Professional";

  const getInitials = () => {
    if (!displayProfession) return "PR";
    const words = displayProfession.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return displayProfession.slice(0, 2).toUpperCase();
  };

  const handleCallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("Please sign in to call this professional");
      navigate("/register");
      return;
    }

    setIsProcessing(true);
    const result = await recordCall(id);
    setIsProcessing(false);
    
    if (result.success) {
      // The digger's phone is returned from the edge function
      if ((result as any).diggerPhone) {
        window.location.href = `tel:${(result as any).diggerPhone}`;
      }
    }
  };

  const handleEmailClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("Please sign in to email this professional");
      navigate("/register");
      return;
    }

    setIsProcessing(true);
    const result = await recordEmail(id);
    setIsProcessing(false);
    
    if (result.success && result.diggerEmail) {
      // Open email client with the digger's email
      window.location.href = `mailto:${result.diggerEmail}`;
    }
  };

  const formatHourlyRate = () => {
    if (hourlyRateMin && hourlyRateMax) {
      return `$${hourlyRateMin}-${hourlyRateMax}/hr`;
    }
    return null;
  };

  return (
    <Card className="hover:shadow-[var(--shadow-hover)] transition-all duration-300 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {/* Online Status Badge */}
            <div className="absolute -bottom-1 -right-1">
              <div className={`w-4 h-4 rounded-full border-2 border-background ${isOnline ? 'bg-green-500' : 'bg-muted'}`} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {/* Profession as main title - NO NAME */}
            <h3 className="font-semibold text-lg truncate">{displayProfession}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-muted-foreground'}`}>
                {isOnline ? '● Online' : '○ Offline'}
              </span>
            </div>
            
            {/* Badges row */}
            <div className="flex gap-1 mt-2 flex-wrap">
              {isInsured && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                  Insured
                </Badge>
              )}
              {isBonded && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Bonded
                </Badge>
              )}
              {isLicensed === 'yes' && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                  Licensed
                </Badge>
              )}
              {offersFreeEstimates && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Free Estimates
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-medium">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount})</span>
          </div>
          {formatHourlyRate() && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{formatHourlyRate()}</span>
            </div>
          )}
          {yearsExperience && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{yearsExperience}y exp</span>
            </div>
          )}
        </div>

        {/* Specialties/Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.slice(0, 4).map((category, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
            {categories.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{categories.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Call and Email buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="default"
            className="flex-1"
            onClick={handleCallClick}
            disabled={isProcessing || isCallingDigger}
          >
            {isCallingDigger ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Phone className="h-4 w-4 mr-2" />
            )}
            Call
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleEmailClick}
            disabled={isProcessing || isEmailingDigger}
          >
            {isEmailingDigger ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectoryDiggerCard;

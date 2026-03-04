import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  Shield, 
  Clock, 
  CheckCircle2, 
  Award, 
  Briefcase,
  DollarSign,
  MapPin
} from "lucide-react";

interface ProfileHeaderProps {
  profileImageUrl?: string | null;
  businessName: string;
  profession: string;
  isOnline: boolean;
  averageRating: number;
  totalRatings: number;
  yearsExperience?: number | null;
  completionRate?: number | null;
  responseTimeHours?: number | null;
  hourlyRateDisplay?: string | null;
  country?: string | null;
  isVerified?: boolean;
  isInsured?: boolean;
  isBonded?: boolean;
  isLicensed?: string | null;
  isAnonymized?: boolean;
}

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
    "Japan": "🇯🇵",
    "Other": "🌍"
  };
  return flags[countryName] || "🌍";
};

export const ProfileHeader = ({
  profileImageUrl,
  businessName,
  profession,
  isOnline,
  averageRating,
  totalRatings,
  yearsExperience,
  completionRate,
  responseTimeHours,
  hourlyRateDisplay,
  country,
  isVerified,
  isInsured,
  isBonded,
  isLicensed,
  isAnonymized = false,
}: ProfileHeaderProps) => {
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = isAnonymized 
    ? businessName.split(' ').map(w => w.charAt(0)).join('.') + '.'
    : businessName;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 sm:border-4 border-primary/20">
            <AvatarImage src={profileImageUrl || undefined} alt={businessName} />
            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
              {getInitials(businessName)}
            </AvatarFallback>
          </Avatar>
          {/* Online Status Badge */}
          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-background ${isOnline ? 'bg-green-500' : 'bg-muted'}`} />
        </div>

        {/* Name and Primary Info */}
        <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">{displayName}</h1>
            {isVerified && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <Shield className="w-3.5 h-3.5 mr-1" />
                Verified Pro
              </Badge>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {isOnline ? 'Available Now' : 'Offline'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <span className="text-xl text-muted-foreground">{profession}</span>
          </div>

          {country && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xl">{getCountryFlag(country)}</span>
              <span>{country}</span>
            </div>
          )}

          {/* Trust Badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {isInsured && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                <Shield className="w-3 h-3 mr-1" />
                Insured
              </Badge>
            )}
            {isBonded && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
                <Shield className="w-3 h-3 mr-1" />
                Bonded
              </Badge>
            )}
            {isLicensed === 'yes' && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Licensed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        {/* Rating */}
        <div className="bg-accent/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center min-w-0">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400 shrink-0" />
            <span className="text-xl sm:text-2xl font-bold text-foreground truncate">
              {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {totalRatings > 0 ? `${totalRatings} reviews` : 'No reviews yet'}
          </p>
        </div>

        {/* Experience */}
        {yearsExperience && yearsExperience > 0 && (
          <div className="bg-accent/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="text-xl sm:text-2xl font-bold text-foreground">{yearsExperience}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Years Experience</p>
          </div>
        )}

        {/* Completion Rate */}
        {completionRate !== null && completionRate !== undefined && completionRate > 0 && (
          <div className="bg-accent/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
              <span className="text-xl sm:text-2xl font-bold text-foreground">{completionRate}%</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Completion Rate</p>
          </div>
        )}

        {/* Response Time */}
        {responseTimeHours !== null && responseTimeHours !== undefined && responseTimeHours > 0 && (
          <div className="bg-accent/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
              <span className="text-xl sm:text-2xl font-bold text-foreground">
                {responseTimeHours < 24 ? `${responseTimeHours}h` : `${Math.round(responseTimeHours / 24)}d`}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Response Time</p>
          </div>
        )}

        {/* Hourly Rate */}
        {hourlyRateDisplay && (
          <div className="bg-accent/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 shrink-0" />
              <span className="text-base sm:text-lg font-bold text-foreground truncate">{hourlyRateDisplay}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Hourly Rate</p>
          </div>
        )}
      </div>
    </div>
  );
};

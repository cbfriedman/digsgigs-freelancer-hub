import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingSummary } from "./RatingSummary";
import { OptimizedImage } from "./OptimizedImage";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";

interface DiggerCardProps {
  name: string;
  profession: string;
  expertise: string[];
  rating: number;
  reviews: number;
  image: string;
  profileImageUrl?: string | null;
  country?: string | null;
  diggerId?: string;
}

export const DiggerCard = ({ name, profession, expertise, rating, reviews, image, profileImageUrl, country, diggerId }: DiggerCardProps) => {
  const { isOnline } = useDiggerPresence(diggerId);
  
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

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-hover)] border-border/50">
      <div className="relative h-48 overflow-hidden">
        <OptimizedImage
          src={profileImageUrl || image} 
          alt={name}
          width={400}
          height={300}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        {/* Online/Offline Status Indicator */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-border/50">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-muted'}`} />
            <span className="text-xs font-medium text-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="text-base">{profession}</CardDescription>
        {country && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span>{getCountryFlag(country)}</span>
            <span>{country}</span>
          </div>
        )}
        <div className="mt-2">
          <RatingSummary averageRating={rating} totalRatings={reviews} />
        </div>
        <Badge variant="outline" className="mt-2 w-fit">
          Click to view contact info - cost varies by tier + lead fee
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {expertise.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

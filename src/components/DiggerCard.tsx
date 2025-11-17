import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingSummary } from "./RatingSummary";
import { OptimizedImage } from "./OptimizedImage";

interface DiggerCardProps {
  name: string;
  profession: string;
  expertise: string[];
  rating: number;
  reviews: number;
  image: string;
}

export const DiggerCard = ({ name, profession, expertise, rating, reviews, image }: DiggerCardProps) => {
  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-hover)] border-border/50">
      <div className="relative h-48 overflow-hidden">
        <OptimizedImage
          src={image} 
          alt={name}
          width={400}
          height={300}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription className="text-base">{profession}</CardDescription>
        <div className="mt-2">
          <RatingSummary averageRating={rating} totalRatings={reviews} />
        </div>
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

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DemoDiggerCardProps {
  name: string;
  profession: string;
  categories: string[];
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRateMin: number;
  hourlyRateMax: number;
  yearsExperience: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export const DemoDiggerCard: React.FC<DemoDiggerCardProps> = ({
  name,
  profession,
  categories,
  location,
  rating,
  reviewCount,
  hourlyRateMin,
  hourlyRateMax,
  yearsExperience,
}) => {
  const navigate = useNavigate();

  return (
    <Card className="h-full flex flex-col border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex flex-col gap-4 flex-1">
        <div>
          <h4 className="font-semibold text-lg mb-2">{name}</h4>
          <p className="text-sm text-muted-foreground mb-3">{profession}</p>
          
          {/* Multiple Category Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map((category, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>
                {rating.toFixed(1)} ({reviewCount} reviews)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>{yearsExperience} years experience</span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-3 border-t">
          <p className="text-sm text-muted-foreground mb-2">Hourly Rate:</p>
          <p className="font-semibold text-lg">
            {formatCurrency(hourlyRateMin)} - {formatCurrency(hourlyRateMax)}
          </p>
        </div>

        <div className="mt-auto pt-2">
          <Button onClick={() => navigate("/browse-diggers")} className="w-full" variant="default">
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoDiggerCard;

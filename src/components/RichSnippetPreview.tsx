import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RichSnippetPreviewProps {
  businessName: string;
  rating: number;
  reviewCount: number;
  priceRange?: string;
  location: string;
}

/**
 * Preview component showing how the business will appear in Google search results
 * with rich snippets (star ratings)
 */
export const RichSnippetPreview = ({
  businessName,
  rating,
  reviewCount,
  priceRange,
  location
}: RichSnippetPreviewProps) => {
  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground mb-1">Google Search Preview</p>
          <div className="space-y-1">
            <h3 className="text-blue-600 text-lg font-normal hover:underline cursor-pointer">
              {businessName} - Professional Services | digsandgigs
            </h3>
            <p className="text-sm text-green-700">
              https://digsandgigs.net › digger › ...
            </p>
            <div className="flex items-center gap-2 my-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-300 text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                Rating: {rating.toFixed(1)} · {reviewCount} reviews
              </span>
              {priceRange && (
                <span className="text-sm text-gray-600">· {priceRange}</span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {businessName} provides professional services in {location}. 
              Rated {rating.toFixed(1)} stars with {reviewCount} verified reviews...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

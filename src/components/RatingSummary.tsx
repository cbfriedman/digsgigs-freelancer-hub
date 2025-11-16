import { Star } from "lucide-react";

interface RatingSummaryProps {
  averageRating: number | null;
  totalRatings: number | null;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const RatingSummary = ({ 
  averageRating, 
  totalRatings, 
  showText = true,
  size = "md" 
}: RatingSummaryProps) => {
  const rating = averageRating || 0;
  const count = totalRatings || 0;

  const starSize = size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";

  if (count === 0) {
    return showText ? (
      <span className={`${textSize} text-muted-foreground`}>No reviews yet</span>
    ) : null;
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`${starSize} ${
              i < Math.round(rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
      {showText && (
        <span className={`${textSize} text-muted-foreground`}>
          {rating.toFixed(1)} ({count} {count === 1 ? "review" : "reviews"})
        </span>
      )}
    </div>
  );
};

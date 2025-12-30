import { cn } from "@/lib/utils";

interface DigsAndGigsLogoProps {
  variant?: "icon" | "full" | "horizontal";
  className?: string;
  width?: number | string;
  height?: number | string;
  showText?: boolean;
}

/**
 * DigsAndGigs Logo Component
 * 
 * Variants:
 * - icon: Just the circular icon with dots and wavy line
 * - full: Square logo with icon
 * - horizontal: Logo with text side-by-side
 */
export function DigsAndGigsLogo({
  variant = "full",
  className,
  width,
  height,
  showText = true,
}: DigsAndGigsLogoProps) {
  const baseClasses = "inline-block";
  
  if (variant === "icon") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        width={width || 100}
        height={height || 100}
        className={cn(baseClasses, className)}
        aria-label="Digs and Gigs Logo"
      >
        <defs>
          <linearGradient id="iconPurpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#6d28d9", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#9333ea", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        
        {/* Background Circle with Purple Gradient */}
        <circle cx="50" cy="50" r="45" fill="url(#iconPurpleGrad)" />
        
        {/* White Dot (upper-left) */}
        <circle cx="30" cy="30" r="6" fill="white" />
        
        {/* Orange Dot (lower-right) */}
        <circle cx="70" cy="70" r="6" fill="#f97316" />
        
        {/* Wavy S-shaped connecting line */}
        <path
          d="M 30 30 Q 40 45 50 50 Q 60 55 70 70"
          stroke="white"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === "horizontal" && showText) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <DigsAndGigsLogo variant="icon" width={width || 120} height={height || 120} />
        <span className="text-3xl font-semibold">
          <span className="text-gray-800 dark:text-gray-100">Digs</span>
          <span className="text-blue-600 dark:text-blue-400"> &amp;</span>
          <span className="text-gray-800 dark:text-gray-100"> Gigs</span>
        </span>
      </div>
    );
  }

  // Full variant (default)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={width || 200}
      height={height || 200}
      className={cn(baseClasses, className)}
      aria-label="Digs and Gigs Logo"
    >
      <defs>
        <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#6d28d9", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#9333ea", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Background Circle with Purple Gradient */}
      <circle cx="100" cy="100" r="90" fill="url(#purpleGradient)" />
      
      {/* White Dot (upper-left) */}
      <circle cx="60" cy="60" r="12" fill="white" />
      
      {/* Orange Dot (lower-right) */}
      <circle cx="140" cy="140" r="12" fill="#f97316" />
      
      {/* Wavy S-shaped connecting line */}
      <path
        d="M 60 60 Q 80 90 100 100 Q 120 110 140 140"
        stroke="white"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


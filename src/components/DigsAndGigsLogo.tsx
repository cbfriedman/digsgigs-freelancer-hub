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
 * - icon: Just the circular handshake icon
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
        {/* Background Circle */}
        <circle cx="50" cy="50" r="45" fill="#3B2055" />
        
        {/* Handshake Icon - Two hands meeting */}
        {/* Left hand (white) */}
        <path d="M25 55 L35 42 L45 42 L52 50 L45 58 L35 58 Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
        <path d="M35 42 L35 32 Q35 28 40 28 L48 28" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
        
        {/* Right hand (orange) */}
        <path d="M75 55 L65 42 L55 42 L48 50 L55 58 L65 58 Z" fill="#f97316" stroke="#f97316" strokeWidth="1" strokeLinejoin="round"/>
        <path d="M65 42 L65 32 Q65 28 60 28 L52 28" stroke="#f97316" strokeWidth="4" strokeLinecap="round" fill="none"/>
        
        {/* Handshake clasp in center */}
        <ellipse cx="50" cy="50" rx="12" ry="10" fill="white" stroke="#f97316" strokeWidth="3"/>
      </svg>
    );
  }

  if (variant === "horizontal" && showText) {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <DigsAndGigsLogo variant="icon" width={width || 120} height={height || 120} />
        <span className="text-3xl font-semibold">
          <span className="text-gray-800 dark:text-gray-100">Digs</span>
          <span className="text-orange-500"> &amp;</span>
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
      {/* Background Circle */}
      <circle cx="100" cy="100" r="90" fill="#3B2055" />
      
      {/* Handshake Icon - Two hands meeting */}
      {/* Left hand (white) */}
      <path d="M50 110 L70 84 L90 84 L104 100 L90 116 L70 116 Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M70 84 L70 64 Q70 56 80 56 L96 56" stroke="white" strokeWidth="8" strokeLinecap="round" fill="none"/>
      
      {/* Right hand (orange) */}
      <path d="M150 110 L130 84 L110 84 L96 100 L110 116 L130 116 Z" fill="#f97316" stroke="#f97316" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M130 84 L130 64 Q130 56 120 56 L104 56" stroke="#f97316" strokeWidth="8" strokeLinecap="round" fill="none"/>
      
      {/* Handshake clasp in center */}
      <ellipse cx="100" cy="100" rx="24" ry="20" fill="white" stroke="#f97316" strokeWidth="6"/>
    </svg>
  );
}

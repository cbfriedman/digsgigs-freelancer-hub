import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  /** Show navigation bar */
  showNav?: boolean;
  /** Show footer */
  showFooter?: boolean;
  /** Maximum content width variant */
  maxWidth?: "tight" | "default" | "wide" | "full";
  /** Additional container padding */
  padded?: boolean;
  /** Additional className for main content */
  className?: string;
  /** Optional className for the outer wrapper (e.g. to constrain height and remove page scroll) */
  wrapperClassName?: string;
  /** Navigation props */
  navProps?: {
    showBackButton?: boolean;
    backTo?: string;
    backLabel?: string;
  };
}

const maxWidthClasses = {
  tight: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export function PageLayout({
  children,
  showNav = true,
  showFooter = true,
  maxWidth = "default",
  padded = true,
  className,
  wrapperClassName,
  navProps,
}: PageLayoutProps) {
  return (
    <div className={cn("min-h-screen flex flex-col bg-background", wrapperClassName)}>
      {/* Nav is in root layout so it persists on every page */}
      
      <main
        className={cn(
          "flex-1 w-full mx-auto",
          maxWidthClasses[maxWidth],
          padded && "px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6",
          className
        )}
      >
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
}

export default PageLayout;

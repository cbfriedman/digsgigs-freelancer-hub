import { ImgHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}

/**
 * OptimizedImage component with WebP support and responsive srcset
 * Supports both Supabase Storage URLs (with transformation) and static assets
 */
export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  sizes = "100vw",
  priority = false,
  className,
  ...props
}: OptimizedImageProps) => {
  const [error, setError] = useState(false);
  
  // Check if this is a Supabase Storage URL
  const isSupabaseUrl = src.includes('supabase.co/storage/v1/object/public/');
  
  // Generate srcset for different screen sizes
  const generateSrcSet = (url: string, format?: string) => {
    if (isSupabaseUrl) {
      // Use Supabase image transformation for different sizes
      const baseUrl = url.split('?')[0];
      const widths = [640, 750, 828, 1080, 1200, 1920];
      
      return widths
        .map(w => {
          const params = new URLSearchParams({
            width: w.toString(),
            quality: '85',
            ...(format && { format })
          });
          return `${baseUrl}?${params} ${w}w`;
        })
        .join(', ');
    }
    
    // For static assets, return the original (assumes optimization at build time)
    return src;
  };

  // Try WebP with fallback
  const webpSrc = isSupabaseUrl 
    ? `${src.split('?')[0]}?format=webp&quality=85${width ? `&width=${width}` : ''}`
    : src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    
  const fallbackSrc = isSupabaseUrl && width
    ? `${src.split('?')[0]}?width=${width}&quality=85`
    : src;

  // If there's an error or WebP not supported, show fallback
  if (error || !src) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        className={cn(className)}
        {...props}
      />
    );
  }

  return (
    <picture>
      {/* WebP format for modern browsers */}
      <source
        type="image/webp"
        srcSet={isSupabaseUrl ? generateSrcSet(src, 'webp') : webpSrc}
        sizes={sizes}
      />
      
      {/* Fallback to original format */}
      <source
        srcSet={isSupabaseUrl ? generateSrcSet(src) : src}
        sizes={sizes}
      />
      
      {/* Fallback img tag */}
      <img
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        onError={() => setError(true)}
        className={cn(className)}
        {...props}
      />
    </picture>
  );
};

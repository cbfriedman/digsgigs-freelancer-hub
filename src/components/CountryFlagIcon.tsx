import { useState } from "react";
import { getCodeForCountryName, getFlagForCountryName } from "@/config/regionOptions";

const FLAG_CDN_BASE = "https://flagcdn.com";

type Size = "sm" | "md" | "lg";

const sizeStyles: Record<Size, { width: number; height: number; fontSize: string }> = {
  sm: { width: 24, height: 18, fontSize: "0.75rem" },
  md: { width: 32, height: 24, fontSize: "1rem" },
  lg: { width: 40, height: 30, fontSize: "1.25rem" },
};

export interface CountryFlagIconProps {
  /** Country name (e.g. "Australia") or 2-letter code (e.g. "AU"). */
  countryNameOrCode: string;
  size?: Size;
  className?: string;
  /** Accessible label (default: country code or empty). */
  title?: string;
}

/**
 * Renders a real flag image from flagcdn.com for the given country.
 * Falls back to flag emoji if no code or image fails to load.
 */
export function CountryFlagIcon({
  countryNameOrCode,
  size = "md",
  className = "",
  title,
}: CountryFlagIconProps) {
  const code =
    getCodeForCountryName(countryNameOrCode?.trim() || "") ||
    (countryNameOrCode?.trim().length === 2 ? countryNameOrCode.trim().toUpperCase() : "");
  const emojiFallback = getFlagForCountryName(countryNameOrCode || "") || (code ? getFlagForCountryName(code) : "") || "🌐";
  const [imgError, setImgError] = useState(false);

  const { width, height, fontSize } = sizeStyles[size];

  if (!code || imgError) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width, height, fontSize }}
        title={title ?? (code || undefined)}
        role="img"
        aria-label={title ?? (code ? `Flag of ${code}` : "Location")}
      >
        {emojiFallback}
      </span>
    );
  }

  return (
    <img
      src={`${FLAG_CDN_BASE}/w${width}/${code.toLowerCase()}.png`}
      alt=""
      width={width}
      height={height}
      className={`shrink-0 rounded object-cover ${className}`}
      title={title ?? code}
      loading="lazy"
      onError={() => setImgError(true)}
    />
  );
}

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigation } from "react-router-dom";
import { cn } from "@/lib/utils";

const MIN_SHOW_MS = 500;
const COMPLETE_DURATION_MS = 220;
const GUARANTEED_SHOW_MS = 600; // Always show at least this long on mount (full page load/refresh)

/**
 * Site-wide progress bar fixed at the very top of the viewport (above header).
 * Shown during initial load, full page refresh, and route navigation.
 * Rendered via portal to document.body so it is never clipped.
 */
export function GlobalProgressBar() {
  const navigation = useNavigation();
  const [initialDone, setInitialDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const mountedAt = useRef(Date.now());
  const [guaranteedPhaseOver, setGuaranteedPhaseOver] = useState(false);
  const isNavigating = navigation.state === "loading" || navigation.state === "submitting";
  const active = isNavigating || !initialDone;

  useEffect(() => {
    const t = setTimeout(() => setGuaranteedPhaseOver(true), GUARANTEED_SHOW_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isNavigating && !initialDone) {
      const elapsed = Date.now() - mountedAt.current;
      const delay = Math.max(0, MIN_SHOW_MS - elapsed);
      const t = setTimeout(() => setInitialDone(true), delay);
      return () => clearTimeout(t);
    }
  }, [isNavigating, initialDone]);

  useEffect(() => {
    if (active) {
      setCompleting(false);
      return;
    }
    setCompleting(true);
    const t = setTimeout(() => setCompleting(false), COMPLETE_DURATION_MS);
    return () => clearTimeout(t);
  }, [active]);

  const show = active || completing || !guaranteedPhaseOver;
  if (!show) return null;

  const bar = (
    <div
      role="progressbar"
      aria-label="Page loading"
      className={cn(
        "fixed inset-x-0 top-0 z-[99999] h-1 overflow-hidden transition-opacity duration-150 pointer-events-none",
        "bg-primary/30",
        completing && "opacity-0"
      )}
      style={{ isolation: "isolate" }}
    >
      <div
        className={cn(
          "h-full rounded-r-full bg-primary",
          completing
            ? "w-full transition-[width] duration-200 ease-out"
            : "w-1/3 min-w-[120px] max-w-[240px] animate-refresh-slide"
        )}
      />
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(bar, document.body)
    : bar;
}

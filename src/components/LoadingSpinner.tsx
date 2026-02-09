import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  /** Optional label below the spinner */
  label?: string;
  /** Inline (e.g. inside a button) vs block (full loading state) */
  variant?: "block" | "inline";
  className?: string;
}

/** Site-wide loading icon: same look everywhere (Messages, Admin, AI chat, MyBids, etc.) */
export function LoadingSpinner({ label, variant = "block", className }: LoadingSpinnerProps) {
  const wrapperClass =
    "loading-spinner-wrapper rounded-2xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20";
  const iconClass = "text-primary animate-spin";

  if (variant === "inline") {
    return (
      <span className={wrapperClass + " w-8 h-8 inline-flex " + (className ?? "")}>
        <Loader2 className={"h-4 w-4 " + iconClass} aria-hidden />
      </span>
    );
  }

  return (
    <div className={"flex flex-col items-center justify-center gap-3 text-center " + (className ?? "")}>
      <div className={wrapperClass + " w-12 h-12"}>
        <Loader2 className={"h-6 w-6 " + iconClass} aria-hidden />
      </div>
      {label && <p className="text-muted-foreground text-sm font-medium">{label}</p>}
    </div>
  );
}

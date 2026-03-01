import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  partnerName?: string;
  partnerAvatarUrl?: string | null;
  className?: string;
}

export function TypingIndicator({
  className,
}: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 justify-start px-0 py-1",
        className
      )}
      data-testid="typing-indicator"
      aria-label="Typing"
    >
      <span
        className="typing-dot-sm rounded-full bg-muted-foreground/70 animate-typing-dot"
        style={{ animationDelay: "0ms" }}
        aria-hidden
      />
      <span
        className="typing-dot-sm rounded-full bg-muted-foreground/70 animate-typing-dot"
        style={{ animationDelay: "0.5s" }}
        aria-hidden
      />
      <span
        className="typing-dot-sm rounded-full bg-muted-foreground/70 animate-typing-dot"
        style={{ animationDelay: "1s" }}
        aria-hidden
      />
      <span className="text-xs text-muted-foreground ml-0.5">typing</span>
    </div>
  );
}

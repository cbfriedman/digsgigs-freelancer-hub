import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  partnerName: string;
  partnerAvatarUrl?: string | null;
  className?: string;
}

export function TypingIndicator({
  partnerName,
  partnerAvatarUrl,
  className,
}: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 justify-start",
        className
      )}
      data-testid="typing-indicator"
    >
      <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border/50">
        {partnerAvatarUrl && (
          <AvatarImage src={partnerAvatarUrl} alt="" className="object-cover" />
        )}
        <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
          {partnerName[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl rounded-bl-md bg-muted/60 border border-border/40 shadow-sm">
        <span
          className="typing-dot-sm rounded-full bg-primary animate-typing-dot"
          style={{ animationDelay: "0ms" }}
          aria-hidden
        />
        <span
          className="typing-dot-md rounded-full bg-accent animate-typing-dot"
          style={{ animationDelay: "0.2s" }}
          aria-hidden
        />
        <span
          className="typing-dot-sm rounded-full bg-primary animate-typing-dot"
          style={{ animationDelay: "0.4s" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

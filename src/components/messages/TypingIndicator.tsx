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
      <div className="flex items-center gap-1 px-3 py-2 rounded-2xl rounded-bl-md bg-card border border-border/50 shadow-sm">
        <span
          className="w-2 h-2 rounded-full bg-primary animate-typing-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-typing-dot"
          style={{ animationDelay: "160ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-typing-dot"
          style={{ animationDelay: "320ms" }}
        />
      </div>
    </div>
  );
}

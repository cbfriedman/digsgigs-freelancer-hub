import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isOwn: boolean;
  isRead?: boolean;
  senderName?: string;
  showAvatar?: boolean;
}

export function MessageBubble({
  content,
  timestamp,
  isOwn,
  isRead = false,
  senderName,
  showAvatar = false,
}: MessageBubbleProps) {
  const timeStr = format(new Date(timestamp), "h:mm a");

  return (
    <div className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
      {/* Avatar placeholder for alignment */}
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      )}
      
      <div className={cn("group max-w-[85%] sm:max-w-[75%]")}>
        {/* Sender name */}
        {senderName && !isOwn && (
          <p className="text-xs text-muted-foreground mb-1 ml-3">{senderName}</p>
        )}
        
        {/* Message bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 shadow-sm transition-all",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md ml-auto"
              : "bg-card border border-border/50 rounded-bl-md shadow-card"
          )}
        >
          {/* Content */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
          
          {/* Timestamp and read status */}
          <div
            className={cn(
              "flex items-center justify-end gap-1.5 mt-1.5 select-none",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            <span className="text-[10px] sm:text-xs">{timeStr}</span>
            {isOwn && (
              <span className="shrink-0">
                {isRead ? (
                  <CheckCheck className="h-3.5 w-3.5" aria-label="Read" />
                ) : (
                  <Check className="h-3.5 w-3.5" aria-label="Sent" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Avatar placeholder for alignment */}
      {isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0" />
      )}
    </div>
  );
}

export default MessageBubble;

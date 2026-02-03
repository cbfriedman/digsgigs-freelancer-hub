import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ConversationListItemProps {
  id: string;
  partnerName: string;
  subtitle: string;
  updatedAt: string;
  isSelected: boolean;
  isOnline?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function ConversationListItem({
  partnerName,
  subtitle,
  updatedAt,
  isSelected,
  isOnline = false,
  unreadCount = 0,
  onClick,
}: ConversationListItemProps) {
  const initial = partnerName[0]?.toUpperCase() || "?";
  const dateStr = format(new Date(updatedAt), "M/d/yy");

  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center gap-3 p-3 text-left transition-all duration-200",
        "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
        isSelected && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onClick={onClick}
    >
      {/* Avatar with online indicator */}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
          <AvatarFallback className={cn(
            "font-semibold text-sm",
            isSelected 
              ? "bg-primary text-primary-foreground" 
              : "bg-primary/10 text-primary"
          )}>
            {initial}
          </AvatarFallback>
        </Avatar>
        {/* Online/offline indicator */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            isOnline ? "bg-success" : "bg-muted-foreground/40"
          )}
          aria-label={isOnline ? "Online" : "Offline"}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            "font-medium truncate",
            isSelected ? "text-primary" : "text-foreground",
            unreadCount > 0 && "font-semibold"
          )}>
            {partnerName}
          </p>
          <span className="text-xs text-muted-foreground shrink-0">{dateStr}</span>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}

export default ConversationListItem;

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Check, CheckCheck, Paperclip, Download, MoreVertical, Copy, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const BUCKET = "message-attachments";
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isOwn: boolean;
  isRead?: boolean;
  senderName?: string;
  showAvatar?: boolean;
  attachments?: { name: string; path: string; type: string }[];
  /** When set, shows three-dot menu with Reply (if onReply) and for own messages Edit, Copy, Delete */
  messageId?: string;
  onReply?: (messageId: string, content: string) => void;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
}

function useSignedUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (paths.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const path of paths) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);
        if (!cancelled && data?.signedUrl) next[path] = data.signedUrl;
      }
      if (!cancelled) setUrls(next);
    })();
    return () => { cancelled = true; };
  }, [paths.join(",")]);
  return urls;
}

export function MessageBubble({
  content,
  timestamp,
  isOwn,
  isRead = false,
  senderName,
  showAvatar = false,
  attachments = [],
  messageId,
  onReply,
  onEdit,
  onDelete,
  onCopy,
}: MessageBubbleProps) {
  const timeStr = format(new Date(timestamp), "h:mm a");
  const paths = attachments.map((a) => a.path);
  const signedUrls = useSignedUrls(paths);
  const showActions = messageId && (onReply || (isOwn && onCopy));
  const [menuOpen, setMenuOpen] = useState(false);
  const openedByClickRef = useRef(false);

  return (
    <div className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      )}

      <div className={cn("group min-w-0 max-w-[85%] sm:max-w-[75%]")}>
        {senderName && !isOwn && (
          <p className="text-xs text-muted-foreground mb-1 ml-3">{senderName}</p>
        )}

        <div
          className={cn(
            "relative overflow-hidden rounded-2xl px-4 py-2.5 shadow-sm transition-all",
            showActions && "pr-10",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md ml-auto"
              : "bg-muted text-foreground border border-border/40 rounded-bl-md shadow-card"
          )}
        >
          {/* Three-dot menu - Reply for any message; Edit/Copy/Delete for own */}
          {showActions && (
            <div className="absolute top-1.5 right-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
              <DropdownMenu
                modal={false}
                open={menuOpen}
                onOpenChange={(next) => {
                  if (next && !openedByClickRef.current) return;
                  setMenuOpen(next);
                  openedByClickRef.current = false;
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7",
                      isOwn
                        ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      openedByClickRef.current = true;
                      setMenuOpen(true);
                    }}
                    title="Message options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover">
                  {onReply && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onReply(messageId!, content || "");
                      }}
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                  )}
                  {isOwn && onCopy && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(content || "");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className={cn("flex flex-wrap gap-2 mb-2", content ? "mb-2" : "")}>
              {attachments.map((att) => {
                const url = signedUrls[att.path];
                const isImage = att.type.startsWith("image/");
                if (isImage && url) {
                  return (
                    <a
                      key={att.path}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-border/50 max-w-[280px] max-h-[240px]"
                    >
                      <img
                        src={url}
                        alt={att.name}
                        className="object-cover w-full h-full max-h-[240px]"
                      />
                    </a>
                  );
                }
                return (
                  <a
                    key={att.path}
                    href={url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.name}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      isOwn
                        ? "border-primary-foreground/30 hover:bg-primary-foreground/10"
                        : "border-border/50 hover:bg-muted/50"
                    )}
                  >
                    {url ? (
                      <Download className="h-4 w-4 shrink-0" />
                    ) : (
                      <Paperclip className="h-4 w-4 shrink-0 opacity-70" />
                    )}
                    <span className="truncate max-w-[180px]">{att.name}</span>
                  </a>
                );
              })}
            </div>
          )}

          {content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {content}
            </p>
          ) : attachments.length > 0 ? null : (
            <p className="text-sm text-muted-foreground/80 italic">No text</p>
          )}

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

      {isOwn && showAvatar && (
        <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0" />
      )}
    </div>
  );
}

export default MessageBubble;

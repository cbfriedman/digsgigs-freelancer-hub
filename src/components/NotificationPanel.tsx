import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { X, Check, Trash2, Mail, MessageSquare, DollarSign, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "new_bid":
      return <DollarSign className="h-4 w-4 text-green-500" />;
    case "new_message":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "new_gig":
      return <Briefcase className="h-4 w-4 text-purple-500" />;
    case "bid_status":
      return <Mail className="h-4 w-4 text-orange-500" />;
    default:
      return <Mail className="h-4 w-4 text-muted-foreground" />;
  }
};

interface NotificationPanelProps {
  /** Called when a notification is clicked (e.g. to close the header dropdown). */
  onNotificationClick?: () => void;
}

export const NotificationPanel = ({ onNotificationClick }: NotificationPanelProps) => {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    onNotificationClick?.();

    if (notification.type === "new_message" && notification.metadata?.conversation_id) {
      navigate(`/messages?conversation=${notification.metadata.conversation_id}`);
      return;
    }
    // Any notification tied to a gig (e.g. "New bid received") opens the gig detail page
    if (notification.metadata?.gig_id) {
      navigate(`/gig/${notification.metadata.gig_id}`);
      return;
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-xs text-muted-foreground">
            {notifications.filter(n => !n.read).length} unread
          </p>
        </div>
        <div className="flex gap-1">
          {notifications.some(n => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              title="Mark all as read"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
                  !notification.read && "bg-primary/5"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 5 && (
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate("/notifications")}
          >
            View All Notifications
          </Button>
        </div>
      )}
    </div>
  );
};

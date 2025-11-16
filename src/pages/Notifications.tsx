import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bell, Check, Trash2, Mail, MessageSquare, DollarSign, Briefcase, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { useState } from "react";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "new_bid":
      return <DollarSign className="h-5 w-5 text-green-500" />;
    case "new_message":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "new_gig":
      return <Briefcase className="h-5 w-5 text-purple-500" />;
    case "bid_status":
      return <Mail className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            digsandgigs
          </h1>
          <div className="w-32" />
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Bell className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Notifications</h1>
            </div>
            <p className="text-muted-foreground">
              Stay updated with your activity on digsandgigs
            </p>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({notifications.filter(n => !n.read).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              {notifications.some(n => !n.read) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Mark all as read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-lg font-medium mb-2">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-muted-foreground">
                  {filter === "unread" 
                    ? "You're all caught up!"
                    : "When you receive notifications, they'll appear here"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    !notification.read && "border-primary/50 bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold">{notification.title}</p>
                          {!notification.read && (
                            <Badge variant="default" className="ml-2">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;

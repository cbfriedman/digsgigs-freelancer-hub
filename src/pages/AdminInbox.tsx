import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Inbox, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import type { ContactStatus } from "@/components/admin/SupportInboxTab";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  created_at: string;
}

const STATUS_LABELS: Record<ContactStatus, string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
};

const STATUS_VARIANTS: Record<ContactStatus, "default" | "secondary" | "outline"> = {
  new: "default",
  in_progress: "secondary",
  resolved: "outline",
};

function StatusBadge({ status }: { status: ContactStatus }) {
  const label = STATUS_LABELS[status] ?? status;
  const variant = STATUS_VARIANTS[status] ?? "secondary";
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
}

const AdminInbox = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const normalizeStatus = (s: ContactSubmission): ContactSubmission => {
    const status: ContactStatus =
      s.status && ["new", "in_progress", "resolved"].includes(s.status)
        ? (s.status as ContactStatus)
        : "new";
    return { ...s, status };
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to access this page");
        navigate("/register");
        return;
      }

      const { data: rolesData, error: adminError } = await (supabase.rpc as any)(
        "get_user_app_roles_safe",
        { _user_id: user.id }
      );

      if (adminError) {
        console.error("Error checking admin status:", adminError);
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      const hasAdmin =
        rolesData &&
        Array.isArray(rolesData) &&
        rolesData.some((r: any) => r.app_role === "admin");

      if (!hasAdmin) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadSubmissions();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = ((data as ContactSubmission[]) || []).map(normalizeStatus);
      setSubmissions(list);
      if ((list.length ?? 0) > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (error) {
      console.error("Error loading contact submissions:", error);
      toast.error("Failed to load inbox");
    }
  };

  const updateSubmissionStatus = async (id: string, status: ContactStatus) => {
    setUpdatingStatusId(id);
    try {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s))
      );
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const selected = submissions.find((s) => s.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading inbox...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <div className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Inbox className="h-8 w-8" />
            Contact Inbox
          </h1>
          <p className="text-muted-foreground">
            Messages sent via the Contact Us form
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Messages
                <span className="text-sm font-normal text-muted-foreground">
                  {submissions.length} total
                </span>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={loadSubmissions}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <CardDescription>
              Click a message to read it. Replies go to the sender’s email.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid md:grid-cols-[320px_1fr] min-h-[480px] border-t">
              <ScrollArea className="h-[480px] border-r">
                <ul className="p-0 divide-y">
                  {submissions.length === 0 ? (
                    <li className="p-6 text-center text-muted-foreground">
                      No messages yet.
                    </li>
                  ) : (
                    submissions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors ${
                            selectedId === s.id ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{s.name}</span>
                            <StatusBadge status={s.status} />
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {s.subject || "(No subject)"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(s.created_at), "MMM d, yyyy · h:mm a")}
                          </div>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
              <ScrollArea className="h-[480px]">
                {selected ? (
                  <div className="p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-semibold">{selected.name}</h2>
                        <a
                          href={`mailto:${selected.email}`}
                          className="text-primary hover:underline text-sm"
                        >
                          {selected.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {format(
                            new Date(selected.created_at),
                            "MMMM d, yyyy 'at' h:mm a"
                          )}
                        </span>
                        <StatusBadge status={selected.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">Status:</span>
                      <Select
                        value={selected.status}
                        onValueChange={(value) => updateSubmissionStatus(selected.id, value as ContactStatus)}
                        disabled={updatingStatusId === selected.id}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(STATUS_LABELS) as [ContactStatus, string][]).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {updatingStatusId === selected.id && (
                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {selected.subject && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">
                          Subject:{" "}
                        </span>
                        <span>{selected.subject}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Message
                      </p>
                      <p className="whitespace-pre-wrap">{selected.message}</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || "Your message")}`}>
                        Reply via email
                      </a>
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 flex items-center justify-center h-full text-muted-foreground">
                    Select a message
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AdminInbox;

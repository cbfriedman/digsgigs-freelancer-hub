import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export type ContactStatus = "new" | "in_progress" | "resolved";

export interface ContactSubmission {
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

const STATUS_FILTER_ALL = "all";

const SupportInboxTab = () => {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ContactSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const normalizeStatus = (s: ContactSubmission): ContactSubmission => {
    const status: ContactStatus =
      s.status && ["new", "in_progress", "resolved"].includes(s.status)
        ? (s.status as ContactStatus)
        : "new";
    return { ...s, status };
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
      setFilteredSubmissions(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    } catch (error) {
      console.error("Error loading contact submissions:", error);
      toast.error("Failed to load support inbox");
    } finally {
      setLoading(false);
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
      setFilteredSubmissions((prev) =>
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

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    let list = submissions;
    if (statusFilter !== STATUS_FILTER_ALL) {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.subject?.toLowerCase().includes(q) ?? false) ||
          s.message.toLowerCase().includes(q)
      );
    }
    setFilteredSubmissions(list);
    if (list.length > 0 && (!selectedId || !list.some((s) => s.id === selectedId))) {
      setSelectedId(list[0].id);
    } else if (list.length === 0) {
      setSelectedId(null);
    }
  }, [searchQuery, statusFilter, submissions]);

  const selected = filteredSubmissions.find((s) => s.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading support inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Support Inbox</h2>
        <p className="text-muted-foreground text-sm">
          Contact form submissions (support@digsandgigs.net). Click a message to read; reply via email.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Messages
              <span className="text-sm font-normal text-muted-foreground">
                {filteredSubmissions.length}{searchQuery ? ` of ${submissions.length}` : ""} total
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={loadSubmissions}>
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
          <CardDescription>
            Messages from the Contact Us form. Set status and reply to the sender’s email.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid md:grid-cols-[320px_1fr] min-h-[480px] border-t">
            <ScrollArea className="h-[480px] border-r">
              <div className="p-2 border-b flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STATUS_FILTER_ALL}>All</SelectItem>
                    {(Object.entries(STATUS_LABELS) as [ContactStatus, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ul className="p-0 divide-y">
                {filteredSubmissions.length === 0 ? (
                  <li className="p-6 text-center text-muted-foreground">
                    {submissions.length === 0 ? "No messages yet." : "No messages match your filters."}
                  </li>
                ) : (
                  filteredSubmissions.map((s) => (
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
                      <h3 className="text-lg font-semibold">{selected.name}</h3>
                      <a
                        href={`mailto:${selected.email}`}
                        className="text-primary hover:underline text-sm"
                      >
                        {selected.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(selected.created_at), "MMMM d, yyyy 'at' h:mm a")}
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
                      <span className="text-sm font-medium text-muted-foreground">Subject: </span>
                      <span>{selected.subject}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Message</p>
                    <p className="whitespace-pre-wrap">{selected.message}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || "Your message")}`}
                    >
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
  );
};

export default SupportInboxTab;

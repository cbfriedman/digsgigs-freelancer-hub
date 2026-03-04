import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TelemarketerLeadsStatusProps {
  telemarketerId: string;
}

export function TelemarketerLeadsStatus({ telemarketerId }: TelemarketerLeadsStatusProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeads();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel("telemarketer-leads")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gigs",
          filter: `telemarketer_id=eq.${telemarketerId}`,
        },
        () => {
          loadLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [telemarketerId]);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("gigs")
        .select(`
          *,
          lead_purchases (
            id,
            status,
            is_exclusive,
            awarded_at
          ),
          lead_exclusivity_queue (
            id,
            status,
            queue_position
          )
        `)
        .eq("telemarketer_id", telemarketerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLeadStatus = (lead: any) => {
    if (lead.awarded_at) {
      return { label: "Awarded", color: "bg-green-500" };
    }
    
    const exclusiveCount = lead.lead_exclusivity_queue?.filter((q: any) => q.status === "active").length || 0;
    const nonExclusiveCount = lead.lead_purchases?.filter((p: any) => !p.is_exclusive && p.status === "completed").length || 0;
    
    if (exclusiveCount > 0) {
      return { label: `In Queue (${exclusiveCount})`, color: "bg-blue-500" };
    }
    
    if (nonExclusiveCount > 0) {
      return { label: `Non-Exclusive (${nonExclusiveCount})`, color: "bg-primary" };
    }
    
    return { label: "Open", color: "bg-yellow-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Status</CardTitle>
        <CardDescription>
          Track the status of your uploaded leads
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No leads uploaded yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uploaded</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => {
                const status = getLeadStatus(lead);
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      {format(new Date(lead.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{lead.title}</TableCell>
                    <TableCell>{lead.location}</TableCell>
                    <TableCell>
                      {lead.budget_min && lead.budget_max
                        ? `$${lead.budget_min} - $${lead.budget_max}`
                        : lead.budget_min
                        ? `$${lead.budget_min}+`
                        : "Not specified"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lead.lead_source === "telemarketing" ? "Telemarketing" : "Internet"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={status.color}>{status.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

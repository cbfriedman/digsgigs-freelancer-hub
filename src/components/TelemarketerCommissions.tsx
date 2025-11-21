import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TelemarketerCommissionsProps {
  telemarketerId: string;
}

export function TelemarketerCommissions({ telemarketerId }: TelemarketerCommissionsProps) {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommissions();
  }, [telemarketerId]);

  const loadCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from("telemarketer_commissions")
        .select(`
          *,
          gigs (
            title,
            location
          ),
          lead_purchases (
            digger_id
          )
        `)
        .eq("telemarketer_id", telemarketerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
    } catch (error) {
      console.error("Error loading commissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-500",
      processing: "bg-blue-500",
      paid: "bg-green-500",
      failed: "bg-red-500",
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors]}>
        {status}
      </Badge>
    );
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
        <CardTitle>Commission History</CardTitle>
        <CardDescription>
          Track your earnings from awarded leads
        </CardDescription>
      </CardHeader>
      <CardContent>
        {commissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No commissions yet. Upload leads to start earning!
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Lead Price</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    {format(new Date(commission.awarded_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{commission.gigs?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {commission.gigs?.location}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {commission.commission_type === "percentage" ? "35%" : "$25 Flat"}
                    </Badge>
                  </TableCell>
                  <TableCell>${commission.lead_price.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-green-600">
                    ${commission.commission_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(commission.payment_status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

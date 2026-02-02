import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface EscrowContract {
  id: string;
  gig_id: string;
  consumer_id: string;
  digger_id: string;
  total_amount: number;
  platform_fee_amount: number;
  contract_type: string;
  status: string;
  hourly_rate: number | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  funded_at: string | null;
  completed_at: string | null;
  gigs: {
    title: string;
  };
  milestone_payments: {
    id: string;
    milestone_number: number;
    description: string;
    amount: number;
    platform_fee: number;
    digger_payout: number;
    status: string;
    hours_worked: number | null;
    hourly_rate: number | null;
    released_at: string | null;
  }[];
}

export default function EscrowDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [asConsumerContracts, setAsConsumerContracts] = useState<EscrowContract[]>([]);
  const [asDiggerContracts, setAsDiggerContracts] = useState<EscrowContract[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/register");
      return;
    }
    loadContracts();
  }, [user, navigate]);

  const loadContracts = async () => {
    try {
      setLoading(true);

      // Fetch contracts where user is consumer
      const { data: consumerData, error: consumerError } = await supabase
        .from("escrow_contracts")
        .select(`
          *,
          gigs (title),
          milestone_payments (*)
        `)
        .eq("consumer_id", user?.id)
        .order("created_at", { ascending: false });

      if (consumerError) throw consumerError;

      // Fetch contracts where user is digger
      const { data: diggerProfileData, error: profileError } = await supabase
        .from("digger_profiles")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") throw profileError;

      let diggerData: any[] = [];
      if (diggerProfileData) {
        const { data, error: diggerError } = await supabase
          .from("escrow_contracts")
          .select(`
            *,
            gigs (title),
            milestone_payments (*)
          `)
          .eq("digger_id", diggerProfileData.id)
          .order("created_at", { ascending: false });

        if (diggerError) throw diggerError;
        diggerData = data || [];
      }

      setAsConsumerContracts(consumerData || []);
      setAsDiggerContracts(diggerData);
    } catch (error: any) {
      console.error("Error loading contracts:", error);
      toast.error("Failed to load escrow contracts");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      funded: { variant: "default", label: "Funded" },
      in_progress: { variant: "secondary", label: "In Progress" },
      completed: { variant: "default", label: "Completed" }
    };
    
    const config = statusMap[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMilestoneStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      in_progress: { variant: "secondary", label: "In Progress" },
      completed: { variant: "default", label: "Released" }
    };
    
    const config = statusMap[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const ContractCard = ({ contract, role }: { contract: EscrowContract; role: "consumer" | "digger" }) => {
    const completedMilestones = contract.milestone_payments.filter(m => m.status === "completed").length;
    const totalMilestones = contract.milestone_payments.length;
    const totalPaid = contract.milestone_payments
      .filter(m => m.status === "completed")
      .reduce((sum, m) => sum + m.amount, 0);

    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {contract.gigs.title}
              </CardTitle>
              <CardDescription className="mt-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="capitalize">
                    {contract.contract_type === "fixed" ? "Fixed Price" : "Hourly"}
                  </span>
                  {contract.contract_type === "hourly" && (
                    <span>${contract.hourly_rate}/hr • {contract.actual_hours || 0}/{contract.estimated_hours} hours</span>
                  )}
                </div>
              </CardDescription>
            </div>
            {getStatusBadge(contract.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold">${contract.total_amount.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-lg font-semibold">{completedMilestones}/{totalMilestones} milestones</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-lg font-semibold">${totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Description</TableHead>
                  {contract.contract_type === "hourly" && (
                    <TableHead>Hours</TableHead>
                  )}
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Released</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contract.milestone_payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={contract.contract_type === "hourly" ? 6 : 5} className="text-center text-muted-foreground">
                      No milestones yet
                    </TableCell>
                  </TableRow>
                ) : (
                  contract.milestone_payments.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell>#{milestone.milestone_number}</TableCell>
                      <TableCell>{milestone.description}</TableCell>
                      {contract.contract_type === "hourly" && (
                        <TableCell>
                          {milestone.hours_worked ? `${milestone.hours_worked}h @ $${milestone.hourly_rate}/hr` : "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <div className="font-medium">${milestone.amount.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">
                            Fee: ${milestone.platform_fee.toFixed(2)}
                          </div>
                          {role === "digger" && (
                            <div className="text-xs text-muted-foreground">
                              Payout: ${milestone.digger_payout.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getMilestoneStatusBadge(milestone.status)}</TableCell>
                      <TableCell>
                        {milestone.released_at 
                          ? new Date(milestone.released_at).toLocaleDateString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/gig/${contract.gig_id}`)}
            >
              View Gig Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Escrow Dashboard</h1>
            <p className="text-muted-foreground">
              Track your active escrow contracts, milestones, and payment history
            </p>
          </div>

          <Tabs defaultValue="consumer" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="consumer">
                As Client ({asConsumerContracts.length})
              </TabsTrigger>
              <TabsTrigger value="digger">
                As Digger ({asDiggerContracts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="consumer" className="mt-6">
              {asConsumerContracts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No escrow contracts as client</p>
                    <Button onClick={() => navigate("/browse-gigs")}>
                      Browse Gigs
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                asConsumerContracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} role="consumer" />
                ))
              )}
            </TabsContent>

            <TabsContent value="digger" className="mt-6">
              {asDiggerContracts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No escrow contracts as digger</p>
                    <Button onClick={() => navigate("/browse-gigs")}>
                      Browse Gigs
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                asDiggerContracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} role="digger" />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
}

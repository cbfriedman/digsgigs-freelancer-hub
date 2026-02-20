import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { DollarSign, TrendingUp, Calendar, Loader2, Receipt, SlidersHorizontal, ArrowUpDown, Download, FileText, FileSpreadsheet, Mail, Settings, Star, AlertTriangle, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { exportToCSV, exportToPDF } from "@/utils/exportTransactions";
import { RatingDialog } from "@/components/RatingDialog";
import { GiggerRatingDialog } from "@/components/GiggerRatingDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Transaction {
  id: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  digger_payout: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  digger_id: string;
  milestone_payment_id?: string | null;
  gigs: {
    id: string;
    title: string;
    consumer_id: string;
  };
  bids?: {
    amount: number;
  } | null;
  profiles?: {
    full_name: string | null;
  } | null;
  /** When true, this row is from paid milestones (fallback when transaction row missing) */
  fromMilestone?: boolean;
}

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: payoutLoading, canReceivePayments } = useStripeConnect();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'digger' | 'consumer' | null>(null);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '180'>('all');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [triggeringMonthly, setTriggeringMonthly] = useState(false);
  const [ratingDialog, setRatingDialog] = useState<{
    open: boolean;
    diggerId: string;
    gigId: string;
    gigTitle: string;
  }>({
    open: false,
    diggerId: "",
    gigId: "",
    gigTitle: "",
  });
  const [giggerRatingDialog, setGiggerRatingDialog] = useState<{
    open: boolean;
    consumerId: string;
    gigId: string;
    diggerId: string;
    gigTitle: string;
  }>({
    open: false,
    consumerId: "",
    gigId: "",
    diggerId: "",
    gigTitle: "",
  });
  const checkContractCompleted = async (gigId: string, diggerId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc("is_contract_fully_completed_rpc" as any, {
      p_gig_id: gigId,
      p_digger_id: diggerId,
    });
    if (error) return false;
    return !!data;
  };
  const [disputeDialog, setDisputeDialog] = useState<{
    open: boolean;
    transaction: Transaction | null;
    subject: string;
    description: string;
    submitting: boolean;
  }>({
    open: false,
    transaction: null,
    subject: "",
    description: "",
    submitting: false,
  });

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [transactions, sortBy, filterStatus, dateRange]);

  const applyFiltersAndSort = () => {
    let filtered = [...transactions];

    // Apply date range filter
    if (dateRange !== 'all') {
      const daysAgo = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      filtered = filtered.filter(tx => new Date(tx.created_at) >= cutoffDate);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tx => tx.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-desc':
          return b.total_amount - a.total_amount;
        case 'amount-asc':
          return a.total_amount - b.total_amount;
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);

    // Update stats for diggers based on filtered data
    if (userType === 'digger') {
      const earnings = filtered.reduce((sum, tx) => sum + (tx.digger_payout || 0), 0);
      const commission = filtered.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0);
      setTotalEarnings(earnings);
      setTotalCommission(commission);
    }
  };

  const checkAuthAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth?redirect=/transactions');
        return;
      }

      // Prefer digger view if user has a digger profile (so Diggers always see their earnings, even when profile.user_type is consumer/gigger)
      const { data: diggerProfile, error: diggerError } = await supabase
        .from('digger_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!diggerError && diggerProfile?.id) {
        setUserType('digger');
        setDiggerId(diggerProfile.id);
        await loadTransactions(session.user.id, 'digger', diggerProfile.id);
        return;
      }

      // Otherwise load as consumer (Gigger) – require profile for redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        toast({
          title: "Profile not found",
          description: "Please complete your profile first",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setUserType('consumer');
      await loadTransactions(session.user.id, 'consumer', null);
    } catch (error: any) {
      // Error already handled with toast in loadTransactions
      // Only log if it's an auth error
      if (error?.message?.includes('auth') || error?.message?.includes('session')) {
        toast({
          title: "Authentication Error",
          description: "Please sign in again",
          variant: "destructive",
        });
        navigate("/register");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (userId: string, type: 'digger' | 'consumer', diggerId: string | null) => {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          gigs (
            id,
            title,
            consumer_id
          ),
          bids (
            amount
          ),
          profiles:consumer_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      // Filter based on user type
      if (type === 'digger' && diggerId) {
        query = query.eq('digger_id', diggerId);
      } else if (type === 'consumer') {
        query = query.eq('consumer_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      let list: Transaction[] = (data || []).map((row: any) => ({
        ...row,
        bids: row.bids ?? null,
        profiles: row.profiles ?? null,
      }));

      // Diggers: include paid milestones that may have no transaction row (so they always see earnings)
      if (type === 'digger' && diggerId) {
        const existingMilestoneIds = new Set((list as any[]).map((t: any) => t.milestone_payment_id).filter(Boolean));
        const { data: paidMilestones } = await supabase
          .from('milestone_payments')
          .select(`
            id,
            amount,
            digger_payout,
            platform_fee,
            released_at,
            created_at,
            escrow_contract_id,
            escrow_contracts!inner(digger_id, gig_id, consumer_id, gigs(id, title, consumer_id))
          `)
          .eq('status', 'paid')
          .not('stripe_payment_intent_id', 'is', null);

        const milestones = paidMilestones || [];
        for (const m of milestones) {
          const contract = (m as any).escrow_contracts;
          const gigs = contract?.gigs;
          if (!contract || contract.digger_id !== diggerId || existingMilestoneIds.has(m.id)) continue;
          existingMilestoneIds.add(m.id);
          const gross = Number(m.amount);
          const giggerPaid = Math.round(gross * 1.03 * 100) / 100; // Gigger pays gross + 3%
          const platformFeeDigger = Math.round((gross - Number(m.digger_payout)) * 100) / 100; // 8% paid by Digger
          list.push({
            id: `milestone-${m.id}`,
            total_amount: giggerPaid,
            commission_rate: 0.08,
            commission_amount: platformFeeDigger,
            digger_payout: Number(m.digger_payout),
            status: 'completed',
            created_at: m.created_at,
            completed_at: m.released_at || m.created_at,
            digger_id: contract.digger_id,
            milestone_payment_id: m.id,
            gigs: gigs ? { id: gigs.id, title: gigs.title || 'Milestone', consumer_id: gigs.consumer_id } : { id: '', title: 'Milestone', consumer_id: '' },
            bids: null,
            profiles: null,
            fromMilestone: true,
          });
        }
        list.sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
      }

      setTransactions(list);

      // Calculate totals for diggers
      if (type === 'digger') {
        const earnings = list.reduce((sum: number, tx: any) => sum + (tx.digger_payout || 0), 0);
        const commission = list.reduce((sum: number, tx: any) => sum + (tx.commission_amount || 0), 0);
        setTotalEarnings(earnings);
        setTotalCommission(commission);
      }
    } catch (error: any) {
      // Error logging - consider using proper error tracking service in production
      if (import.meta.env.DEV) {
        console.error('Error loading transactions:', error);
      }
      toast({
        title: "Error",
        description: error?.message || "Failed to load transactions",
        variant: "destructive",
      });
    }
  };

  const getCommissionTierColor = (rate: number) => {
    if (rate === 0) return 'text-green-600';
    if (rate <= 0.04) return 'text-blue-600';
    return 'text-orange-600';
  };

  const getCommissionTierName = (rate: number) => {
    if (rate === 0) return 'Premium';
    if (rate <= 0.04) return 'Pro';
    return 'Free';
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "No transactions to export",
        description: "Apply different filters to see transactions",
        variant: "destructive",
      });
      return;
    }

    exportToCSV(filteredTransactions, userType!, 'transactions');
    toast({
      title: "Export successful",
      description: `Downloaded ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} as CSV`,
    });
  };

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "No transactions to export",
        description: "Apply different filters to see transactions",
        variant: "destructive",
      });
      return;
    }

    const stats = userType === 'digger' ? {
      totalEarnings,
      totalCommission,
      transactionCount: filteredTransactions.length
    } : undefined;

    exportToPDF(filteredTransactions, userType!, stats, 'transactions');
    toast({
      title: "Export successful",
      description: `Downloaded ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} as PDF`,
    });
  };

  const openDisputeDialog = (transaction: Transaction) => {
    setDisputeDialog({
      open: true,
      transaction,
      subject: "",
      description: "",
      submitting: false,
    });
  };

  const submitDispute = async () => {
    const { transaction, subject, description } = disputeDialog;
    if (!transaction || !subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter a short subject for the dispute",
        variant: "destructive",
      });
      return;
    }
    setDisputeDialog((prev) => ({ ...prev, submitting: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase.from("disputes").insert({
        gig_id: transaction.gigs.id,
        transaction_id: transaction.fromMilestone ? null : transaction.id,
        milestone_payment_id: transaction.milestone_payment_id ?? null,
        raised_by_user_id: user.id,
        subject: subject.trim(),
        description: description.trim() || null,
        status: "open",
      });

      if (error) throw error;
      toast({
        title: "Dispute reported",
        description: "Our team will review and get back to you.",
      });
      setDisputeDialog({ open: false, transaction: null, subject: "", description: "", submitting: false });
    } catch (e: any) {
      toast({
        title: "Failed to submit dispute",
        description: e?.message ?? "Please try again",
        variant: "destructive",
      });
    } finally {
      setDisputeDialog((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleEmailReport = async () => {
    if (filteredTransactions.length === 0) {
      toast({
        title: "No transactions to send",
        description: "Apply different filters to see transactions",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);

    try {
      const dateRangeText = dateRange !== 'all' 
        ? `Last ${dateRange} days` 
        : 'All time';

      const stats = userType === 'digger' ? {
        totalEarnings,
        totalCommission,
      } : undefined;

      await invokeEdgeFunction(supabase, 'send-transaction-report', {
        body: {
          transactions: filteredTransactions,
          userType,
          stats,
          dateRange: dateRangeText,
        },
      });

      toast({
        title: "Report sent!",
        description: `Transaction report with ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''} has been sent to your email`,
      });
    } catch (error: any) {
      console.error('Error sending email report:', error);
      toast({
        title: "Failed to send email",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleTriggerMonthlyReports = async () => {
    setTriggeringMonthly(true);

    try {
      const data = await invokeEdgeFunction<{ message?: string }>(supabase, 'send-monthly-reports', {
        body: {},
      });

      toast({
        title: "Monthly reports triggered!",
        description: data?.message || "Monthly reports are being sent to all users with transactions from last month",
      });
    } catch (error: any) {
      console.error('Error triggering monthly reports:', error);
      toast({
        title: "Failed to trigger reports",
        description: error?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setTriggeringMonthly(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">Transaction History</h1>
                <p className="text-muted-foreground">
                  {userType === 'digger' 
                    ? 'View your completed work, milestone payments, and earnings. All payouts you receive appear here.'
                    : 'View your payment history for completed gigs'}
                </p>
              </div>
              
              {/* Export Dropdown */}
              {transactions.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/email-preferences')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Email Preferences
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={sendingEmail || triggeringMonthly}>
                        {sendingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleEmailReport}>
                        <Mail className="w-4 h-4 mr-2" />
                        Email Report
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleExportCSV}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="w-4 h-4 mr-2" />
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleTriggerMonthlyReports}
                    disabled={triggeringMonthly || sendingEmail}
                  >
                    {triggeringMonthly ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Triggering...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Test Monthly Reports
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

          {/* Digger: payout account status + link to Account */}
          {userType === 'digger' && !payoutLoading && !canReceivePayments && (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <Wallet className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                Set up your payout account in Account to receive milestone payments.{" "}
                <Button variant="link" className="h-auto p-0 font-medium" onClick={() => navigate("/account#payout-account")}>
                  Go to Account
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats for Diggers */}
          {userType === 'digger' && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Earned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    ${totalEarnings.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dateRange !== 'all' 
                      ? `In last ${dateRange} days`
                      : 'After commission'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Commission Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    ${totalCommission.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dateRange !== 'all' 
                      ? `In last ${dateRange} days`
                      : 'Platform fees'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completed Gigs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {filteredTransactions.length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dateRange !== 'all' 
                      ? `In last ${dateRange} days`
                      : 'Total transactions'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transactions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-semibold">All Transactions</h2>
                {(dateRange !== 'all' || filterStatus !== 'all' || sortBy !== 'date-desc') && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-sm text-muted-foreground"
                    onClick={() => {
                      setFilterStatus('all');
                      setDateRange('all');
                      setSortBy('date-desc');
                    }}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {/* Date Range Filter */}
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger className="w-[160px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="180">Last 6 Months</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px]">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort Options */}
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[200px]">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date: Newest First</SelectItem>
                    <SelectItem value="date-asc">Date: Oldest First</SelectItem>
                    <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                    <SelectItem value="amount-asc">Amount: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results count and export info */}
            {transactions.length > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  Showing {filteredTransactions.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </p>
                {filteredTransactions.length > 0 && (
                  <p className="text-xs">
                    💡 Export as CSV/PDF or email the report to yourself. Need help? <Link to="/contact" className="text-primary underline hover:no-underline">Contact support</Link>.
                  </p>
                )}
              </div>
            )}
            
            {filteredTransactions.length === 0 && transactions.length > 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No transactions match your filters</p>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters to see more results
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilterStatus('all');
                      setDateRange('all');
                      setSortBy('date-desc');
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : filteredTransactions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No transactions yet</p>
                  <p className="text-muted-foreground mb-4">
                    {userType === 'digger' 
                      ? 'Complete your first gig to see transactions here'
                      : 'Post a gig and hire a digger to see transactions'}
                  </p>
                  <Button onClick={() => navigate(userType === 'digger' ? '/browse-gigs' : '/post-gig')}>
                    {userType === 'digger' ? 'Browse Gigs' : 'Post a Gig'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{transaction.gigs.title}</CardTitle>
                        <CardDescription>
                          {userType === 'consumer' ? (
                            <>Work completed by a digger</>
                          ) : (
                            <>Client: {transaction.profiles?.full_name || 'Anonymous'}</>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {transaction.fromMilestone && (
                          <Badge variant="secondary">Milestone</Badge>
                        )}
                        <Badge variant="default">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Transaction Details */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Amount:</span>
                          <span className="font-semibold">${transaction.total_amount.toFixed(2)}</span>
                        </div>
                        {userType === 'digger' && (
                          <>
                            {(transaction.fromMilestone || transaction.milestone_payment_id) && (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Gross (milestone amount):</span>
                                  <span className="font-medium">
                                    ${(transaction.total_amount / 1.03).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Platform fee (8%, paid by you):</span>
                                  <span className="font-semibold text-destructive">
                                    -${(transaction.total_amount / 1.03 - transaction.digger_payout).toFixed(2)}
                                  </span>
                                </div>
                              </>
                            )}
                            {!transaction.fromMilestone && !transaction.milestone_payment_id && transaction.commission_rate > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Commission ({(transaction.commission_rate * 100).toFixed(0)}%
                                  {' - '}
                                  <span className={getCommissionTierColor(transaction.commission_rate)}>
                                    {getCommissionTierName(transaction.commission_rate)}
                                  </span>):
                                </span>
                                <span className="font-semibold text-destructive">
                                  -${transaction.commission_amount.toFixed(2)}
                                </span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Your Payout:</span>
                              <span className="text-xl font-bold text-primary">
                                ${transaction.digger_payout.toFixed(2)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {transaction.completed_at 
                              ? formatDistanceToNow(new Date(transaction.completed_at), { addSuffix: true })
                              : formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {(transaction.fromMilestone || transaction.milestone_payment_id)
                              ? `Gross: $${(transaction.total_amount / 1.03).toFixed(2)}`
                              : `Original bid: $${transaction.bids?.amount?.toFixed(2) || '0.00'}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Commission Breakdown for Diggers (skip for milestone-only rows) */}
                    {userType === 'digger' && !transaction.fromMilestone && !transaction.milestone_payment_id && transaction.commission_rate > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          💡 Tip: With a{' '}
                          {transaction.commission_rate >= 0.09 
                            ? 'Pro plan (8% escrow), you would have saved ' + 
                              ((transaction.total_amount * 0.01)).toFixed(2)
                            : transaction.commission_rate >= 0.08
                            ? 'Premium plan, you would have saved ' + 
                              transaction.commission_amount.toFixed(2)
                            : 'current plan, you\'re already saving the most!'}
                          {' '}on this transaction
                        </p>
                      </div>
                    )}

                    {/* Rating and Dispute for Consumers */}
                    {userType === 'consumer' && transaction.status === 'completed' && (
                      <div className="pt-4 border-t flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            const completed = await checkContractCompleted(transaction.gigs.id, transaction.digger_id);
                            if (!completed) {
                              toast({
                                title: "Contract not fully completed",
                                description: "You can leave a review once the contract is fully completed (all milestones paid).",
                                variant: "destructive",
                              });
                              return;
                            }
                            setRatingDialog({
                              open: true,
                              diggerId: transaction.digger_id,
                              gigId: transaction.gigs.id,
                              gigTitle: transaction.gigs.title,
                            });
                          }}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Rate Professional
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openDisputeDialog(transaction)}
                          className="text-amber-600 hover:text-amber-700 border-amber-200"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Report dispute
                        </Button>
                      </div>
                    )}
                    {/* Rating and Dispute for Diggers */}
                    {userType === 'digger' && transaction.status === 'completed' && (
                      <div className="pt-4 border-t flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const completed = await checkContractCompleted(transaction.gigs.id, transaction.digger_id);
                            if (!completed) {
                              toast({
                                title: "Contract not fully completed",
                                description: "You can leave a review once the contract is fully completed (all milestones paid).",
                                variant: "destructive",
                              });
                              return;
                            }
                            setGiggerRatingDialog({
                              open: true,
                              consumerId: transaction.gigs.consumer_id,
                              gigId: transaction.gigs.id,
                              diggerId: transaction.digger_id,
                              gigTitle: transaction.gigs.title,
                            });
                          }}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Rate Client
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDisputeDialog(transaction)}
                          className="text-amber-600 hover:text-amber-700 border-amber-200"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Report dispute
                        </Button>
                      </div>
                    )}
                    {userType === 'digger' && transaction.status !== 'completed' && (
                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDisputeDialog(transaction)}
                          className="text-amber-600 hover:text-amber-700 border-amber-200"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Report dispute
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <RatingDialog
        open={ratingDialog.open}
        onOpenChange={(open) => setRatingDialog({ ...ratingDialog, open })}
        diggerId={ratingDialog.diggerId}
        gigId={ratingDialog.gigId}
        gigTitle={ratingDialog.gigTitle}
        onSuccess={() => {
          toast({
            title: "Review submitted",
            description: "Thank you for your feedback! It will appear on the professional’s profile.",
          });
        }}
      />
      <GiggerRatingDialog
        open={giggerRatingDialog.open}
        onOpenChange={(open) => setGiggerRatingDialog({ ...giggerRatingDialog, open })}
        consumerId={giggerRatingDialog.consumerId}
        gigId={giggerRatingDialog.gigId}
        diggerId={giggerRatingDialog.diggerId}
        gigTitle={giggerRatingDialog.gigTitle}
        onSuccess={() => {
          toast({
            title: "Review submitted",
            description: "Thanks! Your review helps other professionals and will be visible to the client after they review you.",
          });
        }}
      />

      <Dialog open={disputeDialog.open} onOpenChange={(open) => !open && setDisputeDialog({ open: false, transaction: null, subject: "", description: "", submitting: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a dispute</DialogTitle>
            <DialogDescription>
              Describe the issue with this transaction. Our team will review and follow our dispute process.
              {disputeDialog.transaction && (
                <span className="block mt-1 text-muted-foreground">
                  Gig: {disputeDialog.transaction.gigs.title}
                </span>
              )}
              <span className="block mt-2 text-sm">
                Need help? <Link to="/contact" className="text-primary underline hover:no-underline">Contact support</Link>.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="dispute-subject">Subject</Label>
              <Input
                id="dispute-subject"
                placeholder="e.g. Payment not received / Work not as agreed"
                value={disputeDialog.subject}
                onChange={(e) => setDisputeDialog((p) => ({ ...p, subject: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dispute-description">Details (optional)</Label>
              <Textarea
                id="dispute-description"
                placeholder="Add any details that help us resolve this."
                value={disputeDialog.description}
                onChange={(e) => setDisputeDialog((p) => ({ ...p, description: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialog({ open: false, transaction: null, subject: "", description: "", submitting: false })}>
              Cancel
            </Button>
            <Button onClick={submitDispute} disabled={disputeDialog.submitting}>
              {disputeDialog.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;

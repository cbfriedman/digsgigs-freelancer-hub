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
import { DollarSign, Calendar, Loader2, Receipt, SlidersHorizontal, ArrowUpDown, Download, FileText, FileSpreadsheet, Mail, Settings, Wallet, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { exportToCSV, exportToPDF } from "@/utils/exportTransactions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";

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
  /** Client (gigger) profile — for digger view */
  profiles?: {
    full_name: string | null;
  } | null;
  /** Digger (freelancer) profile — for consumer view */
  digger_profile?: {
    profile_name: string | null;
    business_name: string;
  } | null;
  /** When true, this row is from paid milestones (fallback when transaction row missing) */
  fromMilestone?: boolean;
  /** Milestone description (e.g. "Phase 1: Design") when this is a milestone payment */
  milestone_description?: string | null;
  milestone_number?: number | null;
}

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: payoutLoading, isOnboarded, canReceivePayments } = useStripeConnect();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userType, setUserType] = useState<'digger' | 'consumer' | null>(null);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  /** When true, user has both digger and gigger roles; they can switch between Earnings and Payments views */
  const [hasBothRoles, setHasBothRoles] = useState(false);
  /** Which view we're showing when hasBothRoles: 'digger' = earnings, 'gigger' = payments made */
  const [transactionView, setTransactionView] = useState<'digger' | 'gigger'>('digger');
  const [userId, setUserId] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '30' | '90' | '180'>('all');
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const INITIAL_DISPLAY_LIMIT = 10;
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [triggeringMonthly, setTriggeringMonthly] = useState(false);
  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [transactions, sortBy, filterStatus, dateRange]);

  useEffect(() => {
    setDisplayLimit(INITIAL_DISPLAY_LIMIT);
  }, [sortBy, filterStatus, dateRange]);

  const handleRefresh = async () => {
    if (!userId || userType == null) return;
    setRefreshing(true);
    try {
      await loadTransactions(userId, userType, diggerId);
      toast({ title: "Refreshed", description: "Transaction list updated." });
    } catch {
      // Error already toasted in loadTransactions
    } finally {
      setRefreshing(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...transactions];

    // Apply date range filter (use completed_at for payment date when available)
    if (dateRange !== 'all') {
      const daysAgo = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      filtered = filtered.filter(tx => new Date(tx.completed_at || tx.created_at) >= cutoffDate);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tx => tx.status === filterStatus);
    }

    // Apply sorting (use completed_at for payment date when available)
    const dateOf = (tx: Transaction) => new Date(tx.completed_at || tx.created_at).getTime();
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return dateOf(b) - dateOf(a);
        case 'date-asc':
          return dateOf(a) - dateOf(b);
        case 'amount-desc':
          return b.total_amount - a.total_amount;
        case 'amount-asc':
          return a.total_amount - b.total_amount;
        default:
          return 0;
      }
    });

    setFilteredTransactions(filtered);

    // Update stats based on filtered data
    if (userType === 'digger') {
      const earnings = filtered.reduce((sum, tx) => sum + (tx.digger_payout || 0), 0);
      const commission = filtered.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0);
      setTotalEarnings(earnings);
      setTotalCommission(commission);
    } else if (userType === 'consumer') {
      const paid = filtered.reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
      setTotalPaid(paid);
    }
  };

  const checkAuthAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate('/register');
        return;
      }

      setUserId(session.user.id);

      const { data: diggerProfile, error: diggerError } = await supabase
        .from('digger_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!diggerError && diggerProfile?.id) {
        setDiggerId(diggerProfile.id);
        setHasBothRoles(true); // Can switch to "Payments (Gigger)" to see payments they made as client
        setTransactionView('digger');
        setUserType('digger');
        await loadTransactions(session.user.id, 'digger', diggerProfile.id);
        return;
      }

      setHasBothRoles(false);
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

  const switchTransactionView = async (view: 'digger' | 'gigger') => {
    if (!userId || view === transactionView) return;
    setLoading(true);
    try {
      setTransactionView(view);
      if (view === 'gigger') {
        setUserType('consumer');
        await loadTransactions(userId, 'consumer', null);
      } else {
        setUserType('digger');
        await loadTransactions(userId, 'digger', diggerId);
      }
    } catch {
      setTransactionView(transactionView);
      setUserType(transactionView === 'digger' ? 'digger' : 'consumer');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (userId: string, type: 'digger' | 'consumer', diggerIdParam: string | null) => {
    try {
      const selectConsumer = `
        *,
        gigs ( id, title, consumer_id ),
        bids ( amount ),
        profiles:consumer_id ( full_name ),
        digger_profiles!transactions_digger_id_fkey ( profile_name, business_name ),
        milestone_payments ( description, milestone_number )
      `;
      let query = supabase
        .from('transactions')
        .select(selectConsumer)
        .order('created_at', { ascending: false });

      // Filter based on user type
      if (type === 'digger' && diggerIdParam) {
        query = query.eq('digger_id', diggerIdParam);
      } else if (type === 'consumer') {
        query = query.eq('consumer_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      let list: Transaction[] = (data || []).map((row: any) => {
        const mp = row.milestone_payments;
        return {
          ...row,
          bids: row.bids ?? null,
          profiles: row.profiles ?? null,
          digger_profile: row.digger_profiles ?? null,
          milestone_description: mp?.description ?? null,
          milestone_number: mp?.milestone_number ?? null,
        };
      });

      // Diggers: include paid milestones that may have no transaction row (so they always see earnings)
      if (type === 'digger' && diggerIdParam) {
        const existingMilestoneIds = new Set((list as any[]).map((t: any) => t.milestone_payment_id).filter(Boolean));
        const { data: paidMilestones } = await supabase
          .from('milestone_payments')
          .select(`
            id,
            amount,
            description,
            milestone_number,
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
          if (!contract || contract.digger_id !== diggerIdParam || existingMilestoneIds.has(m.id)) continue;
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
            milestone_description: (m as any).description ?? null,
            milestone_number: (m as any).milestone_number ?? null,
          });
        }
        list.sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
      }

      // Deduplicate by milestone_payment_id so only one card shows per milestone (webhook + confirm-milestone-session can both insert)
      const byDate = (a: Transaction, b: Transaction) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime();
      list.sort((a, b) => {
        if ((a.milestone_payment_id ?? null) !== (b.milestone_payment_id ?? null)) return byDate(a, b);
        // Same milestone: prefer real transaction row over synthetic (fromMilestone)
        const aFake = (a as any).fromMilestone ? 1 : 0;
        const bFake = (b as any).fromMilestone ? 1 : 0;
        return aFake - bFake || byDate(a, b);
      });
      const seenMilestoneIds = new Set<string | null | undefined>();
      list = list.filter((t: Transaction) => {
        const key = t.milestone_payment_id ?? null;
        if (key != null) {
          if (seenMilestoneIds.has(key)) return false;
          seenMilestoneIds.add(key);
        }
        return true;
      }) as Transaction[];
      list.sort((a, b) => byDate(a, b));

      if (type === 'digger' && diggerIdParam) {
        // Enrich milestone-only rows with client (consumer) name
        const missingConsumerIds = [...new Set(
          list
            .filter((t: Transaction) => !t.profiles?.full_name && t.gigs?.consumer_id)
            .map((t: Transaction) => t.gigs.consumer_id)
        )];
        if (missingConsumerIds.length > 0) {
          const { data: consumerProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', missingConsumerIds);
          const byId = new Map((consumerProfiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p]));
          list = list.map((t: Transaction) => {
            if (t.profiles?.full_name != null) return t;
            const profile = t.gigs?.consumer_id ? byId.get(t.gigs.consumer_id) : null;
            return { ...t, profiles: profile ? { full_name: profile.full_name } : { full_name: null } };
          }) as Transaction[];
        }
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

  const getClientDisplayName = (tx: Transaction) =>
    tx.profiles?.full_name?.trim() || "Client";
  const getProfessionalDisplayName = (tx: Transaction) =>
    tx.digger_profile?.profile_name?.trim() ||
    tx.digger_profile?.business_name?.trim() ||
    "Professional";
  const getTransactionDate = (tx: Transaction) =>
    tx.completed_at || tx.created_at;
  const getTransactionRef = (tx: Transaction) =>
    tx.fromMilestone || tx.milestone_payment_id
      ? "Milestone payment"
      : `#${tx.id.slice(-6)}`;

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <Skeleton className="h-9 w-56 mb-2 rounded" />
                <Skeleton className="h-5 w-full max-w-md rounded" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-8">
              <div className="space-y-4 min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-10 w-[160px] rounded-md" />
                  <Skeleton className="h-10 w-[160px] rounded-md" />
                  <Skeleton className="h-10 w-[200px] rounded-md" />
                </div>
                <div className="space-y-4" aria-busy="true" aria-label="Loading transactions">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between gap-3">
                          <Skeleton className="h-6 w-3/4 rounded" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-1/2 rounded mt-2" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <Skeleton className="h-24 w-full rounded-lg" />
                          <Skeleton className="h-24 w-full rounded-lg" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <Card><CardHeader className="pb-3"><Skeleton className="h-4 w-24 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-20 rounded" /></CardContent></Card>
                <Card><CardHeader className="pb-3"><Skeleton className="h-4 w-28 rounded" /></CardHeader><CardContent><Skeleton className="h-8 w-20 rounded" /></CardContent></Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Transactions | Digs & Gigs"
        description={userType === 'digger' ? "View your earnings, milestone payments, and transaction history. Export or email your reports." : "View your payment history for completed gigs. Export transactions and manage disputes."}
      />
      <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Transaction History</h1>
                <p className="text-muted-foreground mb-1">
                  {userType === 'digger' 
                    ? 'Your earnings, milestone payments, and payouts. Clear and up to date.'
                    : 'Your payment history for completed gigs and milestones.'}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-500" aria-hidden />
                  Your transaction data is private and secure.
                </p>
              </div>
              
              {/* Actions: Refresh, Email prefs, Export */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Refresh transaction list"
                >
                  {refreshing ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 sm:mr-2" />}
                  <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
                </Button>
                {transactions.length > 0 && (
                  <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/email-preferences')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Email Preferences
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={sendingEmail || triggeringMonthly}>
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
                    size="sm"
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
                  </>
                )}
              </div>
            </div>

          {/* View switcher for users with both Digger and Gigger roles */}
          {hasBothRoles && userType != null && (
            <Tabs
              value={transactionView}
              onValueChange={(v) => v === 'digger' || v === 'gigger' ? switchTransactionView(v) : undefined}
            >
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="digger" disabled={loading}>
                  Earnings (as Digger)
                </TabsTrigger>
                <TabsTrigger value="gigger" disabled={loading}>
                  Payments (as Gigger)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* At a glance: key totals (visible first, especially on mobile) */}
          {transactions.length > 0 && (
            <section aria-label="At a glance" className="rounded-lg border border-border bg-muted/30 px-4 py-4 sm:px-5 sm:py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-x-8">
                {userType === 'digger' && (
                  <>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total earned</span>
                      <p className="text-xl sm:text-2xl font-bold text-primary mt-0.5">${totalEarnings.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Commission paid</span>
                      <p className="text-xl sm:text-2xl font-bold text-destructive mt-0.5">${totalCommission.toFixed(2)}</p>
                    </div>
                  </>
                )}
                {userType === 'consumer' && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total paid</span>
                    <p className="text-xl sm:text-2xl font-bold text-primary mt-0.5">${totalPaid.toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transactions</span>
                  <p className="text-xl sm:text-2xl font-bold mt-0.5">{filteredTransactions.length}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Period</span>
                  <p className="text-sm font-medium mt-0.5">{dateRange === 'all' ? 'All time' : `Last ${dateRange} days`}</p>
                </div>
              </div>
            </section>
          )}

          {/* Digger: payout account status + link to Account */}
          {userType === 'digger' && !payoutLoading && !canReceivePayments && (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <Wallet className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                {isOnboarded ? (
                  <>
                    <span className="font-medium text-amber-700 dark:text-amber-400">Payout account pending verification.</span>{" "}
                    Stripe is verifying your identity and bank details. Once complete, you can receive milestone payments.{" "}
                    <Button variant="link" className="h-auto p-0 font-medium" onClick={() => navigate("/account#payout-account")}>
                      Check status in Account
                    </Button>
                  </>
                ) : (
                  <>
                    Set up your payout account in Account to receive milestone payments.{" "}
                    <Button variant="link" className="h-auto p-0 font-medium" onClick={() => navigate("/account#payout-account")}>
                      Go to Account
                    </Button>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Transaction list — summary is in "At a glance" strip above */}
          <div>
            <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-4" role="search" aria-label="Filter and sort transactions">
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold">Transaction list</h2>
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

            {/* Results count and export tip */}
            {transactions.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <p className="font-medium">
                  {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
                  {filteredTransactions.length !== transactions.length && ` (of ${transactions.length})`}
                </p>
                {filteredTransactions.length > 0 && (
                  <p className="text-xs">
                    Export CSV/PDF or <Link to="/contact" className="text-primary underline hover:no-underline">contact support</Link>.
                  </p>
                )}
              </div>
            )}
            
            {filteredTransactions.length === 0 && transactions.length > 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 sm:py-16 text-center px-6">
                  <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-80" />
                  <p className="text-lg font-semibold mb-2">No transactions match your filters</p>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    Change the time period, status, or sort to see your transactions.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setFilterStatus('all');
                      setDateRange('all');
                      setSortBy('date-desc');
                    }}
                  >
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            ) : filteredTransactions.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 sm:py-16 text-center px-6">
                  <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-80" />
                  <p className="text-lg font-semibold mb-2">No transactions yet</p>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    {userType === 'digger' 
                      ? "When you complete gigs and receive payments, they'll show up here with full details and export options."
                      : "When you pay for completed gigs or milestones, your payment history will appear here."}
                  </p>
                  <Button onClick={() => navigate(userType === 'digger' ? '/browse-gigs' : '/post-gig')}>
                    {userType === 'digger' ? 'Browse gigs' : 'Post a gig'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
              {filteredTransactions.slice(0, displayLimit).map((transaction) => {
                const dateStr = getTransactionDate(transaction);
                const isMilestone = transaction.fromMilestone || !!transaction.milestone_payment_id;
                const gross = transaction.total_amount / 1.03;
                return (
                <Card
                  key={transaction.id}
                  className={`overflow-hidden ${transaction.status === 'completed' ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-amber-500'}`}
                  aria-label={`Transaction: ${transaction.gigs.title}, ${format(new Date(dateStr), 'MMM d, yyyy')}, ${transaction.status}`}
                >
                  {/* At a glance: date, amount, status — scan quickly */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-6 pt-4 pb-2 text-sm border-b border-border/50 bg-muted/20">
                    <span className="text-muted-foreground font-medium">{format(new Date(dateStr), 'MMM d, yyyy')}</span>
                    <span className="text-muted-foreground/80" aria-hidden>·</span>
                    <span className="font-bold text-foreground">
                      {userType === 'digger' ? `$${transaction.digger_payout.toFixed(2)} earned` : `$${transaction.total_amount.toFixed(2)} paid`}
                    </span>
                    <span className="text-muted-foreground/80" aria-hidden>·</span>
                    {isMilestone && <Badge variant="secondary" className="text-xs">Milestone</Badge>}
                    <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="shrink-0">
                      {transaction.status}
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-xl break-words">{transaction.gigs.title}</CardTitle>
                          <span className="text-xs text-muted-foreground font-normal whitespace-nowrap">
                            {getTransactionRef(transaction)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-primary shrink-0"
                            onClick={() => navigate(`/gig/${transaction.gigs.id}`)}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            View project
                          </Button>
                        </div>
                        {(isMilestone && (transaction.milestone_description ?? transaction.milestone_number != null)) && (
                          <p className="text-sm text-muted-foreground">
                            {[transaction.milestone_number != null && `Milestone ${transaction.milestone_number}`, transaction.milestone_description].filter(Boolean).join(': ')}
                          </p>
                        )}
                        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span>
                            {userType === 'consumer'
                              ? <>Professional: <strong className="text-foreground">{getProfessionalDisplayName(transaction)}</strong></>
                              : <>Client: <strong className="text-foreground">{getClientDisplayName(transaction)}</strong></>}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            {formatDistanceToNow(new Date(dateStr), { addSuffix: true })}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Amounts & fees */}
                      <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Amount details</div>
                        {userType === 'digger' ? (
                          <>
                            {isMilestone && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Gross (milestone amount)</span>
                                <span className="font-medium">${gross.toFixed(2)}</span>
                              </div>
                            )}
                            {!isMilestone && transaction.bids?.amount != null && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Bid amount</span>
                                <span className="font-medium">${Number(transaction.bids.amount).toFixed(2)}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between items-baseline">
                              <span className="font-semibold">Your payout</span>
                              <span className="text-xl font-bold text-primary">${transaction.digger_payout.toFixed(2)}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Amount paid</span>
                              <span className="font-semibold">${transaction.total_amount.toFixed(2)}</span>
                            </div>
                            {isMilestone && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Milestone gross</span>
                                <span className="font-medium">${gross.toFixed(2)}</span>
                              </div>
                            )}
                            {transaction.bids?.amount != null && !isMilestone && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Bid amount</span>
                                <span className="font-medium">${Number(transaction.bids.amount).toFixed(2)}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-2 text-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Paid on {format(new Date(dateStr), 'MMMM d, yyyy')}</span>
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              );
              })}
              {filteredTransactions.length > INITIAL_DISPLAY_LIMIT && (
                <div className="flex justify-center gap-2 pt-4 flex-wrap">
                  {displayLimit < filteredTransactions.length ? (
                    <Button variant="outline" onClick={() => setDisplayLimit(filteredTransactions.length)}>
                      Load more ({filteredTransactions.length - displayLimit} more)
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setDisplayLimit(INITIAL_DISPLAY_LIMIT)}>
                      Load less
                    </Button>
                  )}
                </div>
              )}
            </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
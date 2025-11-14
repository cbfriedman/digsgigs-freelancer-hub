import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, DollarSign, TrendingUp, Calendar, Loader2, Receipt } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  id: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  digger_payout: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  gigs: {
    title: string;
    consumer_id: string;
  };
  bids: {
    amount: number;
  };
  profiles: {
    full_name: string | null;
  };
}

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'digger' | 'consumer' | null>(null);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth?redirect=/transactions');
        return;
      }

      // Check user type
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

      setUserType(profile.user_type as 'digger' | 'consumer');

      if (profile.user_type === 'digger') {
        // Get digger profile ID
        const { data: diggerProfile } = await supabase
          .from('digger_profiles' as any)
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (diggerProfile) {
          setDiggerId((diggerProfile as any).id);
          await loadTransactions(session.user.id, 'digger', (diggerProfile as any).id);
        }
      } else {
        await loadTransactions(session.user.id, 'consumer', null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (userId: string, type: 'digger' | 'consumer', diggerId: string | null) => {
    try {
      let query = supabase
        .from('transactions' as any)
        .select(`
          *,
          gigs (
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

      const txData = (data as any) || [];
      setTransactions(txData);

      // Calculate totals for diggers
      if (type === 'digger') {
        const earnings = txData.reduce((sum: number, tx: any) => sum + (tx.digger_payout || 0), 0);
        const commission = txData.reduce((sum: number, tx: any) => sum + (tx.commission_amount || 0), 0);
        setTotalEarnings(earnings);
        setTotalCommission(commission);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            digsandgiggs
          </h1>
          <div className="w-32" /> {/* Spacer for alignment */}
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold mb-2">Transaction History</h1>
            <p className="text-muted-foreground">
              {userType === 'digger' 
                ? 'View your completed work and earnings breakdown'
                : 'View your payment history for completed gigs'}
            </p>
          </div>

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
                    After commission
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
                    Platform fees
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
                    {transactions.length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Total transactions
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upgrade CTA for Free Tier Diggers */}
          {userType === 'digger' && totalCommission > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">Save on Commission Fees</h3>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to Pro (4%) or Premium (0%) to keep more of your earnings
                    </p>
                  </div>
                  <Button onClick={() => navigate('/subscription')}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">All Transactions</h2>
            
            {transactions.length === 0 ? (
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
              transactions.map((transaction) => (
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
                      <Badge variant="default">
                        {transaction.status}
                      </Badge>
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
                            Original bid: ${transaction.bids?.amount?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Commission Breakdown for Diggers */}
                    {userType === 'digger' && transaction.commission_rate > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          💡 Tip: With a{' '}
                          {transaction.commission_rate >= 0.09 
                            ? 'Pro plan, you would have saved ' + 
                              ((transaction.total_amount * 0.05) - transaction.commission_amount).toFixed(2)
                            : transaction.commission_rate >= 0.04
                            ? 'Premium plan, you would have saved ' + 
                              transaction.commission_amount.toFixed(2)
                            : 'current plan, you\'re already saving the most!'}
                          {' '}on this transaction
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;

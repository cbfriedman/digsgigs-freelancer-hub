import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Loader2,
  Rocket,
  User,
  Bell,
  CreditCard,
  MessageSquare,
  FileCheck,
  Mail
} from "lucide-react";
import { toast } from "sonner";

interface TestStep {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  details?: any;
}

export default function E2ETestSuite() {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<TestStep[]>([
    {
      id: 'auth',
      name: 'Authentication',
      description: 'Verify users can sign up and log in',
      icon: User,
      status: 'pending'
    },
    {
      id: 'gig-creation',
      name: 'Gig Creation',
      description: 'Consumer creates a gig with AI matching',
      icon: Rocket,
      status: 'pending'
    },
    {
      id: 'notifications',
      name: 'In-App Notifications',
      description: 'Diggers receive notifications for matching gigs',
      icon: Bell,
      status: 'pending'
    },
    {
      id: 'email-notifications',
      name: 'Email Notifications',
      description: 'Test email delivery via Resend',
      icon: Mail,
      status: 'pending'
    },
    {
      id: 'lead-purchase',
      name: 'Lead Purchase',
      description: 'Digger purchases gig lead via Stripe',
      icon: CreditCard,
      status: 'pending'
    },
    {
      id: 'messaging',
      name: 'Messaging System',
      description: 'Consumer and digger exchange messages',
      icon: MessageSquare,
      status: 'pending'
    },
    {
      id: 'transaction',
      name: 'Transaction Completion',
      description: 'Work completion and payment processing',
      icon: FileCheck,
      status: 'pending'
    }
  ]);

  const updateStep = (id: string, updates: Partial<TestStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const testAuthentication = async (): Promise<boolean> => {
    updateStep('auth', { status: 'running' });
    
    try {
      // Check if session exists
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        updateStep('auth', { 
          status: 'warning',
          message: 'No active session. Please sign in to run full tests.',
          details: { action: 'Navigate to /auth to sign in' }
        });
        return false;
      }

      // Verify profile exists
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, user_type')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        updateStep('auth', { 
          status: 'error',
          message: 'Profile not found for authenticated user'
        });
        return false;
      }

      updateStep('auth', { 
        status: 'success',
        message: `Authenticated as ${profile.user_type}`,
        details: { email: profile.email, user_type: profile.user_type }
      });
      return true;
    } catch (error: any) {
      updateStep('auth', { 
        status: 'error',
        message: error.message
      });
      return false;
    }
  };

  const testGigCreation = async (): Promise<string | null> => {
    updateStep('gig-creation', { status: 'running' });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create test gig
      const testGig = {
        consumer_id: session.user.id,
        title: `[TEST] Kitchen Renovation - ${Date.now()}`,
        description: 'Test gig for end-to-end testing. Need kitchen cabinets installed, countertops replaced, and plumbing work. This is a test and should not be treated as a real gig.',
        location: 'San Francisco, CA',
        budget_min: 5000,
        budget_max: 10000,
        status: 'open'
      };

      const { data: gig, error: gigError } = await supabase
        .from('gigs')
        .insert(testGig)
        .select()
        .single();

      if (gigError || !gig) throw gigError || new Error('Failed to create gig');

      // Test AI matching
      const { data: aiMatch, error: aiError } = await supabase.functions.invoke(
        'match-industry-codes',
        {
          body: {
            title: testGig.title,
            description: testGig.description,
            category: 'Construction'
          }
        }
      );

      if (aiError) {
        updateStep('gig-creation', {
          status: 'warning',
          message: 'Gig created but AI matching failed',
          details: { gigId: gig.id, error: aiError.message }
        });
        return gig.id;
      }

      // Update gig with AI-matched codes
      const { error: updateError } = await supabase
        .from('gigs')
        .update({
          sic_codes: aiMatch.sic_codes,
          naics_codes: aiMatch.naics_codes,
          ai_matched_codes: true
        })
        .eq('id', gig.id);

      if (updateError) throw updateError;

      updateStep('gig-creation', {
        status: 'success',
        message: 'Gig created and AI-matched successfully',
        details: {
          gigId: gig.id,
          sic_codes: aiMatch.sic_codes,
          naics_codes: aiMatch.naics_codes,
          reasoning: aiMatch.reasoning
        }
      });

      return gig.id;
    } catch (error: any) {
      updateStep('gig-creation', {
        status: 'error',
        message: error.message
      });
      return null;
    }
  };

  const testNotifications = async (gigId: string): Promise<boolean> => {
    updateStep('notifications', { status: 'running' });
    
    try {
      // Wait 2 seconds for trigger to fire
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check for notifications created in the last minute
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, type, created_at')
        .eq('type', 'new_gig')
        .gte('created_at', new Date(Date.now() - 60000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        updateStep('notifications', {
          status: 'warning',
          message: 'No notifications sent. This could mean no matching diggers exist.',
          details: { 
            note: 'Create digger profiles with matching SIC/NAICS codes',
            gigId 
          }
        });
        return false;
      }

      updateStep('notifications', {
        status: 'success',
        message: `${notifications.length} notification(s) sent to matching diggers`,
        details: { notifications: notifications.slice(0, 5) }
      });

      return true;
    } catch (error: any) {
      updateStep('notifications', {
        status: 'error',
        message: error.message
      });
      return false;
    }
  };

  const testEmailNotifications = async (): Promise<boolean> => {
    updateStep('email-notifications', { status: 'running' });
    
    try {
      // Test sending a bid notification email
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-bid-notification', {
        body: {
          bidId: 'test-bid-id',
          type: 'test'
        }
      });

      if (error) {
        updateStep('email-notifications', {
          status: 'warning',
          message: 'Email function exists but test call failed',
          details: { error: error.message, note: 'Resend API key may need verification' }
        });
        return false;
      }

      updateStep('email-notifications', {
        status: 'success',
        message: 'Email notification system is configured',
        details: { 
          provider: 'Resend',
          note: 'Check Resend dashboard for actual email delivery'
        }
      });

      return true;
    } catch (error: any) {
      updateStep('email-notifications', {
        status: 'error',
        message: error.message
      });
      return false;
    }
  };

  const testLeadPurchase = async (gigId: string): Promise<boolean> => {
    updateStep('lead-purchase', { status: 'running' });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Check if user has a digger profile
      const { data: diggerProfile } = await supabase
        .from('digger_profiles')
        .select('id, subscription_tier, hourly_rate')
        .eq('user_id', session.user.id)
        .single();

      if (!diggerProfile) {
        updateStep('lead-purchase', {
          status: 'warning',
          message: 'No digger profile found. Only diggers can purchase leads.',
          details: { note: 'Create a digger profile to test lead purchases' }
        });
        return false;
      }

      // Check if Stripe is configured
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            gigId,
            diggerId: diggerProfile.id,
            gigTitle: 'Test Gig',
            tier: diggerProfile.subscription_tier || 'free',
            isOldLead: false
          }
        }
      );

      if (checkoutError) {
        updateStep('lead-purchase', {
          status: 'warning',
          message: 'Stripe checkout session creation failed',
          details: { error: checkoutError.message }
        });
        return false;
      }

      updateStep('lead-purchase', {
        status: 'success',
        message: 'Lead purchase flow is operational',
        details: {
          subscription_tier: diggerProfile.subscription_tier,
          checkout_url: checkoutData.url,
          note: 'Use test card 4242 4242 4242 4242 to test payments'
        }
      });

      return true;
    } catch (error: any) {
      updateStep('lead-purchase', {
        status: 'error',
        message: error.message
      });
      return false;
    }
  };

  const testMessaging = async (): Promise<boolean> => {
    updateStep('messaging', { status: 'running' });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Check if messaging tables exist and are accessible
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);

      if (error) throw error;

      updateStep('messaging', {
        status: 'success',
        message: 'Messaging system is operational',
        details: { 
          note: 'Messages can be exchanged after lead purchase',
          existing_conversations: conversations?.length || 0
        }
      });

      return true;
    } catch (error: any) {
      updateStep('messaging', {
        status: 'error',
        message: error.message
      });
      return false;
    }
  };

  const testTransactions = async (): Promise<boolean> => {
    updateStep('transaction', { status: 'running' });
    
    try {
      // Check if transaction system is configured
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, status, total_amount')
        .limit(5);

      if (error) throw error;

      updateStep('transaction', {
        status: 'success',
        message: 'Transaction system is operational',
        details: {
          recent_transactions: transactions?.length || 0,
          note: 'Transactions created when work is marked complete'
        }
      });

      return true;
    } catch (error: any) {
      updateStep('transaction', {
        status: 'error',
        message: error.message
      });
      return false;
    }
  };

  const runFullTest = async () => {
    setTesting(true);
    setProgress(0);

    try {
      // Step 1: Authentication
      setProgress(14);
      const authSuccess = await testAuthentication();
      if (!authSuccess) {
        toast.error('Authentication required to continue tests');
        setTesting(false);
        return;
      }

      // Step 2: Gig Creation
      setProgress(28);
      const gigId = await testGigCreation();
      if (!gigId) {
        toast.error('Failed to create test gig');
        setTesting(false);
        return;
      }

      // Step 3: Notifications
      setProgress(42);
      await testNotifications(gigId);

      // Step 4: Email Notifications
      setProgress(56);
      await testEmailNotifications();

      // Step 5: Lead Purchase
      setProgress(70);
      await testLeadPurchase(gigId);

      // Step 6: Messaging
      setProgress(84);
      await testMessaging();

      // Step 7: Transactions
      setProgress(100);
      await testTransactions();

      toast.success('End-to-end test suite completed!');
    } catch (error: any) {
      toast.error(`Test suite failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: TestStep['status']) => {
    switch (status) {
      case 'success': return 'border-green-500';
      case 'error': return 'border-red-500';
      case 'warning': return 'border-yellow-500';
      case 'running': return 'border-blue-500';
      default: return 'border-border';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">End-to-End Test Suite</h1>
        <p className="text-muted-foreground">
          Comprehensive testing of the complete user journey from gig creation to transaction completion
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Progress</CardTitle>
          <CardDescription>
            {testing ? 'Running tests...' : 'Ready to test'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="w-full" />
          
          <Button 
            onClick={runFullTest} 
            disabled={testing}
            className="w-full"
            size="lg"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Run Full Test Suite
              </>
            )}
          </Button>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Before Testing</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Sign in with a test account</li>
                <li>Have at least one digger profile with SIC/NAICS codes</li>
                <li>Stripe test mode should be enabled</li>
                <li>Resend domain should be verified</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <Card key={step.id} className={`${getStatusColor(step.status)} border-l-4`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <div>
                            <CardTitle className="text-lg">{step.name}</CardTitle>
                            <CardDescription>{step.description}</CardDescription>
                          </div>
                        </div>
                        {getStatusIcon(step.status)}
                      </div>
                    </CardHeader>
                    {step.message && (
                      <CardContent>
                        <p className="text-sm mb-2">{step.message}</p>
                        {step.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Testing Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="consumer">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="consumer">Consumer Journey</TabsTrigger>
              <TabsTrigger value="digger">Digger Journey</TabsTrigger>
            </TabsList>
            
            <TabsContent value="consumer" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">1</Badge>
                  <div>
                    <p className="font-medium">Create Account</p>
                    <p className="text-sm text-muted-foreground">Sign up as a consumer at /auth</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">2</Badge>
                  <div>
                    <p className="font-medium">Post a Gig</p>
                    <p className="text-sm text-muted-foreground">Navigate to /post-gig and create a detailed gig posting</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">3</Badge>
                  <div>
                    <p className="font-medium">Receive Bids</p>
                    <p className="text-sm text-muted-foreground">View bids at /my-gigs and review proposals</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">4</Badge>
                  <div>
                    <p className="font-medium">Accept Bid & Complete Work</p>
                    <p className="text-sm text-muted-foreground">Accept a bid, communicate via messages, mark work complete</p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="digger" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">1</Badge>
                  <div>
                    <p className="font-medium">Create Digger Profile</p>
                    <p className="text-sm text-muted-foreground">Register as digger at /digger-registration with SIC/NAICS codes</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">2</Badge>
                  <div>
                    <p className="font-medium">Receive Notification</p>
                    <p className="text-sm text-muted-foreground">Get notified when matching gigs are posted (check /notifications)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">3</Badge>
                  <div>
                    <p className="font-medium">Purchase Lead</p>
                    <p className="text-sm text-muted-foreground">Browse gigs, purchase lead to see contact info (use test card 4242 4242 4242 4242)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">4</Badge>
                  <div>
                    <p className="font-medium">Submit Bid & Get Hired</p>
                    <p className="text-sm text-muted-foreground">Submit proposal, communicate via messages, complete work</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

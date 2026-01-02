import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@3.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-MONTHLY-REPORTS] ${step}${detailsStr}`);
};

interface Transaction {
  gigs: { title: string };
  profiles: { full_name: string | null };
  total_amount: number;
  commission_amount: number;
  digger_payout: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const generateEmailHTML = (
  userType: 'digger' | 'consumer',
  transactions: Transaction[],
  stats?: { totalEarnings: number; totalEscrowFees: number },
  dateRange?: string
) => {
  const summarySection = userType === 'digger' && stats ? `
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #333; font-size: 18px; margin: 0 0 15px;">Monthly Summary</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align: center; padding: 10px;">
            <div style="color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase;">Total Earnings</div>
            <div style="color: #0f172a; font-size: 24px; font-weight: bold;">$${stats.totalEarnings.toFixed(2)}</div>
          </td>
          <td style="text-align: center; padding: 10px;">
            <div style="color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase;">Escrow Fees Paid</div>
            <div style="color: #ef4444; font-size: 24px; font-weight: bold;">$${stats.totalEscrowFees.toFixed(2)}</div>
          </td>
          <td style="text-align: center; padding: 10px;">
            <div style="color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase;">Transactions</div>
            <div style="color: #0f172a; font-size: 24px; font-weight: bold;">${transactions.length}</div>
          </td>
        </tr>
      </table>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  ` : '';

  const transactionCards = transactions.map(tx => {
    const date = new Date(tx.completed_at || tx.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const clientInfo = userType === 'digger' ? `
      <p style="color: #64748b; font-size: 14px; margin: 0 0 12px;">Client: ${tx.profiles?.full_name || 'Anonymous'}</p>
    ` : '';

  const payoutSection = userType === 'digger' ? `
      <tr>
        <td style="padding: 8px 0;">
          <span style="color: #64748b; font-size: 12px; font-weight: 500;">Escrow Fee</span><br/>
          <span style="color: #ef4444; font-size: 14px; font-weight: 600;">-$${tx.commission_amount.toFixed(2)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0 0;">
          <span style="color: #4f46e5; font-size: 14px; font-weight: 600;">Your Payout</span><br/>
          <span style="color: #4f46e5; font-size: 20px; font-weight: bold;">$${tx.digger_payout.toFixed(2)}</span>
        </td>
      </tr>
    ` : '';

    return `
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 10px 0;">
        <h3 style="color: #0f172a; font-size: 16px; font-weight: bold; margin: 0 0 4px;">${tx.gigs.title}</h3>
        ${clientInfo}
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding: 8px 0;">
              <span style="color: #64748b; font-size: 12px; font-weight: 500;">Date</span><br/>
              <span style="color: #0f172a; font-size: 14px; font-weight: 600;">${date}</span>
            </td>
            <td width="50%" style="padding: 8px 0; text-align: right;">
              <span style="color: #64748b; font-size: 12px; font-weight: 500;">Status</span><br/>
              <span style="background-color: #f1f5f9; border-radius: 4px; color: #475569; font-size: 12px; font-weight: 500; padding: 4px 8px; text-transform: capitalize;">${tx.status}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 4px 0;">
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 8px 0;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #64748b; font-size: 12px; font-weight: 500;">Total Amount</span><br/>
              <span style="color: #0f172a; font-size: 14px; font-weight: 600;">$${tx.total_amount.toFixed(2)}</span>
            </td>
          </tr>
          ${payoutSection}
        </table>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monthly Transaction Report</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 40px;">
                  <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 10px;">Monthly Transaction Report</h1>
                  <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
                    Here is your monthly transaction report from Digs and Gigs.
                    ${dateRange ? `<br/>Period: ${dateRange}` : ''}
                  </p>
                  
                  ${summarySection}
                  
                  <h2 style="color: #333; font-size: 18px; font-weight: bold; margin: 20px 0 10px;">Transactions (${transactions.length})</h2>
                  
                  ${transactionCards}
                  
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />
                  <p style="color: #64748b; font-size: 12px; line-height: 20px; margin: 0;">
                    This is your automated monthly report from Digs and Gigs.<br/>
                    Questions? Contact us at support@digsandgigs.net
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Monthly reports function started");

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate date range for last month
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const dateRange = `${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    logStep("Date range calculated", { 
      start: lastMonth.toISOString(), 
      end: lastMonthEnd.toISOString() 
    });

    // Get all users with transactions in the last month
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select(`
        *,
        gigs (title),
        profiles!transactions_consumer_id_fkey (full_name)
      `)
      .gte('created_at', lastMonth.toISOString())
      .lte('created_at', lastMonthEnd.toISOString());

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`);
    }

    if (!transactions || transactions.length === 0) {
      logStep("No transactions found for last month");
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No transactions to report' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep("Transactions fetched", { count: transactions.length });

    // Group transactions by user
    const userTransactions = new Map<string, { email: string; userType: string; transactions: any[]; userId: string }>();

    for (const tx of transactions) {
      // Add for digger
      if (tx.digger_id) {
        const { data: diggerProfile } = await supabaseClient
          .from('profiles')
          .select('id, email, user_type')
          .eq('id', tx.digger_id)
          .single();

        if (diggerProfile?.email) {
          // Check email preferences
          const { data: prefs } = await supabaseClient
            .from('email_preferences')
            .select('enabled, report_frequency')
            .eq('user_id', diggerProfile.id)
            .single();

          // Skip if user has disabled emails or frequency is not monthly
          if (!prefs?.enabled || prefs.report_frequency !== 'monthly') {
            logStep("Skipping digger due to preferences", { 
              userId: diggerProfile.id, 
              enabled: prefs?.enabled, 
              frequency: prefs?.report_frequency 
            });
            continue;
          }

          if (!userTransactions.has(tx.digger_id)) {
            userTransactions.set(tx.digger_id, {
              email: diggerProfile.email,
              userType: 'digger',
              transactions: [],
              userId: diggerProfile.id
            });
          }
          userTransactions.get(tx.digger_id)?.transactions.push(tx);
        }
      }

      // Add for consumer
      if (tx.consumer_id) {
        const { data: consumerProfile } = await supabaseClient
          .from('profiles')
          .select('id, email, user_type')
          .eq('id', tx.consumer_id)
          .single();

        if (consumerProfile?.email) {
          // Check email preferences
          const { data: prefs } = await supabaseClient
            .from('email_preferences')
            .select('enabled, report_frequency')
            .eq('user_id', consumerProfile.id)
            .single();

          // Skip if user has disabled emails or frequency is not monthly
          if (!prefs?.enabled || prefs.report_frequency !== 'monthly') {
            logStep("Skipping consumer due to preferences", { 
              userId: consumerProfile.id, 
              enabled: prefs?.enabled, 
              frequency: prefs?.report_frequency 
            });
            continue;
          }

          if (!userTransactions.has(tx.consumer_id)) {
            userTransactions.set(tx.consumer_id, {
              email: consumerProfile.email,
              userType: 'consumer',
              transactions: [],
              userId: consumerProfile.id
            });
          }
          userTransactions.get(tx.consumer_id)?.transactions.push(tx);
        }
      }
    }

    logStep("Grouped transactions by user", { userCount: userTransactions.size });

    // Send emails to each user
    const emailResults = [];
    const skippedCount = 0;
    
    for (const [userId, userData] of userTransactions) {
      const { email, userType, transactions: userTxs } = userData;

      // Calculate stats for diggers
      let stats;
      if (userType === 'digger') {
        const totalEarnings = userTxs.reduce((sum, tx) => sum + (tx.digger_payout || 0), 0);
        const totalEscrowFees = userTxs.reduce((sum, tx) => sum + (tx.commission_amount || 0), 0);
        stats = { totalEarnings, totalEscrowFees };
      }

      const html = generateEmailHTML(userType as 'digger' | 'consumer', userTxs, stats, dateRange);

      try {
        const emailResponse = await resend.emails.send({
          from: 'Digs and Gigs <noreply@digsandgigs.net>',
          to: [email],
          subject: `Your Monthly Transaction Report - ${dateRange} | Digs and Gigs`,
          html,
        });

        if (emailResponse.error) {
          logStep("Email failed", { userId, email, error: emailResponse.error.message });
          emailResults.push({ userId, email, success: false, error: emailResponse.error.message });
        } else {
          logStep("Email sent", { userId, email, emailId: emailResponse.data?.id });
          emailResults.push({ userId, email, success: true, emailId: emailResponse.data?.id });
        }
      } catch (emailError) {
        const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
        logStep("Email exception", { userId, email, error: errorMsg });
        emailResults.push({ userId, email, success: false, error: errorMsg });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    logStep("Monthly reports completed", { 
      total: emailResults.length, 
      successful: successCount,
      failed: emailResults.length - successCount,
      skippedDueToPreferences: skippedCount
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `Sent ${successCount} of ${emailResults.length} reports`,
      results: emailResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

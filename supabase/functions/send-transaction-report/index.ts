import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@3.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-TRANSACTION-REPORT] ${step}${detailsStr}`);
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
  stats?: { totalEarnings: number; totalCommission: number },
  dateRange?: string
) => {
  const summarySection = userType === 'digger' && stats ? `
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #333; font-size: 18px; margin: 0 0 15px;">Summary</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align: center; padding: 10px;">
            <div style="color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase;">Total Earnings</div>
            <div style="color: #0f172a; font-size: 24px; font-weight: bold;">$${stats.totalEarnings.toFixed(2)}</div>
          </td>
          <td style="text-align: center; padding: 10px;">
            <div style="color: #64748b; font-size: 12px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase;">Commission Paid</div>
            <div style="color: #ef4444; font-size: 24px; font-weight: bold;">$${stats.totalCommission.toFixed(2)}</div>
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
          <span style="color: #64748b; font-size: 12px; font-weight: 500;">Commission</span><br/>
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
      <title>Transaction Report</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden;">
              <tr>
                <td style="padding: 40px;">
                  <h1 style="color: #333; font-size: 24px; font-weight: bold; margin: 0 0 10px;">Transaction Report</h1>
                  <p style="color: #64748b; font-size: 14px; margin: 0 0 20px;">
                    Here is your transaction report from digsandgiggs.
                    ${dateRange ? `<br/>Period: ${dateRange}` : ''}
                  </p>
                  
                  ${summarySection}
                  
                  <h2 style="color: #333; font-size: 18px; font-weight: bold; margin: 20px 0 10px;">Transactions (${transactions.length})</h2>
                  
                  ${transactionCards}
                  
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 20px;" />
                  <p style="color: #64748b; font-size: 12px; line-height: 20px; margin: 0;">
                    This report was generated from your digsandgiggs account.<br/>
                    Questions? Contact us at support@digsandgiggs.com
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
    logStep("Function started");

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated');
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { transactions, userType, stats, dateRange } = await req.json();

    if (!transactions || !userType) {
      throw new Error('Missing required parameters');
    }

    logStep("Request data", { 
      transactionCount: transactions.length, 
      userType,
      dateRange 
    });

    // Generate email HTML
    const html = generateEmailHTML(userType, transactions, stats, dateRange);

    logStep("Email HTML generated");

    // Send email
    const emailResponse = await resend.emails.send({
      from: 'digsandgiggs <onboarding@resend.dev>',
      to: [user.email],
      subject: `Your Transaction Report - ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`,
      html,
    });

    if (emailResponse.error) {
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Transaction report sent successfully',
      emailId: emailResponse.data?.id 
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

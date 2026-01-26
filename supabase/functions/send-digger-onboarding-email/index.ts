import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OnboardingEmailRequest {
  userId: string;
  email: string;
  name?: string;
  step?: number;
  diggerProfileId?: string;
}

// Helper to add UTM parameters to URLs
const addUTM = (url: string, step: number): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}utm_source=email&utm_medium=onboarding&utm_campaign=digger_onboarding_step_${step}`;
};

// Email templates for each step - Updated for pay-per-lead model
const getEmailContent = (step: number, firstName: string, email: string) => {
  const baseUrl = 'https://digsandgigs.net';
  
  const emails: Record<number, { subject: string; html: string }> = {
    // STEP 1: Welcome - Pay-Per-Lead Model
    1: {
      subject: `🎉 Welcome to Digs & Gigs, ${firstName}! Projects Are Coming`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Welcome to Digs & Gigs!</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Get ready to receive project leads in your inbox 📬</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                <strong>You're in!</strong> Get ready to receive project requests delivered straight to your inbox.
              </p>
              
              <h3 style="margin: 25px 0 15px 0; color: #333;">Here's how Digs & Gigs works:</h3>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0;"><strong>1.</strong> Clients post projects — we email them directly to you</p>
                <p style="margin: 0 0 12px 0;"><strong>2.</strong> You see the details (scope, budget, timeline)</p>
                <p style="margin: 0 0 12px 0;"><strong>3.</strong> Pay a small fee to unlock client contact info (starting at $10)</p>
                <p style="margin: 0;"><strong>4.</strong> Connect directly and win the work — no platform commission on your earnings</p>
              </div>
              
              <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #667eea;">🎁 Your Welcome Benefits:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;"><strong>$0 setup fee</strong> (normally $199)</li>
                  <li style="margin-bottom: 8px;"><strong>Dynamic lead pricing</strong> starting at just $10</li>
                  <li style="margin-bottom: 8px;"><strong>Full refund</strong> on any bogus leads</li>
                  <li><strong>Non-exclusive leads</strong> — pursue as many as you want</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                Unlike other platforms that take 15-20% of every project, we charge a small upfront fee and you keep everything you earn.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/role-dashboard', 1)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Check Your Inbox for Leads →</a>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Over the next few days, I'll share tips to help you win more projects.
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Welcome to the future of freelancing!<br>
                <em>— The Digs & Gigs Team</em>
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="${baseUrl}/faq" style="color: #667eea; text-decoration: none;">FAQ</a> | 
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `
    },
    
    // STEP 2: How Lead Emails Work
    2: {
      subject: `📬 How Project Emails Work (So You Don't Miss Out)`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">How Lead Emails Work</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Projects delivered directly to your inbox</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                On Digs & Gigs, we don't make you compete in bidding wars. Instead, we deliver projects directly to your inbox.
              </p>
              
              <h3 style="margin: 25px 0 15px 0; color: #333;">How it works:</h3>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 20px 0;">
                <div style="margin-bottom: 20px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">1</div>
                  <span style="font-weight: bold;">A client posts what they need</span>
                  <p style="margin: 5px 0 0 44px; font-size: 14px; color: #666;">Design, development, marketing, etc.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">2</div>
                  <span style="font-weight: bold;">We email the project to matching freelancers</span>
                  <p style="margin: 5px 0 0 44px; font-size: 14px; color: #666;">Based on your skills and preferences.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">3</div>
                  <span style="font-weight: bold;">Review the details</span>
                  <p style="margin: 5px 0 0 44px; font-size: 14px; color: #666;">Scope, budget, location, timeline.</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">4</div>
                  <span style="font-weight: bold;">Pay a small fee to unlock client contact info</span>
                  <p style="margin: 5px 0 0 44px; font-size: 14px; color: #666;">If interested, reveal who the client is.</p>
                </div>
                
                <div>
                  <div style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; font-weight: bold; margin-right: 12px;">5</div>
                  <span style="font-weight: bold;">Reach out directly</span>
                  <p style="margin: 5px 0 0 44px; font-size: 14px; color: #666;">No middleman, no commission on your work.</p>
                </div>
              </div>
              
              <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
                <h4 style="margin: 0 0 10px 0; color: #667eea;">📊 Lead Pricing:</h4>
                <p style="margin: 0 0 8px 0;"><strong>Non-exclusive leads:</strong> 2% of project budget (min $10, max $49)</p>
                <p style="margin: 0;"><strong>Exclusive jobs:</strong> 3% referral fee (only if selected, paid from client deposit)</p>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px;"><strong>💡 Pro Tip:</strong> Keep an eye on your inbox! Projects move fast.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/my-profiles', 2)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Make Sure You're Set Up →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: Why flat-fee beats commissions (with real math).<br>
                <em>— The Digs & Gigs Team</em>
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `
    },
    
    // STEP 3: Why Flat-Fee Beats Commissions
    3: {
      subject: `💰 Keep More of What You Earn — Here's the Math`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Why Flat-Fee Wins</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">The math that puts more money in your pocket</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                Let's talk about why Digs & Gigs is built differently.
              </p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                Most platforms take <strong>15-20% of every project</strong> you complete:
              </p>
              
              <div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;">❌ Win a $5,000 project? Hand over $750-$1,000.</p>
                <p style="margin: 0;">❌ Over a year, that adds up to thousands lost.</p>
              </div>
              
              <h3 style="margin: 30px 0 15px 0; color: #333;">On Digs & Gigs:</h3>
              
              <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;">✅ Pay a small upfront fee to unlock the lead ($10-$49)</p>
                <p style="margin: 0 0 8px 0;">✅ Keep 100% of your non-exclusive project earnings</p>
                <p style="margin: 0;">✅ For exclusive jobs: just 3% referral fee (and the client pays it upfront as a deposit to you)</p>
              </div>
              
              <h3 style="margin: 30px 0 15px 0; color: #333;">Example:</h3>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <p style="margin: 0 0 10px 0;">You unlock a $3,000 project lead for $10.</p>
                <p style="margin: 0 0 10px 0;">You win the job.</p>
                <p style="margin: 0 0 15px 0; font-size: 18px; color: #333;">You keep: <strong style="color: #22c55e; font-size: 24px;">$3,000</strong> <span style="font-size: 14px; color: #666;">(minus your $10 unlock cost)</span></p>
                <p style="margin: 0; font-size: 14px; color: #666;">On Upwork/Fiverr: You'd keep ~$2,400.</p>
                <p style="margin: 10px 0 0 0; font-size: 18px; color: #22c55e;"><strong>That's $590 more in your pocket — per project.</strong></p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/role-dashboard', 3)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Start Winning Projects →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: How to write outreach that wins clients.<br>
                <em>— The Digs & Gigs Team</em>
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `
    },
    
    // STEP 4: How to Win Clients
    4: {
      subject: `🏆 The Message Template That Wins 40% More Clients`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">How to Win Clients</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">The outreach formula that actually works</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                You found a project that's perfect for you. You unlocked the client's contact info. Now what?
              </p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                Here's the outreach formula our most successful freelancers use:
              </p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 15px 0; font-style: italic; color: #666;">Template:</p>
                <p style="margin: 0 0 10px 0;"><strong>Subject: Re: [Their Project Name]</strong></p>
                <p style="margin: 0 0 10px 0;">Hi [Name],</p>
                <p style="margin: 0 0 10px 0;">I saw your project on Digs & Gigs and wanted to reach out directly.</p>
                <p style="margin: 0 0 10px 0;"><strong>[1 sentence about why you're a great fit]</strong></p>
                <p style="margin: 0 0 10px 0;"><strong>[1 relevant example or portfolio link]</strong></p>
                <p style="margin: 0 0 10px 0;">I'd love to hop on a quick call to understand your project better. What does your schedule look like this week?</p>
                <p style="margin: 0;">Best,<br>[Your Name]</p>
              </div>
              
              <h3 style="margin: 30px 0 15px 0; color: #333;">Why This Works:</h3>
              
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;"><strong>Short and specific</strong> — clients don't read essays</li>
                <li style="margin-bottom: 10px;"><strong>Shows you read their project</strong> — not a copy-paste template</li>
                <li style="margin-bottom: 10px;"><strong>Includes proof</strong> — one example beats ten claims</li>
                <li><strong>Clear next step</strong> — asking for a call converts better than "let me know"</li>
              </ul>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px;"><strong>💡 Pro Tip:</strong> Respond within 2 hours when possible. Fast responders get hired 3x more often.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/role-dashboard', 4)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Check Your Lead Inbox →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: Make sure you're not missing leads.<br>
                <em>— The Digs & Gigs Team</em>
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `
    },
    
    // STEP 5: First Lead Nudge
    5: {
      subject: `👋 Have You Checked Your Project Emails?`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Check Your Inbox</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Don't miss out on project opportunities</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                Just checking in! Have you had a chance to review any project emails yet?
              </p>
              
              <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
                <h4 style="margin: 0 0 15px 0; color: #667eea;">Remember:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Projects come straight to your inbox — no logging in to browse</li>
                  <li style="margin-bottom: 8px;">You choose which leads to pursue (no obligation)</li>
                  <li style="margin-bottom: 8px;">Unlock fees start at just $10</li>
                  <li>Bogus leads? Full refund, no questions asked.</li>
                </ul>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="margin: 0 0 15px 0; color: #92400e;">If you haven't received any project emails yet, make sure:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">✓ Check your spam/promotions folder</li>
                  <li style="margin-bottom: 8px;">✓ Add <strong>hello@digsandgigs.net</strong> to your contacts</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; margin: 25px 0;">
                Questions? Just reply to this email — we're here to help!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/email-preferences', 5)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Update Your Preferences →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                — The Digs & Gigs Team
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `
    },
    
    // STEP 6: Refund Policy & Trust
    6: {
      subject: `🛡️ Our Guarantee: Bad Leads = Full Refund`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Our Lead Guarantee</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">We stand behind every lead we send you</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                We know you're investing real money to unlock leads. That's why we have a straightforward guarantee:
              </p>
              
              <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                <h3 style="margin: 0 0 15px 0; color: #22c55e; font-size: 24px;">🛡️ Full Refund on Bogus Leads</h3>
                <p style="margin: 0; font-size: 16px;">If a lead turns out to be fake, spam, or completely unresponsive — we'll refund your unlock fee. No questions asked.</p>
              </div>
              
              <h3 style="margin: 30px 0 15px 0; color: #333;">What qualifies for a refund:</h3>
              
              <ul style="margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">Client provided fake contact information</li>
                <li style="margin-bottom: 10px;">Phone number disconnected or email bounces</li>
                <li style="margin-bottom: 10px;">Client never responds after multiple attempts</li>
                <li style="margin-bottom: 10px;">Project details were completely misrepresented</li>
                <li>Any other situation where the lead was clearly invalid</li>
              </ul>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0;"><strong>How to request a refund:</strong></p>
                <p style="margin: 0; font-size: 14px; color: #666;">Simply reply to any of our emails with your lead details and what happened. Our team reviews refund requests within 24-48 hours.</p>
              </div>
              
              <p style="font-size: 16px; margin: 25px 0;">
                We succeed when you succeed. That's why we're committed to sending you quality leads worth your time and money.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/role-dashboard', 6)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Start Winning Projects →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: Final tips to maximize your success.<br>
                <em>— The Digs & Gigs Team</em>
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `
    },
    
    // STEP 7: Final Summary & Next Steps
    7: {
      subject: `🎯 ${firstName}, You're Ready to Start Winning Projects`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">You're All Set!</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Here's everything you need to succeed</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                This is the last email in your welcome series. Here's a quick recap of everything you need to know:
              </p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 20px 0; color: #333;">📋 Quick Reference:</h3>
                
                <div style="border-bottom: 1px solid #e0e0e0; padding-bottom: 15px; margin-bottom: 15px;">
                  <p style="margin: 0;"><strong>How leads arrive:</strong> Directly to your inbox</p>
                </div>
                
                <div style="border-bottom: 1px solid #e0e0e0; padding-bottom: 15px; margin-bottom: 15px;">
                  <p style="margin: 0;"><strong>Lead pricing:</strong> 2% of budget (min $10, max $49)</p>
                </div>
                
                <div style="border-bottom: 1px solid #e0e0e0; padding-bottom: 15px; margin-bottom: 15px;">
                  <p style="margin: 0;"><strong>What you keep:</strong> 100% of your project earnings</p>
                </div>
                
                <div style="border-bottom: 1px solid #e0e0e0; padding-bottom: 15px; margin-bottom: 15px;">
                  <p style="margin: 0;"><strong>Bad leads:</strong> Full refund, no questions asked</p>
                </div>
                
                <div>
                  <p style="margin: 0;"><strong>Exclusive jobs:</strong> 3% referral fee (paid from client deposit)</p>
                </div>
              </div>
              
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 25px 0;">
                <h4 style="margin: 0 0 15px 0; color: #22c55e;">✅ Your Checklist:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Add hello@digsandgigs.net to your contacts</li>
                  <li style="margin-bottom: 8px;">Check spam/promotions folders for leads</li>
                  <li style="margin-bottom: 8px;">Respond quickly when you unlock a lead</li>
                  <li>Use our outreach template to win more jobs</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; margin: 25px 0;">
                Questions? Just reply to any of our emails. We're always here to help you succeed.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/role-dashboard', 7)}" style="display: inline-block; background: #22c55e; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">View Your Lead Dashboard →</a>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center; margin-top: 25px;">
                You've got this, ${firstName}! 🚀
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                We'll keep sending you leads as they come in.<br>
                <em>— The Digs & Gigs Team</em>
              </p>
              <p style="margin: 15px 0 0 0; color: #999; font-size: 12px;">
                <a href="${baseUrl}" style="color: #667eea; text-decoration: none;">Digs & Gigs</a> | 
                <a href="${baseUrl}/faq" style="color: #667eea; text-decoration: none;">FAQ</a> | 
                <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
              </p>
            </div>
          </body>
        </html>
      `
    }
  };
  
  return emails[step] || emails[1];
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, email, name, step = 1, diggerProfileId }: OnboardingEmailRequest = await req.json();

    if (!email || !userId) {
      throw new Error('Email and userId are required');
    }

    console.log(`Sending onboarding email step ${step} to:`, { email, name, userId });

    const firstName = name?.split(' ')[0] || 'there';
    const emailContent = getEmailContent(step, firstName, email);

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "Digs and Gigs <hello@digsandgigs.net>",
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log(`Onboarding email step ${step} sent successfully:`, emailResponse);

    // Update or create onboarding record
    const stepField = `step_${step}_sent_at`;
    
    // Check if record exists
    const { data: existingRecord } = await supabase
      .from('digger_onboarding_emails')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRecord) {
      // Update existing record
      await supabase
        .from('digger_onboarding_emails')
        .update({
          current_step: step,
          [stepField]: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed: step >= 7,
        })
        .eq('user_id', userId);
    } else {
      // Create new record
      await supabase
        .from('digger_onboarding_emails')
        .insert({
          user_id: userId,
          email: email,
          current_step: step,
          [stepField]: new Date().toISOString(),
          digger_profile_id: diggerProfileId,
          completed: step >= 7,
        });
    }

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending onboarding email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

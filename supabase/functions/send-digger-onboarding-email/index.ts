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

// Email templates for each step
const getEmailContent = (step: number, firstName: string, email: string) => {
  const baseUrl = 'https://digsandgigs.net';
  
  const emails: Record<number, { subject: string; html: string }> = {
    // STEP 1: Welcome (Value + Activation)
    1: {
      subject: `🎉 Welcome to Digs & Gigs, ${firstName}! Your Founder Journey Starts Now`,
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
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">You're one of the first 500 Founding Diggers 👑</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                <strong>Congratulations!</strong> You've just joined a freelance marketplace built differently — one where you keep 100% of what you earn, with no bidding wars, no commissions, and no racing to the bottom.
              </p>
              
              <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #667eea;">🎁 Your Founder Benefits (Locked In):</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;"><strong>$19/month subscription</strong> — locked for life</li>
                  <li style="margin-bottom: 8px;"><strong>$10 standard leads / $25 high-value leads</strong> — for your entire first year</li>
                  <li style="margin-bottom: 8px;"><strong>Priority ranking</strong> in client searches</li>
                  <li style="margin-bottom: 8px;"><strong>Founding Digger badge</strong> on your profile</li>
                  <li><strong>60 days free</strong> to try everything</li>
                </ul>
              </div>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                These are the lowest prices we will ever offer. New freelancers who join after the first 500 spots are filled won't get these rates.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/my-profiles', 1)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Complete Your Profile →</a>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Over the next few days, I'll send you everything you need to succeed on Digs & Gigs.
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
    
    // STEP 2: How Matching Works
    2: {
      subject: `🎯 How Digs & Gigs Finds You Clients (No Bidding Required)`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">How Matching Works</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Clients find you. You choose who to contact.</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                On most platforms, you're stuck in bidding wars, racing to submit the lowest price. Not here.
              </p>
              
              <h3 style="margin: 25px 0 15px 0; color: #333;">Here's how Digs & Gigs works:</h3>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 20px 0;">
                <div style="display: flex; margin-bottom: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px; font-weight: bold; flex-shrink: 0;">1</div>
                  <div style="margin-left: 15px;">
                    <p style="margin: 0 0 4px 0; font-weight: bold;">A client posts a project</p>
                    <p style="margin: 0; font-size: 14px; color: #666;">They describe what they need — design, development, marketing, whatever.</p>
                  </div>
                </div>
                
                <div style="display: flex; margin-bottom: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px; font-weight: bold; flex-shrink: 0;">2</div>
                  <div style="margin-left: 15px;">
                    <p style="margin: 0 0 4px 0; font-weight: bold;">We match them with freelancers like you</p>
                    <p style="margin: 0; font-size: 14px; color: #666;">Our system pairs projects with Diggers whose skills and categories match.</p>
                  </div>
                </div>
                
                <div style="display: flex; margin-bottom: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px; font-weight: bold; flex-shrink: 0;">3</div>
                  <div style="margin-left: 15px;">
                    <p style="margin: 0 0 4px 0; font-weight: bold;">You decide if you want to pursue it</p>
                    <p style="margin: 0; font-size: 14px; color: #666;">See project details, budget, and timeline — then choose whether to reveal the client's contact info.</p>
                  </div>
                </div>
                
                <div style="display: flex;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 36px; height: 36px; border-radius: 50%; text-align: center; line-height: 36px; font-weight: bold; flex-shrink: 0;">4</div>
                  <div style="margin-left: 15px;">
                    <p style="margin: 0 0 4px 0; font-weight: bold;">Connect, pitch, and win</p>
                    <p style="margin: 0; font-size: 14px; color: #666;">Reach out directly. No middleman. No commission on your earnings.</p>
                  </div>
                </div>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px;"><strong>💡 Pro Tip:</strong> The more complete your profile, the better your match quality. Add your portfolio, skills, and categories today.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/browse-gigs', 2)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Browse Available Projects →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: How lead pricing works (and why it's better than commissions).<br>
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
    
    // STEP 3: How Lead Pricing Works (Founders Edition)
    3: {
      subject: `💰 $10 Leads vs. 20% Commissions — Here's Why You'll Love This`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Lead Pricing Explained</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Why flat-rate beats commissions every time</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                Most freelance platforms take <strong>15-20% of every project</strong> you complete. Win a $5,000 job? Hand over $750-$1,000 to the platform.
              </p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                Digs & Gigs works differently. We never touch your earnings.
              </p>
              
              <h3 style="margin: 25px 0 15px 0; color: #333;">Your Founder Lead Pricing (First Year):</h3>
              
              <div style="display: flex; gap: 20px; margin: 20px 0;">
                <div style="flex: 1; background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="margin: 0 0 5px 0; font-size: 32px; font-weight: bold; color: #22c55e;">$10</p>
                  <p style="margin: 0; font-weight: bold;">Standard Leads</p>
                  <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">Design · Writing · Marketing · Video · Admin · General Freelance</p>
                </div>
                <div style="flex: 1; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center;">
                  <p style="margin: 0 0 5px 0; font-size: 32px; font-weight: bold; color: #f59e0b;">$25</p>
                  <p style="margin: 0; font-weight: bold;">High-Value Leads</p>
                  <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">Development · SEO · Consulting · Legal · Finance · Accounting</p>
                </div>
              </div>
              
              <h3 style="margin: 30px 0 15px 0; color: #333;">Let's Do the Math:</h3>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Scenario:</strong> You win a $3,000 project</p>
                <p style="margin: 0 0 5px 0;">❌ Other platforms: You keep $2,400 (they take $600)</p>
                <p style="margin: 0;">✅ Digs & Gigs: You keep <strong>$3,000</strong> (lead cost: $10-$25)</p>
              </div>
              
              <div style="background: #f0f9ff; border-left: 4px solid #667eea; padding: 15px 20px; margin: 25px 0;">
                <p style="margin: 0;"><strong>🔒 Founder Guarantee:</strong> These lead prices are locked for your entire first year. After that, pricing may adjust — but as a Founder, you'll always get better rates than new members.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/pricing', 3)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">See Full Pricing Details →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: How to build a profile that wins clients.<br>
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
    
    // STEP 4: Build a High-Converting Profile
    4: {
      subject: `✨ 5 Profile Tweaks That Get You More Clients`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Build a Winning Profile</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">5 things top freelancers always do</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                Your profile is your storefront. Here's what separates freelancers who get hired from those who don't:
              </p>
              
              <div style="margin: 25px 0;">
                <div style="border-bottom: 1px solid #e0e0e0; padding: 15px 0;">
                  <p style="margin: 0 0 5px 0;"><strong>1. Use a professional photo</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #666;">Profiles with photos get 3x more responses. Use a clear headshot with good lighting.</p>
                </div>
                
                <div style="border-bottom: 1px solid #e0e0e0; padding: 15px 0;">
                  <p style="margin: 0 0 5px 0;"><strong>2. Write a benefit-focused headline</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #666;">Not "Web Developer" — try "I Build Websites That Convert Visitors Into Customers"</p>
                </div>
                
                <div style="border-bottom: 1px solid #e0e0e0; padding: 15px 0;">
                  <p style="margin: 0 0 5px 0;"><strong>3. Show your best work first</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #666;">Upload 3-5 portfolio pieces that represent the work you want more of.</p>
                </div>
                
                <div style="border-bottom: 1px solid #e0e0e0; padding: 15px 0;">
                  <p style="margin: 0 0 5px 0;"><strong>4. Be specific about what you do</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #666;">"I help e-commerce brands increase sales with email marketing" beats "Marketing expert"</p>
                </div>
                
                <div style="padding: 15px 0;">
                  <p style="margin: 0 0 5px 0;"><strong>5. Add all relevant categories</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #666;">More categories = more matches. Don't limit yourself to just one skill.</p>
                </div>
              </div>
              
              <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-size: 24px;">👑</p>
                <p style="margin: 0; font-size: 14px;"><strong>Founder Perk:</strong> Your "Founding Digger" badge automatically appears on your profile, building instant trust with clients.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/my-profiles', 4)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Optimize Your Profile Now →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: How to write proposals that win clients.<br>
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
    
    // STEP 5: How to Win Clients on Digs & Gigs
    5: {
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
                You found a project that's perfect for you. You revealed the client's contact info. Now what?
              </p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                Here's the outreach formula our most successful Diggers use:
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
                <a href="${addUTM(baseUrl + '/browse-gigs', 5)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Find Projects to Pitch →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: How to stand out even more with Boosted Profiles.<br>
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
    
    // STEP 6: Upsell - Boosted Profile & Featured Badge
    6: {
      subject: `⚡ Want to Show Up First in Client Searches?`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Get Seen First</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Optional add-ons for freelancers who want more visibility</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                As a Founding Digger, you already get priority ranking. But if you want even more visibility, we offer optional add-ons:
              </p>
              
              <div style="border: 2px solid #667eea; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; color: #667eea;">⚡ Boosted Profile — $20/month</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                  Appear at the top of search results in your categories. Clients see you first.
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Top placement in category searches</li>
                  <li>Highlighted listing</li>
                  <li>Average 2.5x more profile views</li>
                </ul>
              </div>
              
              <div style="border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; color: #f59e0b;">⭐ Featured Digger Badge — $10/month</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                  A visual badge that increases trust and click-through rates.
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>"Featured" badge on your profile</li>
                  <li>Signals quality and commitment</li>
                  <li>Average 35% higher response rate</li>
                </ul>
              </div>
              
              <div style="border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 10px 0; color: #22c55e;">🏆 Category Dominance — $49/month</h3>
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666;">
                  Be showcased as a top expert in your chosen category.
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Featured in category spotlight section</li>
                  <li>"Top Expert" designation</li>
                  <li>Maximum visibility for serious freelancers</li>
                </ul>
              </div>
              
              <div style="background: #f0f9ff; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px;"><strong>Note:</strong> These are 100% optional. Your Founder benefits already give you a competitive edge.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/pricing', 6)}" style="display: inline-block; background: #22c55e; color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Explore Add-Ons →</a>
              </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                Tomorrow: Important reminder about your Founder benefits.<br>
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
    
    // STEP 7: Urgency - Your Founders Benefits Start Now
    7: {
      subject: `⏰ ${firstName}, Your 60-Day Free Trial Has Started — Here's What Happens Next`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
            
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Your Founder Clock is Ticking</h1>
              <p style="margin: 0; font-size: 16px; opacity: 0.9;">Important: What happens after 60 days</p>
            </div>
            
            <div style="padding: 30px; background: #ffffff;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">Hey ${firstName},</p>
              
              <p style="font-size: 16px; margin: 0 0 20px 0;">
                This is the last email in your welcome series, and it's an important one.
              </p>
              
              <p style="font-size: 16px; margin: 0 0 25px 0;">
                <strong>Your 60-day free trial started when you signed up.</strong> Here's what you need to know:
              </p>
              
              <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #dc2626;">⚠️ If You Don't Complete Your Profile:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">You won't receive project matches</li>
                  <li style="margin-bottom: 8px;">Clients won't be able to find you</li>
                  <li>Your 60 days will pass without results</li>
                </ul>
              </div>
              
              <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #22c55e;">✅ What to Do Right Now:</h3>
                <ol style="margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;"><strong>Complete your profile</strong> (takes 10 minutes)</li>
                  <li style="margin-bottom: 8px;"><strong>Add your categories & skills</strong></li>
                  <li style="margin-bottom: 8px;"><strong>Upload portfolio samples</strong></li>
                  <li><strong>Start browsing projects</strong> — and reveal your first lead</li>
                </ol>
              </div>
              
              <h3 style="margin: 30px 0 15px 0; color: #333;">Your Founder Benefits (Reminder):</h3>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;">👑 <strong>$19/month subscription</strong> — locked for life</p>
                <p style="margin: 0 0 8px 0;">💰 <strong>$10/$25 leads</strong> — guaranteed for 12 months</p>
                <p style="margin: 0 0 8px 0;">🎖️ <strong>Founding Digger badge</strong> — permanent</p>
                <p style="margin: 0;">⬆️ <strong>Priority ranking</strong> — always</p>
              </div>
              
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px;"><strong>⚠️ Important:</strong> If you cancel or let your subscription lapse, you permanently lose the $19/month lifetime guarantee. You won't get it back.</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${addUTM(baseUrl + '/my-profiles', 7)}" style="display: inline-block; background: #dc2626; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">Complete Your Profile Now →</a>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center; margin-top: 25px;">
                Questions? Just reply to this email. We're here to help you succeed.
              </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                You've got this, ${firstName}!<br>
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
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingRecord) {
      // Update existing record
      const updateData: Record<string, any> = {
        [stepField]: new Date().toISOString(),
        current_step: step,
        updated_at: new Date().toISOString(),
      };
      
      if (step === 7) {
        updateData.completed = true;
      }

      await supabase
        .from('digger_onboarding_emails')
        .update(updateData)
        .eq('id', existingRecord.id);
    } else {
      // Create new record
      const insertData: Record<string, any> = {
        user_id: userId,
        email: email,
        digger_profile_id: diggerProfileId,
        current_step: step,
        [stepField]: new Date().toISOString(),
        completed: step === 7,
      };

      await supabase
        .from('digger_onboarding_emails')
        .insert(insertData);
    }

    // Also log to marketing_email_log
    await supabase
      .from('marketing_email_log')
      .insert({
        email,
        email_type: 'onboarding',
        campaign_name: `digger_onboarding_step_${step}`,
        user_id: userId,
        reason: `onboarding_step_${step}`,
      });

    return new Response(JSON.stringify({ 
      success: true, 
      step,
      emailResponse 
    }), {
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

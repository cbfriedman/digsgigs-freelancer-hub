import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Extract and verify authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.error('Invalid authentication token:', userError);
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { gigId, diggerId, gigTitle, tier, isOldLead } = await req.json();

    if (!gigId || !diggerId) {
      throw new Error('Missing required parameters');
    }

    // SECURITY: Verify diggerId belongs to authenticated user and get hourly rate
    const { data: diggerProfile, error: profileError } = await supabaseClient
      .from('digger_profiles')
      .select('id, user_id, hourly_rate, hourly_rate_min')
      .eq('id', diggerId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !diggerProfile) {
      console.error('Unauthorized: Digger profile does not belong to user', { userId: user.id, diggerId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Digger profile does not belong to user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authorization verified:', { userId: user.id, diggerId, gigId });

    // Calculate lead cost based on hourly rate or tier
    let leadCost = 3; // Default: free tier
    let leadDescription = '';
    
    // Calculate average hourly rate and apply tier multiplier
    const hourlyMin = diggerProfile.hourly_rate_min || 0;
    const hourlyMax = diggerProfile.hourly_rate_max || 0;
    const averageRate = (hourlyMin + hourlyMax) / 2;
    
    if (averageRate > 0) {
      const tier = diggerProfile.subscription_tier || 'free';
      const multipliers: Record<string, number> = { free: 3, pro: 2, premium: 1 };
      const multiplier = multipliers[tier] || 3;
      const hourlyCharge = averageRate * multiplier;
      leadCost = Math.max(100, hourlyCharge);
      leadDescription = `${multiplier} hours at $${averageRate.toFixed(2)}/hr (min $100)`;
      console.log('Hourly rate lead cost calculated:', { averageRate, multiplier, hourlyCharge, leadCost });
    } else if (isOldLead) {
      // Old leads (>24h) are always $1
      leadCost = 1;
      leadDescription = 'Old lead special';
    } else if (tier === 'premium') {
      leadCost = 0;
      leadDescription = 'Premium tier';
    } else if (tier === 'pro') {
      leadCost = 2;
      leadDescription = 'Pro tier';
    } else {
      leadDescription = 'Free tier';
    }

    // If lead is free for premium users, skip Stripe
    if (leadCost === 0) {
      return new Response(
        JSON.stringify({ 
          sessionId: null, 
          url: null, 
          leadCost: 0,
          message: 'Free lead for premium users'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Lead Purchase: ${gigTitle}`,
              description: `Access to client contact - ${leadDescription} ($${leadCost})`,
            },
            unit_amount: Math.round(leadCost * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/gig/${gigId}?payment=success`,
      cancel_url: `${req.headers.get('origin')}/gig/${gigId}?payment=cancelled`,
      metadata: {
        gigId,
        diggerId,
        amount: leadCost.toString(),
        tier,
        isOldLead: isOldLead ? 'true' : 'false',
      },
    });

    console.log('Checkout session created:', { sessionId: session.id, userId: user.id, gigId, diggerId });

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

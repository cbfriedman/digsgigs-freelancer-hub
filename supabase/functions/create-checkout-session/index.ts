import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { gigId, diggerId, gigTitle, tier } = await req.json();

    if (!gigId || !diggerId) {
      throw new Error('Missing required parameters');
    }

    // Calculate lead cost based on digger's tier
    let leadCost = 3; // Default: free tier
    if (tier === 'premium') {
      leadCost = 0;
    } else if (tier === 'pro') {
      leadCost = 2;
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
              description: `Access to client contact information - ${tier} tier ($${leadCost})`,
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
      },
    });

    console.log('Checkout session created:', session.id);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-PAYMENT-METHODS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    logStep("Function started", { method: req.method });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;
    
    if (customers.data.length === 0) {
      logStep("Creating new Stripe customer");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    } else {
      customerId = customers.data[0].id;
    }

    logStep("Using Stripe customer", { customerId });

    if (req.method === 'GET') {
      // List payment methods: card and us_bank_account
      logStep("Listing payment methods");
      const [cardsRes, bankRes] = await Promise.all([
        stripe.paymentMethods.list({ customer: customerId, type: 'card' }),
        stripe.paymentMethods.list({ customer: customerId, type: 'us_bank_account' }),
      ]);
      const allPms = [...cardsRes.data, ...bankRes.data];

      const dbPaymentMethods: any[] = [];
      for (const pm of allPms) {
        const { data: existing } = await supabaseAdmin
          .from('payment_methods')
          .select('id, is_default')
          .eq('stripe_payment_method_id', pm.id)
          .single();

        if (pm.type === 'card' && pm.card) {
          if (!existing) {
            await supabaseAdmin.from('payment_methods').insert({
              user_id: user.id,
              stripe_payment_method_id: pm.id,
              stripe_customer_id: customerId,
              type: 'card',
              card_brand: pm.card.brand,
              card_last4: pm.card.last4,
              card_exp_month: pm.card.exp_month,
              card_exp_year: pm.card.exp_year,
              is_default: false,
            });
          }
          dbPaymentMethods.push({
            id: pm.id,
            type: 'card',
            card: {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            },
            us_bank_account: undefined,
            is_default: existing?.is_default ?? false,
            created: pm.created,
          });
        } else if (pm.type === 'us_bank_account' && pm.us_bank_account) {
          if (!existing) {
            await supabaseAdmin.from('payment_methods').insert({
              user_id: user.id,
              stripe_payment_method_id: pm.id,
              stripe_customer_id: customerId,
              type: 'us_bank_account',
              card_brand: null,
              card_last4: pm.us_bank_account.last4 ?? null,
              card_exp_month: null,
              card_exp_year: null,
              is_default: false,
            });
          }
          dbPaymentMethods.push({
            id: pm.id,
            type: 'us_bank_account',
            card: undefined,
            us_bank_account: {
              bank_name: pm.us_bank_account.bank_name ?? null,
              last4: pm.us_bank_account.last4 ?? null,
            },
            is_default: existing?.is_default ?? false,
            created: pm.created,
          });
        }
      }

      // Keep profile.payment_verified in sync (so admin and others see correct status)
      if (allPms.length > 0) {
        await supabaseAdmin.from('profiles').update({ payment_verified: true }).eq('id', user.id);
      }

      return new Response(
        JSON.stringify({ paymentMethods: dbPaymentMethods }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (req.method === 'POST') {
      // Save payment method from Setup Intent
      const { setupIntentId, paymentMethodId } = await req.json();

      if (!setupIntentId || !paymentMethodId) {
        throw new Error('Missing setupIntentId or paymentMethodId');
      }

      logStep("Saving payment method", { setupIntentId, paymentMethodId });

      // Retrieve the setup intent to verify it's completed
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      if (setupIntent.status !== 'succeeded') {
        throw new Error('Setup Intent not completed');
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Get payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      const pmType = paymentMethod.type;
      if (pmType !== 'card' && pmType !== 'us_bank_account') {
        throw new Error('Unsupported payment method type');
      }

      const { data: existingMethods } = await supabaseAdmin
        .from('payment_methods')
        .select('id')
        .eq('user_id', user.id);
      const isDefault = !existingMethods || existingMethods.length === 0;

      if (isDefault) {
        await supabaseAdmin
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const insertRow: Record<string, unknown> = {
        user_id: user.id,
        stripe_payment_method_id: paymentMethodId,
        stripe_customer_id: customerId,
        type: pmType,
        is_default: isDefault,
      };
      if (pmType === 'card' && paymentMethod.card) {
        insertRow.card_brand = paymentMethod.card.brand;
        insertRow.card_last4 = paymentMethod.card.last4;
        insertRow.card_exp_month = paymentMethod.card.exp_month;
        insertRow.card_exp_year = paymentMethod.card.exp_year;
      } else if (pmType === 'us_bank_account' && paymentMethod.us_bank_account) {
        insertRow.card_brand = null;
        insertRow.card_last4 = paymentMethod.us_bank_account.last4 ?? null;
        insertRow.card_exp_month = null;
        insertRow.card_exp_year = null;
      }

      const { error: dbError } = await supabaseAdmin
        .from('payment_methods')
        .insert(insertRow);

      if (dbError) {
        logStep("Database error", { error: dbError });
        throw new Error(`Failed to save payment method: ${dbError.message}`);
      }

      await supabaseAdmin.from('profiles').update({ payment_verified: true }).eq('id', user.id);
      logStep("Payment method saved", { paymentMethodId });

      const responsePayload: Record<string, unknown> = {
        success: true,
        paymentMethod: {
          id: paymentMethodId,
          type: pmType,
          is_default: isDefault,
        },
      };
      if (pmType === 'card' && paymentMethod.card) {
        (responsePayload.paymentMethod as any).card = {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        };
      } else if (pmType === 'us_bank_account' && paymentMethod.us_bank_account) {
        (responsePayload.paymentMethod as any).us_bank_account = {
          bank_name: paymentMethod.us_bank_account.bank_name ?? null,
          last4: paymentMethod.us_bank_account.last4 ?? null,
        };
      }

      return new Response(
        JSON.stringify(responsePayload),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (req.method === 'DELETE') {
      // Delete payment method
      const { paymentMethodId } = await req.json();

      if (!paymentMethodId) {
        throw new Error('Missing paymentMethodId');
      }

      logStep("Deleting payment method", { paymentMethodId });

      // Verify user owns this payment method
      const { data: pmRecord } = await supabaseAdmin
        .from('payment_methods')
        .select('id, is_default')
        .eq('stripe_payment_method_id', paymentMethodId)
        .eq('user_id', user.id)
        .single();

      if (!pmRecord) {
        throw new Error('Payment method not found or unauthorized');
      }

      // Detach from Stripe customer
      await stripe.paymentMethods.detach(paymentMethodId);

      // Delete from database
      await supabaseAdmin
        .from('payment_methods')
        .delete()
        .eq('stripe_payment_method_id', paymentMethodId);

      // If no payment methods left, clear payment_verified on profile
      const { count } = await supabaseAdmin
        .from('payment_methods')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if (count === 0) {
        await supabaseAdmin.from('profiles').update({ payment_verified: false }).eq('id', user.id);
      }

      // If this was the default, set another one as default
      if (pmRecord.is_default) {
        const { data: otherMethods } = await supabaseAdmin
          .from('payment_methods')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (otherMethods && otherMethods.length > 0) {
          await supabaseAdmin
            .from('payment_methods')
            .update({ is_default: true })
            .eq('id', otherMethods[0].id);
        }
      }

      logStep("Payment method deleted", { paymentMethodId });

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (req.method === 'PATCH') {
      // Update payment method (set as default)
      const { paymentMethodId, isDefault } = await req.json();

      if (!paymentMethodId || typeof isDefault !== 'boolean') {
        throw new Error('Missing paymentMethodId or isDefault');
      }

      logStep("Updating payment method", { paymentMethodId, isDefault });

      // Verify user owns this payment method
      const { data: pmRecord } = await supabaseAdmin
        .from('payment_methods')
        .select('id')
        .eq('stripe_payment_method_id', paymentMethodId)
        .eq('user_id', user.id)
        .single();

      if (!pmRecord) {
        throw new Error('Payment method not found or unauthorized');
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await supabaseAdmin
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('stripe_payment_method_id', paymentMethodId);
      }

      // Update this payment method
      await supabaseAdmin
        .from('payment_methods')
        .update({ is_default: isDefault })
        .eq('stripe_payment_method_id', paymentMethodId);

      logStep("Payment method updated", { paymentMethodId, isDefault });

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Method not allowed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

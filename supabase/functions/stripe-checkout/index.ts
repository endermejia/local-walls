import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { area_id } = await req.json();

    // 1. Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    // 2. Get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // 3. Get area info
    const { data: area, error: areaError } = await supabaseClient
      .from('areas')
      .select('id, name, price, stripe_account_id')
      .eq('id', area_id)
      .single();

    if (areaError || !area) throw new Error('Area not found');
    if (!area.price || area.price <= 0)
      throw new Error('Area is free or price not set');

    // 4. Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const origin = req.headers.get('origin');

    // 5. Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Topo: ${area.name}`,
            },
            unit_amount: Math.round(area.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/area/redirect?session_id={CHECKOUT_SESSION_ID}&area_id=${area.id}`,
      cancel_url: `${origin}/area/redirect?cancel=true&area_id=${area.id}`,
      customer_email: user.email,
      metadata: {
        area_id: area.id.toString(),
        user_id: user.id,
      },
    };

    // Add transfer_data if stripe_account_id is present (Stripe Connect)
    if (area.stripe_account_id) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: 0, // We take no fee for now, or we could take one.
        transfer_data: {
          destination: area.stripe_account_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

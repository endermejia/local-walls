import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'https://climbeast.com',
  'https://www.climbeast.com',
  'https://local-walls.vercel.app',
];

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const corsHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (ALLOWED_ORIGINS.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    corsHeaders['Access-Control-Allow-Headers'] =
      'authorization, x-client-info, apikey, content-type';
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!corsHeaders['Access-Control-Allow-Origin']) {
      throw new Error(`Origin ${origin} not allowed`);
    }

    const { area_id } = await req.json();
    if (!area_id) throw new Error('area_id is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization')!;

    // Cliente para verificar al usuario
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Cliente admin para leer el área (evitamos problemas de RLS aquí)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: area, error: areaError } = await supabaseAdmin
      .from('areas')
      .select('id, name, price, stripe_account_id')
      .eq('id', area_id)
      .single();

    if (areaError || !area) throw new Error(`Area not found (ID: ${area_id})`);
    if (!area.price || area.price <= 0)
      throw new Error('Area price is not set or invalid');
    if (area.price < 0.5)
      throw new Error('Area price must be at least €0.50 (Stripe minimum)');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: `Croquis: ${area.name}` },
            unit_amount: Math.round(area.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/area/redirect?session_id={CHECKOUT_SESSION_ID}&area_id=${area.id}`,
      cancel_url: `${origin}/area/redirect?cancel=true&area_id=${area.id}`,
      customer_email: user.email,
      metadata: { area_id: area.id.toString(), user_id: user.id },
    };

    if (area.stripe_account_id) {
      sessionConfig.payment_intent_data = {
        transfer_data: { destination: area.stripe_account_id },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return new Response(JSON.stringify({ url: session.url }), {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error('[stripe-checkout] error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: corsHeaders,
      status: 400,
    });
  }
});

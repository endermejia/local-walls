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

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    // 1. Obtener área
    const { data: area, error: areaError } = await supabaseAdmin
      .from('areas')
      .select('id, name, stripe_account_id')
      .eq('id', area_id)
      .single();

    if (areaError || !area) throw new Error('Area not found');

    // 2. Verificar permisos
    const { data: isAdmin } = await supabaseAdmin
      .from('area_admins')
      .select('id')
      .eq('area_id', area_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!isAdmin && !profile?.is_admin) {
      throw new Error('No tienes permisos de administrador para esta área');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let stripeAccountId = area.stripe_account_id;
    const { stripe_account_id: forcedAccountId, force_new } = await req
      .json()
      .catch(() => ({}));

    // 2.5 Si la zona no tiene cuenta y no se ha forzado una, buscamos si tiene en otras
    if (!stripeAccountId && !forcedAccountId && !force_new) {
      const { data: otherAdminAreas } = await supabaseAdmin
        .from('area_admins')
        .select('id, area:areas(id, name, stripe_account_id)')
        .eq('user_id', user.id)
        .not('area.stripe_account_id', 'is', null);

      const accounts = (otherAdminAreas || [])
        .map((a) => a.area as any)
        .filter(
          (a, index, self) =>
            a &&
            index ===
              self.findIndex(
                (t) => t.stripe_account_id === a.stripe_account_id,
              ),
        );

      if (accounts.length > 0) {
        return new Response(
          JSON.stringify({ status: 'multiple_accounts', accounts }),
          { headers: corsHeaders, status: 200 },
        );
      }
    }

    if (forcedAccountId) {
      stripeAccountId = forcedAccountId;
    }

    // 3. Verificar si la cuenta existe en Stripe
    if (stripeAccountId) {
      try {
        await stripe.accounts.retrieve(stripeAccountId);
        console.log(
          '[stripe-onboarding] Cuenta de Stripe válida encontrada:',
          stripeAccountId,
        );
      } catch (err) {
        // Si Stripe dice que no existe (error 400), la marcamos como nula para crear una nueva
        if (
          err.raw?.code === 'resource_missing' ||
          err.message.includes('No such account')
        ) {
          console.warn(
            '[stripe-onboarding] La cuenta guardada ya no existe en Stripe, creando una nueva.',
          );
          stripeAccountId = null;
        } else {
          // Si es otro tipo de error de Stripe, sí lanzamos el error
          throw err;
        }
      }
    }

    // 4. Crear cuenta si no existe (o si la anterior ya no era válida)
    if (!stripeAccountId) {
      console.log(
        '[stripe-onboarding] Creating new stripe account for area: ',
        area.name,
      );
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: `Monetización: ${area.name}`,
          product_description: `Croquis de escalada de la zona ${area.name}`,
        },
        metadata: { area_id: area_id.toString(), user_id: user.id },
      });
      stripeAccountId = account.id;

      await supabaseAdmin
        .from('areas')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', area_id);
    }

    // 5. Crear link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/area/redirect?onboarding_refresh=true&area_id=${area_id}`,
      return_url: `${origin}/area/redirect?onboarding_success=true&area_id=${area_id}`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: stripeAccountId }),
      {
        headers: corsHeaders,
        status: 200,
      },
    );
  } catch (error) {
    console.error('[stripe-onboarding] error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: corsHeaders,
      status: 400,
    });
  }
});

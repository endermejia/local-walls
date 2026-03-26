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

    // 3. Get area info and check admin permissions
    // Using admin client to query permissions as RLS might be complex
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: area, error: areaError } = await supabaseAdmin
      .from('areas')
      .select('id, name, stripe_account_id')
      .eq('id', area_id)
      .single();

    if (areaError || !area) throw new Error('Area not found');

    // 4. Permission Check: Only Area Admins or Global Admins
    const { data: isAdmin, error: adminError } = await supabaseAdmin
      .from('area_admins')
      .select('id')
      .eq('area_id', area_id)
      .eq('user_id', user.id)
      .maybeSingle();

    // Check if user is global admin (you might have a different way to check this)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!isAdmin && !profile?.is_admin) {
      throw new Error(
        'You do not have permission to manage payments for this area',
      );
    }

    // 5. Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const origin = req.headers.get('origin');
    let stripeAccountId = area.stripe_account_id;

    // 6. Create Connected Account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: `Monetization: ${area.name}`,
          product_description: `Croquis de escalada de la zona ${area.name}`,
        },
        metadata: {
          area_id: area_id.toString(),
          user_id: user.id,
        },
      });
      stripeAccountId = account.id;

      // Save ID immediately in areas table
      const { error: updateError } = await supabaseAdmin
        .from('areas')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', area_id);

      if (updateError) throw updateError;
    }

    // 7. Create Account Link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/area/redirect?onboarding_refresh=true&area_id=${area_id}`,
      return_url: `${origin}/area/redirect?onboarding_success=true&area_id=${area_id}`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: stripeAccountId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('[stripe-onboarding] error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

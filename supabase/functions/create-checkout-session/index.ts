import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { items, shipping_info } = await req.json();
    if (!items || items.length === 0) throw new Error('No items in cart');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 1. Create order in database (pending)
    const total_amount = items.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0,
    );

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        total_amount,
        currency: 'eur',
        shipping_name: shipping_info.name,
        shipping_address: shipping_info.address,
        shipping_city: shipping_info.city,
        shipping_zip: shipping_info.zip,
        shipping_country: shipping_info.country,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      item_type: item.type,
      item_id: item.id, // For merchandise/packs
      item_numeric_id: item.numericId || null, // For areas
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: itemsError } = await supabaseClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // 3. Create Stripe line items
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
          metadata: {
            item_id: item.id,
            item_type: item.type,
          },
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/merchandising/checkout`,
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: {
        order_id: order.id,
      },
    });

    // 5. Update order with session id
    await supabaseClient
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id);

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

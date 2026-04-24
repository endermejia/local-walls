import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, ngsw-bypass',
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

    const body = await req.json();
    const items = body.items;
    const shipping_info = body.shipping_info || body.shippingInfo;

    if (!items || items.length === 0) throw new Error('No items in cart');
    if (!shipping_info) throw new Error('Shipping info is required');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Fetch item details (names, prices) from DB for security and completeness
    const enrichedItems = [];
    for (const item of items) {
      let detail;
      if (item.type === 'merchandise') {
        const { data } = await supabaseAdmin
          .from('merchandise_items')
          .select('name, price, image_urls')
          .eq('id', item.id)
          .single();
        detail = data;
      } else if (item.type === 'area_pack') {
        const { data } = await supabaseAdmin
          .from('area_packs')
          .select('name, price, image_urls')
          .eq('id', item.id)
          .single();
        detail = data;
      } else if (item.type === 'area') {
        const { data } = await supabaseAdmin
          .from('areas')
          .select('name, price')
          .eq('id', item.id || item.numericId)
          .single();
        detail = data;
      }

      if (!detail) throw new Error(`Item not found: ${item.id} (${item.type})`);

      enrichedItems.push({
        ...item,
        name: detail.name,
        price: detail.price,
        image_url: (detail as any).image_urls?.[0] || null,
      });
    }

    // 2. Create order in database (pending)
    const total_amount = enrichedItems.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0,
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        total_amount,
        currency: 'eur',
        shipping_name: shipping_info.name,
        shipping_phone: shipping_info.phone,
        shipping_address: shipping_info.address,
        shipping_city: shipping_info.city,
        shipping_zip: shipping_info.zip,
        shipping_country: shipping_info.country,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Create order items
    const orderItems = enrichedItems.map((item: any) => ({
      order_id: order.id,
      item_type: item.type,
      item_id: item.type === 'area' ? null : item.id,
      item_numeric_id: item.type === 'area' ? item.id || item.numericId : null,
      quantity: item.quantity,
      unit_price: item.price,
      selected_size: item.selectedSize || null,
      selected_color: item.selectedColor || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // 4. Create Stripe line items
    const line_items = enrichedItems.map((item: any) => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          images: item.image_url ? [item.image_url] : [],
          metadata: {
            item_id: item.id?.toString(),
            item_type: item.type,
          },
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url:
        body.success_url ||
        `${req.headers.get('origin')}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        body.cancel_url ||
        `${req.headers.get('origin')}/merchandising/checkout`,
      customer_email: user.email,
      client_reference_id: order.id,
      metadata: {
        order_id: order.id,
      },
    });

    // 6. Update order with session id
    await supabaseAdmin
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) throw new Error('Missing stripe-signature');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Case 1: Shop Order (contains shipping_name in metadata)
      if (session.metadata?.shipping_name) {
        const userId = session.metadata.user_id;

        // Fetch line items to reconstruct order_items
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          {
            expand: ['data.price.product'],
          },
        );

        // Create the order
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .insert({
            user_id: userId,
            status: 'paid',
            total_amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'eur',
            shipping_name: session.metadata.shipping_name,
            shipping_phone: session.metadata.shipping_phone,
            shipping_address: session.metadata.shipping_address,
            shipping_city: session.metadata.shipping_city,
            shipping_zip: session.metadata.shipping_zip,
            shipping_country: session.metadata.shipping_country,
            stripe_session_id: session.id,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = lineItems.data.map((item) => {
          const product = item.price?.product as Stripe.Product;
          const metadata = product.metadata;

          return {
            order_id: order.id,
            item_type: metadata.item_type,
            item_id: metadata.item_type === 'area' ? null : metadata.item_id,
            item_numeric_id:
              metadata.item_type === 'area' ? parseInt(metadata.item_id) : null,
            quantity: item.quantity || 1,
            unit_price: metadata.unit_price
              ? parseFloat(metadata.unit_price)
              : item.price?.unit_amount
                ? item.price.unit_amount / 100
                : 0,
            selected_size: metadata.selected_size || null,
            selected_color: metadata.selected_color || null,
          };
        });

        const { error: itemsError } = await supabaseAdmin
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Register area purchases if needed
        for (const item of orderItems) {
          if (item.item_type === 'area' || item.item_type === 'area_pack') {
            await supabaseAdmin.from('area_purchases').insert({
              user_id: userId,
              area_id:
                item.item_type === 'area' ? item.item_numeric_id : item.item_id,
              amount: item.unit_price * item.quantity,
              stripe_session_id: session.id,
            });
          }
        }
      }
      // Case 2: Legacy Single Area Purchase (Old Checkout)
      else if (session.metadata?.area_id && session.metadata?.user_id) {
        const area_id = session.metadata.area_id;
        const user_id = session.metadata.user_id;
        const amount = session.amount_total ? session.amount_total / 100 : 0;

        await supabaseAdmin.from('area_purchases').insert({
          user_id: user_id,
          area_id: parseInt(area_id),
          amount: amount,
          stripe_session_id: session.id,
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

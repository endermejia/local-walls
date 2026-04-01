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

      // Case 1: General Shop Order
      const orderId = session.metadata?.order_id;
      if (orderId) {
        // Update order status
        const { data: order, error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', orderId)
          .select('*, order_items(*)')
          .single();

        if (updateError) throw updateError;

        // If order contains area packs or areas, register them
        for (const item of order.order_items) {
          if (item.item_type === 'area' || item.item_type === 'area_pack') {
            // Logic to register purchase in area_purchases if needed
            // For area packs, we might need a separate table or just add to area_purchases multiple times
            await supabaseAdmin.from('area_purchases').insert({
              user_id: order.user_id,
              area_id: item.item_id, // For pack, this might be a pack ID, handle accordingly
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

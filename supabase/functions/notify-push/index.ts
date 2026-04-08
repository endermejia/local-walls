import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import webpush from 'https://esm.sh/web-push@3.6.4';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

serve(async (req) => {
  try {
    const { record } = await req.json();
    console.log('Notification received:', record);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch recipient subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', record.user_id);

    if (error) throw error;

    console.log(`Sending to ${subscriptions?.length || 0} subscriptions`);

    const payload = JSON.stringify({
      notification: {
        title: 'ClimBeast',
        body: record.content || 'Nueva notificación',
        icon: '/icons/icon-192x192.png',
        data: {
          url: record.url || '/',
        },
      },
    });

    const results = await Promise.allSettled(
      (subscriptions || []).map((sub) =>
        webpush.sendNotification(sub.subscription, payload),
      ),
    );

    // Cleanup invalid subscriptions
    const invalidSubs = results
      .map((res, i) =>
        res.status === 'rejected' && res.reason.statusCode === 410
          ? subscriptions[i].subscription
          : null,
      )
      .filter(Boolean);

    if (invalidSubs.length > 0) {
      console.log(`Cleaning up ${invalidSubs.length} invalid subscriptions`);
      // Add logic to delete if needed, but for now we just log
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error sending push:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

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
      .select(
        'subscription, users:user_profiles!push_subscriptions_user_id_fkey(notification_sound, message_sound)',
      )
      .eq('user_id', record.user_id);

    if (error) throw error;

    console.log(`Sending to ${subscriptions?.length || 0} subscriptions`);

    let body = 'Nueva notificación';
    switch (record.type) {
      case 'like':
        body = 'A alguien le ha gustado tu ascensión';
        break;
      case 'comment':
        body = 'Alguien ha comentado tu ascensión';
        break;
      case 'mention':
        body = 'Te han mencionado en un comentario';
        break;
      case 'likedComment':
      case 'liked_comment':
        body = 'A alguien le ha gustado tu comentario';
        break;
      case 'message':
        body = 'Has recibido un nuevo mensaje';
        break;
      case 'follow_request':
        body = 'Has recibido una solicitud de seguimiento';
        break;
      case 'follow_accepted':
        body = 'Han aceptado tu solicitud de seguimiento';
        break;
    }

    const results = await Promise.allSettled(
      (subscriptions || []).map((sub) => {
        let soundEnabled = false;

        // Handle array or object from join
        const users = sub.users;
        const userProfile = Array.isArray(users) ? users[0] : users;

        if (userProfile) {
          if (record.type === 'message') {
            soundEnabled = userProfile.message_sound !== false;
          } else {
            soundEnabled = userProfile.notification_sound !== false;
          }
        } else {
          // default to true if we cant find the profile setting
          soundEnabled = true;
        }

        const payload = JSON.stringify({
          notification: {
            title: 'ClimBeast',
            body: body,
            icon: 'https://climbeast.com/logo/android-chrome-192x192.png',
            badge: 'https://climbeast.com/logo/favicon-32x32.png',
            vibrate: [200, 100, 200],
            tag: `cb-notif-${record.type}-${Date.now()}`,
            renotify: true,
            data: {
              url: '/',
            },
          },
        });

        // CONFIGURACIÓN CRÍTICA PARA SONIDO DE SISTEMA
        const pushOptions = {
          TTL: 86400, // Tiempo de vida en segundos
          urgency: 'high', // Esto le dice a Android: "Despierta y haz ruido"
        };

        return webpush.sendNotification(sub.subscription, payload, pushOptions);
      }),
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

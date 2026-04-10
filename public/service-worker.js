importScripts("./ngsw-worker.js");

self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push Received.", event);

  if (!event.data) {
    console.log("[ServiceWorker] Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("[ServiceWorker] Push data:", JSON.stringify(data));

    // Handle nested payload from Edge Function: { data: { notification: { ... } } }
    // Or standard: { notification: { ... } }
    let notif =
      data.notification || (data.data && data.data.notification) || data;

    // In some cases, 'data' might be the actual notification if not wrapped at all
    if (!notif.title && data.title) notif = data;

    const title = notif.title || "ClimBeast";
    const body = notif.body || "";

    // Ensure relative URLs are resolved to absolute ones for reliability
    const origin = self.location.origin;
    const icon = notif.icon
      ? notif.icon.startsWith("http")
        ? notif.icon
        : `${origin}${notif.icon}`
      : `${origin}/logo/android-chrome-192x192.png`;
    const badge = notif.badge
      ? notif.badge.startsWith("http")
        ? notif.badge
        : `${origin}${notif.badge}`
      : `${origin}/logo/climbeast-small.png`;

    // Extract target URL, ensuring it's relative to origin
    let targetUrl = notif.data?.url || (data.data && data.data.url) || "/home";
    if (!targetUrl.startsWith("http")) {
      targetUrl = new URL(targetUrl, origin).href;
    }

    const options = {
      body: body,
      icon: icon,
      badge: badge,
      vibrate: notif.vibrate || [200, 100, 200],
      tag: notif.tag || "cb-notif",
      renotify: notif.renotify !== false,
      data: {
        url: targetUrl,
        ...notif.data,
      },
    };

    console.log(
      "[ServiceWorker] Showing notification:",
      title,
      JSON.stringify(options),
    );

    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((windowClients) => {
          // Mejorado: En móvil, ser visible + estar enfocado es muy estricto.
          // Solo omitimos la notificación si la app está REALMENTE en primer plano.
          const isAppFocused = windowClients.some(
            (client) => client.visibilityState === "visible" && client.focused,
          );

          if (isAppFocused) {
            console.log(
              "[ServiceWorker] App is active and focused, skipping notification display.",
            );
            return;
          }

          return self.registration.showNotification(title, options);
        }),
    );
  } catch (err) {
    console.error("[ServiceWorker] Error processing push event:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  console.log(
    "[ServiceWorker] Notification click Received.",
    event.notification.data,
  );

  event.notification.close();

  // Get the target URL from notification data. It's already absolute.
  const urlToOpen =
    event.notification.data?.url || new URL("/home", self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // 1. Try to find a window that already has this URL open
        for (const client of windowClients) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // 2. If no exact match, try to find ANY window of our app and navigate it
        for (const client of windowClients) {
          if ("focus" in client && "navigate" in client) {
            return client
              .focus()
              .then((fClient) => fClient.navigate(urlToOpen));
          }
        }

        // 3. If no window is open at all, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

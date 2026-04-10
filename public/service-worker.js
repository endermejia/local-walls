importScripts("./ngsw-worker.js");

self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push Received.", event);

  if (!event.data) {
    console.log("[ServiceWorker] Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("[ServiceWorker] Push data:", data);

    if (data.notification) {
      const title = data.notification.title || "ClimBeast";
      const options = {
        body: data.notification.body || "",
        icon: data.notification.icon || "/assets/icons/icon-192x192.png",
        badge: data.notification.badge || "/assets/icons/badge-72x72.png",
        vibrate: data.notification.vibrate || [200, 100, 200],
        tag: data.notification.tag || "cb-notif",
        renotify: data.notification.renotify !== false,
        data: {
          url: data.notification.data?.url || "/home",
          ...data.notification.data,
        },
      };

      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch (err) {
    console.error("[ServiceWorker] Error parsing push data:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  console.log(
    "[ServiceWorker] Notification click Received.",
    event.notification.data,
  );

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/home";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Check if there is already a window open with this URL
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && "focus" in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

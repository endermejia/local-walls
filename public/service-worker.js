importScripts("./ngsw-worker.js");

self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push Evento recibido.");

  if (!event.data) {
    console.error("[ServiceWorker] Push sin datos.");
    return;
  }

  // Envolvemos todo en waitUntil para asegurar que Android no mate el proceso antes de mostrar la notificación
  event.waitUntil(
    (async () => {
      try {
        const data = event.data.json();
        console.log("[ServiceWorker] Datos recibidos:", data);

        // Soporte para estructura anidada o plana
        const notif = data.notification || data;
        const title = notif.title || "ClimBeast";

        // IMPORTANTE: Android requiere URLs absolutas para iconos si se lanza desde el worker
        const baseUrl = self.location.origin;
        const icon =
          notif.icon && notif.icon.startsWith("http")
            ? notif.icon
            : `${baseUrl}/logo/android-chrome-192x192.png`;
        const badge =
          notif.badge && notif.badge.startsWith("http")
            ? notif.badge
            : `${baseUrl}/logo/favicon-32x32.png`;

        const options = {
          body: notif.body || "",
          icon: icon,
          badge: badge,
          vibrate: notif.vibrate || [200, 100, 200],
          tag: notif.tag || "cb-notif",
          renotify: true,
          data: {
            url: notif.data?.url || "/home",
            ...notif.data,
          },
        };

        console.log("[ServiceWorker] Mostrando notificación...");
        return await self.registration.showNotification(title, options);
      } catch (err) {
        console.error("[ServiceWorker] Error procesando Push:", err);
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[ServiceWorker] Notification click.");
  event.notification.close();

  // Aseguramos que la URL sea absoluta para clients.openWindow
  const targetUrl = new URL(
    event.notification.data?.url || "/home",
    self.location.origin,
  ).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // 1. Intentar encontrar una ventana que ya tenga esta URL abierta
        for (const client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        // 2. Si no hay ventana exacta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});

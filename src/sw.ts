/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// App shell (JS/CSS/HTML/ícones) via precache do Workbox — chamadas à API do
// Supabase nunca passam por aqui, sempre direto na rede (ver PWA_CONFIG em
// vite.config.ts: só globPatterns de assets estáticos entram no manifest).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

// ── Push notifications (vendas novas) ───────────────────────────────────────
// Disparado pela edge function send-sale-push (supabase/functions/send-sale-push)
// quando uma linha nova aparece em sale_events. Payload: { title, body, url }.
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Seller Finance', body: event.data.text() };
  }

  const title = payload.title ?? 'Seller Finance';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-64x64.png',
    data: { url: payload.url ?? '/vendas' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação: foca uma aba já aberta no app (navegando pra rota do
// evento) ou abre uma nova.
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) ?? '/vendas';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) (client as WindowClient).navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

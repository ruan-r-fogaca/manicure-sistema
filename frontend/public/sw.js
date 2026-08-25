// Service worker só pra notificação push — recebe o push do servidor e
// mostra a notificação do sistema; ao tocar, abre (ou foca) o app.

self.addEventListener('push', (event) => {
  let dados = { titulo: 'Sistema Manicure', mensagem: '' };
  try {
    dados = event.data.json();
  } catch (e) {
    dados.mensagem = event.data?.text() || '';
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo || 'Sistema Manicure', {
      body: dados.mensagem,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ('focus' in janela) return janela.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

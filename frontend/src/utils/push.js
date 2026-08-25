import { api } from '../api/client.js';

function base64ParaUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Normalizado = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = window.atob(base64Normalizado);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

// Registra o service worker, pede permissão de notificação e, se autorizado,
// inscreve esse aparelho pra receber push — chamado uma vez ao abrir o app.
export async function configurarNotificacoesPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  try {
    const registro = await navigator.serviceWorker.register('/sw.js');

    let permissao = Notification.permission;
    if (permissao === 'default') {
      permissao = await Notification.requestPermission();
    }
    if (permissao !== 'granted') return;

    const jaInscrito = await registro.pushManager.getSubscription();
    if (jaInscrito) return;

    const { chave } = await api.get('/push/chave-publica');
    if (!chave) return;

    const inscricao = await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ParaUint8Array(chave),
    });

    await api.post('/push/inscrever', inscricao.toJSON());
  } catch (e) {
    // Notificação push é um extra — se o navegador não suportar ou algo
    // falhar, o app continua funcionando normal (sino continua ativo).
  }
}

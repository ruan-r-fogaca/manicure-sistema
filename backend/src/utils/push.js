import webpush from 'web-push';
import dotenv from 'dotenv';
import { supabase } from '../supabaseClient.js';

dotenv.config();

const configurado = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (configurado) {
  webpush.setVapidDetails('mailto:contato@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

// Manda a notificação pra todo aparelho inscrito (sistema de uso pessoal, um
// salão só — não precisa mirar usuário específico). Inscrição inválida
// (endpoint expirado/desinstalado) é removida na hora, sem travar as outras.
export async function enviarPushParaTodos(titulo, mensagem) {
  if (!configurado) return;

  const { data: inscricoes, error } = await supabase.from('push_subscriptions').select('*');
  if (error || !inscricoes?.length) return;

  const payload = JSON.stringify({ titulo, mensagem });

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      const subscription = {
        endpoint: inscricao.endpoint,
        keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
      };
      try {
        await webpush.sendNotification(subscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', inscricao.id);
        }
      }
    })
  );
}

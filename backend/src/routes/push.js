import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

// GET /api/push/chave-publica -> chave VAPID pública, usada pelo navegador
// pra criar a inscrição de push.
router.get('/chave-publica', (req, res) => {
  res.json({ chave: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /api/push/inscrever -> salva a inscrição de push desse aparelho
router.post('/inscrever', async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ erro: 'Inscrição de push inválida.' });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json({ ok: true });
});

export default router;

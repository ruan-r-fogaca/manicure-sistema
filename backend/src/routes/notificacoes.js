import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { atualizarNotificacoes } from '../utils/notificacoes.js';

const router = Router();

// GET /api/notificacoes -> roda as checagens (pagamento previsto, agendamento
// esquecido) e devolve a lista pro sino. Chamado toda vez que o app abre.
router.get('/', async (req, res) => {
  try {
    const notificacoes = await atualizarNotificacoes();
    res.json(notificacoes);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Precisa vir antes de PUT /:id — senão "marcar-todas-lidas" seria lido como um :id.
router.put('/marcar-todas-lidas', async (req, res) => {
  const { error } = await supabase.from('notificacoes').update({ lida: true }).eq('lida', false);
  if (error) return res.status(500).json({ erro: error.message });
  res.status(204).send();
});

router.put('/:id', async (req, res) => {
  const { lida } = req.body;
  const { data, error } = await supabase.from('notificacoes').update({ lida }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

export default router;

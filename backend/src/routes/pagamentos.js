import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

// GET /api/pagamentos/agendamento/:agendamentoId
router.get('/agendamento/:agendamentoId', async (req, res) => {
  const { data, error } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('agendamento_id', req.params.agendamentoId)
    .maybeSingle();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// PUT /api/pagamentos/:id -> registrar pagamento (forma e status)
router.put('/:id', async (req, res) => {
  const { forma_pagamento, status } = req.body;
  const validosForma = ['pix', 'dinheiro', 'credito', 'debito'];
  const validosStatus = ['pago', 'pendente'];

  if (status && !validosStatus.includes(status)) return res.status(400).json({ erro: 'status inválido.' });
  if (forma_pagamento && !validosForma.includes(forma_pagamento)) return res.status(400).json({ erro: 'forma_pagamento inválida.' });

  const payload = { forma_pagamento, status };
  if (status === 'pago') payload.data_pagamento = new Date().toISOString();

  const { data, error } = await supabase
    .from('pagamentos')
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });

  // Cliente marcada como "Pendente" (atendeu, ia pagar depois): assim que o
  // pagamento é confirmado, o agendamento vira "Atendido" automaticamente.
  if (status === 'pago' && data.agendamento_id) {
    await supabase.from('agendamentos').update({ status: 'atendido' }).eq('id', data.agendamento_id).eq('status', 'pendente');
  }

  res.json(data);
});

export default router;
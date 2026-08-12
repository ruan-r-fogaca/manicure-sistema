import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

const VALIDOS_STATUS = ['pendente', 'pago', 'atrasado', 'cancelado'];
const VALIDOS_FORMA = ['pix', 'dinheiro', 'credito', 'debito'];

router.get('/', async (req, res) => {
  let query = supabase
    .from('cobrancas')
    .select('*, clientes(nome, telefone, tipo_cobranca)')
    .order('competencia', { ascending: false });

  if (req.query.competencia) {
    query = query.eq('competencia', `${req.query.competencia}-01`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

router.put('/:id', async (req, res) => {
  const { forma_pagamento, status } = req.body;

  if (status && !VALIDOS_STATUS.includes(status)) return res.status(400).json({ erro: 'status inválido.' });
  if (forma_pagamento && !VALIDOS_FORMA.includes(forma_pagamento)) {
    return res.status(400).json({ erro: 'forma_pagamento inválida.' });
  }

  const payload = {};
  if (forma_pagamento !== undefined) payload.forma_pagamento = forma_pagamento;
  if (status !== undefined) payload.status = status;
  if (status === 'pago') payload.data_pagamento = new Date().toISOString();
  if (status && status !== 'pago') payload.data_pagamento = null;

  const { data, error } = await supabase
    .from('cobrancas')
    .update(payload)
    .eq('id', req.params.id)
    .select('*, clientes(nome, telefone)')
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

export default router;
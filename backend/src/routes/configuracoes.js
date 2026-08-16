import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

// GET /api/configuracoes
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('configuracoes').select('*').eq('id', 1).single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// PUT /api/configuracoes
router.put('/', async (req, res) => {
  const {
    horarios_funcionamento,
    intervalo_entre_atendimentos_minutos,
    taxa_credito_percentual,
    taxa_debito_percentual,
  } = req.body;

  const payload = {};
  if (horarios_funcionamento !== undefined) payload.horarios_funcionamento = horarios_funcionamento;
  if (intervalo_entre_atendimentos_minutos !== undefined) {
    payload.intervalo_entre_atendimentos_minutos = intervalo_entre_atendimentos_minutos;
  }
  if (taxa_credito_percentual !== undefined) payload.taxa_credito_percentual = taxa_credito_percentual;
  if (taxa_debito_percentual !== undefined) payload.taxa_debito_percentual = taxa_debito_percentual;

  const { data, error } = await supabase.from('configuracoes').update(payload).eq('id', 1).select().single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

export default router;

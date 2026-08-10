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
  const { horarios_funcionamento, intervalo_entre_atendimentos_minutos } = req.body;
  const { data, error } = await supabase
    .from('configuracoes')
    .update({ horarios_funcionamento, intervalo_entre_atendimentos_minutos })
    .eq('id', 1)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

export default router;

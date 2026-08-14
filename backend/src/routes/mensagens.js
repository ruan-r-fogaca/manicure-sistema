import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

// GET /api/mensagens
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('mensagens_modelo').select('*').order('criado_em');
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// POST /api/mensagens
router.post('/', async (req, res) => {
  const { nome, texto } = req.body;
  if (!nome || !texto) {
    return res.status(400).json({ erro: 'nome e texto são obrigatórios.' });
  }
  const { data, error } = await supabase.from('mensagens_modelo').insert({ nome, texto }).select().single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/mensagens/:id
router.put('/:id', async (req, res) => {
  const { nome, texto } = req.body;
  const { data, error } = await supabase
    .from('mensagens_modelo')
    .update({ nome, texto })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// DELETE /api/mensagens/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('mensagens_modelo').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.status(204).send();
});

export default router;

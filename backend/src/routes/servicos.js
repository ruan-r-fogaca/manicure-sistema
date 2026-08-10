import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

// GET /api/servicos?ativo=true
router.get('/', async (req, res) => {
  let query = supabase.from('servicos').select('*').order('nome');
  if (req.query.ativo !== undefined) {
    query = query.eq('ativo', req.query.ativo === 'true');
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// POST /api/servicos
router.post('/', async (req, res) => {
  const { nome, preco, duracao_minutos, ativo = true } = req.body;
  if (!nome || preco == null || !duracao_minutos) {
    return res.status(400).json({ erro: 'nome, preco e duracao_minutos são obrigatórios.' });
  }
  const { data, error } = await supabase
    .from('servicos')
    .insert({ nome, preco, duracao_minutos, ativo })
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/servicos/:id
router.put('/:id', async (req, res) => {
  const { nome, preco, duracao_minutos, ativo } = req.body;
  const { data, error } = await supabase
    .from('servicos')
    .update({ nome, preco, duracao_minutos, ativo })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// DELETE /api/servicos/:id (marca como inativo, não apaga)
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('servicos').update({ ativo: false }).eq('id', req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.status(204).send();
});

export default router;

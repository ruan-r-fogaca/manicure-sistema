import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

// GET /api/clientes?busca=maria
router.get('/', async (req, res) => {
  let query = supabase.from('clientes').select('*').order('nome');
  if (req.query.busca) {
    query = query.ilike('nome', `%${req.query.busca}%`);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/clientes/:id  -> dados da cliente + último atendimento
router.get('/:id', async (req, res) => {
  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ erro: 'Cliente não encontrada.' });

  const { data: ultimoAtendimento } = await supabase
    .from('agendamentos')
    .select('*, servicos(nome)')
    .eq('cliente_id', req.params.id)
    .eq('status', 'atendido')
    .order('data', { ascending: false })
    .limit(1)
    .maybeSingle();

  res.json({ ...cliente, ultimo_atendimento: ultimoAtendimento || null });
});

// GET /api/clientes/:id/historico -> lista de atendimentos passados
router.get('/:id/historico', async (req, res) => {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, servicos(nome), pagamentos(valor, forma_pagamento, status, data_pagamento)')
    .eq('cliente_id', req.params.id)
    .order('data', { ascending: false })
    .order('hora_inicio', { ascending: false });
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/clientes/fixas/proximas -> clientes fixas próximas do novo atendimento
router.get('/fixas/proximas', async (req, res) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cliente_fixa', true);
  if (error) return res.status(500).json({ erro: error.message });

  const hoje = new Date();
  const resultado = [];
  for (const cliente of data) {
    const { data: ultimo } = await supabase
      .from('agendamentos')
      .select('data')
      .eq('cliente_id', cliente.id)
      .eq('status', 'atendido')
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ultimo && cliente.frequencia_dias) {
      const dataUltimo = new Date(ultimo.data + 'T12:00:00');
      const proximaData = new Date(dataUltimo);
      proximaData.setDate(proximaData.getDate() + cliente.frequencia_dias);
      const diasRestantes = Math.ceil((proximaData - hoje) / (1000 * 60 * 60 * 24));
      if (diasRestantes <= 3) {
        resultado.push({ ...cliente, proxima_data_sugerida: proximaData.toISOString().slice(0, 10), dias_restantes: diasRestantes });
      }
    }
  }
  res.json(resultado);
});

// POST /api/clientes
router.post('/', async (req, res) => {
  const { nome, telefone, cliente_fixa = false, frequencia_dias, servico_habitual_id, horario_habitual, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'nome é obrigatório.' });

  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome, telefone, cliente_fixa, frequencia_dias, servico_habitual_id, horario_habitual, observacoes })
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  const { nome, telefone, cliente_fixa, frequencia_dias, servico_habitual_id, horario_habitual, observacoes } = req.body;
  const { data, error } = await supabase
    .from('clientes')
    .update({ nome, telefone, cliente_fixa, frequencia_dias, servico_habitual_id, horario_habitual, observacoes })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// DELETE /api/clientes/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('clientes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.status(204).send();
});

export default router;

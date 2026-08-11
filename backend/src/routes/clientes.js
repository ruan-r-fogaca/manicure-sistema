import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

// GET /api/clientes?busca=maria&status=ativos|inativos|todos
// status padrão é "ativos" (não aparece cliente inativada por engano nas listas do dia a dia)
router.get('/', async (req, res) => {
  let query = supabase.from('clientes').select('*').order('nome');
  if (req.query.busca) {
    query = query.ilike('nome', `%${req.query.busca}%`);
  }
  const status = req.query.status || 'ativos';
  if (status === 'ativos') query = query.eq('ativo', true);
  else if (status === 'inativos') query = query.eq('ativo', false);
  // status === 'todos' -> sem filtro
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

// GET /api/clientes/fixas/proximas -> clientes fixas
// Sem parâmetro: lista TODAS as clientes fixas (usada na tela "Clientes fixas" -
//   assim, assim que você marca "cliente fixa" ela já aparece aqui, mesmo sem
//   histórico de atendimento ainda).
// ?apenas_proximas=true: só as que estão a 3 dias ou menos do prazo de voltar
//   (usada no aviso da tela Início, pra não virar bagunça de notificação).
router.get('/fixas/proximas', async (req, res) => {
  const apenasProximas = req.query.apenas_proximas === 'true';

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cliente_fixa', true)
    .eq('ativo', true);
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

    let entrada = { ...cliente, proxima_data_sugerida: null, dias_restantes: null };

    if (ultimo && cliente.frequencia_dias) {
      const dataUltimo = new Date(ultimo.data + 'T12:00:00');
      const proximaData = new Date(dataUltimo);
      proximaData.setDate(proximaData.getDate() + cliente.frequencia_dias);
      const diasRestantes = Math.ceil((proximaData - hoje) / (1000 * 60 * 60 * 24));
      entrada.proxima_data_sugerida = proximaData.toISOString().slice(0, 10);
      entrada.dias_restantes = diasRestantes;

      if (apenasProximas && diasRestantes > 3) continue;
    } else if (apenasProximas) {
      // ainda sem atendimento registrado: não teria "prazo" pra calcular,
      // então essa cliente só aparece na lista completa, não no aviso rápido.
      continue;
    }

    resultado.push(entrada);
  }
  res.json(resultado);
});

// POST /api/clientes
router.post('/', async (req, res) => {
  const { nome, telefone, cliente_fixa = false, frequencia_dias, servico_habitual_id, horario_habitual, observacoes } = req.body;
  if (!nome) return res.status(400).json({ erro: 'nome é obrigatório.' });

  const { data, error } = await supabase
    .from('clientes')
    .insert({ nome, telefone, cliente_fixa, frequencia_dias, servico_habitual_id, horario_habitual, observacoes, ativo: true })
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

// PUT /api/clientes/:id (também usado para inativar/reativar, enviando { ativo: false/true })
router.put('/:id', async (req, res) => {
  const { nome, telefone, cliente_fixa, frequencia_dias, servico_habitual_id, horario_habitual, observacoes, ativo } = req.body;
  const payload = { nome, telefone, cliente_fixa, frequencia_dias, servico_habitual_id, horario_habitual, observacoes };
  if (ativo !== undefined) payload.ativo = ativo;

  const { data, error } = await supabase
    .from('clientes')
    .update(payload)
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
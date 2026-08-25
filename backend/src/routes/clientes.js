import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

const TIPOS_COBRANCA = ['por_atendimento', 'mensal_fixo', 'mensal_por_servico'];

const MENSAGEM_NOME_DUPLICADO = 'Já existe uma cliente cadastrada com esse nome. Insira um sobrenome pra diferenciar.';

// Checa se já existe cliente com esse nome (ignorando maiúsculas/minúsculas e
// espaços nas pontas). excluirId serve pra edição não bater com ela mesma.
async function nomeJaExiste(nome, excluirId) {
  let query = supabase.from('clientes').select('id').ilike('nome', nome.trim()).limit(1);
  if (excluirId) query = query.neq('id', excluirId);
  const { data, error } = await query;
  if (error) throw error;
  return data.length > 0;
}

// O valor do plano mensal (fixo ou por serviço) não é mais exigido aqui — dá
// pra marcar a cliente como mensal já no cadastro e definir o valor depois,
// na página dela. Enquanto não tiver valor, cobranças geradas saem R$0.
function validarCobranca(body) {
  const { tipo_cobranca, dia_cobranca } = body;
  if (tipo_cobranca !== undefined && !TIPOS_COBRANCA.includes(tipo_cobranca)) {
    return 'tipo_cobranca inválido.';
  }
  if (dia_cobranca !== undefined && dia_cobranca !== null && (dia_cobranca < 1 || dia_cobranca > 31)) {
    return 'dia_cobranca deve ser entre 1 e 31.';
  }
  return null;
}

router.get('/', async (req, res) => {
  let query = supabase.from('clientes').select('*').order('nome');
  if (req.query.busca) {
    query = query.ilike('nome', `%${req.query.busca}%`);
  }
  const status = req.query.status || 'ativos';
  if (status === 'ativos') query = query.eq('ativo', true);
  else if (status === 'inativos') query = query.eq('ativo', false);
  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const [{ data: cliente, error }, { data: ultimoAtendimento }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', req.params.id).single(),
    supabase
      .from('agendamentos')
      .select('*, servicos(nome)')
      .eq('cliente_id', req.params.id)
      .in('status', ['atendido', 'pendente'])
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) return res.status(404).json({ erro: 'Cliente não encontrada.' });

  res.json({ ...cliente, ultimo_atendimento: ultimoAtendimento || null });
});

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

router.post('/', async (req, res) => {
  const {
    nome,
    telefone,
    servico_habitual_id,
    horario_habitual,
    observacoes,
    tipo_cobranca = 'por_atendimento',
    valor_mensal_fixo,
    valor_por_servico,
    dia_cobranca,
    meta_atendimentos_mes,
  } = req.body;
  if (!nome) return res.status(400).json({ erro: 'nome é obrigatório.' });

  const erroCobranca = validarCobranca(req.body);
  if (erroCobranca) return res.status(400).json({ erro: erroCobranca });

  try {
    if (await nomeJaExiste(nome)) return res.status(400).json({ erro: MENSAGEM_NOME_DUPLICADO });
  } catch (error) {
    return res.status(500).json({ erro: error.message });
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nome: nome.trim(),
      telefone,
      servico_habitual_id,
      horario_habitual,
      observacoes,
      ativo: true,
      tipo_cobranca,
      valor_mensal_fixo: tipo_cobranca === 'mensal_fixo' ? valor_mensal_fixo : null,
      valor_por_servico: tipo_cobranca === 'mensal_por_servico' ? valor_por_servico : null,
      dia_cobranca: dia_cobranca || null,
      meta_atendimentos_mes: tipo_cobranca !== 'por_atendimento' ? meta_atendimentos_mes || null : null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const {
    nome,
    telefone,
    servico_habitual_id,
    horario_habitual,
    observacoes,
    ativo,
    tipo_cobranca,
    valor_mensal_fixo,
    valor_por_servico,
    dia_cobranca,
    meta_atendimentos_mes,
  } = req.body;

  const erroCobranca = validarCobranca(req.body);
  if (erroCobranca) return res.status(400).json({ erro: erroCobranca });

  if (nome) {
    try {
      if (await nomeJaExiste(nome, req.params.id)) return res.status(400).json({ erro: MENSAGEM_NOME_DUPLICADO });
    } catch (error) {
      return res.status(500).json({ erro: error.message });
    }
  }

  const payload = {
    nome: nome ? nome.trim() : nome,
    telefone,
    servico_habitual_id,
    horario_habitual,
    observacoes,
  };
  if (ativo !== undefined) payload.ativo = ativo;
  if (tipo_cobranca !== undefined) {
    payload.tipo_cobranca = tipo_cobranca;
    payload.valor_mensal_fixo = tipo_cobranca === 'mensal_fixo' ? valor_mensal_fixo : null;
    payload.valor_por_servico = tipo_cobranca === 'mensal_por_servico' ? valor_por_servico : null;
    payload.meta_atendimentos_mes = tipo_cobranca !== 'por_atendimento' ? meta_atendimentos_mes || null : null;
  }
  if (dia_cobranca !== undefined) payload.dia_cobranca = dia_cobranca || null;

  const { data, error } = await supabase
    .from('clientes')
    .update(payload)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('clientes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ erro: error.message });
  res.status(204).send();
});

export default router;
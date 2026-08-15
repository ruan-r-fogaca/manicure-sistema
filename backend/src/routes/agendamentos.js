import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { calcularHoraFim, haSobreposicao } from '../utils/horarios.js';

const router = Router();

// Checa conflito de horário para uma data, ignorando um agendamento específico (útil na remarcação)
async function existeConflito(data, horaInicio, horaFim, ignorarId = null) {
  let query = supabase
    .from('agendamentos')
    .select('id, hora_inicio, hora_fim')
    .eq('data', data)
    .in('status', ['agendado', 'confirmado', 'atendido']);

  if (ignorarId) query = query.neq('id', ignorarId);

  const { data: agendamentosDoDia, error } = await query;
  if (error) throw error;

  return agendamentosDoDia.some((a) => haSobreposicao(horaInicio, horaFim, a.hora_inicio, a.hora_fim));
}

// GET /api/agendamentos?data=2026-08-12  ou  ?inicio=2026-08-10&fim=2026-08-16 (semana)
router.get('/', async (req, res) => {
  let query = supabase
    .from('agendamentos')
    .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome, cor)')
    .order('data')
    .order('hora_inicio');

  if (req.query.data) {
    query = query.eq('data', req.query.data);
  } else if (req.query.inicio && req.query.fim) {
    query = query.gte('data', req.query.inicio).lte('data', req.query.fim);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/agendamentos/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome, cor), pagamentos(*)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
  res.json(data);
});

// POST /api/agendamentos -> cria um novo agendamento com checagem de conflito de horário
router.post('/', async (req, res) => {
  const { cliente_id, servico_id, data, hora_inicio, observacao, grupo_id, ordem } = req.body;
  if (!cliente_id || !servico_id || !data || !hora_inicio) {
    return res.status(400).json({ erro: 'cliente_id, servico_id, data e hora_inicio são obrigatórios.' });
  }

  const { data: servico, error: erroServico } = await supabase
    .from('servicos')
    .select('*')
    .eq('id', servico_id)
    .single();
  if (erroServico || !servico) return res.status(404).json({ erro: 'Serviço não encontrado.' });

  const hora_fim = calcularHoraFim(hora_inicio, servico.duracao_minutos);

  const conflito = await existeConflito(data, hora_inicio, hora_fim);
  if (conflito) return res.status(409).json({ erro: 'Esse horário já está ocupado.' });

  const { data: novoAgendamento, error } = await supabase
    .from('agendamentos')
    .insert({
      cliente_id,
      servico_id,
      data,
      hora_inicio,
      hora_fim,
      valor: servico.preco,
      observacao,
      grupo_id: grupo_id || null,
      ordem: ordem || 0,
      status: 'agendado',
    })
    .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome, cor)')
    .single();

  if (error) return res.status(500).json({ erro: error.message });
  res.status(201).json(novoAgendamento);
});

// PUT /api/agendamentos/:id/remarcar -> nova data/horário, libera o antigo e reserva o novo
router.put('/:id/remarcar', async (req, res) => {
  const { data, hora_inicio } = req.body;
  if (!data || !hora_inicio) return res.status(400).json({ erro: 'data e hora_inicio são obrigatórios.' });

  const { data: agendamentoAtual, error: erroAtual } = await supabase
    .from('agendamentos')
    .select('*, servicos(duracao_minutos)')
    .eq('id', req.params.id)
    .single();
  if (erroAtual || !agendamentoAtual) return res.status(404).json({ erro: 'Agendamento não encontrado.' });

  const hora_fim = calcularHoraFim(hora_inicio, agendamentoAtual.servicos.duracao_minutos);

  const conflito = await existeConflito(data, hora_inicio, hora_fim, req.params.id);
  if (conflito) return res.status(409).json({ erro: 'Esse horário já está ocupado.' });

  const { data: atualizado, error } = await supabase
    .from('agendamentos')
    .update({ data, hora_inicio, hora_fim, status: 'agendado' })
    .eq('id', req.params.id)
    .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome, cor)')
    .single();

  if (error) return res.status(500).json({ erro: error.message });
  res.json(atualizado);
});

// PUT /api/agendamentos/:id/status -> muda status (confirmado, atendido, cancelado, faltou)
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validos = ['agendado', 'confirmado', 'atendido', 'cancelado', 'faltou'];
  if (!validos.includes(status)) return res.status(400).json({ erro: 'status inválido.' });

  const { data, error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', req.params.id)
    .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome, cor)')
    .single();

  if (error) return res.status(500).json({ erro: error.message });
  // Cancelar ou marcar falta libera o horário automaticamente pois a checagem de
  // conflito só considera agendado/confirmado/atendido.
  res.json(data);
});

// PUT /api/agendamentos/:id -> edição geral (ex: observação)
router.put('/:id', async (req, res) => {
  const { observacao } = req.body;
  const { data, error } = await supabase
    .from('agendamentos')
    .update({ observacao })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

export default router;

import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { calcularHoraFim, haSobreposicao } from '../utils/horarios.js';

const router = Router();

// Checa conflito de horário para uma data, ignorando um ou vários agendamentos
// específicos (útil na remarcação e na edição de grupo, que reserva o próprio horário antigo)
async function existeConflito(data, horaInicio, horaFim, ignorarIds = null) {
  let query = supabase
    .from('agendamentos')
    .select('id, hora_inicio, hora_fim')
    .eq('data', data)
    .in('status', ['agendado', 'confirmado', 'atendido', 'pendente']);

  const lista = ignorarIds == null ? [] : Array.isArray(ignorarIds) ? ignorarIds : [ignorarIds];
  if (lista.length === 1) query = query.neq('id', lista[0]);
  else if (lista.length > 1) query = query.not('id', 'in', `(${lista.join(',')})`);

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

// PUT /api/agendamentos/:id/status -> muda status (confirmado, atendido, cancelado, pendente)
// "pendente" = atendeu, mas o pagamento avulso ficou pra depois (ex: paga semana que vem).
// Conta como atendimento realizado em todo lugar que soma faturamento/relatórios — só
// o pagamento em si é que continua pendente até ela marcar como pago no Financeiro.
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validos = ['agendado', 'confirmado', 'atendido', 'cancelado', 'pendente'];
  if (!validos.includes(status)) return res.status(400).json({ erro: 'status inválido.' });

  const { data, error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', req.params.id)
    .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome, cor)')
    .single();

  if (error) return res.status(500).json({ erro: error.message });
  // Só cancelar libera o horário automaticamente — a checagem de conflito considera
  // agendado/confirmado/atendido/pendente como "ocupado" (pendente já foi atendido).
  res.json(data);
});

// PUT /api/agendamentos/editar-grupo -> edita dia, horário e a lista de serviços de um
// agendamento (avulso ou com vários serviços agrupados por grupo_id).
// Body: { ids: [...ids atuais do card], data, hora_inicio, servico_ids: [...na ordem] }
//
// Reaproveita as linhas existentes na mesma posição da nova lista (preserva o pagamento
// e o status de cada uma); sobrou linha antiga sem serviço correspondente -> cancela;
// sobrou serviço novo sem linha correspondente -> cria uma linha nova (status agendado).
router.put('/editar-grupo', async (req, res) => {
  const { ids, data, hora_inicio, servico_ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !data || !hora_inicio || !Array.isArray(servico_ids) || servico_ids.length === 0) {
    return res.status(400).json({ erro: 'ids, data, hora_inicio e servico_ids são obrigatórios.' });
  }

  try {
    const { data: linhasAtuais, error: erroAtual } = await supabase
      .from('agendamentos')
      .select('id, cliente_id, grupo_id, status')
      .in('id', ids);
    if (erroAtual) throw erroAtual;
    if (linhasAtuais.length === 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
    const clienteId = linhasAtuais[0].cliente_id;

    const { data: servicos, error: erroServicos } = await supabase.from('servicos').select('*').in('id', servico_ids);
    if (erroServicos) throw erroServicos;
    const servicosPorId = new Map(servicos.map((s) => [s.id, s]));
    const servicosOrdenados = servico_ids.map((id) => servicosPorId.get(id));
    if (servicosOrdenados.some((s) => !s)) return res.status(404).json({ erro: 'Um dos serviços selecionados não foi encontrado.' });

    let inicioAtual = hora_inicio;
    let grupoId = linhasAtuais[0].grupo_id;
    if (!grupoId && servicosOrdenados.length > 1) grupoId = crypto.randomUUID();
    if (servicosOrdenados.length === 1) grupoId = null;

    const linhas = servicosOrdenados.map((servico, i) => {
      const fim = calcularHoraFim(inicioAtual, servico.duracao_minutos);
      const linha = {
        cliente_id: clienteId,
        servico_id: servico.id,
        data,
        hora_inicio: inicioAtual,
        hora_fim: fim,
        valor: servico.preco,
        ordem: i,
        grupo_id: grupoId,
      };
      inicioAtual = fim;
      return linha;
    });
    const horaFimGrupo = linhas[linhas.length - 1].hora_fim;

    const conflito = await existeConflito(data, hora_inicio, horaFimGrupo, ids);
    if (conflito) return res.status(409).json({ erro: 'Esse horário já está ocupado.' });

    const idsExistentes = linhasAtuais.map((l) => l.id);
    const statusPorId = new Map(linhasAtuais.map((l) => [l.id, l.status]));
    const paraSalvar = [];
    const idsParaCancelar = [];
    // Todas as linhas do upsert precisam ter o mesmo conjunto de colunas — o
    // Postgres monta um único INSERT ... ON CONFLICT, e uma coluna omitida
    // numa linha mas presente noutra vira NULL em vez de "não mexe".
    for (let i = 0; i < Math.max(linhas.length, idsExistentes.length); i++) {
      if (i < linhas.length && i < idsExistentes.length) {
        paraSalvar.push({ id: idsExistentes[i], ...linhas[i], status: statusPorId.get(idsExistentes[i]) });
      } else if (i < linhas.length) {
        // Gera o id aqui mesmo (em vez de deixar o banco gerar): todas as linhas
        // do upsert precisam ter as mesmas colunas, e as outras já têm id.
        paraSalvar.push({ id: crypto.randomUUID(), ...linhas[i], status: 'agendado' });
      } else {
        idsParaCancelar.push(idsExistentes[i]);
      }
    }

    if (idsParaCancelar.length > 0) {
      const { error: erroCancelar } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .in('id', idsParaCancelar);
      if (erroCancelar) throw erroCancelar;
    }

    const { data: atualizados, error: erroSalvar } = await supabase
      .from('agendamentos')
      .upsert(paraSalvar)
      .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome, cor)');
    if (erroSalvar) throw erroSalvar;

    // O pagamento é criado com o valor do agendamento na hora do insert e não
    // acompanha mudanças depois — se o serviço (e o valor) mudou numa linha que
    // já existia, sincroniza o pagamento dela, mas só se ainda estiver pendente
    // (pagamento já feito não deve ter o valor reescrito).
    const linhasReaproveitadas = paraSalvar.filter((l) => l.id);
    if (linhasReaproveitadas.length > 0) {
      const valorPorId = new Map(linhasReaproveitadas.map((l) => [l.id, l.valor]));
      const { data: pagamentosPendentes, error: erroPagBusca } = await supabase
        .from('pagamentos')
        .select('id, agendamento_id')
        .in('agendamento_id', [...valorPorId.keys()])
        .eq('status', 'pendente');
      if (erroPagBusca) throw erroPagBusca;
      await Promise.all(
        (pagamentosPendentes || []).map((p) =>
          supabase.from('pagamentos').update({ valor: valorPorId.get(p.agendamento_id) }).eq('id', p.id)
        )
      );
    }

    res.json(atualizados);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
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

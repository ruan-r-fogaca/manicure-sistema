import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { hojeBrasilISO } from '../utils/horarios.js';

const router = Router();

function inicioFimSemana(dataRef) {
  const d = new Date(dataRef + 'T12:00:00');
  const diaSemana = d.getDay();
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - diaSemana);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

function inicioFimMes(dataRef) {
  const d = new Date(dataRef + 'T12:00:00');
  const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

async function buscarTaxasCartao() {
  const { data } = await supabase
    .from('configuracoes')
    .select('taxa_credito_percentual, taxa_debito_percentual')
    .eq('id', 1)
    .maybeSingle();
  return {
    credito: Number(data?.taxa_credito_percentual ?? 0),
    debito: Number(data?.taxa_debito_percentual ?? 0),
  };
}

// Desconta a taxa da maquininha do valor bruto pra refletir o que efetivamente
// cai na conta — dinheiro/pix não têm taxa, então passam direto.
function valorLiquido(valor, formaPagamento, taxas) {
  const taxa = formaPagamento === 'credito' ? taxas.credito : formaPagamento === 'debito' ? taxas.debito : 0;
  return Number(valor) * (1 - taxa / 100);
}

async function calcularFaturamento(inicio, fim, taxas) {
  // -03:00 explícito: data_pagamento é timestamptz (instante real), então sem o
  // fuso a comparação assume UTC e desloca o dia perto da meia-noite no Brasil.
  const [{ data: atendidos, error: erroAtendidos }, { data: pagos, error: erroPagos }] = await Promise.all([
    supabase.from('agendamentos').select('valor').in('status', ['atendido', 'pendente']).gte('data', inicio).lte('data', fim),
    supabase
      .from('pagamentos')
      // Só avulso: visita de cliente mensal não é "recebido" separado, já
      // está coberta pela mensalidade (mesma regra de origemPorTipo abaixo).
      .select('valor, forma_pagamento, data_pagamento, agendamentos!inner(clientes!inner(tipo_cobranca))')
      .eq('status', 'pago')
      .eq('agendamentos.clientes.tipo_cobranca', 'por_atendimento')
      .gte('data_pagamento', `${inicio}T00:00:00-03:00`)
      .lte('data_pagamento', `${fim}T23:59:59-03:00`),
  ]);
  if (erroAtendidos) throw erroAtendidos;
  if (erroPagos) throw erroPagos;

  const porFormaPagamento = { pix: 0, dinheiro: 0, credito: 0, debito: 0 };
  let recebidoLiquido = 0;
  let taxaCartaoDescontada = 0;
  for (const p of pagos) {
    const liquido = valorLiquido(p.valor, p.forma_pagamento, taxas);
    recebidoLiquido += liquido;
    taxaCartaoDescontada += Number(p.valor) - liquido;
    if (p.forma_pagamento && porFormaPagamento[p.forma_pagamento] !== undefined) {
      porFormaPagamento[p.forma_pagamento] += liquido;
    }
  }

  return {
    atendimentos_realizados: atendidos.reduce((s, a) => s + Number(a.valor), 0),
    pagamentos_recebidos: recebidoLiquido,
    por_forma_pagamento: porFormaPagamento,
    taxa_cartao_descontada: taxaCartaoDescontada,
  };
}

async function origemPorTipo(inicio, fim, competencia, taxas) {
  // Filtra pelo tipo de cobrança do cliente pra não misturar pagamentos de
  // atendimento avulso com visitas de clientes mensais (que já pagaram no fechamento).
  const [
    { data: cobrancasMes, error: erroCobrancas },
    { data: avulsoAtendido, error: erroAvulso },
    { data: avulsoPago, error: erroAvulsoPago },
  ] = await Promise.all([
    supabase.from('cobrancas').select('valor_cobrado, tipo, status, forma_pagamento').eq('competencia', competencia),
    supabase
      .from('agendamentos')
      .select('valor, clientes!inner(tipo_cobranca)')
      .in('status', ['atendido', 'pendente'])
      .eq('clientes.tipo_cobranca', 'por_atendimento')
      .gte('data', inicio)
      .lte('data', fim),
    supabase
      .from('pagamentos')
      .select('valor, forma_pagamento, agendamentos!inner(clientes!inner(tipo_cobranca))')
      .eq('status', 'pago')
      .eq('agendamentos.clientes.tipo_cobranca', 'por_atendimento')
      .gte('data_pagamento', `${inicio}T00:00:00-03:00`)
      .lte('data_pagamento', `${fim}T23:59:59-03:00`),
  ]);
  if (erroCobrancas) throw erroCobrancas;
  if (erroAvulso) throw erroAvulso;
  if (erroAvulsoPago) throw erroAvulsoPago;

  // aplicarTaxa só faz sentido em "pago" (dinheiro já recebido) — o valor
  // "cobrado" é o que foi faturado, independente de como acabou sendo pago.
  const somaTipo = (tipo, filtroStatus, aplicarTaxa = false) =>
    cobrancasMes
      .filter((c) => c.tipo === tipo && (!filtroStatus || filtroStatus.includes(c.status)))
      .reduce((s, c) => s + (aplicarTaxa ? valorLiquido(c.valor_cobrado, c.forma_pagamento, taxas) : Number(c.valor_cobrado)), 0);

  const mensalFixo = {
    cobrado: somaTipo('mensal_fixo'),
    pago: somaTipo('mensal_fixo', ['pago'], true),
    pendente: somaTipo('mensal_fixo', ['pendente', 'atrasado']),
  };
  const mensalPorServico = {
    cobrado: somaTipo('mensal_por_servico'),
    pago: somaTipo('mensal_por_servico', ['pago'], true),
    pendente: somaTipo('mensal_por_servico', ['pendente', 'atrasado']),
  };

  const avulso = {
    cobrado: avulsoAtendido.reduce((s, a) => s + Number(a.valor), 0),
    pago: avulsoPago.reduce((s, p) => s + valorLiquido(p.valor, p.forma_pagamento, taxas), 0),
  };

  return {
    mensal_fixo: mensalFixo,
    mensal_por_servico: mensalPorServico,
    avulso,
    total_cobrado: mensalFixo.cobrado + mensalPorServico.cobrado + avulso.cobrado,
    total_pago: mensalFixo.pago + mensalPorServico.pago + avulso.pago,
  };
}

router.get('/', async (req, res) => {
  try {
    const dataRef = req.query.data || hojeBrasilISO();
    const { inicio: inicioSemana, fim: fimSemana } = inicioFimSemana(dataRef);
    const { inicio: inicioMes, fim: fimMes } = inicioFimMes(dataRef);
    const competencia = `${inicioMes.slice(0, 7)}-01`;
    const taxas = await buscarTaxasCartao();

    const [dia, semana, mes, origem_mes] = await Promise.all([
      calcularFaturamento(dataRef, dataRef, taxas),
      calcularFaturamento(inicioSemana, fimSemana, taxas),
      calcularFaturamento(inicioMes, fimMes, taxas),
      origemPorTipo(inicioMes, fimMes, competencia, taxas),
    ]);

    // "Pendente" = atendimento avulso já realizado mas ainda não pago. Um pagamento
    // "pendente" é criado assim que o agendamento é marcado, então sem os filtros de
    // status='atendido' e tipo_cobranca isso contaria até serviço que nem aconteceu
    // ainda, ou visita de cliente mensal (que já pagou no fechamento do mês).
    const [
      { data: pendentesAvulso, error: erroPendentes },
      { data: pendentesMensais, error: erroPendentesMensais },
    ] = await Promise.all([
      supabase
        .from('pagamentos')
        .select('valor, agendamentos!inner(status, clientes!inner(tipo_cobranca))')
        .eq('status', 'pendente')
        .in('agendamentos.status', ['atendido', 'pendente'])
        .eq('agendamentos.clientes.tipo_cobranca', 'por_atendimento'),
      supabase.from('cobrancas').select('valor_cobrado').in('status', ['pendente', 'atrasado']),
    ]);
    if (erroPendentes) throw erroPendentes;
    if (erroPendentesMensais) throw erroPendentesMensais;

    const totalPendente =
      pendentesAvulso.reduce((s, p) => s + Number(p.valor), 0) +
      pendentesMensais.reduce((s, c) => s + Number(c.valor_cobrado), 0);

    res.json({
      hoje: dia,
      semana,
      mes,
      pendente: totalPendente,
      competencia: competencia.slice(0, 7),
      origem_mes,
      taxas_cartao: taxas,
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// GET /api/financeiro/atendimentos?inicio=2026-08-10&fim=2026-08-16
// Lista os atendimentos concluídos no período, com o status de pagamento de
// cada um — usado pra montar o checklist de fechamento (dia/semana).
router.get('/atendimentos', async (req, res) => {
  const { inicio, fim } = req.query;
  if (!inicio || !fim) return res.status(400).json({ erro: 'inicio e fim são obrigatórios.' });

  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, clientes(nome, telefone, tipo_cobranca), servicos(nome), pagamentos(id, status, forma_pagamento)')
    .in('status', ['atendido', 'pendente'])
    .gte('data', inicio)
    .lte('data', fim)
    .order('data')
    .order('hora_inicio');
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

router.post('/fechamento', async (req, res) => {
  try {
    const competenciaStr = req.body?.competencia || hojeBrasilISO().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(competenciaStr)) {
      return res.status(400).json({ erro: 'competencia deve estar no formato YYYY-MM.' });
    }
    const competencia = `${competenciaStr}-01`;
    const d = new Date(competencia + 'T12:00:00');
    const inicio = competencia;
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [
      { data: clientesMensais, error: erroClientes },
      { data: jaFechadas, error: erroExistentes },
    ] = await Promise.all([
      supabase.from('clientes').select('*').eq('ativo', true).in('tipo_cobranca', ['mensal_fixo', 'mensal_por_servico']),
      supabase.from('cobrancas').select('cliente_id').eq('competencia', competencia),
    ]);
    if (erroClientes) throw erroClientes;
    if (erroExistentes) throw erroExistentes;
    const idsJaFechados = new Set(jaFechadas.map((c) => c.cliente_id));

    const candidatos = clientesMensais.filter((cliente) => !idsJaFechados.has(cliente.id));

    const criadas = await Promise.all(
      candidatos.map(async (cliente) => {
        let valor = 0;
        let quantidade = null;

        if (cliente.tipo_cobranca === 'mensal_fixo') {
          valor = Number(cliente.valor_mensal_fixo || 0);
        } else {
          const { data: atendimentos, error: erroAt } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('cliente_id', cliente.id)
            .in('status', ['atendido', 'pendente'])
            .gte('data', inicio)
            .lte('data', fim);
          if (erroAt) throw erroAt;
          quantidade = atendimentos.length;
          valor = quantidade * Number(cliente.valor_por_servico || 0);
        }

        const { data: nova, error: erroInsert } = await supabase
          .from('cobrancas')
          .insert({
            cliente_id: cliente.id,
            competencia,
            tipo: cliente.tipo_cobranca,
            quantidade_atendimentos: quantidade,
            valor_cobrado: valor,
            status: 'pendente',
          })
          .select('*, clientes(nome, telefone)')
          .single();
        if (erroInsert) throw erroInsert;
        return nova;
      })
    );

    res.status(201).json({ competencia: competenciaStr, criadas, ignoradas_ja_fechadas: idsJaFechados.size });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;
import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

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

async function calcularFaturamento(inicio, fim) {
  const { data: atendidos, error: erroAtendidos } = await supabase
    .from('agendamentos')
    .select('valor')
    .eq('status', 'atendido')
    .gte('data', inicio)
    .lte('data', fim);
  if (erroAtendidos) throw erroAtendidos;

  const { data: pagos, error: erroPagos } = await supabase
    .from('pagamentos')
    .select('valor, forma_pagamento, data_pagamento')
    .eq('status', 'pago')
    .gte('data_pagamento', `${inicio}T00:00:00`)
    .lte('data_pagamento', `${fim}T23:59:59`);
  if (erroPagos) throw erroPagos;

  const porFormaPagamento = { pix: 0, dinheiro: 0, credito: 0, debito: 0 };
  for (const p of pagos) {
    if (p.forma_pagamento) porFormaPagamento[p.forma_pagamento] += Number(p.valor);
  }

  return {
    atendimentos_realizados: atendidos.reduce((s, a) => s + Number(a.valor), 0),
    pagamentos_recebidos: pagos.reduce((s, p) => s + Number(p.valor), 0),
    por_forma_pagamento: porFormaPagamento,
  };
}

async function origemPorTipo(inicio, fim, competencia) {
  const { data: cobrancasMes, error: erroCobrancas } = await supabase
    .from('cobrancas')
    .select('valor_cobrado, tipo, status')
    .eq('competencia', competencia);
  if (erroCobrancas) throw erroCobrancas;

  const somaTipo = (tipo, filtroStatus) =>
    cobrancasMes
      .filter((c) => c.tipo === tipo && (!filtroStatus || filtroStatus.includes(c.status)))
      .reduce((s, c) => s + Number(c.valor_cobrado), 0);

  const mensalFixo = {
    cobrado: somaTipo('mensal_fixo'),
    pago: somaTipo('mensal_fixo', ['pago']),
    pendente: somaTipo('mensal_fixo', ['pendente', 'atrasado']),
  };
  const mensalPorServico = {
    cobrado: somaTipo('mensal_por_servico'),
    pago: somaTipo('mensal_por_servico', ['pago']),
    pendente: somaTipo('mensal_por_servico', ['pendente', 'atrasado']),
  };

  const { data: avulsoAtendido, error: erroAvulso } = await supabase
    .from('agendamentos')
    .select('valor, clientes!inner(tipo_cobranca)')
    .eq('status', 'atendido')
    .eq('clientes.tipo_cobranca', 'por_atendimento')
    .gte('data', inicio)
    .lte('data', fim);
  if (erroAvulso) throw erroAvulso;

  const { data: avulsoPago, error: erroAvulsoPago } = await supabase
    .from('pagamentos')
    .select('valor, status, data_pagamento')
    .eq('status', 'pago')
    .gte('data_pagamento', `${inicio}T00:00:00`)
    .lte('data_pagamento', `${fim}T23:59:59`);
  if (erroAvulsoPago) throw erroAvulsoPago;

  const avulso = {
    cobrado: avulsoAtendido.reduce((s, a) => s + Number(a.valor), 0),
    pago: avulsoPago.reduce((s, p) => s + Number(p.valor), 0),
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
    const dataRef = req.query.data || new Date().toISOString().slice(0, 10);
    const { inicio: inicioSemana, fim: fimSemana } = inicioFimSemana(dataRef);
    const { inicio: inicioMes, fim: fimMes } = inicioFimMes(dataRef);
    const competencia = `${inicioMes.slice(0, 7)}-01`;

    const [dia, semana, mes, origem_mes] = await Promise.all([
      calcularFaturamento(dataRef, dataRef),
      calcularFaturamento(inicioSemana, fimSemana),
      calcularFaturamento(inicioMes, fimMes),
      origemPorTipo(inicioMes, fimMes, competencia),
    ]);

    const { data: pendentesAvulso, error: erroPendentes } = await supabase
      .from('pagamentos')
      .select('valor')
      .eq('status', 'pendente');
    if (erroPendentes) throw erroPendentes;

    const { data: pendentesMensais, error: erroPendentesMensais } = await supabase
      .from('cobrancas')
      .select('valor_cobrado')
      .in('status', ['pendente', 'atrasado']);
    if (erroPendentesMensais) throw erroPendentesMensais;

    const totalPendente =
      pendentesAvulso.reduce((s, p) => s + Number(p.valor), 0) +
      pendentesMensais.reduce((s, c) => s + Number(c.valor_cobrado), 0);

    res.json({ hoje: dia, semana, mes, pendente: totalPendente, competencia: competencia.slice(0, 7), origem_mes });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.post('/fechamento', async (req, res) => {
  try {
    const competenciaStr = req.body?.competencia || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(competenciaStr)) {
      return res.status(400).json({ erro: 'competencia deve estar no formato YYYY-MM.' });
    }
    const competencia = `${competenciaStr}-01`;
    const d = new Date(competencia + 'T12:00:00');
    const inicio = competencia;
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

    const { data: clientesMensais, error: erroClientes } = await supabase
      .from('clientes')
      .select('*')
      .eq('ativo', true)
      .in('tipo_cobranca', ['mensal_fixo', 'mensal_por_servico']);
    if (erroClientes) throw erroClientes;

    const { data: jaFechadas, error: erroExistentes } = await supabase
      .from('cobrancas')
      .select('cliente_id')
      .eq('competencia', competencia);
    if (erroExistentes) throw erroExistentes;
    const idsJaFechados = new Set(jaFechadas.map((c) => c.cliente_id));

    const criadas = [];
    for (const cliente of clientesMensais) {
      if (idsJaFechados.has(cliente.id)) continue;

      let valor = 0;
      let quantidade = null;

      if (cliente.tipo_cobranca === 'mensal_fixo') {
        valor = Number(cliente.valor_mensal_fixo || 0);
      } else {
        const { data: atendimentos, error: erroAt } = await supabase
          .from('agendamentos')
          .select('id')
          .eq('cliente_id', cliente.id)
          .eq('status', 'atendido')
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
      criadas.push(nova);
    }

    res.status(201).json({ competencia: competenciaStr, criadas, ignoradas_ja_fechadas: idsJaFechados.size });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;
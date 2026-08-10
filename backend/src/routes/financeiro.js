import { Router } from 'express';
import { supabase } from '../supabaseClient.js';

const router = Router();

function inicioFimSemana(dataRef) {
  const d = new Date(dataRef + 'T12:00:00');
  const diaSemana = d.getDay(); // 0 = domingo
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

// Soma faturamento de "atendimentos realizados" (status = atendido) em um período,
// e separadamente o total de "pagamentos recebidos" (pagamentos.status = pago) no mesmo período.
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

  const porFormaPagamento = { pix: 0, dinheiro: 0, cartao: 0 };
  for (const p of pagos) {
    if (p.forma_pagamento) porFormaPagamento[p.forma_pagamento] += Number(p.valor);
  }

  return {
    atendimentos_realizados: atendidos.reduce((s, a) => s + Number(a.valor), 0),
    pagamentos_recebidos: pagos.reduce((s, p) => s + Number(p.valor), 0),
    por_forma_pagamento: porFormaPagamento,
  };
}

// GET /api/financeiro?data=2026-08-12 -> resumo dia/semana/mês + pendências
router.get('/', async (req, res) => {
  try {
    const dataRef = req.query.data || new Date().toISOString().slice(0, 10);
    const { inicio: inicioSemana, fim: fimSemana } = inicioFimSemana(dataRef);
    const { inicio: inicioMes, fim: fimMes } = inicioFimMes(dataRef);

    const [dia, semana, mes] = await Promise.all([
      calcularFaturamento(dataRef, dataRef),
      calcularFaturamento(inicioSemana, fimSemana),
      calcularFaturamento(inicioMes, fimMes),
    ]);

    const { data: pendentes, error: erroPendentes } = await supabase
      .from('pagamentos')
      .select('valor')
      .eq('status', 'pendente');
    if (erroPendentes) throw erroPendentes;

    const totalPendente = pendentes.reduce((s, p) => s + Number(p.valor), 0);

    res.json({ hoje: dia, semana, mes, pendente: totalPendente });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;

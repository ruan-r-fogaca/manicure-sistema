import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { hojeBrasilISO } from '../utils/horarios.js';

const router = Router();

// GET /api/relatorios/faturamento?meses=6 -> faturado (atendido) por mês, últimos N meses
router.get('/faturamento', async (req, res) => {
  try {
    const meses = Math.min(Math.max(Number(req.query.meses) || 6, 1), 12);
    const hoje = new Date(`${hojeBrasilISO()}T12:00:00`);
    const inicioRange = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1);
    const inicioISO = `${inicioRange.getFullYear()}-${String(inicioRange.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: atendidos, error } = await supabase
      .from('agendamentos')
      .select('data, valor')
      .in('status', ['atendido', 'pendente'])
      .gte('data', inicioISO);
    if (error) return res.status(500).json({ erro: error.message });

    const porMes = {};
    for (let i = 0; i < meses; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1) + i, 1);
      porMes[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    for (const a of atendidos) {
      const chave = a.data.slice(0, 7);
      if (porMes[chave] !== undefined) porMes[chave] += Number(a.valor);
    }

    res.json(Object.entries(porMes).map(([competencia, total]) => ({ competencia, total })));
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// GET /api/relatorios/servicos?inicio=2026-08-01&fim=2026-08-31 -> ranking de serviços mais vendidos no período (padrão: mês atual)
router.get('/servicos', async (req, res) => {
  try {
    const hoje = new Date(`${hojeBrasilISO()}T12:00:00`);
    const inicioPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    const fimPadrao = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().slice(0, 10);
    const inicio = req.query.inicio || inicioPadrao;
    const fim = req.query.fim || fimPadrao;

    const { data, error } = await supabase
      .from('agendamentos')
      .select('valor, servicos(nome, cor)')
      .in('status', ['atendido', 'pendente'])
      .gte('data', inicio)
      .lte('data', fim);
    if (error) return res.status(500).json({ erro: error.message });

    const porServico = {};
    for (const a of data) {
      const nome = a.servicos?.nome || 'Outro';
      if (!porServico[nome]) porServico[nome] = { nome, cor: a.servicos?.cor || '#C14C74', quantidade: 0, valor: 0 };
      porServico[nome].quantidade += 1;
      porServico[nome].valor += Number(a.valor);
    }

    res.json(Object.values(porServico).sort((a, b) => b.valor - a.valor));
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;

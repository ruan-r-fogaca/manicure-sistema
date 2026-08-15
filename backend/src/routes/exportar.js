import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { hojeBrasilISO } from '../utils/horarios.js';

const router = Router();

function paraCsv(linhas) {
  return linhas
    .map((linha) =>
      linha
        .map((campo) => {
          const str = String(campo ?? '');
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    )
    .join('\r\n');
}

function rotuloTipoCobranca(tipo) {
  if (tipo === 'mensal_fixo') return 'Mensal fixo';
  if (tipo === 'mensal_por_servico') return 'Mensal por serviço';
  return 'Avulso';
}

function enviarCsv(res, nomeArquivo, linhas) {
  // BOM no início: sem ele o Excel exibe acentos errados em CSV UTF-8.
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  res.send(`﻿${paraCsv(linhas)}`);
}

// GET /api/exportar/clientes.csv
router.get('/clientes.csv', async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('*').order('nome');
  if (error) return res.status(500).json({ erro: error.message });

  const linhas = [['Nome', 'Telefone', 'Tipo de cobrança', 'Valor mensal', 'Cliente fixa', 'Frequência (dias)', 'Ativo']];
  for (const c of data) {
    const valorMensal =
      c.tipo_cobranca === 'mensal_fixo' ? c.valor_mensal_fixo : c.tipo_cobranca === 'mensal_por_servico' ? c.valor_por_servico : '';
    linhas.push([
      c.nome,
      c.telefone || '',
      rotuloTipoCobranca(c.tipo_cobranca),
      valorMensal ?? '',
      c.cliente_fixa ? 'Sim' : 'Não',
      c.frequencia_dias ?? '',
      c.ativo ? 'Sim' : 'Não',
    ]);
  }
  enviarCsv(res, 'clientes.csv', linhas);
});

// GET /api/exportar/financeiro.csv?competencia=2026-08
router.get('/financeiro.csv', async (req, res) => {
  const competencia = req.query.competencia || hojeBrasilISO().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(competencia)) return res.status(400).json({ erro: 'competencia deve estar no formato YYYY-MM.' });

  const compData = `${competencia}-01`;
  const d = new Date(`${compData}T12:00:00`);
  const inicio = compData;
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [{ data: cobrancas, error: erroCobrancas }, { data: avulsos, error: erroAvulsos }] = await Promise.all([
    supabase.from('cobrancas').select('*, clientes(nome)').eq('competencia', compData),
    supabase
      .from('agendamentos')
      .select('data, valor, clientes!inner(nome, tipo_cobranca), servicos(nome), pagamentos(status, forma_pagamento)')
      .eq('status', 'atendido')
      .eq('clientes.tipo_cobranca', 'por_atendimento')
      .gte('data', inicio)
      .lte('data', fim),
  ]);
  if (erroCobrancas) return res.status(500).json({ erro: erroCobrancas.message });
  if (erroAvulsos) return res.status(500).json({ erro: erroAvulsos.message });

  const linhas = [['Data/Competência', 'Cliente', 'Tipo', 'Descrição', 'Valor', 'Status pagamento', 'Forma de pagamento']];
  for (const c of cobrancas) {
    linhas.push([
      competencia,
      c.clientes?.nome || '',
      rotuloTipoCobranca(c.tipo),
      c.tipo === 'mensal_por_servico' ? `${c.quantidade_atendimentos ?? 0} atendimento(s)` : 'Mensalidade',
      c.valor_cobrado,
      c.status,
      c.forma_pagamento || '',
    ]);
  }
  for (const a of avulsos) {
    const pagamento = a.pagamentos?.[0];
    linhas.push([a.data, a.clientes?.nome || '', 'Avulso', a.servicos?.nome || '', a.valor, pagamento?.status || 'pendente', pagamento?.forma_pagamento || '']);
  }

  enviarCsv(res, `financeiro-${competencia}.csv`, linhas);
});

export default router;

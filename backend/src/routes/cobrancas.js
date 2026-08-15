import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { hojeBrasilISO } from '../utils/horarios.js';

const router = Router();

const VALIDOS_STATUS = ['pendente', 'pago', 'atrasado', 'cancelado'];
const VALIDOS_FORMA = ['pix', 'dinheiro', 'credito', 'debito'];

router.get('/', async (req, res) => {
  let query = supabase
    .from('cobrancas')
    .select('*, clientes(nome, telefone, tipo_cobranca)')
    .order('competencia', { ascending: false });

  if (req.query.competencia) {
    query = query.eq('competencia', `${req.query.competencia}-01`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

// GET /api/cobrancas/vencidas
// Clientes mensais cujo dia_cobranca já chegou (ou passou) neste mês e que
// ainda não têm cobrança paga registrada na competência atual — usado pro
// alerta de mensalidades vencidas/vencendo no Financeiro.
router.get('/vencidas', async (req, res) => {
  try {
    const hoje = hojeBrasilISO();
    const [ano, mes, dia] = hoje.split('-').map(Number);
    const competencia = `${hoje.slice(0, 7)}-01`;
    const ultimoDiaMes = new Date(ano, mes, 0).getDate();

    const [{ data: clientes, error: erroClientes }, { data: cobrancasMes, error: erroCobrancas }] = await Promise.all([
      supabase
        .from('clientes')
        .select('id, nome, telefone, tipo_cobranca, valor_mensal_fixo, valor_por_servico, dia_cobranca')
        .eq('ativo', true)
        .in('tipo_cobranca', ['mensal_fixo', 'mensal_por_servico'])
        .not('dia_cobranca', 'is', null),
      supabase.from('cobrancas').select('cliente_id, status, valor_cobrado').eq('competencia', competencia),
    ]);
    if (erroClientes) throw erroClientes;
    if (erroCobrancas) throw erroCobrancas;

    const cobrancaPorCliente = new Map(cobrancasMes.map((c) => [c.cliente_id, c]));

    const candidatos = clientes.filter((cliente) => {
      const cobranca = cobrancaPorCliente.get(cliente.id);
      if (cobranca?.status === 'pago' || cobranca?.status === 'cancelado') return false;
      const diaVencimento = Math.min(cliente.dia_cobranca, ultimoDiaMes);
      return diaVencimento <= dia;
    });

    const vencidas = await Promise.all(
      candidatos.map(async (cliente) => {
        const cobranca = cobrancaPorCliente.get(cliente.id);
        const diaVencimento = Math.min(cliente.dia_cobranca, ultimoDiaMes);
        const dataVencimento = `${hoje.slice(0, 7)}-${String(diaVencimento).padStart(2, '0')}`;

        let valor = cobranca ? Number(cobranca.valor_cobrado) : Number(cliente.valor_mensal_fixo || 0);
        if (!cobranca && cliente.tipo_cobranca === 'mensal_por_servico') {
          const fim = `${hoje.slice(0, 7)}-${String(ultimoDiaMes).padStart(2, '0')}`;
          const { data: atendimentos } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('cliente_id', cliente.id)
            .eq('status', 'atendido')
            .gte('data', competencia)
            .lte('data', fim);
          valor = (atendimentos?.length || 0) * Number(cliente.valor_por_servico || 0);
        }

        return {
          cliente_id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          valor,
          data_vencimento: dataVencimento,
          status_cobranca: cobranca?.status || 'nao_gerada',
        };
      })
    );

    vencidas.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    res.json(vencidas);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.put('/:id', async (req, res) => {
  const { forma_pagamento, status } = req.body;

  if (status && !VALIDOS_STATUS.includes(status)) return res.status(400).json({ erro: 'status inválido.' });
  if (forma_pagamento && !VALIDOS_FORMA.includes(forma_pagamento)) {
    return res.status(400).json({ erro: 'forma_pagamento inválida.' });
  }

  const payload = {};
  if (forma_pagamento !== undefined) payload.forma_pagamento = forma_pagamento;
  if (status !== undefined) payload.status = status;
  if (status === 'pago') payload.data_pagamento = new Date().toISOString();
  if (status && status !== 'pago') payload.data_pagamento = null;

  const { data, error } = await supabase
    .from('cobrancas')
    .update(payload)
    .eq('id', req.params.id)
    .select('*, clientes(nome, telefone)')
    .single();
  if (error) return res.status(500).json({ erro: error.message });
  res.json(data);
});

export default router;
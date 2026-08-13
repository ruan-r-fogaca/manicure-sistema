import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { hojeBrasilISO } from '../utils/horarios.js';

const router = Router();

// GET /api/dashboard -> resumo do dia atual
router.get('/', async (req, res) => {
  const hoje = req.query.data || hojeBrasilISO();

  const { data: agendamentosHoje, error } = await supabase
    .from('agendamentos')
    .select('*, clientes(nome, telefone), servicos(nome)')
    .eq('data', hoje)
    .neq('status', 'cancelado')
    .order('hora_inicio');

  if (error) return res.status(500).json({ erro: error.message });

  const atendidos = agendamentosHoje.filter((a) => a.status === 'atendido');
  const faturamentoHoje = atendidos.reduce((soma, a) => soma + Number(a.valor), 0);

  const proximo = agendamentosHoje.find((a) => ['agendado', 'confirmado'].includes(a.status));

  // Horários disponíveis restantes hoje (estimativa simplificada: conta slots livres de 30 min no expediente)
  const { data: config } = await supabase.from('configuracoes').select('*').eq('id', 1).single();

  res.json({
    data: hoje,
    total_atendimentos: agendamentosHoje.length,
    atendidos: atendidos.length,
    faturamento_hoje: faturamentoHoje,
    proximo_atendimento: proximo || null,
    agenda_do_dia: agendamentosHoje,
    horarios_funcionamento_hoje: config?.horarios_funcionamento,
  });
});

export default router;

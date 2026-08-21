import { supabase } from '../supabaseClient.js';

export function fimDoMes(competencia) {
  const [ano, mes] = competencia.split('-').map(Number);
  return new Date(ano, mes, 0).toISOString().slice(0, 10);
}

// Conta atendimentos de verdade no mês, ao vivo — uma cobrança mensal_por_servico
// é gerada uma vez com uma "foto" da quantidade, mas a cliente continua sendo
// atendida depois disso. Enquanto não foi paga, quantidade/valor mostrados em
// qualquer tela devem refletir a realidade, não o que existia na geração.
export async function contarAtendimentosNoMes(clienteId, competencia) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('cliente_id', clienteId)
    .in('status', ['atendido', 'pendente'])
    .gte('data', competencia)
    .lte('data', fimDoMes(competencia));
  if (error) throw error;
  return data.length;
}

import { supabase } from '../supabaseClient.js';
import { hojeBrasilISO } from './horarios.js';
import { enviarPushParaTodos } from './push.js';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Cria a notificação só se ainda não existir uma igual (mesmo agendamento +
// tipo) — assim rodar essa checagem toda vez que o app abre não duplica nada.
// Retorna a notificação só quando ela é NOVA (pra saber se manda push ou não).
async function garantirNotificacao({ tipo, titulo, mensagem, agendamento_id }) {
  const { data: existente } = await supabase
    .from('notificacoes')
    .select('id')
    .eq('agendamento_id', agendamento_id)
    .eq('tipo', tipo)
    .maybeSingle();
  if (existente) return null;

  const { data: nova, error } = await supabase
    .from('notificacoes')
    .insert({ tipo, titulo, mensagem, agendamento_id })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return null; // criada em paralelo (corrida rara) — ok, ignora
    throw error;
  }
  return nova;
}

// 3.1 — pagamentos "pendente" cuja data prevista de pagamento já chegou.
async function verificarPagamentosPrevistos() {
  const hoje = hojeBrasilISO();
  // !inner + neq no status do agendamento: se o agendamento foi cancelado
  // depois de marcar "pendente", o pagamento avulso não faz mais sentido.
  const { data: pagamentos, error } = await supabase
    .from('pagamentos')
    .select('id, valor, agendamento_id, agendamentos!inner(status, clientes(nome))')
    .eq('status', 'pendente')
    .not('data_prevista', 'is', null)
    .lte('data_prevista', hoje)
    .neq('agendamentos.status', 'cancelado');
  if (error) throw error;

  const novas = [];
  for (const p of pagamentos) {
    const nome = p.agendamentos?.clientes?.nome || 'Cliente';
    const nova = await garantirNotificacao({
      tipo: 'pagamento_pendente',
      titulo: 'Pagamento previsto pra hoje',
      mensagem: `${nome} tinha combinado de pagar ${formatarMoeda(p.valor)} até hoje.`,
      agendamento_id: p.agendamento_id,
    });
    if (nova) novas.push(nova);
  }
  return novas;
}

// 3.2 — agendamentos de dias já passados que continuam "agendado" (esqueceu
// de atualizar o status depois do atendimento).
async function verificarAgendamentosEsquecidos() {
  const hoje = hojeBrasilISO();
  const { data: agendamentos, error } = await supabase
    .from('agendamentos')
    .select('id, data, hora_inicio, clientes(nome)')
    .eq('status', 'agendado')
    .lt('data', hoje);
  if (error) throw error;

  const novas = [];
  for (const a of agendamentos) {
    const nome = a.clientes?.nome || 'Cliente';
    const dataFormatada = new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR');
    const nova = await garantirNotificacao({
      tipo: 'agendamento_esquecido',
      titulo: 'Agendamento esquecido',
      mensagem: `${nome} · ${dataFormatada} às ${a.hora_inicio?.slice(0, 5)} ainda está como "Agendado". Foi atendida?`,
      agendamento_id: a.id,
    });
    if (nova) novas.push(nova);
  }
  return novas;
}

// Roda as duas checagens, manda push só das notificações realmente novas, e
// devolve a lista completa (recentes primeiro) pra mostrar no sino.
export async function atualizarNotificacoes() {
  const [previstos, esquecidos] = await Promise.all([verificarPagamentosPrevistos(), verificarAgendamentosEsquecidos()]);
  const novas = [...previstos, ...esquecidos];

  await Promise.all(novas.map((n) => enviarPushParaTodos(n.titulo, n.mensagem)));

  const { data: todas, error } = await supabase
    .from('notificacoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50);
  if (error) throw error;
  return todas;
}

// Agrupa agendamentos que foram criados juntos (mesmo grupo_id) num único item
// visual: horário de início do primeiro serviço, término do último, serviços
// concatenados e valor somado. Agendamentos avulsos (sem grupo_id) viram um
// item com 1 único id.
export function agruparAgendamentos(lista) {
  const vistos = new Set();
  const itens = [];

  for (const a of lista) {
    if (vistos.has(a.id)) continue;

    const membros = a.grupo_id ? lista.filter((x) => x.grupo_id === a.grupo_id) : [a];
    membros.forEach((m) => vistos.add(m.id));
    // Ordena por `ordem` (não por horário): quando um serviço no meio do grupo
    // vira o dia, o horário sozinho engana (00:30 é "menor" que 21:30).
    const ordenados = [...membros].sort((x, y) => (x.ordem || 0) - (y.ordem || 0));

    const horaInicio = ordenados[0].hora_inicio;
    const horaFim = ordenados[ordenados.length - 1].hora_fim;

    itens.push({
      ids: ordenados.map((m) => m.id),
      data: a.data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      // Quando o horário "dá a volta" pra depois da meia-noite, o fim fica
      // numericamente menor que o início.
      terminaDiaSeguinte: horaFim <= horaInicio,
      clientes: a.clientes,
      servicosNome: ordenados.map((m) => m.servicos?.nome).filter(Boolean).join(' + '),
      valor: ordenados.reduce((soma, m) => soma + Number(m.valor), 0),
      status: a.status,
      observacao: a.observacao,
    });
  }

  return itens.sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio));
}

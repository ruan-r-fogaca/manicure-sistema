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
    const ordenados = [...membros].sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio));

    itens.push({
      ids: ordenados.map((m) => m.id),
      data: a.data,
      hora_inicio: ordenados[0].hora_inicio,
      hora_fim: ordenados[ordenados.length - 1].hora_fim,
      clientes: a.clientes,
      servicosNome: ordenados.map((m) => m.servicos?.nome).filter(Boolean).join(' + '),
      valor: ordenados.reduce((soma, m) => soma + Number(m.valor), 0),
      status: a.status,
      observacao: a.observacao,
    });
  }

  return itens.sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio));
}

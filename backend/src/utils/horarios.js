// Utilitários de horário: validação de expediente, cálculo de término e checagem de conflitos.

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// Data de "hoje" no fuso do Brasil, independente do fuso do servidor (o Render roda em UTC,
// então new Date().toISOString() "vira o dia" cedo demais à noite).
function hojeBrasilISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Calcula hora_fim a partir de hora_inicio + duração em minutos
function calcularHoraFim(horaInicio, duracaoMinutos) {
  return minutesToTime(timeToMinutes(horaInicio) + Number(duracaoMinutos));
}

// Verifica se o horário [inicio, fim) está dentro do expediente configurado para aquela data
function dentroDoExpediente(dataISO, horaInicio, horaFim, horariosFuncionamento) {
  const diaSemana = DIAS_SEMANA[new Date(dataISO + 'T12:00:00').getDay()];
  const expediente = horariosFuncionamento[diaSemana];

  if (!expediente) {
    return { ok: false, motivo: 'Fechado neste dia da semana.' };
  }

  const inicioMin = timeToMinutes(horaInicio);
  const fimMin = timeToMinutes(horaFim);
  const abreMin = timeToMinutes(expediente.abre);
  const fechaMin = timeToMinutes(expediente.fecha);

  if (inicioMin < abreMin || fimMin > fechaMin) {
    return {
      ok: false,
      motivo: `Fora do horário de funcionamento (${expediente.abre} às ${expediente.fecha}).`,
    };
  }

  return { ok: true };
}

// Verifica sobreposição entre dois intervalos [inicioA,fimA) e [inicioB,fimB)
function haSobreposicao(inicioA, fimA, inicioB, fimB) {
  return timeToMinutes(inicioA) < timeToMinutes(fimB) && timeToMinutes(inicioB) < timeToMinutes(fimA);
}

export { timeToMinutes, minutesToTime, calcularHoraFim, dentroDoExpediente, haSobreposicao, hojeBrasilISO, DIAS_SEMANA };

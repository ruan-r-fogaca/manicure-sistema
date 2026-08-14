// Utilitários de horário: cálculo de término e checagem de conflitos.

// Data de "hoje" no fuso do Brasil, independente do fuso do servidor (o Render roda em UTC,
// então new Date().toISOString() "vira o dia" cedo demais à noite).
function hojeBrasilISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Sempre devolve um horário válido (00:00–23:59): passar de 24h "dá a volta"
// pro início do próximo dia, já que a coluna `time` do banco não aceita 24h+.
function minutesToTime(mins) {
  const minsNoDia = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(minsNoDia / 60).toString().padStart(2, '0');
  const m = (minsNoDia % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Calcula hora_fim a partir de hora_inicio + duração em minutos (sem limite:
// se passar da meia-noite, o horário "dá a volta" pro dia seguinte).
function calcularHoraFim(horaInicio, duracaoMinutos) {
  return minutesToTime(timeToMinutes(horaInicio) + Number(duracaoMinutos));
}

// Verifica sobreposição entre dois intervalos [inicioA,fimA) e [inicioB,fimB).
// Quando o fim é numericamente menor que o início, o intervalo cruzou a
// meia-noite — soma 24h pro fim antes de comparar.
function haSobreposicao(inicioA, fimA, inicioB, fimB) {
  const iA = timeToMinutes(inicioA);
  let fA = timeToMinutes(fimA);
  if (fA <= iA) fA += 1440;
  const iB = timeToMinutes(inicioB);
  let fB = timeToMinutes(fimB);
  if (fB <= iB) fB += 1440;
  return iA < fB && iB < fA;
}

export { timeToMinutes, minutesToTime, calcularHoraFim, haSobreposicao, hojeBrasilISO };

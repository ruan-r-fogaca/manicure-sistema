// Sempre usar hora local (não toISOString, que converte para UTC e "vira o dia"
// à noite em fusos atrás de UTC, como o horário do Brasil).
export function dataParaISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function hojeISO() {
  return dataParaISO(new Date());
}

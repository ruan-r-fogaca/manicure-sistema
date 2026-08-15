const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function dataLocalISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function diaRelativo(dataISO) {
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  if (dataISO === dataLocalISO(hoje)) return 'Hoje';
  if (dataISO === dataLocalISO(amanha)) return 'Amanhã';
  return null;
}

export function formatarDataMensagem(dataISO) {
  const d = new Date(`${dataISO}T12:00:00`);
  const extenso = `${d.getDate()} de ${MESES[d.getMonth()]}`;
  const relativo = diaRelativo(dataISO);
  return relativo ? `(${relativo}) ${extenso}` : extenso;
}

// Substitui {nome}, {data}, {hora}, {servico} pelos dados reais do atendimento.
export function preencherModelo(texto, { nome, data, hora, servico }) {
  return texto
    .replaceAll('{nome}', nome || '')
    .replaceAll('{data}', data || '')
    .replaceAll('{hora}', hora || '')
    .replaceAll('{servico}', servico || '');
}

export function linkWhatsapp(telefone, texto) {
  const numero = (telefone || '').replace(/\D/g, '');
  const numeroComDDI = numero.startsWith('55') ? numero : `55${numero}`;
  return `https://wa.me/${numeroComDDI}?text=${encodeURIComponent(texto)}`;
}

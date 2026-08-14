// Máscara de telefone brasileiro com DDI: 55 99 99999-9999 (celular) ou 55 99 9999-9999 (fixo)
export function mascararTelefone(valor) {
  let numeros = (valor || '').replace(/\D/g, '');
  if (numeros.startsWith('55')) numeros = numeros.slice(2);
  numeros = numeros.slice(0, 11);

  if (numeros.length === 0) return '';
  if (numeros.length <= 2) return `55 ${numeros}`;
  if (numeros.length <= 6) return `55 ${numeros.slice(0, 2)} ${numeros.slice(2)}`;
  if (numeros.length <= 10) {
    return `55 ${numeros.slice(0, 2)} ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return `55 ${numeros.slice(0, 2)} ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}
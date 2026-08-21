import { Banknote, Zap, CreditCard } from 'lucide-react';

export const FORMAS_PAGAMENTO = [
  { valor: 'dinheiro', label: 'Dinheiro', Icone: Banknote, cor: 'text-status-atendido' },
  { valor: 'pix', label: 'Pix', Icone: Zap, cor: 'text-status-confirmado' },
  { valor: 'credito', label: 'Crédito', Icone: CreditCard, cor: 'text-plum-600' },
  { valor: 'debito', label: 'Débito', Icone: CreditCard, cor: 'text-rose-500' },
];

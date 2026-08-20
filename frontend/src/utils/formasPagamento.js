import { Banknote, Zap, CreditCard } from 'lucide-react';

export const FORMAS_PAGAMENTO = [
  { valor: 'dinheiro', label: 'Dinheiro', Icone: Banknote },
  { valor: 'pix', label: 'Pix', Icone: Zap },
  { valor: 'credito', label: 'Crédito', Icone: CreditCard },
  { valor: 'debito', label: 'Débito', Icone: CreditCard },
];

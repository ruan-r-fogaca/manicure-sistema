import { NavLink } from 'react-router-dom';
import { House, CalendarDays, Users, Wallet, Settings } from 'lucide-react';

const itens = [
  { to: '/', label: 'Início', Icone: House, cor: 'text-plum-600', bg: 'bg-plum-600/10' },
  { to: '/agenda', label: 'Agenda', Icone: CalendarDays, cor: 'text-status-confirmado', bg: 'bg-status-confirmado/10' },
  { to: '/clientes', label: 'Clientes', Icone: Users, cor: 'text-rose-500', bg: 'bg-rose-500/10' },
  { to: '/financeiro', label: 'Financeiro', Icone: Wallet, cor: 'text-status-atendido', bg: 'bg-status-atendido/10' },
  { to: '/configuracoes', label: 'Ajustes', Icone: Settings, cor: 'text-status-pendente', bg: 'bg-status-pendente/10' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-base-200 shadow-[0_-4px_14px_rgba(95,32,56,0.06)] flex justify-around items-center py-2 pb-safe z-40 max-w-lg mx-auto">
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${item.cor} ${
              isActive ? item.bg : 'opacity-60'
            }`
          }
        >
          <item.Icone size={20} strokeWidth={2} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

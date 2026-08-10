import { NavLink } from 'react-router-dom';

const itens = [
  { to: '/', label: 'Início', icone: '🏠' },
  { to: '/agenda', label: 'Agenda', icone: '📅' },
  { to: '/clientes', label: 'Clientes', icone: '👥' },
  { to: '/financeiro', label: 'Financeiro', icone: '💰' },
  { to: '/configuracoes', label: 'Ajustes', icone: '⚙️' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-base-200 flex justify-around items-center py-2 pb-safe z-40 max-w-lg mx-auto">
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              isActive ? 'text-plum-600' : 'text-ink/50'
            }`
          }
        >
          <span className="text-lg leading-none">{item.icone}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

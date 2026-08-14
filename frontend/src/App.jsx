import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Agenda from './pages/Agenda.jsx';
import NovoAgendamento from './pages/NovoAgendamento.jsx';
import Clientes from './pages/Clientes.jsx';
import ClienteDetalhes from './pages/ClienteDetalhes.jsx';
import ClientesFixas from './pages/ClientesFixas.jsx';
import Financeiro from './pages/Financeiro.jsx';
import Configuracoes from './pages/Configuracoes.jsx';

export default function App() {
  return (
    <div className="max-w-lg mx-auto min-h-screen bg-base-50 pb-24">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/agenda/novo" element={<NovoAgendamento />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/fixas" element={<ClientesFixas />} />
        <Route path="/clientes/:id" element={<ClienteDetalhes />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
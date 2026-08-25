import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import { Carregando } from './components/Estado.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import { api } from './api/client.js';
import { configurarNotificacoesPush } from './utils/push.js';

const Agenda = lazy(() => import('./pages/Agenda.jsx'));
const NovoAgendamento = lazy(() => import('./pages/NovoAgendamento.jsx'));
const Clientes = lazy(() => import('./pages/Clientes.jsx'));
const ClienteDetalhes = lazy(() => import('./pages/ClienteDetalhes.jsx'));
const Financeiro = lazy(() => import('./pages/Financeiro.jsx'));
const MensalidadesVencidas = lazy(() => import('./pages/MensalidadesVencidas.jsx'));
const FechamentoPDF = lazy(() => import('./pages/FechamentoPDF.jsx'));
const Relatorios = lazy(() => import('./pages/Relatorios.jsx'));
const Lembretes = lazy(() => import('./pages/Lembretes.jsx'));
const Galeria = lazy(() => import('./pages/Galeria.jsx'));
const Configuracoes = lazy(() => import('./pages/Configuracoes.jsx'));

export default function App() {
  const [logado, setLogado] = useState(api.estaLogado());

  useEffect(() => {
    if (logado) configurarNotificacoesPush();
  }, [logado]);

  if (!logado) {
    return <Login onEntrar={() => setLogado(true)} />;
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen app-shell pb-24">
      <Suspense fallback={<Carregando />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/agenda/novo" element={<NovoAgendamento />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalhes />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/financeiro/vencidos" element={<MensalidadesVencidas />} />
          <Route path="/financeiro/fechamento-pdf" element={<FechamentoPDF />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/lembretes" element={<Lembretes />} />
          <Route path="/galeria" element={<Galeria />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </Suspense>
      <BottomNav />
    </div>
  );
}

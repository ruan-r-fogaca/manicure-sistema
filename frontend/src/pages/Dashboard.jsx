import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro } from '../components/Estado.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataExtenso(dataISO) {
  const d = new Date(dataISO + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(setResumo)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8">
      <p className="text-ink/50 text-sm">Olá! 👋</p>
      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-5">
        {resumo && formatarDataExtenso(resumo.data)}
      </h1>

      <Erro mensagem={erro} />

      {resumo && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl2 p-3 text-center shadow-sm border border-base-200">
              <p className="text-xl font-display font-bold text-plum-600">{resumo.total_atendimentos}</p>
              <p className="text-[11px] text-ink/50 mt-0.5">atendimentos</p>
            </div>
            <div className="bg-white rounded-xl2 p-3 text-center shadow-sm border border-base-200">
              <p className="text-xl font-display font-bold text-plum-600">{formatarMoeda(resumo.faturamento_hoje)}</p>
              <p className="text-[11px] text-ink/50 mt-0.5">faturado hoje</p>
            </div>
            <div className="bg-white rounded-xl2 p-3 text-center shadow-sm border border-base-200">
              <p className="text-xl font-display font-bold text-plum-600">{resumo.atendidos}</p>
              <p className="text-[11px] text-ink/50 mt-0.5">concluídos</p>
            </div>
          </div>

          {resumo.proximo_atendimento && (
            <div className="bg-plum-600 text-white rounded-xl2 p-4 mb-6">
              <p className="text-xs uppercase tracking-wide text-white/70 mb-1">Próximo atendimento</p>
              <p className="font-display font-semibold text-lg">
                {resumo.proximo_atendimento.hora_inicio} · {resumo.proximo_atendimento.clientes?.nome}
              </p>
              <p className="text-white/80 text-sm">
                {resumo.proximo_atendimento.servicos?.nome} · {formatarMoeda(resumo.proximo_atendimento.valor)}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Agenda de hoje</h2>
            <Link to="/agenda/novo" className="text-sm font-medium text-plum-600">
              + Novo
            </Link>
          </div>

          {resumo.agenda_do_dia.length === 0 ? (
            <p className="text-sm text-ink/50 py-6 text-center">Nenhum atendimento hoje ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {resumo.agenda_do_dia.map((a) => (
                <div key={a.id} className="bg-white rounded-xl2 p-3 border border-base-200 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">
                      {a.hora_inicio} · {a.clientes?.nome}
                    </p>
                    <p className="text-xs text-ink/50">{a.servicos?.nome}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

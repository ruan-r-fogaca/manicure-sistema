import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Sucesso } from '../components/Estado.jsx';
import StatusSelect from '../components/StatusSelect.jsx';
import PagamentoModal from '../components/PagamentoModal.jsx';
import { usePagamentoFlow } from '../hooks/usePagamentoFlow.js';
import { agruparAgendamentos } from '../utils/agrupar.js';

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
  const [clientesFixasPendentes, setClientesFixasPendentes] = useState([]);

  function carregar() {
    api
      .get('/dashboard')
      .then(setResumo)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));

    // ?apenas_proximas=true -> só quem está a 3 dias ou menos do prazo de voltar
    api
      .get('/clientes/fixas/proximas?apenas_proximas=true')
      .then(setClientesFixasPendentes)
      .catch(() => {}); // aviso opcional, não bloqueia o dashboard se falhar
  }

  useEffect(() => {
    carregar();
  }, []);

  const {
    agendamentoPendente,
    enviando,
    erroModal,
    mensagemSucesso,
    solicitarMudancaStatus,
    confirmarPagamento,
    cancelarPagamento,
  } = usePagamentoFlow({ aoAtualizar: carregar });

  async function mudarStatus(item, status) {
    try {
      await solicitarMudancaStatus(item, status);
    } catch (e) {
      setErro(e.message);
    }
  }

  if (carregando) return <Carregando />;

  const itensHoje = resumo ? agruparAgendamentos(resumo.agenda_do_dia) : [];
  const proximoItem = resumo?.proximo_atendimento
    ? itensHoje.find((it) => it.ids.includes(resumo.proximo_atendimento.id))
    : null;

  return (
    <div className="px-5 pt-8">
      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-5">
        {resumo && formatarDataExtenso(resumo.data)}
      </h1>

      <Erro mensagem={erro} />
      <Sucesso mensagem={mensagemSucesso} />

      {resumo && (
        <>
          <div className="grid grid-cols-[1fr_1.3fr_1fr] gap-3 mb-6">
            <div className="bg-white rounded-xl2 p-3 flex flex-col items-center justify-center text-center shadow-sm border border-base-200">
              <p className="text-xl font-display font-bold text-plum-600">{resumo.total_atendimentos}</p>
              <p className="text-[11px] text-ink/50 mt-0.5">atendimentos</p>
            </div>
            <div className="bg-white rounded-xl2 p-3 flex flex-col items-center justify-center text-center shadow-sm border border-base-200">
              <p className="text-base font-display font-bold text-plum-600 whitespace-nowrap">
                {formatarMoeda(resumo.faturamento_hoje)}
              </p>
              <p className="text-[11px] text-ink/50 mt-0.5">faturado hoje</p>
            </div>
            <div className="bg-white rounded-xl2 p-3 flex flex-col items-center justify-center text-center shadow-sm border border-base-200">
              <p className="text-xl font-display font-bold text-plum-600">{resumo.atendidos}</p>
              <p className="text-[11px] text-ink/50 mt-0.5">concluídos</p>
            </div>
          </div>

          {clientesFixasPendentes.length > 0 && (
            <Link
              to="/clientes/fixas"
              className="flex items-center justify-between bg-rose-400/10 border border-rose-400/30 rounded-xl2 px-4 py-3 mb-4"
            >
              <p className="text-sm font-medium text-rose-500">
                {clientesFixasPendentes.length === 1
                  ? '1 cliente fixa está no prazo de voltar'
                  : `${clientesFixasPendentes.length} clientes fixas estão no prazo de voltar`}
              </p>
              <span className="text-rose-500">→</span>
            </Link>
          )}

          {proximoItem && (
            <div className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-xl2 p-4 mb-6">
              <p className="text-xs uppercase tracking-wide text-white/70 mb-1">Próximo atendimento</p>
              <p className="font-display font-semibold text-lg">
                {proximoItem.hora_inicio}–{proximoItem.hora_fim}
                {proximoItem.terminaDiaSeguinte && ' (dia seguinte)'} · {proximoItem.clientes?.nome}
              </p>
              <p className="text-white/80 text-sm">
                {proximoItem.servicosNome} · {formatarMoeda(proximoItem.valor)}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Agenda de hoje</h2>
            <Link to="/agenda/novo" className="text-sm font-medium text-plum-600">
              + Novo
            </Link>
          </div>

          {itensHoje.length === 0 ? (
            <p className="text-sm text-ink/50 py-6 text-center">Nenhum atendimento hoje ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {itensHoje.map((item) => (
                <div
                  key={item.ids.join('-')}
                  className="bg-white rounded-xl2 p-3 border border-base-200 flex justify-between items-center"
                  style={item.corServico ? { borderLeftColor: item.corServico, borderLeftWidth: '4px' } : undefined}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {item.hora_inicio}–{item.hora_fim}
                      {item.terminaDiaSeguinte && ' (dia seguinte)'} · {item.clientes?.nome}
                    </p>
                    <p className="text-xs text-ink/50">{item.servicosNome}</p>
                    {item.observacao && <p className="text-xs text-ink/40 mt-0.5 italic">obs: {item.observacao}</p>}
                  </div>
                  {/* Tocar no badge de status já deixa trocar pra qualquer outro,
                      sem precisar ir na tela de clientes. */}
                  <StatusSelect status={item.status} onChange={(novoStatus) => mudarStatus(item, novoStatus)} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PagamentoModal
        aberto={!!agendamentoPendente}
        agendamento={agendamentoPendente}
        enviando={enviando}
        erro={erroModal}
        onSelecionar={confirmarPagamento}
        onFechar={cancelarPagamento}
      />
    </div>
  );
}
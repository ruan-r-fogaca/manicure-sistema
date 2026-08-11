import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio, Sucesso } from '../components/Estado.jsx';
import StatusSelect from '../components/StatusSelect.jsx';
import PagamentoModal from '../components/PagamentoModal.jsx';
import MiniCalendario from '../components/MiniCalendario.jsx';
import { usePagamentoFlow } from '../hooks/usePagamentoFlow.js';

const VISOES = ['Hoje', 'Amanhã', 'Semana'];

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

function inicioFimSemana() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - hoje.getDay());
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
}

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataCurta(dataISO) {
  const d = new Date(dataISO + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function formatarDataExtenso(dataISO) {
  const d = new Date(dataISO + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function Agenda() {
  const [visao, setVisao] = useState('Hoje');
  // Quando uma data é escolhida no mini-calendário, ela manda na exibição,
  // até o usuário voltar pras abas Hoje/Amanhã/Semana.
  const [dataEscolhida, setDataEscolhida] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = () => {
    setCarregando(true);
    let promessa;
    if (dataEscolhida) {
      promessa = api.get(`/agendamentos?data=${dataEscolhida}`);
    } else if (visao === 'Hoje') {
      promessa = api.get(`/agendamentos?data=${isoHoje(0)}`);
    } else if (visao === 'Amanhã') {
      promessa = api.get(`/agendamentos?data=${isoHoje(1)}`);
    } else {
      const { inicio, fim } = inicioFimSemana();
      promessa = api.get(`/agendamentos?inicio=${inicio}&fim=${fim}`);
    }
    promessa
      .then(setAgendamentos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visao, dataEscolhida]);

  const {
    agendamentoPendente,
    enviando,
    erroModal,
    mensagemSucesso,
    solicitarMudancaStatus,
    confirmarPagamento,
    cancelarPagamento,
  } = usePagamentoFlow({ aoAtualizar: carregar });

  const agrupadosPorDia = useMemo(() => {
    const grupos = {};
    for (const a of agendamentos) {
      if (!grupos[a.data]) grupos[a.data] = [];
      grupos[a.data].push(a);
    }
    return grupos;
  }, [agendamentos]);

  async function mudarStatus(agendamento, status) {
    try {
      await solicitarMudancaStatus(agendamento, status);
    } catch (e) {
      setErro(e.message);
    }
  }

  function selecionarVisao(v) {
    setDataEscolhida(null);
    setVisao(v);
  }

  function selecionarDataCalendario(iso) {
    setDataEscolhida(iso);
  }

  const mostrarCabecalhoPorDia = visao === 'Semana' && !dataEscolhida;

  return (
    <div className="px-5 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-semibold text-2xl text-plum-600">Agenda</h1>
        <Link
          to="/agenda/novo"
          className="bg-plum-600 text-white text-sm font-medium px-3 py-2 rounded-lg shadow-sm"
        >
          + Novo agendamento
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-2 flex-1">
          {VISOES.map((v) => (
            <button
              key={v}
              onClick={() => selecionarVisao(v)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                !dataEscolhida && visao === v ? 'bg-plum-600 text-white border-plum-600' : 'bg-white text-ink/60 border-base-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <MiniCalendario dataSelecionada={dataEscolhida} onSelecionarData={selecionarDataCalendario} />
      </div>

      {dataEscolhida && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-ink/60">{formatarDataExtenso(dataEscolhida)}</p>
          <button onClick={() => setDataEscolhida(null)} className="text-xs text-plum-600 font-medium">
            Voltar para Hoje
          </button>
        </div>
      )}

      <Erro mensagem={erro} />
      <Sucesso mensagem={mensagemSucesso} />

      {carregando ? (
        <Carregando />
      ) : agendamentos.length === 0 ? (
        <Vazio titulo="Nada por aqui" descricao="Não há agendamentos para esse período." />
      ) : (
        Object.entries(agrupadosPorDia).map(([dia, itens]) => (
          <div key={dia} className="mb-5">
            {mostrarCabecalhoPorDia && (
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-2">
                {formatarDataCurta(dia)}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {itens.map((a) => (
                <div key={a.id} className="bg-white rounded-xl2 p-3 border border-base-200">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <p className="font-medium text-sm">
                        {a.hora_inicio}–{a.hora_fim} · {a.clientes?.nome}
                      </p>
                      <p className="text-xs text-ink/50">
                        {a.servicos?.nome} · {formatarMoeda(a.valor)}
                      </p>
                    </div>
                    <StatusSelect status={a.status} onChange={(novoStatus) => mudarStatus(a, novoStatus)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
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
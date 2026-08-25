import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio, Sucesso } from '../components/Estado.jsx';
import StatusSelect from '../components/StatusSelect.jsx';
import PagamentoModal from '../components/PagamentoModal.jsx';
import MiniCalendario from '../components/MiniCalendario.jsx';
import BarraServicos from '../components/BarraServicos.jsx';
import DataPrevistaModal from '../components/DataPrevistaModal.jsx';
import { usePagamentoFlow } from '../hooks/usePagamentoFlow.js';
import { dataParaISO } from '../utils/data.js';
import { agruparAgendamentos } from '../utils/agrupar.js';
import { Plus, Bell } from 'lucide-react';

const VISOES = ['Hoje', 'Amanhã', 'Semana', 'Mês'];

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return dataParaISO(d);
}

function inicioFimSemana() {
  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - hoje.getDay());
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: dataParaISO(inicio), fim: dataParaISO(fim) };
}

function inicioFimMes() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { inicio: dataParaISO(inicio), fim: dataParaISO(fim) };
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
    } else if (visao === 'Semana') {
      const { inicio, fim } = inicioFimSemana();
      promessa = api.get(`/agendamentos?inicio=${inicio}&fim=${fim}`);
    } else {
      const { inicio, fim } = inicioFimMes();
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
    itemAguardandoData,
    enviando,
    erroModal,
    mensagemSucesso,
    solicitarMudancaStatus,
    confirmarPagamento,
    cancelarPagamento,
    confirmarDataPrevista,
    cancelarDataPrevista,
  } = usePagamentoFlow({ aoAtualizar: carregar });

  const itens = useMemo(() => agruparAgendamentos(agendamentos), [agendamentos]);

  const agrupadosPorDia = useMemo(() => {
    const grupos = {};
    for (const item of itens) {
      if (!grupos[item.data]) grupos[item.data] = [];
      grupos[item.data].push(item);
    }
    return grupos;
  }, [itens]);

  async function mudarStatus(item, status) {
    try {
      await solicitarMudancaStatus(item, status);
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

  const mostrarCabecalhoPorDia = (visao === 'Semana' || visao === 'Mês') && !dataEscolhida;
  const mostrarGuiaMeses = visao === 'Mês' && !dataEscolhida;
  const diasDoMes = Object.keys(agrupadosPorDia);

  function pularParaDia(dia) {
    document.getElementById(`dia-${dia}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="px-5 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-semibold text-2xl text-plum-600">Agenda</h1>
        <Link
          to="/agenda/novo"
          className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 text-sm font-medium px-3 py-2 rounded-lg shadow-sm inline-flex items-center gap-1"
        >
          <Plus size={16} strokeWidth={2.5} /> Novo agendamento
        </Link>
      </div>

      <Link to="/lembretes" className="text-sm font-medium text-plum-600 mb-3 inline-flex items-center gap-1">
        <Bell size={15} strokeWidth={2} /> Lembretes de amanhã
      </Link>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex gap-2 flex-1">
          {VISOES.map((v) => (
            <button
              key={v}
              onClick={() => selecionarVisao(v)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                !dataEscolhida && visao === v ? 'bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 border-plum-600' : 'bg-white text-ink/60 border-base-200'
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
      ) : itens.length === 0 ? (
        <Vazio titulo="Nada por aqui" descricao="Não há agendamentos para esse período." />
      ) : (
        Object.entries(agrupadosPorDia).map(([dia, itensDoDia]) => (
          <div key={dia} id={`dia-${dia}`} className="mb-5 scroll-mt-4">
            {mostrarCabecalhoPorDia && (
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-2">
                {formatarDataCurta(dia)}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {itensDoDia.map((item) => (
                <div key={item.ids.join('-')} className="relative overflow-hidden bg-white rounded-xl2 p-3 border border-base-200">
                  <BarraServicos cores={item.coresServicos} />
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <p className="font-medium text-sm">
                        {item.hora_inicio}–{item.hora_fim}
                        {item.terminaDiaSeguinte && ' (dia seguinte)'} · {item.clientes?.nome}
                      </p>
                      <p className="text-xs text-ink/50">
                        {item.servicosNome} · {formatarMoeda(item.valor)}
                      </p>
                      {item.observacao && <p className="text-xs text-ink/40 mt-0.5 italic">obs: {item.observacao}</p>}
                    </div>
                    <StatusSelect status={item.status} onChange={(novoStatus) => mudarStatus(item, novoStatus)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {mostrarGuiaMeses && diasDoMes.length > 1 && (
        <div className="fixed right-1 top-1/2 -translate-y-1/2 z-30 flex flex-col items-end gap-0.5 max-h-[70vh] overflow-y-auto py-2 px-1">
          {diasDoMes.map((dia) => (
            <button
              key={dia}
              onClick={() => pularParaDia(dia)}
              className="text-[10px] leading-none text-plum-600/70 font-medium px-1 py-0.5 active:text-plum-600 active:font-semibold"
            >
              {dia.slice(8, 10)}
            </button>
          ))}
        </div>
      )}

      <PagamentoModal
        aberto={!!agendamentoPendente}
        agendamento={agendamentoPendente}
        enviando={enviando}
        erro={erroModal}
        onSelecionar={confirmarPagamento}
        onFechar={cancelarPagamento}
      />

      <DataPrevistaModal
        aberto={!!itemAguardandoData}
        agendamento={itemAguardandoData}
        enviando={enviando}
        erro={erroModal}
        onConfirmar={confirmarDataPrevista}
        onFechar={cancelarDataPrevista}
      />
    </div>
  );
}
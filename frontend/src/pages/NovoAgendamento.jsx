import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Erro, Sucesso } from '../components/Estado.jsx';
import PagamentoModal from '../components/PagamentoModal.jsx';
import { usePagamentoFlow } from '../hooks/usePagamentoFlow.js';
import { mascararTelefone } from '../utils/telefone.js';
import { hojeISO } from '../utils/data.js';
import { Plus, Clock } from 'lucide-react';

// Cobre qualquer data/hora no passado (não só "hoje mais cedo"), incluindo dias já passados.
function dataHoraJaPassou(data, horaInicio) {
  const alvo = new Date(`${data}T${horaInicio}:00`);
  return alvo < new Date();
}

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function NovoAgendamento() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);

  const [clienteId, setClienteId] = useState(params.get('cliente') || '');
  const [servicoIds, setServicoIds] = useState([]);
  const [data, setData] = useState(hojeISO());
  const [horaInicio, setHoraInicio] = useState('');
  const [observacao, setObservacao] = useState('');

  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [avisoHorarioPassado, setAvisoHorarioPassado] = useState(false);

  const {
    agendamentoPendente,
    enviando: enviandoPagamento,
    erroModal,
    mensagemSucesso,
    solicitarMudancaStatus,
    confirmarPagamento,
    cancelarPagamento,
  } = usePagamentoFlow({ aoAtualizar: () => {} });

  // Adicionar cliente rápido (botão "+" ao lado do seletor de cliente)
  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState('');

  // Seletor de cliente com busca (abre em modal ao tocar no campo)
  const [mostrarSeletorCliente, setMostrarSeletorCliente] = useState(false);
  const [buscaCliente, setBuscaCliente] = useState('');

  function carregarClientes() {
    return api.get('/clientes').then(setClientes).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregarClientes();
    api.get('/servicos?ativo=true').then(setServicos).catch((e) => setErro(e.message));
  }, []);

  // Trava o scroll da página por trás do modal enquanto ele está aberto.
  useEffect(() => {
    if (!mostrarSeletorCliente) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mostrarSeletorCliente]);

  const servicosSelecionados = servicos.filter((s) => servicoIds.includes(s.id));
  const duracaoTotal = servicosSelecionados.reduce((soma, s) => soma + s.duracao_minutos, 0);
  const valorTotal = servicosSelecionados.reduce((soma, s) => soma + Number(s.preco), 0);

  // Sem limite de horário: se passar da meia-noite, "dá a volta" pro dia seguinte.
  function somarMinutos(hora, minutos) {
    const [h, m] = hora.split(':').map(Number);
    const totalMin = ((h * 60 + m + minutos) % 1440 + 1440) % 1440;
    const hf = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const mf = (totalMin % 60).toString().padStart(2, '0');
    return `${hf}:${mf}`;
  }

  function calcularTermino() {
    if (servicosSelecionados.length === 0 || !horaInicio) return null;
    return somarMinutos(horaInicio, duracaoTotal);
  }

  function terminaNoDiaSeguinte() {
    if (servicosSelecionados.length === 0 || !horaInicio) return false;
    const [h, m] = horaInicio.split(':').map(Number);
    return h * 60 + m + duracaoTotal >= 1440;
  }

  function alternarServico(id) {
    setServicoIds((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]));
  }

  async function handleAdicionarCliente(e) {
    e.preventDefault();
    if (!novoClienteNome.trim()) return;
    setSalvandoCliente(true);
    setErroCliente('');
    try {
      const criado = await api.post('/clientes', {
        nome: novoClienteNome,
        telefone: novoClienteTelefone,
      });
      await carregarClientes();
      setClienteId(criado.id);
      setNovoClienteNome('');
      setNovoClienteTelefone('');
      setMostrarNovoCliente(false);
    } catch (err) {
      setErroCliente(err.message);
    } finally {
      setSalvandoCliente(false);
    }
  }

  async function criarAgendamentos(forcarAtendido) {
    setEnviando(true);
    try {
      const grupoId = servicosSelecionados.length > 1 ? crypto.randomUUID() : null;
      let inicioAtual = horaInicio;
      const idsCriados = [];
      let clienteCriado = null;
      for (let i = 0; i < servicosSelecionados.length; i++) {
        const servico = servicosSelecionados[i];
        const criado = await api.post('/agendamentos', {
          cliente_id: clienteId,
          servico_id: servico.id,
          data,
          hora_inicio: inicioAtual,
          observacao,
          grupo_id: grupoId,
          ordem: i,
        });
        idsCriados.push(criado.id);
        clienteCriado = criado.clientes;
        inicioAtual = somarMinutos(inicioAtual, servico.duracao_minutos);
      }
      if (forcarAtendido) {
        await solicitarMudancaStatus({ ids: idsCriados, clientes: clienteCriado }, 'atendido');
      } else {
        navigate('/agenda');
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!clienteId || servicoIds.length === 0 || !data || !horaInicio) {
      setErro('Preencha cliente, ao menos um serviço, data e horário.');
      return;
    }
    if (dataHoraJaPassou(data, horaInicio)) {
      setAvisoHorarioPassado(true);
      return;
    }
    criarAgendamentos(false);
  }

  const termino = calcularTermino();
  const clienteSelecionado = clientes.find((c) => c.id === clienteId);
  const clientesFiltrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(buscaCliente.trim().toLowerCase())
  );

  return (
    <div className="px-5 pt-8">
      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-5">Novo agendamento</h1>

      <Erro mensagem={erro} />
      <Sucesso mensagem={mensagemSucesso} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-ink/70 mb-1 block">Cliente</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setBuscaCliente('');
                setMostrarSeletorCliente(true);
              }}
              className="flex-1 bg-white border border-base-200 rounded-lg px-3 py-2.5 text-left"
            >
              {clienteSelecionado ? clienteSelecionado.nome : <span className="text-ink/40">Selecione...</span>}
            </button>
            <button
              type="button"
              onClick={() => setMostrarNovoCliente((v) => !v)}
              className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg shrink-0"
              aria-label="Adicionar nova cliente"
              title="Adicionar nova cliente"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          </div>

          {mostrarNovoCliente && (
            <div className="mt-3 bg-plum-600/5 border border-plum-600/20 rounded-xl2 p-3 flex flex-col gap-2">
              <p className="text-sm font-medium text-ink/70">Nova cliente</p>
              {erroCliente && (
                <div className="bg-status-cancelado/10 border border-status-cancelado/30 text-status-cancelado text-xs rounded-lg px-3 py-2">
                  {erroCliente}
                </div>
              )}
              <input
                placeholder="Nome"
                value={novoClienteNome}
                onChange={(e) => setNovoClienteNome(e.target.value)}
                className="border border-base-200 bg-white rounded-lg px-3 py-2.5"
              />
              <input
                placeholder="Telefone"
                value={novoClienteTelefone}
                onChange={(e) => setNovoClienteTelefone(mascararTelefone(e.target.value))}
                className="border border-base-200 bg-white rounded-lg px-3 py-2.5"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdicionarCliente}
                  disabled={salvandoCliente}
                  className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 text-sm font-medium rounded-lg py-2 disabled:opacity-60"
                >
                  {salvandoCliente ? 'Salvando...' : 'Salvar cliente'}
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarNovoCliente(false)}
                  className="flex-1 bg-white border border-base-200 text-sm font-medium rounded-lg py-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-ink/70 mb-1 block">Serviços</label>
          <div className="flex flex-col gap-2 bg-white border border-base-200 rounded-lg px-3 py-2.5">
            {servicos.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={servicoIds.includes(s.id)}
                  onChange={() => alternarServico(s.id)}
                />
                {s.nome} · {formatarMoeda(s.preco)}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-ink/70 mb-1 block">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full bg-white border border-base-200 rounded-lg px-3 py-2.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70 mb-1 block">Horário</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full bg-white border border-base-200 rounded-lg px-3 py-2.5"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink/70 mb-1 block">Observação (opcional)</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
            className="w-full bg-white border border-base-200 rounded-lg px-3 py-2.5"
          />
        </div>

        {servicosSelecionados.length > 0 && horaInicio && (
          <div className="bg-plum-600/5 border border-plum-600/20 rounded-xl2 p-4 text-sm">
            <p className="font-display font-semibold text-plum-600 mb-1">Resumo</p>
            <p>Duração total: {duracaoTotal} min</p>
            <p>Término: {termino}{terminaNoDiaSeguinte() && ' (dia seguinte)'}</p>
            <p>Valor total: {formatarMoeda(valorTotal)}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 font-medium rounded-lg py-3 mt-2 disabled:opacity-60"
        >
          {enviando ? 'Salvando...' : 'Confirmar agendamento'}
        </button>
      </form>

      {avisoHorarioPassado && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl2 p-5 pb-6">
            <h2 className="font-display font-semibold text-lg mb-1 inline-flex items-center gap-1.5">
              <Clock size={18} strokeWidth={2} className="text-status-pendente" /> Esse horário já passou
            </h2>
            <p className="text-sm text-ink/50 mb-4">
              Você está agendando para um horário anterior ao momento atual. Deseja continuar mesmo assim?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAvisoHorarioPassado(false);
                  criarAgendamentos(true);
                }}
                className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-2.5 font-medium"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setAvisoHorarioPassado(false)}
                className="flex-1 bg-base-100 rounded-lg py-2.5 font-medium"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarSeletorCliente && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
          onClick={() => setMostrarSeletorCliente(false)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl2 p-4 h-[75dvh] sm:h-auto sm:max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="font-display font-semibold text-lg">Selecionar cliente</h2>
              <button
                type="button"
                onClick={() => setMostrarSeletorCliente(false)}
                className="text-ink/40 text-xl leading-none px-2"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <input
              autoFocus
              placeholder="Buscar por nome..."
              value={buscaCliente}
              onChange={(e) => setBuscaCliente(e.target.value)}
              className="w-full border border-base-200 bg-white rounded-lg px-3 py-2.5 mb-3 shrink-0"
            />
            <div className="overflow-y-auto overscroll-contain flex-1 flex flex-col gap-1">
              {clientesFiltrados.length === 0 ? (
                <p className="text-sm text-ink/40 text-center py-6">Nenhuma cliente encontrada.</p>
              ) : (
                clientesFiltrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClienteId(c.id);
                      setMostrarSeletorCliente(false);
                    }}
                    className={`text-left px-3 py-2.5 rounded-lg text-sm ${
                      c.id === clienteId ? 'bg-plum-600/10 text-plum-600 font-medium' : 'hover:bg-base-100'
                    }`}
                  >
                    {c.nome}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <PagamentoModal
        aberto={!!agendamentoPendente}
        agendamento={agendamentoPendente}
        enviando={enviandoPagamento}
        erro={erroModal}
        onSelecionar={confirmarPagamento}
        onFechar={cancelarPagamento}
      />
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Erro } from '../components/Estado.jsx';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function NovoAgendamento() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);

  const [clienteId, setClienteId] = useState(params.get('cliente') || '');
  const [servicoId, setServicoId] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [horaInicio, setHoraInicio] = useState('');
  const [observacao, setObservacao] = useState('');

  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get('/clientes').then(setClientes).catch((e) => setErro(e.message));
    api.get('/servicos?ativo=true').then(setServicos).catch((e) => setErro(e.message));
  }, []);

  const servicoSelecionado = servicos.find((s) => s.id === servicoId);

  function calcularTermino() {
    if (!servicoSelecionado || !horaInicio) return null;
    const [h, m] = horaInicio.split(':').map(Number);
    const totalMin = h * 60 + m + servicoSelecionado.duracao_minutos;
    const hf = Math.floor(totalMin / 60)
      .toString()
      .padStart(2, '0');
    const mf = (totalMin % 60).toString().padStart(2, '0');
    return `${hf}:${mf}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!clienteId || !servicoId || !data || !horaInicio) {
      setErro('Preencha cliente, serviço, data e horário.');
      return;
    }
    setEnviando(true);
    try {
      await api.post('/agendamentos', {
        cliente_id: clienteId,
        servico_id: servicoId,
        data,
        hora_inicio: horaInicio,
        observacao,
      });
      navigate('/agenda');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  const termino = calcularTermino();

  return (
    <div className="px-5 pt-8">
      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-5">Novo agendamento</h1>

      <Erro mensagem={erro} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-ink/70 mb-1 block">Cliente</label>
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full bg-white border border-base-200 rounded-lg px-3 py-2.5"
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-ink/70 mb-1 block">Serviço</label>
          <select
            value={servicoId}
            onChange={(e) => setServicoId(e.target.value)}
            className="w-full bg-white border border-base-200 rounded-lg px-3 py-2.5"
          >
            <option value="">Selecione...</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {formatarMoeda(s.preco)}
              </option>
            ))}
          </select>
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

        {servicoSelecionado && horaInicio && (
          <div className="bg-plum-600/5 border border-plum-600/20 rounded-xl2 p-4 text-sm">
            <p className="font-display font-semibold text-plum-600 mb-1">Resumo</p>
            <p>Duração: {servicoSelecionado.duracao_minutos} min</p>
            <p>Término: {termino}</p>
            <p>Valor: {formatarMoeda(servicoSelecionado.preco)}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="bg-plum-600 text-white font-medium rounded-lg py-3 mt-2 disabled:opacity-60"
        >
          {enviando ? 'Salvando...' : 'Confirmar agendamento'}
        </button>
      </form>
    </div>
  );
}

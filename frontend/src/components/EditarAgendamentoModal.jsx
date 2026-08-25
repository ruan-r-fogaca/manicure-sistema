import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Editar o dia, horário e os serviços de um agendamento (avulso ou com vários
// serviços agrupados) — abre ao tocar num card da agenda.
export default function EditarAgendamentoModal({ item, aberto, onFechar, onSalvo }) {
  const [servicos, setServicos] = useState([]);
  const [data, setData] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [servicoIds, setServicoIds] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto || !item) return;
    setErro('');
    setData(item.data);
    setHoraInicio(item.hora_inicio);
    setServicoIds(item.servicoIds || []);
    api.get('/servicos?ativo=true').then(setServicos).catch((e) => setErro(e.message));
  }, [aberto, item]);

  if (!aberto || !item) return null;

  function alternarServico(id) {
    setServicoIds((atual) => (atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]));
  }

  const servicosSelecionados = servicos.filter((s) => servicoIds.includes(s.id));
  const valorTotal = servicosSelecionados.reduce((soma, s) => soma + Number(s.preco), 0);

  async function salvar(e) {
    e.preventDefault();
    if (servicoIds.length === 0) {
      setErro('Selecione ao menos um serviço.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await api.put('/agendamentos/editar-grupo', {
        ids: item.ids,
        data,
        hora_inicio: horaInicio,
        servico_ids: servicoIds,
      });
      onSalvo();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={onFechar}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl2 p-5 pb-6 max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-semibold text-lg mb-1">Editar agendamento</h2>
        <p className="text-sm text-ink/50 mb-4">{item.clientes?.nome}</p>

        {erro && (
          <div className="bg-status-cancelado/10 border border-status-cancelado/30 text-status-cancelado text-sm rounded-lg px-3 py-2 mb-3">
            {erro}
          </div>
        )}

        <form onSubmit={salvar} className="flex flex-col gap-3 overflow-y-auto">
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
            <label className="text-sm font-medium text-ink/70 mb-1 block">Serviços</label>
            <div className="flex flex-col gap-2 bg-white border border-base-200 rounded-lg px-3 py-2.5">
              {servicos.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={servicoIds.includes(s.id)} onChange={() => alternarServico(s.id)} />
                  {s.nome} · {formatarMoeda(s.preco)}
                </label>
              ))}
            </div>
          </div>

          {servicosSelecionados.length > 0 && (
            <p className="text-xs text-ink/50">Valor total: {formatarMoeda(valorTotal)}</p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-2.5 font-medium disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="flex-1 bg-base-100 rounded-lg py-2.5 font-medium disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

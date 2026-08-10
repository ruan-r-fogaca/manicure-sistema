import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatarData(dataISO) {
  return new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function ClienteDetalhes() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});

  function carregar() {
    setCarregando(true);
    Promise.all([api.get(`/clientes/${id}`), api.get(`/clientes/${id}/historico`)])
      .then(([c, h]) => {
        setCliente(c);
        setForm({
          nome: c.nome,
          telefone: c.telefone || '',
          cliente_fixa: c.cliente_fixa,
          frequencia_dias: c.frequencia_dias || '',
        });
        setHistorico(h);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function salvarEdicao(e) {
    e.preventDefault();
    try {
      await api.put(`/clientes/${id}`, {
        ...form,
        frequencia_dias: form.frequencia_dias ? Number(form.frequencia_dias) : null,
      });
      setEditando(false);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  function linkWhatsapp() {
    if (!cliente?.telefone) return '#';
    const numero = cliente.telefone.replace(/\D/g, '');
    const proximo = historico.find((h) => ['agendado', 'confirmado'].includes(h.status));
    const mensagem = proximo
      ? `Oi, ${cliente.nome}! Passando para lembrar do seu horário no dia ${formatarData(proximo.data)} às ${proximo.hora_inicio}. 💅`
      : `Oi, ${cliente.nome}! Tudo bem? 💅`;
    return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
  }

  if (carregando) return <Carregando />;
  if (!cliente) return <Vazio titulo="Cliente não encontrada" />;

  return (
    <div className="px-5 pt-8">
      <Link to="/clientes" className="text-sm text-plum-600 mb-3 inline-block">
        ← Voltar
      </Link>

      <Erro mensagem={erro} />

      {!editando ? (
        <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display font-semibold text-xl">{cliente.nome}</h1>
              <p className="text-sm text-ink/50">{cliente.telefone || 'Sem telefone'}</p>
            </div>
            {cliente.cliente_fixa && (
              <span className="text-[11px] bg-rose-400/15 text-rose-500 font-medium px-2 py-1 rounded-full">
                Fixa · a cada {cliente.frequencia_dias} dias
              </span>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Link
              to={`/agenda/novo?cliente=${cliente.id}`}
              className="flex-1 bg-plum-600 text-white text-sm font-medium text-center rounded-lg py-2.5"
            >
              Novo agendamento
            </Link>
            {cliente.telefone && (
              <a
                href={linkWhatsapp()}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-status-atendido/15 text-status-atendido text-sm font-medium text-center rounded-lg py-2.5"
              >
                Enviar WhatsApp
              </a>
            )}
          </div>
          <button onClick={() => setEditando(true)} className="text-xs text-ink/40 mt-3">
            Editar dados
          </button>
        </div>
      ) : (
        <form onSubmit={salvarEdicao} className="bg-white border border-base-200 rounded-xl2 p-4 mb-5 flex flex-col gap-3">
          <input
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="border border-base-200 rounded-lg px-3 py-2.5"
            placeholder="Nome"
          />
          <input
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="border border-base-200 rounded-lg px-3 py-2.5"
            placeholder="Telefone"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.cliente_fixa}
              onChange={(e) => setForm({ ...form, cliente_fixa: e.target.checked })}
            />
            Cliente fixa
          </label>
          {form.cliente_fixa && (
            <input
              type="number"
              value={form.frequencia_dias}
              onChange={(e) => setForm({ ...form, frequencia_dias: e.target.value })}
              className="border border-base-200 rounded-lg px-3 py-2.5"
              placeholder="Frequência em dias (ex: 15)"
            />
          )}
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-plum-600 text-white rounded-lg py-2.5 font-medium">
              Salvar
            </button>
            <button type="button" onClick={() => setEditando(false)} className="flex-1 bg-base-100 rounded-lg py-2.5 font-medium">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <h2 className="font-display font-semibold text-lg mb-3">Histórico</h2>
      {historico.length === 0 ? (
        <Vazio titulo="Ainda sem atendimentos" />
      ) : (
        <div className="flex flex-col gap-2">
          {historico.map((h) => (
            <div key={h.id} className="bg-white rounded-xl2 p-3 border border-base-200">
              <div className="flex justify-between items-start mb-1">
                <p className="font-medium text-sm">
                  {formatarData(h.data)} · {h.servicos?.nome}
                </p>
                <StatusBadge status={h.status} />
              </div>
              <p className="text-xs text-ink/50">
                {formatarMoeda(h.valor)}
                {h.pagamentos?.[0] && ` · ${h.pagamentos[0].status === 'pago' ? `Pago (${h.pagamentos[0].forma_pagamento || '-'})` : 'Pendente'}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

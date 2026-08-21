import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { mascararTelefone } from '../utils/telefone.js';
import { agruparAgendamentos } from '../utils/agrupar.js';
import { formatarDataMensagem, preencherModelo as preencherModeloTexto, linkWhatsapp } from '../utils/mensagem.js';
import { ArrowLeft } from 'lucide-react';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatarData(dataISO) {
  return new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR');
}

const TIPOS_COBRANCA = [
  { valor: 'por_atendimento', texto: 'Por atendimento (avulso)' },
  { valor: 'mensal_fixo', texto: 'Mensal (valor fixo)' },
  { valor: 'mensal_por_servico', texto: 'Mensal (por serviço realizado)' },
];

function rotuloTipoCobranca(tipo) {
  return TIPOS_COBRANCA.find((t) => t.valor === tipo)?.texto || 'Por atendimento (avulso)';
}

export default function ClienteDetalhes() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [mostrarSeletorMensagem, setMostrarSeletorMensagem] = useState(false);

  function carregar() {
    setCarregando(true);
    Promise.all([api.get(`/clientes/${id}`), api.get(`/clientes/${id}/historico`), api.get('/mensagens')])
      .then(([c, h, m]) => {
        setCliente(c);
        setForm({
          nome: c.nome,
          telefone: c.telefone || '',
          cliente_fixa: c.cliente_fixa,
          frequencia_dias: c.frequencia_dias || '',
          tipo_cobranca: c.tipo_cobranca || 'por_atendimento',
          valor_mensal_fixo: c.valor_mensal_fixo || '',
          valor_por_servico: c.valor_por_servico || '',
          dia_cobranca: c.dia_cobranca || '',
          meta_atendimentos_mes: c.meta_atendimentos_mes || '',
        });
        setHistorico(h);
        setMensagens(m);
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
        valor_mensal_fixo: form.valor_mensal_fixo ? Number(form.valor_mensal_fixo) : null,
        valor_por_servico: form.valor_por_servico ? Number(form.valor_por_servico) : null,
        dia_cobranca: form.dia_cobranca ? Number(form.dia_cobranca) : null,
        meta_atendimentos_mes: form.meta_atendimentos_mes ? Number(form.meta_atendimentos_mes) : null,
      });
      setEditando(false);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function alternarAtivo() {
    if (!cliente) return;
    setAlterandoStatus(true);
    try {
      await api.put(`/clientes/${id}`, { ativo: !cliente.ativo });
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setAlterandoStatus(false);
    }
  }

  function proximoAtendimento() {
    // Agrupa por grupo_id (quando vários serviços foram marcados juntos) e ordena
    // por data+hora pra achar o próximo atendimento de verdade, não o mais distante.
    const itens = agruparAgendamentos(historico).sort((a, b) =>
      a.data === b.data ? a.hora_inicio.localeCompare(b.hora_inicio) : a.data.localeCompare(b.data)
    );
    return itens.find((it) => ['agendado', 'confirmado'].includes(it.status)) || null;
  }

  function mensagemPadrao() {
    const proximo = proximoAtendimento();
    return proximo
      ? `Olá ${cliente.nome}, tudo bem?\nEste é um lembrete para o seu atendimento, dia ${formatarDataMensagem(proximo.data)} às ${proximo.hora_inicio?.slice(0, 5)}.\nServiço: ${proximo.servicosNome}\nPosso confirmar?  Obrigada ❤️`
      : `Oi, ${cliente.nome}! Tudo bem? 💅`;
  }

  function preencherModelo(texto) {
    const proximo = proximoAtendimento();
    return preencherModeloTexto(texto, {
      nome: cliente.nome,
      data: proximo ? formatarDataMensagem(proximo.data) : '',
      hora: proximo ? proximo.hora_inicio?.slice(0, 5) : '',
      servico: proximo ? proximo.servicosNome : '',
    });
  }

  function abrirWhatsapp(texto) {
    window.open(linkWhatsapp(cliente.telefone, texto), '_blank', 'noopener');
    setMostrarSeletorMensagem(false);
  }

  function handleClickWhatsapp() {
    if (mensagens.length === 0) {
      abrirWhatsapp(mensagemPadrao());
    } else {
      setMostrarSeletorMensagem(true);
    }
  }

  if (carregando) return <Carregando />;
  if (!cliente) return <Vazio titulo="Cliente não encontrada" />;

  const inativa = cliente.ativo === false;
  const ehMensal = cliente.tipo_cobranca && cliente.tipo_cobranca !== 'por_atendimento';

  return (
    <div className="px-5 pt-8">
      <Link to="/clientes" className="text-sm text-plum-600 mb-3 inline-flex items-center gap-1">
        <ArrowLeft size={15} strokeWidth={2} /> Voltar
      </Link>

      <Erro mensagem={erro} />

      {!editando ? (
        <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display font-semibold text-xl">{cliente.nome}</h1>
              <p className="text-sm text-ink/50">{cliente.telefone || 'Sem telefone'}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {inativa && (
                <span className="text-[11px] bg-ink/10 text-ink/50 font-medium px-2 py-1 rounded-full">
                  Inativa
                </span>
              )}
              {cliente.cliente_fixa && (
                <span className="text-[11px] bg-rose-400/15 text-rose-500 font-medium px-2 py-1 rounded-full">
                  Fixa · a cada {cliente.frequencia_dias} dias
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 bg-base-100/60 rounded-lg px-3 py-2.5">
            <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">Cobrança</p>
            <p className="text-sm font-medium">{rotuloTipoCobranca(cliente.tipo_cobranca)}</p>
            {cliente.tipo_cobranca === 'mensal_fixo' && (
              <p className="text-xs text-ink/50 mt-0.5">
                {formatarMoeda(cliente.valor_mensal_fixo)} / mês
                {cliente.meta_atendimentos_mes ? ` · meta de ${cliente.meta_atendimentos_mes}/mês` : ''}
              </p>
            )}
            {cliente.tipo_cobranca === 'mensal_por_servico' && (
              <p className="text-xs text-ink/50 mt-0.5">
                {formatarMoeda(cliente.valor_por_servico)} por atendimento no mês
                {cliente.meta_atendimentos_mes ? ` · meta de ${cliente.meta_atendimentos_mes}/mês` : ''}
              </p>
            )}
            {ehMensal && cliente.dia_cobranca && (
              <p className="text-xs text-ink/50 mt-0.5">Cobrança todo dia {cliente.dia_cobranca}</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <Link
              to={`/agenda/novo?cliente=${cliente.id}`}
              className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 text-sm font-medium text-center rounded-lg py-2.5"
            >
              Novo agendamento
            </Link>
            {cliente.telefone && (
              <button
                type="button"
                onClick={handleClickWhatsapp}
                className="flex-1 bg-status-atendido/15 text-status-atendido text-sm font-medium text-center rounded-lg py-2.5"
              >
                Enviar WhatsApp
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <button onClick={() => setEditando(true)} className="text-xs text-ink/40">
              Editar dados
            </button>
            <button
              onClick={alternarAtivo}
              disabled={alterandoStatus}
              className={`text-xs font-medium disabled:opacity-60 ${
                inativa ? 'text-status-atendido' : 'text-status-cancelado'
              }`}
            >
              {alterandoStatus ? 'Aguarde...' : inativa ? 'Reativar cliente' : 'Inativar cliente'}
            </button>
          </div>
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
            onChange={(e) => setForm({ ...form, telefone: mascararTelefone(e.target.value) })}
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

          <div className="border-t border-base-200 pt-3 mt-1">
            <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Tipo de cobrança</p>
            <select
              value={form.tipo_cobranca}
              onChange={(e) => setForm({ ...form, tipo_cobranca: e.target.value })}
              className="border border-base-200 rounded-lg px-3 py-2.5 w-full mb-2"
            >
              {TIPOS_COBRANCA.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>

            {form.tipo_cobranca === 'mensal_fixo' && (
              <input
                type="number"
                step="0.01"
                value={form.valor_mensal_fixo}
                onChange={(e) => setForm({ ...form, valor_mensal_fixo: e.target.value })}
                className="border border-base-200 rounded-lg px-3 py-2.5 w-full mb-2"
                placeholder="Valor mensal fixo (R$)"
              />
            )}
            {form.tipo_cobranca === 'mensal_por_servico' && (
              <input
                type="number"
                step="0.01"
                value={form.valor_por_servico}
                onChange={(e) => setForm({ ...form, valor_por_servico: e.target.value })}
                className="border border-base-200 rounded-lg px-3 py-2.5 w-full mb-2"
                placeholder="Valor por serviço realizado (R$)"
              />
            )}
            {form.tipo_cobranca !== 'por_atendimento' && (
              <>
                <input
                  type="number"
                  min="1"
                  value={form.meta_atendimentos_mes}
                  onChange={(e) => setForm({ ...form, meta_atendimentos_mes: e.target.value })}
                  className="border border-base-200 rounded-lg px-3 py-2.5 w-full mb-2"
                  placeholder="Meta de atendimentos por mês (opcional)"
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.dia_cobranca}
                  onChange={(e) => setForm({ ...form, dia_cobranca: e.target.value })}
                  className="border border-base-200 rounded-lg px-3 py-2.5 w-full"
                  placeholder="Dia da cobrança (opcional, ex: 5)"
                />
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-2.5 font-medium">
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
                {ehMensal
                  ? ' · Incluso na mensalidade'
                  : h.pagamentos?.[0] &&
                    ` · ${h.pagamentos[0].status === 'pago' ? `Pago (${h.pagamentos[0].forma_pagamento || '-'})` : 'Pendente'}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {mostrarSeletorMensagem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl2 p-5 pb-6">
            <h2 className="font-display font-semibold text-lg mb-1">Qual mensagem enviar?</h2>
            <p className="text-sm text-ink/50 mb-4">Escolha um modelo pra {cliente.nome}.</p>
            <div className="flex flex-col gap-2 mb-3">
              {mensagens.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => abrirWhatsapp(preencherModelo(m.texto))}
                  className="bg-base-100 hover:bg-plum-600/10 border border-base-200 rounded-lg py-3 px-3 text-sm font-medium text-left"
                >
                  {m.nome}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMostrarSeletorMensagem(false)}
              className="w-full text-sm text-ink/50 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
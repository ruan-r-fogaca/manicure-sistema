import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Sucesso, Vazio } from '../components/Estado.jsx';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mesAtual() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function formatarCompetencia(comp) {
  const [ano, mes] = comp.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(mes) - 1]}/${ano}`;
}

const STATUS_CONFIG = {
  pendente: { cor: 'text-status-agendado', bg: 'bg-status-agendado/10', texto: 'Pendente' },
  pago: { cor: 'text-status-atendido', bg: 'bg-status-atendido/10', texto: 'Pago' },
  atrasado: { cor: 'text-status-cancelado', bg: 'bg-status-cancelado/10', texto: 'Atrasado' },
  cancelado: { cor: 'text-ink/40', bg: 'bg-ink/10', texto: 'Cancelado' },
};

const FORMAS = ['pix', 'dinheiro', 'credito', 'debito'];

function LinhaCobranca({ cobranca, onAtualizar }) {
  const [salvando, setSalvando] = useState(false);
  const cfg = STATUS_CONFIG[cobranca.status] || STATUS_CONFIG.pendente;

  async function alterarStatus(status) {
    setSalvando(true);
    try {
      await api.put(`/cobrancas/${cobranca.id}`, { status, forma_pagamento: cobranca.forma_pagamento });
      onAtualizar();
    } finally {
      setSalvando(false);
    }
  }

  async function alterarForma(e) {
    const forma_pagamento = e.target.value || null;
    setSalvando(true);
    try {
      await api.put(`/cobrancas/${cobranca.id}`, { forma_pagamento, status: cobranca.status });
      onAtualizar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-white border border-base-200 rounded-xl2 p-3">
      <div className="flex justify-between items-start mb-1.5">
        <div>
          <p className="font-medium text-sm">{cobranca.clientes?.nome}</p>
          <p className="text-xs text-ink/50">
            {cobranca.tipo === 'mensal_fixo'
              ? 'Mensal fixo'
              : `Mensal por serviço · ${cobranca.quantidade_atendimentos ?? 0} atendimento(s)`}
          </p>
        </div>
        <span className={`text-[11px] font-medium px-2 py-1 rounded-full ${cfg.bg} ${cfg.cor}`}>{cfg.texto}</span>
      </div>

      <div className="flex justify-between items-center mt-2">
        <p className="font-display font-semibold text-plum-600">{formatarMoeda(cobranca.valor_cobrado)}</p>
        <div className="flex gap-1.5 items-center">
          <select
            value={cobranca.forma_pagamento || ''}
            onChange={alterarForma}
            disabled={salvando}
            className="text-xs border border-base-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-60"
          >
            <option value="">Forma...</option>
            {FORMAS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          {cobranca.status !== 'pago' ? (
            <button
              onClick={() => alterarStatus('pago')}
              disabled={salvando}
              className="text-xs font-medium bg-status-atendido/15 text-status-atendido px-2.5 py-1.5 rounded-lg disabled:opacity-60"
            >
              Marcar pago
            </button>
          ) : (
            <button
              onClick={() => alterarStatus('pendente')}
              disabled={salvando}
              className="text-xs font-medium bg-ink/10 text-ink/60 px-2.5 py-1.5 rounded-lg disabled:opacity-60"
            >
              Desfazer
            </button>
          )}
          {cobranca.status !== 'atrasado' && cobranca.status !== 'pago' && (
            <button
              onClick={() => alterarStatus('atrasado')}
              disabled={salvando}
              className="text-xs font-medium bg-status-cancelado/10 text-status-cancelado px-2.5 py-1.5 rounded-lg disabled:opacity-60"
            >
              Atrasado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Cobrancas() {
  const [competencia, setCompetencia] = useState(mesAtual());
  const [cobrancas, setCobrancas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  function carregar() {
    setCarregando(true);
    api
      .get(`/cobrancas?competencia=${competencia}`)
      .then(setCobrancas)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  async function gerarFechamento() {
    setGerando(true);
    setErro('');
    setSucesso('');
    try {
      const resultado = await api.post('/financeiro/fechamento', { competencia });
      setSucesso(
        resultado.criadas.length > 0
          ? `${resultado.criadas.length} cobrança(s) gerada(s).`
          : 'Nenhuma cobrança nova (todas já foram fechadas esse mês).'
      );
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
      setTimeout(() => setSucesso(''), 3000);
    }
  }

  const totalGeral = cobrancas.reduce((s, c) => s + Number(c.valor_cobrado), 0);
  const totalPago = cobrancas.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valor_cobrado), 0);

  return (
    <div className="px-5 pt-8 pb-4">
      <Link to="/financeiro" className="text-sm text-plum-600 mb-3 inline-block">
        ← Voltar
      </Link>

      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">Fechamento mensal</h1>
      <p className="text-sm text-ink/50 mb-5">Cobranças dos clientes mensais (fixo ou por serviço).</p>

      <Sucesso mensagem={sucesso} />
      <Erro mensagem={erro} />

      <div className="flex items-center gap-2 mb-4">
        <input
          type="month"
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="border border-base-200 bg-white rounded-lg px-3 py-2.5 flex-1"
        />
        <button
          onClick={gerarFechamento}
          disabled={gerando}
          className="bg-plum-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-60 whitespace-nowrap"
        >
          {gerando ? 'Gerando...' : 'Gerar cobranças'}
        </button>
      </div>

      {cobrancas.length > 0 && (
        <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-4 flex justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">{formatarCompetencia(competencia)}</p>
            <p className="font-display font-semibold text-lg">{formatarMoeda(totalGeral)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">Já recebido</p>
            <p className="font-display font-semibold text-lg text-status-atendido">{formatarMoeda(totalPago)}</p>
          </div>
        </div>
      )}

      {carregando ? (
        <Carregando />
      ) : cobrancas.length === 0 ? (
        <Vazio
          titulo="Nenhuma cobrança nesse mês"
          descricao="Clique em “Gerar cobranças” para fechar o mês dos clientes mensais."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {cobrancas.map((c) => (
            <LinhaCobranca key={c.id} cobranca={c} onAtualizar={carregar} />
          ))}
        </div>
      )}
    </div>
  );
}
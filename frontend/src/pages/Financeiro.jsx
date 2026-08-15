import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Sucesso, Vazio } from '../components/Estado.jsx';
import { agruparAgendamentos } from '../utils/agrupar.js';
import { dataParaISO, hojeISO } from '../utils/data.js';

const ABAS = ['Dia', 'Semana', 'Mês'];

const FORMAS = [
  { valor: 'dinheiro', label: 'Dinheiro', icone: '💵' },
  { valor: 'pix', label: 'Pix', icone: '⚡' },
  { valor: 'credito', label: 'Crédito', icone: '💳' },
  { valor: 'debito', label: 'Débito', icone: '💳' },
];

const STATUS_COBRANCA = {
  pendente: { cor: 'text-status-agendado', bg: 'bg-status-agendado/10', texto: 'Pendente' },
  pago: { cor: 'text-status-atendido', bg: 'bg-status-atendido/10', texto: 'Pago' },
  atrasado: { cor: 'text-status-cancelado', bg: 'bg-status-cancelado/10', texto: 'Atrasado' },
  cancelado: { cor: 'text-ink/40', bg: 'bg-ink/10', texto: 'Cancelado' },
};

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataCurta(dataISO) {
  return new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function inicioFimSemana(dataRef) {
  const d = new Date(dataRef + 'T12:00:00');
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - d.getDay());
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: dataParaISO(inicio), fim: dataParaISO(fim) };
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatarCompetencia(comp) {
  const [ano, mes] = comp.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[Number(mes) - 1]}/${ano}`;
}

function ResumoCard({ dados }) {
  if (!dados) return null;
  return (
    <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-ink/60">Atendimentos realizados</span>
        <span className="font-display font-semibold text-plum-600">{formatarMoeda(dados.atendimentos_realizados)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-ink/60">Recebido</span>
        <span className="font-display font-semibold text-status-atendido">{formatarMoeda(dados.pagamentos_recebidos)}</span>
      </div>
    </div>
  );
}

function PorFormaPagamento({ dados }) {
  if (!dados) return null;
  return (
    <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
      <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Por forma de pagamento</p>
      {FORMAS.map((f) => (
        <div key={f.valor} className="flex justify-between text-sm mb-1 last:mb-0">
          <span>
            {f.icone} {f.label}
          </span>
          <span className="font-medium">{formatarMoeda(dados[f.valor])}</span>
        </div>
      ))}
    </div>
  );
}

function LinhaAtendimento({ item, onMarcarPago }) {
  const [abrirFormas, setAbrirFormas] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function escolher(forma) {
    setSalvando(true);
    try {
      await onMarcarPago(item, forma);
      setAbrirFormas(false);
    } finally {
      setSalvando(false);
    }
  }

  async function desfazer() {
    setSalvando(true);
    try {
      await onMarcarPago(item, null, true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-white rounded-xl2 p-3 border border-base-200">
      <div className="flex justify-between items-start mb-1.5">
        <div>
          <p className="font-medium text-sm">
            {formatarDataCurta(item.data)} · {item.clientes?.nome}
          </p>
          <p className="text-xs text-ink/50">
            {item.servicosNome} · {formatarMoeda(item.valor)}
          </p>
        </div>
        {item.pagamentoStatus === 'incluso' && (
          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-ink/10 text-ink/50 shrink-0">
            Incluso na mensalidade
          </span>
        )}
        {item.pagamentoStatus === 'pago' && (
          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-status-atendido/10 text-status-atendido shrink-0">
            Pago{item.formaPagamento ? ` · ${item.formaPagamento}` : ''}
          </span>
        )}
      </div>

      {item.pagamentoStatus === 'pendente' && (
        <div className="mt-2">
          {!abrirFormas ? (
            <button
              onClick={() => setAbrirFormas(true)}
              className="text-xs font-medium bg-status-agendado/15 text-status-agendado px-2.5 py-1.5 rounded-lg"
            >
              Pendente · Marcar como pago
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {FORMAS.map((f) => (
                <button
                  key={f.valor}
                  disabled={salvando}
                  onClick={() => escolher(f.valor)}
                  className="text-xs font-medium bg-base-100 hover:bg-plum-600/10 border border-base-200 px-2.5 py-1.5 rounded-lg disabled:opacity-60"
                >
                  {f.icone} {f.label}
                </button>
              ))}
              <button
                disabled={salvando}
                onClick={() => setAbrirFormas(false)}
                className="text-xs text-ink/40 px-2 py-1.5"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {item.pagamentoStatus === 'pago' && (
        <button onClick={desfazer} disabled={salvando} className="text-xs text-ink/40 mt-1.5 disabled:opacity-60">
          Desfazer
        </button>
      )}
    </div>
  );
}

function LinhaCobranca({ cobranca, onAtualizar }) {
  const [salvando, setSalvando] = useState(false);
  const cfg = STATUS_COBRANCA[cobranca.status] || STATUS_COBRANCA.pendente;

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
              <option key={f.valor} value={f.valor}>
                {f.label}
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

export default function Financeiro() {
  const [aba, setAba] = useState('Dia');
  const [resumo, setResumo] = useState(null);
  const [itensPeriodo, setItensPeriodo] = useState([]);
  const [competencia, setCompetencia] = useState(mesAtual());
  const [cobrancas, setCobrancas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [qtdVencidas, setQtdVencidas] = useState(0);

  function carregarResumo() {
    return api
      .get('/financeiro')
      .then(setResumo)
      .catch((e) => setErro(e.message));
  }

  function carregarDetalheDia() {
    setCarregandoDetalhe(true);
    const hoje = hojeISO();
    return api
      .get(`/financeiro/atendimentos?inicio=${hoje}&fim=${hoje}`)
      .then((lista) => setItensPeriodo(agruparAgendamentos(lista)))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoDetalhe(false));
  }

  function carregarDetalheSemana() {
    setCarregandoDetalhe(true);
    const { inicio, fim } = inicioFimSemana(hojeISO());
    return api
      .get(`/financeiro/atendimentos?inicio=${inicio}&fim=${fim}`)
      .then((lista) => setItensPeriodo(agruparAgendamentos(lista)))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoDetalhe(false));
  }

  function carregarCobrancas() {
    setCarregandoDetalhe(true);
    return api
      .get(`/cobrancas?competencia=${competencia}`)
      .then(setCobrancas)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregandoDetalhe(false));
  }

  useEffect(() => {
    setCarregando(true);
    carregarResumo().finally(() => setCarregando(false));
    api
      .get('/cobrancas/vencidas')
      .then((lista) => setQtdVencidas(lista.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (aba === 'Dia') carregarDetalheDia();
    else if (aba === 'Semana') carregarDetalheSemana();
    else if (aba === 'Mês') carregarCobrancas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, competencia]);

  async function marcarPago(item, forma, desfazer = false) {
    try {
      await Promise.all(
        item.pagamentoIds.map((id) =>
          api.put(`/pagamentos/${id}`, desfazer ? { status: 'pendente', forma_pagamento: null } : { status: 'pago', forma_pagamento: forma })
        )
      );
      await Promise.all([carregarResumo(), aba === 'Dia' ? carregarDetalheDia() : carregarDetalheSemana()]);
    } catch (e) {
      setErro(e.message);
    }
  }

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
      await Promise.all([carregarCobrancas(), carregarResumo()]);
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerando(false);
      setTimeout(() => setSucesso(''), 3000);
    }
  }

  if (carregando) return <Carregando />;

  const dadosAba = aba === 'Dia' ? resumo?.hoje : aba === 'Semana' ? resumo?.semana : resumo?.mes;
  const totalGeralMes = cobrancas.reduce((s, c) => s + Number(c.valor_cobrado), 0);
  const totalPagoMes = cobrancas.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valor_cobrado), 0);

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-start justify-between mb-5">
        <h1 className="font-display font-semibold text-2xl text-plum-600">Financeiro</h1>
        <div className="flex flex-col items-end gap-2">
          <Link to="/relatorios" className="text-sm font-medium text-plum-600">
            📊 Relatórios
          </Link>
          <Link
            to="/financeiro/vencidos"
            className="relative text-lg leading-none"
            aria-label={qtdVencidas > 0 ? `${qtdVencidas} mensalidade(s) vencida(s)` : 'Mensalidades vencidas'}
            title="Mensalidades vencidas"
          >
            🔔
            {qtdVencidas > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-status-cancelado rounded-full border border-white" />
            )}
          </Link>
        </div>
      </div>

      <Erro mensagem={erro} />
      <Sucesso mensagem={sucesso} />

      <div className="flex gap-2 mb-4">
        {ABAS.map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
              aba === a ? 'bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 border-plum-600' : 'bg-white text-ink/60 border-base-200'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      <ResumoCard dados={dadosAba} />

      {resumo && (
        <div className="bg-status-agendado/10 border border-status-agendado/30 rounded-xl2 p-4 mb-3">
          <p className="text-sm text-ink/70">Total pendente de recebimento (avulso)</p>
          <p className="font-display font-semibold text-lg">{formatarMoeda(resumo.pendente)}</p>
        </div>
      )}

      {(aba === 'Dia' || aba === 'Semana') && (
        <>
          <PorFormaPagamento dados={dadosAba?.por_forma_pagamento} />

          <h2 className="font-display font-semibold text-lg mb-3 mt-5">
            {aba === 'Dia' ? 'Atendimentos de hoje' : 'Atendimentos da semana'}
          </h2>
          {carregandoDetalhe ? (
            <Carregando />
          ) : itensPeriodo.length === 0 ? (
            <Vazio titulo="Nenhum atendimento" descricao="Ainda não há atendimentos concluídos nesse período." />
          ) : (
            <div className="flex flex-col gap-2">
              {itensPeriodo.map((item) => (
                <LinhaAtendimento key={item.ids.join('-')} item={item} onMarcarPago={marcarPago} />
              ))}
            </div>
          )}
        </>
      )}

      {aba === 'Mês' && (
        <>
          {resumo?.origem_mes && (
            <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
              <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Origem da receita do mês</p>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-ink/70">Avulso (por atendimento)</span>
                <span className="text-sm font-medium">{formatarMoeda(resumo.origem_mes.avulso.cobrado)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-ink/70">Mensal (planos)</span>
                <span className="text-sm font-medium">
                  {formatarMoeda(resumo.origem_mes.mensal_fixo.cobrado + resumo.origem_mes.mensal_por_servico.cobrado)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-base-200">
                <span className="text-sm font-medium">Total do mês</span>
                <span className="font-display font-semibold text-plum-600">{formatarMoeda(resumo.origem_mes.total_cobrado)}</span>
              </div>
            </div>
          )}

          <h2 className="font-display font-semibold text-lg mb-1 mt-5">Fechamento das mensalidades</h2>
          <p className="text-xs text-ink/50 mb-3">Gere as cobranças do mês pras clientes com plano mensal.</p>

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
              className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-60 whitespace-nowrap"
            >
              {gerando ? 'Gerando...' : 'Gerar cobranças'}
            </button>
          </div>

          <div className="flex flex-col gap-1 mb-4">
            <a
              href={api.urlCompleta(`/exportar/financeiro.csv?competencia=${competencia}`)}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-plum-600 inline-block"
            >
              ⬇️ Exportar {formatarCompetencia(competencia)} (CSV)
            </a>
            <Link
              to={`/financeiro/fechamento-pdf?competencia=${competencia}`}
              className="text-sm font-medium text-plum-600 inline-block"
            >
              🖨️ Fechamento {formatarCompetencia(competencia)} (PDF)
            </Link>
          </div>

          {cobrancas.length > 0 && (
            <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-4 flex justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">{formatarCompetencia(competencia)}</p>
                <p className="font-display font-semibold text-lg">{formatarMoeda(totalGeralMes)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-ink/40 mb-1">Já recebido</p>
                <p className="font-display font-semibold text-lg text-status-atendido">{formatarMoeda(totalPagoMes)}</p>
              </div>
            </div>
          )}

          {carregandoDetalhe ? (
            <Carregando />
          ) : cobrancas.length === 0 ? (
            <Vazio
              titulo="Nenhuma cobrança nesse mês"
              descricao='Clique em "Gerar cobranças" para fechar o mês das clientes mensais.'
            />
          ) : (
            <div className="flex flex-col gap-2">
              {cobrancas.map((c) => (
                <LinhaCobranca key={c.id} cobranca={c} onAtualizar={() => Promise.all([carregarCobrancas(), carregarResumo()])} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

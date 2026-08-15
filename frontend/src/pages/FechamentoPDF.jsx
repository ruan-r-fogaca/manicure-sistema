import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro } from '../components/Estado.jsx';

const FORMAS = [
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'pix', label: 'Pix' },
  { valor: 'credito', label: 'Crédito' },
  { valor: 'debito', label: 'Débito' },
];

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatarCompetenciaExtenso(comp) {
  const [ano, mes] = comp.split('-');
  return `${NOMES_MES[Number(mes) - 1]} de ${ano}`;
}

export default function FechamentoPDF() {
  const [searchParams] = useSearchParams();
  const competencia = searchParams.get('competencia') || mesAtual();
  const [resumo, setResumo] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [atendimentos, setAtendimentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const [ano, mes] = competencia.split('-').map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const inicio = `${competencia}-01`;
    const fim = `${competencia}-${String(ultimoDia).padStart(2, '0')}`;

    // dia 15 garante cair dentro do mês escolhido independente de quantos dias ele tem
    Promise.all([
      api.get(`/financeiro?data=${competencia}-15`),
      api.get(`/cobrancas?competencia=${competencia}`),
      api.get(`/financeiro/atendimentos?inicio=${inicio}&fim=${fim}`),
    ])
      .then(([r, c, a]) => {
        setResumo(r);
        setCobrancas(c);
        setAtendimentos(a);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [competencia]);

  if (carregando) return <Carregando />;

  const pendenteTotal = Math.max(
    0,
    (resumo?.origem_mes?.total_cobrado || 0) - (resumo?.origem_mes?.total_pago || 0)
  );

  // Recebido por forma de pagamento, só do que efetivamente compõe a receita do mês:
  // atendimentos avulsos pagos + mensalidades pagas (evita contar visita de mensalista
  // junto com atendimento avulso, que infla o total sem representar dinheiro extra).
  const recebidoPorForma = { dinheiro: 0, pix: 0, credito: 0, debito: 0 };
  for (const a of atendimentos) {
    if (a.clientes?.tipo_cobranca !== 'por_atendimento') continue;
    const pagamentoPago = a.pagamentos?.find((p) => p.status === 'pago');
    if (pagamentoPago?.forma_pagamento && recebidoPorForma[pagamentoPago.forma_pagamento] !== undefined) {
      recebidoPorForma[pagamentoPago.forma_pagamento] += Number(a.valor);
    }
  }
  for (const c of cobrancas) {
    if (c.status === 'pago' && c.forma_pagamento && recebidoPorForma[c.forma_pagamento] !== undefined) {
      recebidoPorForma[c.forma_pagamento] += Number(c.valor_cobrado);
    }
  }

  return (
    <div className="px-5 pt-8 pb-12 max-w-xl mx-auto">
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link to="/financeiro" className="text-sm text-plum-600 font-medium">
          ← Voltar
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 text-sm font-medium px-4 py-2.5 rounded-lg"
        >
          🖨️ Salvar / Imprimir PDF
        </button>
      </div>

      <Erro mensagem={erro} />

      <div className="text-center mb-6">
        <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">Fechamento financeiro</h1>
        <p className="text-sm text-ink/60">{formatarCompetenciaExtenso(competencia)}</p>
      </div>

      <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
        <div className="flex justify-between py-1">
          <span className="text-sm text-ink/70">Total recebido no mês</span>
          <span className="font-display font-semibold text-status-atendido">
            {formatarMoeda(resumo?.origem_mes?.total_pago)}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-sm text-ink/70">Total cobrado no mês</span>
          <span className="font-display font-semibold">{formatarMoeda(resumo?.origem_mes?.total_cobrado)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-sm text-ink/70">Ainda pendente de recebimento</span>
          <span className="font-display font-semibold text-status-cancelado">
            {formatarMoeda(pendenteTotal)}
          </span>
        </div>
      </div>

      {resumo?.origem_mes && (
        <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
          <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Origem da receita</p>
          <div className="flex justify-between py-1">
            <span className="text-sm">Avulso (por atendimento)</span>
            <span className="text-sm font-medium">{formatarMoeda(resumo.origem_mes.avulso.cobrado)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm">Mensalidades (planos)</span>
            <span className="text-sm font-medium">
              {formatarMoeda(resumo.origem_mes.mensal_fixo.cobrado + resumo.origem_mes.mensal_por_servico.cobrado)}
            </span>
          </div>
          <div className="flex justify-between pt-2 mt-1 border-t border-base-200">
            <span className="text-sm font-medium">Total do mês</span>
            <span className="font-display font-semibold text-plum-600">{formatarMoeda(resumo.origem_mes.total_cobrado)}</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
        <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Recebido por forma de pagamento</p>
        {FORMAS.map((f) => (
          <div key={f.valor} className="flex justify-between text-sm py-1">
            <span>{f.label}</span>
            <span className="font-medium">{formatarMoeda(recebidoPorForma[f.valor])}</span>
          </div>
        ))}
      </div>

      <p className="text-xs uppercase tracking-wide text-ink/40 mb-2 mt-5">
        Mensalidades de {formatarCompetenciaExtenso(competencia)}
      </p>
      {cobrancas.length === 0 ? (
        <p className="text-sm text-ink/40 mb-3">Nenhuma mensalidade gerada nesse mês.</p>
      ) : (
        <div className="border border-base-200 rounded-xl2 overflow-hidden mb-3">
          {cobrancas.map((c, i) => (
            <div
              key={c.id}
              className={`flex justify-between items-center px-3 py-2 text-sm ${i % 2 ? 'bg-base-100/60' : 'bg-white'}`}
            >
              <span>{c.clientes?.nome}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-ink/40 capitalize">{c.status}</span>
                <span className="font-medium">{formatarMoeda(c.valor_cobrado)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-ink/30 text-center mt-8">
        Emitido em {new Date().toLocaleDateString('pt-BR')} pelo sistema de agendamentos.
      </p>
    </div>
  );
}

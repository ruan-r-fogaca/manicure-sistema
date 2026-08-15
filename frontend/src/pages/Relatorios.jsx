import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarMoedaCurta(v) {
  const n = Number(v || 0);
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return String(Math.round(n));
}

function mesAbrev(competencia) {
  const [, mes] = competencia.split('-');
  return MESES_ABREV[Number(mes) - 1];
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function GraficoFaturamento({ dados }) {
  const max = Math.max(...dados.map((d) => d.total), 1);
  const largura = 320;
  const altura = 130;
  const espacamento = 8;
  const larguraBarra = (largura - espacamento * (dados.length - 1)) / dados.length;

  return (
    <svg viewBox={`0 0 ${largura} ${altura + 34}`} className="w-full h-auto" role="img" aria-label="Faturamento por mês">
      {dados.map((d, i) => {
        const h = d.total > 0 ? Math.max((d.total / max) * altura, 3) : 0;
        const x = i * (larguraBarra + espacamento);
        const y = altura - h;
        return (
          <g key={d.competencia}>
            <rect x={x} y={y} width={larguraBarra} height={h} rx={4} fill="#7A2E4A" />
            <text x={x + larguraBarra / 2} y={altura + 15} textAnchor="middle" fontSize="9" fill="#2B2320" opacity="0.55">
              {mesAbrev(d.competencia)}
            </text>
            {d.total > 0 && (
              <text x={x + larguraBarra / 2} y={y - 4} textAnchor="middle" fontSize="8.5" fill="#5F2038" fontWeight="600">
                {formatarMoedaCurta(d.total)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ListaServicos({ dados }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div className="flex flex-col gap-3">
      {dados.map((s) => (
        <div key={s.nome}>
          <div className="flex justify-between items-baseline text-sm mb-1">
            <span className="font-medium">{s.nome}</span>
            <span className="text-xs text-ink/50 shrink-0 ml-2">
              {s.quantidade}x · {formatarMoeda(s.valor)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-base-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(s.valor / max) * 100}%`, backgroundColor: s.cor || '#C14C74' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Relatorios() {
  const [faturamento, setFaturamento] = useState(null);
  const [servicos, setServicos] = useState(null);
  const [mesServicos, setMesServicos] = useState(mesAtual());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/relatorios/faturamento?meses=6')
      .then(setFaturamento)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => {
    const inicio = `${mesServicos}-01`;
    const [ano, mes] = mesServicos.split('-').map(Number);
    const fim = new Date(ano, mes, 0).toISOString().slice(0, 10);
    api
      .get(`/relatorios/servicos?inicio=${inicio}&fim=${fim}`)
      .then(setServicos)
      .catch((e) => setErro(e.message));
  }, [mesServicos]);

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8 pb-8">
      <Link to="/financeiro" className="text-sm text-plum-600 mb-3 inline-block">
        ← Voltar
      </Link>

      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-5">Relatórios</h1>

      <Erro mensagem={erro} />

      <h2 className="font-display font-semibold text-lg mb-3">Faturamento por mês</h2>
      <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-6">
        {faturamento && faturamento.some((d) => d.total > 0) ? (
          <GraficoFaturamento dados={faturamento} />
        ) : (
          <p className="text-sm text-ink/40 text-center py-8">Ainda sem atendimentos concluídos nesse período.</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-lg">Serviços mais vendidos</h2>
        <input
          type="month"
          value={mesServicos}
          onChange={(e) => setMesServicos(e.target.value)}
          className="border border-base-200 bg-white rounded-lg px-2 py-1.5 text-sm"
        />
      </div>
      <div className="bg-white border border-base-200 rounded-xl2 p-4">
        {servicos === null ? (
          <Carregando />
        ) : servicos.length === 0 ? (
          <Vazio titulo="Nenhum atendimento nesse mês" />
        ) : (
          <ListaServicos dados={servicos} />
        )}
      </div>
    </div>
  );
}

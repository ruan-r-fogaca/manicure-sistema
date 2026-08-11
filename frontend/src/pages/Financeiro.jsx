import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Carregando, Erro } from '../components/Estado.jsx';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function CardPeriodo({ titulo, dados }) {
  return (
    <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
      <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">{titulo}</p>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-ink/60">Atendimentos realizados</span>
        <span className="font-display font-semibold text-plum-600">{formatarMoeda(dados.atendimentos_realizados)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-ink/60">Pagamentos recebidos</span>
        <span className="font-display font-semibold text-status-atendido">{formatarMoeda(dados.pagamentos_recebidos)}</span>
      </div>
    </div>
  );
}

export default function Financeiro() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/financeiro')
      .then(setDados)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8">
      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-5">Financeiro</h1>

      <Erro mensagem={erro} />

      {dados && (
        <>
          <CardPeriodo titulo="Hoje" dados={dados.hoje} />
          <CardPeriodo titulo="Esta semana" dados={dados.semana} />
          <CardPeriodo titulo="Este mês" dados={dados.mes} />

          <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-3">
            <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Por forma de pagamento (mês)</p>
            <div className="flex justify-between text-sm mb-1">
              <span>Pix</span>
              <span className="font-medium">{formatarMoeda(dados.mes.por_forma_pagamento.pix)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Dinheiro</span>
              <span className="font-medium">{formatarMoeda(dados.mes.por_forma_pagamento.dinheiro)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>Crédito</span>
              <span className="font-medium">{formatarMoeda(dados.mes.por_forma_pagamento.credito)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Débito</span>
              <span className="font-medium">{formatarMoeda(dados.mes.por_forma_pagamento.debito)}</span>
            </div>
          </div>

          <div className="bg-status-agendado/10 border border-status-agendado/30 rounded-xl2 p-4">
            <p className="text-sm text-ink/70">Total pendente de recebimento</p>
            <p className="font-display font-semibold text-lg">{formatarMoeda(dados.pendente)}</p>
          </div>
        </>
      )}
    </div>
  );
}
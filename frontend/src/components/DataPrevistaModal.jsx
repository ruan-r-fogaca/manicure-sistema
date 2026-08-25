import { useState } from 'react';

function mesQueVem() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// Aparece toda vez que um atendimento é marcado como "pendente" — pergunta
// quando o pagamento é esperado, pra avisar no sino quando o dia chegar.
export default function DataPrevistaModal({ agendamento, aberto, enviando, erro, onConfirmar, onFechar }) {
  const [dataEscolhida, setDataEscolhida] = useState('');

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl2 p-5 pb-6">
        <h2 className="font-display font-semibold text-lg mb-1">Quando ela vai pagar?</h2>
        <p className="text-sm text-ink/50 mb-4">
          {agendamento?.clientes?.nome
            ? `Pra te avisar quando chegar a data combinada com ${agendamento.clientes.nome}.`
            : 'Pra te avisar quando chegar a data combinada.'}
        </p>

        {erro && (
          <div className="bg-status-cancelado/10 border border-status-cancelado/30 text-status-cancelado text-sm rounded-lg px-3 py-2 mb-3">
            {erro}
          </div>
        )}

        <div className="flex flex-col gap-2 mb-3">
          <button
            type="button"
            disabled={enviando}
            onClick={() => onConfirmar(mesQueVem())}
            className="bg-base-100 hover:bg-plum-600/10 border border-base-200 rounded-lg py-3 text-sm font-medium disabled:opacity-60"
          >
            Mês que vem
          </button>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dataEscolhida}
              onChange={(e) => setDataEscolhida(e.target.value)}
              className="flex-1 border border-base-200 bg-white rounded-lg px-3 py-2.5 text-sm"
            />
            <button
              type="button"
              disabled={enviando || !dataEscolhida}
              onClick={() => onConfirmar(dataEscolhida)}
              className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              Confirmar
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onFechar}
          disabled={enviando}
          className="w-full text-sm text-ink/50 py-2 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

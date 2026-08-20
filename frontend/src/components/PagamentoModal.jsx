import { FORMAS_PAGAMENTO as FORMAS } from '../utils/formasPagamento.js';

// Aparece toda vez que um atendimento é marcado como "atendido".
// Some sozinho depois de escolher a forma de pagamento.
export default function PagamentoModal({ agendamento, aberto, enviando, erro, onSelecionar, onFechar }) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl2 p-5 pb-6">
        <h2 className="font-display font-semibold text-lg mb-1">Forma de pagamento</h2>
        <p className="text-sm text-ink/50 mb-4">
          {agendamento?.clientes?.nome
            ? `Como ${agendamento.clientes.nome} pagou esse atendimento?`
            : 'Como a cliente pagou esse atendimento?'}
        </p>

        {erro && (
          <div className="bg-status-cancelado/10 border border-status-cancelado/30 text-status-cancelado text-sm rounded-lg px-3 py-2 mb-3">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3">
          {FORMAS.map((f) => (
            <button
              key={f.valor}
              type="button"
              disabled={enviando}
              onClick={() => onSelecionar(f.valor)}
              className="bg-base-100 hover:bg-plum-600/10 border border-base-200 rounded-lg py-3 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              <f.Icone size={18} strokeWidth={2} />
              {f.label}
            </button>
          ))}
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
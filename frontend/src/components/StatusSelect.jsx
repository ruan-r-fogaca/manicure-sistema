const CONFIG = {
  agendado: { cor: '#C9A66B', texto: 'Agendado' },
  confirmado: { cor: '#4F86A6', texto: 'Confirmado' },
  atendido: { cor: '#5B9279', texto: 'Atendido' },
  cancelado: { cor: '#A65C5C', texto: 'Cancelado' },
  pendente: { cor: '#D98E4A', texto: 'Pendente' },
};

const OPCOES = ['agendado', 'confirmado', 'atendido', 'cancelado', 'pendente'];

// Igual ao StatusBadge visualmente, mas é um <select> de verdade por baixo:
// tocar no "ícone"/badge já abre as opções e troca o status na hora, sem
// precisar ir pra outra tela.
export default function StatusSelect({ status, onChange, disabled = false }) {
  const cfg = CONFIG[status] || CONFIG.agendado;
  return (
    <div className="relative inline-flex items-center">
      <span
        className="w-2 h-2 rounded-full absolute left-2 pointer-events-none"
        style={{ backgroundColor: cfg.cor }}
      />
      <select
        value={status}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none cursor-pointer text-xs font-medium pl-5 pr-2 py-1 rounded-full bg-base-100 text-ink/80 border-none disabled:opacity-60"
      >
        {OPCOES.map((o) => (
          <option key={o} value={o}>
            {CONFIG[o].texto}
          </option>
        ))}
      </select>
    </div>
  );
}
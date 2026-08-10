const CONFIG = {
  agendado: { cor: '#C9A66B', texto: 'Agendado' },
  confirmado: { cor: '#4F86A6', texto: 'Confirmado' },
  atendido: { cor: '#5B9279', texto: 'Atendido' },
  cancelado: { cor: '#A65C5C', texto: 'Cancelado' },
  faltou: { cor: '#8A7F9C', texto: 'Faltou' },
};

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.agendado;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-base-100 text-ink/80">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.cor }} />
      {cfg.texto}
    </span>
  );
}

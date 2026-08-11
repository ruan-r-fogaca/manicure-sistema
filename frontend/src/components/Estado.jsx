export function Carregando() {
  return (
    <div className="flex items-center justify-center py-16 text-ink/40 text-sm">
      Carregando...
    </div>
  );
}

export function Vazio({ titulo, descricao, acao }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 text-ink/60">
      <p className="font-display font-semibold text-base text-ink mb-1">{titulo}</p>
      {descricao && <p className="text-sm mb-4">{descricao}</p>}
      {acao}
    </div>
  );
}

export function Sucesso({ mensagem }) {
  if (!mensagem) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-status-atendido text-white text-sm font-medium rounded-full px-4 py-2 shadow-lg">
      {mensagem}
    </div>
  );
}

export function Erro({ mensagem }) {
  if (!mensagem) return null;
  return (
    <div className="bg-status-cancelado/10 border border-status-cancelado/30 text-status-cancelado text-sm rounded-lg px-3 py-2 mb-3">
      {mensagem}
    </div>
  );
}
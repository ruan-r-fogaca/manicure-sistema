import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../api/client.js';

function tempoRelativo(dataISO) {
  const diffMs = Date.now() - new Date(dataISO).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min atrás`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `${horas}h atrás`;
  const dias = Math.floor(horas / 24);
  return `${dias}d atrás`;
}

// Sino de notificações — busca (e gera, se for o caso) as notificações do
// sistema toda vez que o app abre, e mostra um popover com a lista.
export default function NotificacoesBell() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);

  function carregar() {
    api
      .get('/notificacoes')
      .then(setNotificacoes)
      .catch(() => {})
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function marcarLida(id) {
    setNotificacoes((atual) => atual.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    try {
      await api.put(`/notificacoes/${id}`, { lida: true });
    } catch (e) {
      // silencioso — não é crítico se não marcar, ela ainda aparece na lista
    }
  }

  async function marcarTodasLidas() {
    setNotificacoes((atual) => atual.map((n) => ({ ...n, lida: true })));
    try {
      await api.put('/notificacoes/marcar-todas-lidas');
    } catch (e) {
      // idem
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="relative text-plum-600"
        aria-label={naoLidas > 0 ? `${naoLidas} notificação(ões) não lida(s)` : 'Notificações'}
      >
        <Bell size={22} strokeWidth={2} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-status-cancelado text-white text-[10px] font-semibold rounded-full border border-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 mt-2 z-50 bg-white border border-base-200 rounded-xl2 shadow-lg w-72 max-h-[70vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-base-200">
              <p className="text-sm font-semibold">Notificações</p>
              {naoLidas > 0 && (
                <button onClick={marcarTodasLidas} className="text-xs text-plum-600 font-medium">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {carregando ? (
                <p className="text-sm text-ink/40 text-center py-8">Carregando...</p>
              ) : notificacoes.length === 0 ? (
                <p className="text-sm text-ink/40 text-center py-8">Nenhuma notificação por aqui.</p>
              ) : (
                notificacoes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => marcarLida(n.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-base-200 last:border-0 ${
                      n.lida ? 'opacity-60' : 'bg-plum-600/5'
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {!n.lida && <span className="w-1.5 h-1.5 rounded-full bg-plum-600 mt-1.5 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{n.titulo}</p>
                        <p className="text-xs text-ink/60 mt-0.5">{n.mensagem}</p>
                        <p className="text-[10px] text-ink/35 mt-1">{tempoRelativo(n.criado_em)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

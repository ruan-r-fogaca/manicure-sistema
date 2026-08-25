import { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { api } from '../api/client.js';

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await api.login(usuario.trim(), senha);
      onEntrar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-rose-500 to-plum-600">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-4">
            <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-lg" />
          </div>
          <h1 className="font-display font-semibold text-2xl text-white">Jucorrea Nail</h1>
          <p className="text-sm text-white/70 mt-1">Entrar no sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl2 p-5 flex flex-col gap-3 shadow-lg">
          {erro && (
            <div className="bg-status-cancelado/10 border border-status-cancelado/30 text-status-cancelado text-sm rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <div className="relative">
            <User size={18} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Usuário"
              className="w-full border border-base-200 bg-white rounded-lg pl-10 pr-3 py-3 text-sm"
            />
          </div>

          <div className="relative">
            <Lock size={18} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
              className="w-full border border-base-200 bg-white rounded-lg pl-10 pr-3 py-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={enviando || !usuario || !senha}
            className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-3 font-medium disabled:opacity-60 mt-1"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

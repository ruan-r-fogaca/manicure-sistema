import { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../api/client.js';

export default function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-6 py-10 bg-gradient-to-b from-rose-100 via-base-50 to-rose-100">
      {/* formas decorativas ao fundo */}
      <div className="pointer-events-none absolute -top-16 -left-20 w-64 h-64 rounded-full bg-rose-300/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-72 h-72 rounded-full bg-plum-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-rose-400/25 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-32 h-32 rounded-full mx-auto mb-5 p-1 bg-gradient-to-br from-rose-400 via-plum-500 to-rose-500 shadow-lg shadow-plum-600/20">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
              <img src="/icon-192.png" alt="Juliana Corrêa" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="font-display font-semibold text-3xl text-plum-600">Bem-vinda!</h1>
          <p className="text-sm text-ink/50 mt-1.5">Faça login para acessar seu sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur rounded-xl2 p-5 flex flex-col gap-3 shadow-xl shadow-plum-600/10">
          {erro && (
            <div className="bg-status-cancelado/10 border border-status-cancelado/30 text-status-cancelado text-sm rounded-lg px-3 py-2">
              {erro}
            </div>
          )}

          <div className="relative flex items-center">
            <span className="absolute left-1.5 w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <User size={16} strokeWidth={2} className="text-plum-600" />
            </span>
            <input
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Usuário"
              className="w-full border border-base-200 bg-white rounded-lg pl-12 pr-3 py-3 text-sm"
            />
          </div>

          <div className="relative flex items-center">
            <span className="absolute left-1.5 w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
              <Lock size={16} strokeWidth={2} className="text-plum-600" />
            </span>
            <input
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
              className="w-full border border-base-200 bg-white rounded-lg pl-12 pr-10 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              className="absolute right-3 text-ink/30"
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={enviando || !usuario || !senha}
            className="bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-3 font-medium disabled:opacity-60 mt-1 flex items-center justify-center gap-1.5"
          >
            {enviando ? 'Entrando...' : (<>Entrar <ArrowRight size={17} strokeWidth={2.5} /></>)}
          </button>

          <div className="flex items-center gap-3 mt-1">
            <span className="flex-1 h-px bg-base-200" />
            <span className="text-[11px] text-ink/40 inline-flex items-center gap-1">
              <ShieldCheck size={13} strokeWidth={2} /> Acesso seguro
            </span>
            <span className="flex-1 h-px bg-base-200" />
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';
import { mascararTelefone } from '../utils/telefone.js';

const ABAS = [
  { valor: 'ativos', texto: 'Ativos' },
  { valor: 'inativos', texto: 'Inativos' },
  { valor: 'todos', texto: 'Todos' },
];

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('ativos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    setCarregando(true);
    const query = new URLSearchParams();
    if (busca) query.set('busca', busca);
    query.set('status', aba);
    api
      .get(`/clientes?${query.toString()}`)
      .then(setClientes)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    const timeout = setTimeout(carregar, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, aba]);

  async function handleAdicionar(e) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSalvando(true);
    try {
      await api.post('/clientes', { nome: novoNome, telefone: novoTelefone });
      setNovoNome('');
      setNovoTelefone('');
      setMostrarForm(false);
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="px-5 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display font-semibold text-2xl text-plum-600">Clientes</h1>
        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="bg-plum-600 text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          {mostrarForm ? 'Cancelar' : '+ Nova'}
        </button>
      </div>

      <Link
        to="/clientes/fixas"
        className="flex items-center justify-between bg-rose-400/10 border border-rose-400/30 rounded-xl2 px-4 py-3 mb-5"
      >
        <div>
          <p className="text-sm font-medium text-rose-500">Clientes fixas</p>
          <p className="text-xs text-ink/50">Veja quem está no prazo de voltar</p>
        </div>
        <span className="text-rose-500">→</span>
      </Link>

      {mostrarForm && (
        <form onSubmit={handleAdicionar} className="bg-white border border-base-200 rounded-xl2 p-4 mb-5 flex flex-col gap-3">
          <input
            placeholder="Nome"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="border border-base-200 rounded-lg px-3 py-2.5"
          />
          <input
            placeholder="Telefone"
            value={novoTelefone}
            onChange={(e) => setNovoTelefone(mascararTelefone(e.target.value))}
            className="border border-base-200 rounded-lg px-3 py-2.5"
          />
          <button disabled={salvando} className="bg-plum-600 text-white rounded-lg py-2.5 font-medium disabled:opacity-60">
            {salvando ? 'Salvando...' : 'Salvar cliente'}
          </button>
          <p className="text-xs text-ink/40 -mt-1">
            O tipo de cobrança (avulso ou mensal) é definido depois, na página da cliente.
          </p>
        </form>
      )}

      <input
        placeholder="Buscar por nome..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full border border-base-200 bg-white rounded-lg px-3 py-2.5 mb-3"
      />

      <div className="flex gap-2 mb-4">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            onClick={() => setAba(a.valor)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
              aba === a.valor ? 'bg-plum-600 text-white border-plum-600' : 'bg-white text-ink/60 border-base-200'
            }`}
          >
            {a.texto}
          </button>
        ))}
      </div>

      <Erro mensagem={erro} />

      {carregando ? (
        <Carregando />
      ) : clientes.length === 0 ? (
        <Vazio titulo="Nenhuma cliente encontrada" descricao="Cadastre a primeira cliente para começar." />
      ) : (
        <div className="flex flex-col gap-2">
          {clientes.map((c) => (
            <Link
              key={c.id}
              to={`/clientes/${c.id}`}
              className={`bg-white rounded-xl2 p-3 border border-base-200 flex justify-between items-center ${
                c.ativo === false ? 'opacity-50' : ''
              }`}
            >
              <div>
                <p className="font-medium text-sm">{c.nome}</p>
                <p className="text-xs text-ink/50">{c.telefone || 'Sem telefone'}</p>
              </div>
              <div className="flex gap-1.5">
                {c.ativo === false && (
                  <span className="text-[11px] bg-ink/10 text-ink/50 font-medium px-2 py-1 rounded-full">
                    Inativa
                  </span>
                )}
                {c.tipo_cobranca && c.tipo_cobranca !== 'por_atendimento' && (
                  <span className="text-[11px] bg-plum-600/10 text-plum-600 font-medium px-2 py-1 rounded-full">
                    Mensal
                  </span>
                )}
                {c.cliente_fixa && (
                  <span className="text-[11px] bg-rose-400/15 text-rose-500 font-medium px-2 py-1 rounded-full">
                    Fixa
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
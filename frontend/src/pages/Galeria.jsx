import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';

export default function Galeria() {
  const [fotos, setFotos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [arquivoEscolhido, setArquivoEscolhido] = useState(null);
  const [previaUrl, setPreviaUrl] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [legenda, setLegenda] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const inputRef = useRef(null);

  function carregar() {
    setCarregando(true);
    api
      .get('/fotos')
      .then(setFotos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
    api.get('/clientes?status=todos').then(setClientes).catch(() => {});
  }, []);

  function escolherArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setArquivoEscolhido(arquivo);
    setPreviaUrl(URL.createObjectURL(arquivo));
  }

  function cancelarEnvio() {
    setArquivoEscolhido(null);
    setPreviaUrl('');
    setClienteId('');
    setLegenda('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function enviarFoto() {
    if (!arquivoEscolhido) return;
    setEnviando(true);
    setErro('');
    try {
      const formData = new FormData();
      formData.append('foto', arquivoEscolhido);
      if (clienteId) formData.append('cliente_id', clienteId);
      if (legenda) formData.append('legenda', legenda);
      await api.upload('/fotos', formData);
      cancelarEnvio();
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function excluirFoto(id) {
    try {
      await api.del(`/fotos/${id}`);
      setFotoAmpliada(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-semibold text-2xl text-plum-600">Galeria</h1>
        <button
          onClick={() => inputRef.current?.click()}
          className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg text-lg font-medium shrink-0"
          aria-label="Adicionar foto"
        >
          +
        </button>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={escolherArquivo} className="hidden" />
      </div>

      <Erro mensagem={erro} />

      {arquivoEscolhido && (
        <div className="bg-white border border-plum-600/30 rounded-xl2 p-3 mb-5 flex flex-col gap-2">
          <img src={previaUrl} alt="Prévia" className="w-full max-h-56 object-cover rounded-lg" />
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="border border-base-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">Sem cliente vinculada</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <input
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            placeholder="Legenda (opcional)"
            className="border border-base-200 rounded-lg px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={enviarFoto}
              disabled={enviando}
              className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-2 text-sm font-medium disabled:opacity-60"
            >
              {enviando ? 'Enviando...' : 'Salvar foto'}
            </button>
            <button onClick={cancelarEnvio} disabled={enviando} className="flex-1 bg-base-100 rounded-lg py-2 text-sm font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {fotos.length === 0 && !arquivoEscolhido ? (
        <Vazio titulo="Nenhuma foto ainda" descricao="Toque no + pra adicionar a primeira foto do seu portfólio." />
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {fotos.map((f) => (
            <button
              key={f.id}
              onClick={() => setFotoAmpliada(f)}
              className="aspect-square rounded-lg overflow-hidden bg-base-100"
            >
              <img src={f.url} alt={f.legenda || 'Foto do portfólio'} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {fotoAmpliada && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="bg-white rounded-xl2 overflow-hidden max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <img src={fotoAmpliada.url} alt={fotoAmpliada.legenda || 'Foto'} className="w-full max-h-96 object-cover" />
            <div className="p-3">
              {fotoAmpliada.clientes?.nome && <p className="text-sm font-medium">{fotoAmpliada.clientes.nome}</p>}
              {fotoAmpliada.legenda && <p className="text-sm text-ink/60 mt-0.5">{fotoAmpliada.legenda}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => excluirFoto(fotoAmpliada.id)}
                  className="flex-1 bg-status-cancelado/10 text-status-cancelado rounded-lg py-2 text-sm font-medium"
                >
                  Excluir
                </button>
                <button onClick={() => setFotoAmpliada(null)} className="flex-1 bg-base-100 rounded-lg py-2 text-sm font-medium">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Link to="/configuracoes" className="text-sm text-plum-600 mt-6 inline-block">
        ← Voltar pra Ajustes
      </Link>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Carregando, Erro } from '../components/Estado.jsx';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Configuracoes() {
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editandoServico, setEditandoServico] = useState(null);
  const [criandoServico, setCriandoServico] = useState(null);

  function carregar() {
    api
      .get('/servicos')
      .then(setServicos)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  async function salvarServico(servico) {
    try {
      await api.put(`/servicos/${servico.id}`, servico);
      setEditandoServico(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function criarServico() {
    try {
      await api.post('/servicos', criandoServico);
      setCriandoServico(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8 pb-8">
      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-5">Configurações</h1>

      <Erro mensagem={erro} />

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-lg">Serviços</h2>
        <button
          onClick={() => setCriandoServico({ nome: '', preco: '', duracao_minutos: '', ativo: true })}
          className="w-8 h-8 flex items-center justify-center bg-plum-600 text-white rounded-lg text-lg font-medium shrink-0"
          aria-label="Adicionar novo serviço"
          title="Adicionar novo serviço"
        >
          +
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {criandoServico && (
          <ServicoForm
            servico={criandoServico}
            onChange={setCriandoServico}
            onSalvar={criarServico}
            onCancelar={() => setCriandoServico(null)}
          />
        )}
        {servicos.map((s) =>
          editandoServico?.id === s.id ? (
            <ServicoForm
              key={s.id}
              servico={editandoServico}
              onChange={setEditandoServico}
              onSalvar={() => salvarServico(editandoServico)}
              onCancelar={() => setEditandoServico(null)}
            />
          ) : (
            <div key={s.id} className="bg-white border border-base-200 rounded-xl2 p-3 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{s.nome}</p>
                <p className="text-xs text-ink/50">
                  {formatarMoeda(s.preco)} · {s.duracao_minutos} min {!s.ativo && '· Inativo'}
                </p>
              </div>
              <button onClick={() => setEditandoServico(s)} className="text-xs text-plum-600 font-medium">
                Editar
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ServicoForm({ servico, onChange, onSalvar, onCancelar }) {
  return (
    <div className="bg-white border border-plum-600/30 rounded-xl2 p-3 flex flex-col gap-2">
      <input
        value={servico.nome}
        onChange={(e) => onChange({ ...servico, nome: e.target.value })}
        className="border border-base-200 rounded-lg px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="number"
          step="0.01"
          value={servico.preco}
          onChange={(e) => onChange({ ...servico, preco: Number(e.target.value) })}
          className="border border-base-200 rounded-lg px-2 py-1.5 text-sm flex-1"
          placeholder="Preço"
        />
        <input
          type="number"
          value={servico.duracao_minutos}
          onChange={(e) => onChange({ ...servico, duracao_minutos: Number(e.target.value) })}
          className="border border-base-200 rounded-lg px-2 py-1.5 text-sm flex-1"
          placeholder="Duração (min)"
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={servico.ativo} onChange={(e) => onChange({ ...servico, ativo: e.target.checked })} />
        Ativo
      </label>
      <div className="flex gap-2">
        <button onClick={onSalvar} className="flex-1 bg-plum-600 text-white rounded-lg py-2 text-sm font-medium">
          Salvar
        </button>
        <button onClick={onCancelar} className="flex-1 bg-base-100 rounded-lg py-2 text-sm font-medium">
          Cancelar
        </button>
      </div>
    </div>
  );
}

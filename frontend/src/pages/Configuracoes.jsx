import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro } from '../components/Estado.jsx';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Configuracoes() {
  const [servicos, setServicos] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [editandoServico, setEditandoServico] = useState(null);
  const [criandoServico, setCriandoServico] = useState(null);
  const [editandoMensagem, setEditandoMensagem] = useState(null);
  const [criandoMensagem, setCriandoMensagem] = useState(null);

  function carregar() {
    Promise.all([api.get('/servicos'), api.get('/mensagens')])
      .then(([s, m]) => {
        setServicos(s);
        setMensagens(m);
      })
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

  async function salvarMensagem(mensagem) {
    try {
      await api.put(`/mensagens/${mensagem.id}`, mensagem);
      setEditandoMensagem(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function criarMensagem() {
    try {
      await api.post('/mensagens', criandoMensagem);
      setCriandoMensagem(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function excluirMensagem(id) {
    try {
      await api.del(`/mensagens/${id}`);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display font-semibold text-2xl text-plum-600">Configurações</h1>
        <Link to="/galeria" className="text-sm font-medium text-plum-600">
          🖼️ Galeria
        </Link>
      </div>

      <Erro mensagem={erro} />

      <a
        href={api.urlCompleta('/exportar/clientes.csv')}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-plum-600 mb-5 inline-block"
      >
        ⬇️ Exportar clientes (CSV)
      </a>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-lg">Serviços</h2>
        <button
          onClick={() => setCriandoServico({ nome: '', preco: '', duracao_minutos: '', ativo: true, cor: '#C14C74' })}
          className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg text-lg font-medium shrink-0"
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
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: s.cor || '#C14C74' }}
                  aria-hidden="true"
                />
                <div>
                  <p className="font-medium text-sm">{s.nome}</p>
                  <p className="text-xs text-ink/50">
                    {formatarMoeda(s.preco)} · {s.duracao_minutos} min {!s.ativo && '· Inativo'}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditandoServico(s)} className="text-xs text-plum-600 font-medium">
                Editar
              </button>
            </div>
          )
        )}
      </div>

      <div className="flex items-center justify-between mb-1 mt-8">
        <h2 className="font-display font-semibold text-lg">Mensagens</h2>
        <button
          onClick={() => setCriandoMensagem({ nome: '', texto: '' })}
          className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg text-lg font-medium shrink-0"
          aria-label="Adicionar novo modelo de mensagem"
          title="Adicionar novo modelo de mensagem"
        >
          +
        </button>
      </div>
      <p className="text-xs text-ink/40 mb-3">
        Use {'{nome}'}, {'{data}'}, {'{hora}'} e {'{servico}'} no texto — o sistema substitui pelos dados do atendimento na hora de enviar.
      </p>
      <div className="flex flex-col gap-2">
        {criandoMensagem && (
          <MensagemForm
            mensagem={criandoMensagem}
            onChange={setCriandoMensagem}
            onSalvar={criarMensagem}
            onCancelar={() => setCriandoMensagem(null)}
          />
        )}
        {mensagens.length === 0 && !criandoMensagem && (
          <p className="text-sm text-ink/40 py-2">Nenhum modelo criado ainda.</p>
        )}
        {mensagens.map((m) =>
          editandoMensagem?.id === m.id ? (
            <MensagemForm
              key={m.id}
              mensagem={editandoMensagem}
              onChange={setEditandoMensagem}
              onSalvar={() => salvarMensagem(editandoMensagem)}
              onCancelar={() => setEditandoMensagem(null)}
            />
          ) : (
            <div key={m.id} className="bg-white border border-base-200 rounded-xl2 p-3">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm">{m.nome}</p>
                <div className="flex gap-3 shrink-0">
                  <button onClick={() => setEditandoMensagem(m)} className="text-xs text-plum-600 font-medium">
                    Editar
                  </button>
                  <button onClick={() => excluirMensagem(m.id)} className="text-xs text-status-cancelado font-medium">
                    Excluir
                  </button>
                </div>
              </div>
              <p className="text-xs text-ink/50 mt-1 whitespace-pre-wrap">{m.texto}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function MensagemForm({ mensagem, onChange, onSalvar, onCancelar }) {
  return (
    <div className="bg-white border border-plum-600/30 rounded-xl2 p-3 flex flex-col gap-2">
      <input
        value={mensagem.nome}
        onChange={(e) => onChange({ ...mensagem, nome: e.target.value })}
        className="border border-base-200 rounded-lg px-2 py-1.5 text-sm"
        placeholder="Nome do modelo (ex: Lembrete)"
      />
      <textarea
        value={mensagem.texto}
        onChange={(e) => onChange({ ...mensagem, texto: e.target.value })}
        rows={4}
        className="border border-base-200 rounded-lg px-2 py-1.5 text-sm"
        placeholder="Olá {nome}, tudo bem?..."
      />
      <div className="flex gap-2">
        <button onClick={onSalvar} className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-2 text-sm font-medium">
          Salvar
        </button>
        <button onClick={onCancelar} className="flex-1 bg-base-100 rounded-lg py-2 text-sm font-medium">
          Cancelar
        </button>
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
          className="border border-base-200 rounded-lg px-2 py-1.5 text-sm flex-1 min-w-0"
          placeholder="Preço"
        />
        <input
          type="number"
          value={servico.duracao_minutos}
          onChange={(e) => onChange({ ...servico, duracao_minutos: Number(e.target.value) })}
          className="border border-base-200 rounded-lg px-2 py-1.5 text-sm flex-1 min-w-0"
          placeholder="Duração (min)"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="cor-servico" className="text-xs text-ink/60">
          Cor na agenda
        </label>
        <input
          id="cor-servico"
          type="color"
          value={servico.cor || '#C14C74'}
          onChange={(e) => onChange({ ...servico, cor: e.target.value })}
          className="w-8 h-8 rounded border border-base-200 bg-transparent cursor-pointer"
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={servico.ativo} onChange={(e) => onChange({ ...servico, ativo: e.target.checked })} />
        Ativo
      </label>
      <div className="flex gap-2">
        <button onClick={onSalvar} className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-2 text-sm font-medium">
          Salvar
        </button>
        <button onClick={onCancelar} className="flex-1 bg-base-100 rounded-lg py-2 text-sm font-medium">
          Cancelar
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Carregando, Erro } from '../components/Estado.jsx';

const DIAS = [
  { chave: 'segunda', label: 'Segunda' },
  { chave: 'terca', label: 'Terça' },
  { chave: 'quarta', label: 'Quarta' },
  { chave: 'quinta', label: 'Quinta' },
  { chave: 'sexta', label: 'Sexta' },
  { chave: 'sabado', label: 'Sábado' },
  { chave: 'domingo', label: 'Domingo' },
];

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Configuracoes() {
  const [config, setConfig] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [editandoServico, setEditandoServico] = useState(null);
  const [criandoServico, setCriandoServico] = useState(null);

  function normalizarHorarios(horarios) {
    const normalizado = {};
    for (const chave of Object.keys(horarios)) {
      normalizado[chave] = horarios[chave] ? { ...horarios[chave], fecha: '23:59' } : null;
    }
    return normalizado;
  }

  function carregar() {
    Promise.all([api.get('/configuracoes'), api.get('/servicos')])
      .then(([c, s]) => {
        setConfig({ ...c, horarios_funcionamento: normalizarHorarios(c.horarios_funcionamento) });
        setServicos(s);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }

  useEffect(carregar, []);

  function alterarDia(chave, campo, valor) {
    setConfig((prev) => {
      const horarios = { ...prev.horarios_funcionamento };
      if (campo === 'fechado') {
        horarios[chave] = valor ? null : { abre: '08:00', fecha: '23:59' };
      } else {
        horarios[chave] = { ...horarios[chave], [campo]: valor };
      }
      return { ...prev, horarios_funcionamento: horarios };
    });
  }

  async function salvarHorarios() {
    setSalvandoHorarios(true);
    try {
      await api.put('/configuracoes', {
        horarios_funcionamento: config.horarios_funcionamento,
        intervalo_entre_atendimentos_minutos: config.intervalo_entre_atendimentos_minutos,
      });
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvandoHorarios(false);
    }
  }

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

      <h2 className="font-display font-semibold text-lg mb-3">Horário de funcionamento</h2>
      <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-6 flex flex-col gap-3">
        {DIAS.map(({ chave, label }) => {
          const dia = config.horarios_funcionamento[chave];
          return (
            <div key={chave} className="flex items-center justify-between gap-2">
              <span className="text-sm w-20">{label}</span>
              {dia ? (
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-ink/30">Abre às</span>
                  <input
                    type="time"
                    value={dia.abre}
                    onChange={(e) => alterarDia(chave, 'abre', e.target.value)}
                    className="border border-base-200 rounded-lg px-2 py-1.5 text-sm flex-1"
                  />
                </div>
              ) : (
                <span className="text-xs text-ink/40 flex-1">Fechado</span>
              )}
              <label className="flex items-center gap-1 text-xs text-ink/50">
                <input type="checkbox" checked={!dia} onChange={(e) => alterarDia(chave, 'fechado', e.target.checked)} />
                Fechado
              </label>
            </div>
          );
        })}
        <button
          onClick={salvarHorarios}
          disabled={salvandoHorarios}
          className="bg-plum-600 text-white rounded-lg py-2.5 font-medium mt-2 disabled:opacity-60"
        >
          {salvandoHorarios ? 'Salvando...' : 'Salvar horários'}
        </button>
      </div>

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

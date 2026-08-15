import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';
import { agruparAgendamentos } from '../utils/agrupar.js';
import { dataParaISO } from '../utils/data.js';
import { formatarDataMensagem, preencherModelo, linkWhatsapp } from '../utils/mensagem.js';

function amanhaISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return dataParaISO(d);
}

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function chaveItem(item) {
  return item.ids.join('-');
}

function mensagemPadrao(item) {
  return `Olá ${item.clientes?.nome}, tudo bem?\nEste é um lembrete para o seu atendimento, dia ${formatarDataMensagem(item.data)} às ${item.hora_inicio?.slice(0, 5)}.\nServiço: ${item.servicosNome}\nPosso confirmar?  Obrigada ❤️`;
}

// modeloId 'padrao' (ou nenhum modelo cadastrado) usa a mensagem padrão; caso
// contrário busca o modelo escolhido e preenche as variáveis desse atendimento.
function montarMensagem(item, mensagens, modeloId) {
  if (modeloId === 'padrao' || mensagens.length === 0) return mensagemPadrao(item);
  const modelo = mensagens.find((m) => m.id === modeloId);
  if (!modelo) return mensagemPadrao(item);
  return preencherModelo(modelo.texto, {
    nome: item.clientes?.nome,
    data: formatarDataMensagem(item.data),
    hora: item.hora_inicio?.slice(0, 5),
    servico: item.servicosNome,
  });
}

export default function Lembretes() {
  const [itens, setItens] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [selecionados, setSelecionados] = useState(new Set());
  const [modeloId, setModeloId] = useState('padrao');
  const [enviados, setEnviados] = useState(new Set());
  const [fila, setFila] = useState(null); // { itens, indice }

  useEffect(() => {
    const amanha = amanhaISO();
    Promise.all([api.get(`/agendamentos?data=${amanha}`), api.get('/mensagens')])
      .then(([agendamentos, m]) => {
        const agrupados = agruparAgendamentos(agendamentos).filter((it) =>
          ['agendado', 'confirmado'].includes(it.status)
        );
        setItens(agrupados);
        setMensagens(m);
        setSelecionados(new Set(agrupados.filter((it) => it.clientes?.telefone).map(chaveItem)));
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  const itensComTelefone = itens.filter((it) => it.clientes?.telefone);
  const todosSelecionados =
    itensComTelefone.length > 0 && itensComTelefone.every((it) => selecionados.has(chaveItem(it)));

  function alternarTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(itensComTelefone.map(chaveItem)));
  }

  function alternarItem(item) {
    const chave = chaveItem(item);
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function iniciarFila() {
    const selecionadosItens = itens.filter((it) => selecionados.has(chaveItem(it)));
    if (selecionadosItens.length === 0) return;
    setFila({ itens: selecionadosItens, indice: 0 });
  }

  function enviarAtualDaFila() {
    const item = fila.itens[fila.indice];
    const texto = montarMensagem(item, mensagens, modeloId);
    window.open(linkWhatsapp(item.clientes?.telefone, texto), '_blank', 'noopener');
    setEnviados((atual) => new Set(atual).add(chaveItem(item)));
    setFila((f) => ({ ...f, indice: f.indice + 1 }));
  }

  function pularAtual() {
    setFila((f) => ({ ...f, indice: f.indice + 1 }));
  }

  if (carregando) return <Carregando />;

  if (fila) {
    const concluida = fila.indice >= fila.itens.length;

    if (concluida) {
      return (
        <div className="px-5 pt-8 pb-8">
          <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">Fila concluída ✓</h1>
          <p className="text-sm text-ink/50 mb-6">
            {fila.itens.filter((it) => enviados.has(chaveItem(it))).length} de {fila.itens.length} lembrete(s) abertos no
            WhatsApp.
          </p>
          <button
            onClick={() => setFila(null)}
            className="w-full bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-3 text-sm font-medium"
          >
            Voltar à lista
          </button>
        </div>
      );
    }

    const item = fila.itens[fila.indice];
    const texto = montarMensagem(item, mensagens, modeloId);

    return (
      <div className="px-5 pt-8 pb-8">
        <button onClick={() => setFila(null)} className="text-sm text-plum-600 mb-3">
          ← Cancelar fila
        </button>
        <p className="text-xs text-ink/40 mb-1">
          {fila.indice + 1} de {fila.itens.length}
        </p>
        <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">{item.clientes?.nome}</h1>
        <p className="text-sm text-ink/50 mb-4">
          {item.hora_inicio?.slice(0, 5)} · {item.servicosNome}
        </p>
        <div className="bg-white border border-base-200 rounded-xl2 p-4 mb-5 whitespace-pre-wrap text-sm">{texto}</div>
        <button
          onClick={enviarAtualDaFila}
          className="w-full bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-3 text-sm font-medium mb-2"
        >
          Abrir WhatsApp e enviar
        </button>
        <button onClick={pularAtual} className="w-full bg-base-100 rounded-lg py-2.5 text-sm font-medium text-ink/60">
          Pular esta
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-8">
      <Link to="/agenda" className="text-sm text-plum-600 mb-3 inline-block">
        ← Voltar
      </Link>

      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">Lembretes de amanhã</h1>
      <p className="text-sm text-ink/50 mb-1">
        Selecione quem vai receber, escolha a mensagem e toque em enviar — o WhatsApp abre pronto pra cada uma, só
        falta seu toque final lá dentro (o WhatsApp não deixa mandar sozinho).
      </p>
      {itens.length > 0 && (
        <p className="text-xs text-ink/40 mb-5">
          {enviados.size} de {itens.length} enviado(s)
        </p>
      )}

      <Erro mensagem={erro} />

      {itens.length === 0 ? (
        <Vazio titulo="Nada agendado pra amanhã" descricao="Quando tiver atendimentos marcados, eles aparecem aqui." />
      ) : (
        <>
          {mensagens.length > 0 && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-ink/40 mb-2">Mensagem a enviar</p>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-sm bg-white border border-base-200 rounded-lg px-3 py-2">
                  <input type="radio" name="modelo" checked={modeloId === 'padrao'} onChange={() => setModeloId('padrao')} />
                  Padrão (lembrete simples)
                </label>
                {mensagens.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm bg-white border border-base-200 rounded-lg px-3 py-2">
                    <input type="radio" name="modelo" checked={modeloId === m.id} onChange={() => setModeloId(m.id)} />
                    {m.nome}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={todosSelecionados} onChange={alternarTodos} />
              Selecionar todos
            </label>
            <span className="text-xs text-ink/40">{selecionados.size} selecionada(s)</span>
          </div>

          <div className="flex flex-col gap-2 mb-5">
            {itens.map((item) => {
              const chave = chaveItem(item);
              const semTelefone = !item.clientes?.telefone;
              return (
                <label
                  key={chave}
                  className={`bg-white rounded-xl2 p-3 border border-base-200 flex items-center gap-3 ${semTelefone ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selecionados.has(chave)}
                    disabled={semTelefone}
                    onChange={() => alternarItem(item)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {item.hora_inicio?.slice(0, 5)} · {item.clientes?.nome}
                    </p>
                    <p className="text-xs text-ink/50">
                      {item.servicosNome} · {formatarMoeda(item.valor)}
                    </p>
                  </div>
                  {enviados.has(chave) && (
                    <span className="text-xs text-status-atendido font-medium shrink-0">Enviado ✓</span>
                  )}
                  {semTelefone && <span className="text-xs text-ink/40 shrink-0">Sem telefone</span>}
                </label>
              );
            })}
          </div>

          <button
            onClick={iniciarFila}
            disabled={selecionados.size === 0}
            className="w-full bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 rounded-lg py-3 text-sm font-medium disabled:opacity-50"
          >
            Enviar lembretes ({selecionados.size})
          </button>
        </>
      )}
    </div>
  );
}

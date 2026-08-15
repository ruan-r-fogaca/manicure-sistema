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

function LinhaLembrete({ item, mensagens, onEnviado }) {
  const [abrirEscolha, setAbrirEscolha] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function textoParaModelo(texto) {
    return preencherModelo(texto, {
      nome: item.clientes?.nome,
      data: formatarDataMensagem(item.data),
      hora: item.hora_inicio?.slice(0, 5),
      servico: item.servicosNome,
    });
  }

  function mensagemPadrao() {
    return `Olá ${item.clientes?.nome}, tudo bem?\nEste é um lembrete para o seu atendimento, dia ${formatarDataMensagem(item.data)} às ${item.hora_inicio?.slice(0, 5)}.\nServiço: ${item.servicosNome}\nPosso confirmar?  Obrigada ❤️`;
  }

  function enviar(texto) {
    window.open(linkWhatsapp(item.clientes?.telefone, texto), '_blank', 'noopener');
    setAbrirEscolha(false);
    setEnviado(true);
    onEnviado?.();
  }

  function handleClick() {
    if (mensagens.length === 0) enviar(mensagemPadrao());
    else setAbrirEscolha(true);
  }

  return (
    <div className="bg-white rounded-xl2 p-3 border border-base-200">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-medium text-sm">
            {item.hora_inicio?.slice(0, 5)} · {item.clientes?.nome}
          </p>
          <p className="text-xs text-ink/50">
            {item.servicosNome} · {formatarMoeda(item.valor)}
          </p>
        </div>
        {!item.clientes?.telefone ? (
          <span className="text-xs text-ink/40 shrink-0">Sem telefone</span>
        ) : (
          <button
            onClick={handleClick}
            className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 bg-status-atendido/15 text-status-atendido"
          >
            {enviado ? 'Enviado ✓ · Reenviar' : 'Enviar lembrete'}
          </button>
        )}
      </div>

      {abrirEscolha && (
        <div className="mt-2 flex flex-col gap-1.5">
          {mensagens.map((m) => (
            <button
              key={m.id}
              onClick={() => enviar(textoParaModelo(m.texto))}
              className="bg-base-100 hover:bg-plum-600/10 border border-base-200 rounded-lg py-2 px-3 text-xs font-medium text-left"
            >
              {m.nome}
            </button>
          ))}
          <button onClick={() => setAbrirEscolha(false)} className="text-xs text-ink/40 py-1">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export default function Lembretes() {
  const [itens, setItens] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [enviados, setEnviados] = useState(0);

  useEffect(() => {
    const amanha = amanhaISO();
    Promise.all([api.get(`/agendamentos?data=${amanha}`), api.get('/mensagens')])
      .then(([agendamentos, m]) => {
        const agrupados = agruparAgendamentos(agendamentos).filter((it) =>
          ['agendado', 'confirmado'].includes(it.status)
        );
        setItens(agrupados);
        setMensagens(m);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8 pb-8">
      <Link to="/agenda" className="text-sm text-plum-600 mb-3 inline-block">
        ← Voltar
      </Link>

      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">Lembretes de amanhã</h1>
      <p className="text-sm text-ink/50 mb-1">
        Toque em cada cliente pra abrir o WhatsApp já com a mensagem pronta — o envio em si precisa do seu toque,
        o WhatsApp não deixa mandar sozinho.
      </p>
      {itens.length > 0 && (
        <p className="text-xs text-ink/40 mb-5">
          {enviados} de {itens.length} enviado(s)
        </p>
      )}

      <Erro mensagem={erro} />

      {itens.length === 0 ? (
        <Vazio titulo="Nada agendado pra amanhã" descricao="Quando tiver atendimentos marcados, eles aparecem aqui." />
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((item) => (
            <LinhaLembrete
              key={item.ids.join('-')}
              item={item}
              mensagens={mensagens}
              onEnviado={() => setEnviados((n) => n + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';
import { ArrowLeft } from 'lucide-react';

function formatarData(dataISO) {
  return new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function textoPrazo(dias) {
  if (dias < 0) return { texto: `Atrasada há ${Math.abs(dias)} dia(s)`, cor: 'text-status-cancelado bg-status-cancelado/10' };
  if (dias === 0) return { texto: 'O prazo é hoje', cor: 'text-status-agendado bg-status-agendado/10' };
  return { texto: `Faltam ${dias} dia(s)`, cor: 'text-status-confirmado bg-status-confirmado/10' };
}

export default function ClientesFixas() {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/clientes/fixas/proximas')
      .then((dados) => {
        dados.sort((a, b) => a.dias_restantes - b.dias_restantes);
        setClientes(dados);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="px-5 pt-8">
      <Link to="/clientes" className="text-sm text-plum-600 mb-3 inline-flex items-center gap-1">
        <ArrowLeft size={15} strokeWidth={2} /> Voltar
      </Link>

      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">Clientes fixas</h1>
      <p className="text-sm text-ink/50 mb-5">Quem está próxima do prazo de voltar, com base na frequência cadastrada.</p>

      <Erro mensagem={erro} />

      {carregando ? (
        <Carregando />
      ) : clientes.length === 0 ? (
        <Vazio
          titulo="Nenhuma pendência por enquanto"
          descricao="Assim que uma cliente fixa se aproximar do prazo de retorno, ela aparece aqui."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {clientes.map((c) => {
            const prazo = textoPrazo(c.dias_restantes);
            return (
              <div key={c.id} className="bg-white rounded-xl2 p-3 border border-base-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-ink/50">
                      A cada {c.frequencia_dias} dias · sugestão: {formatarData(c.proxima_data_sugerida)}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${prazo.cor}`}>
                    {prazo.texto}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/agenda/novo?cliente=${c.id}`}
                    className="flex-1 bg-gradient-to-br from-rose-500 to-plum-600 text-white shadow-sm shadow-plum-600/30 text-sm font-medium text-center rounded-lg py-2"
                  >
                    Agendar
                  </Link>
                  <Link
                    to={`/clientes/${c.id}`}
                    className="flex-1 bg-base-100 text-sm font-medium text-center rounded-lg py-2"
                  >
                    Ver perfil
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
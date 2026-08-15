import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Carregando, Erro, Vazio } from '../components/Estado.jsx';

function formatarMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataISO) {
  return new Date(`${dataISO}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function MensalidadesVencidas() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api
      .get('/cobrancas/vencidas')
      .then(setItens)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Carregando />;

  return (
    <div className="px-5 pt-8 pb-8">
      <Link to="/financeiro" className="text-sm text-plum-600 mb-3 inline-block">
        ← Voltar
      </Link>

      <h1 className="font-display font-semibold text-2xl text-plum-600 mb-1">Mensalidades vencidas</h1>
      <p className="text-sm text-ink/50 mb-5">
        Clientes com plano mensal cujo dia de cobrança já chegou e ainda não foram marcadas como pagas.
      </p>

      <Erro mensagem={erro} />

      {itens.length === 0 ? (
        <Vazio titulo="Nenhuma mensalidade vencida" descricao="Todas as clientes mensais estão em dia por enquanto." />
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((item) => (
            <div key={item.cliente_id} className="bg-white border border-status-cancelado/30 rounded-xl2 p-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-medium text-sm">{item.nome}</p>
                  <p className="text-xs text-ink/50 mt-0.5">{item.telefone || 'Sem telefone'}</p>
                </div>
                <p className="font-display font-semibold text-plum-600 shrink-0">{formatarMoeda(item.valor)}</p>
              </div>
              <p className="text-xs text-status-cancelado font-medium mt-2">
                Venceu em {formatarData(item.data_vencimento)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

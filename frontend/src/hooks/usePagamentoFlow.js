import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

// Regras do fluxo (TELA CLIENTES #4 + TELA FINANCEIRO #1):
// - Se o novo status for "atendido", não aplica direto: abre o modal de forma
//   de pagamento primeiro.
// - Qualquer outro status (agendado/confirmado/cancelado/faltou) aplica na hora.
// - Depois de escolher a forma de pagamento: marca o(s) agendamento(s) como
//   atendido, marca o(s) pagamento(s) como pago com a forma escolhida, mostra
//   "Atendimento encerrado" e volta pra tela inicial.
//
// `item` sempre tem um array `.ids` — quando vários serviços foram marcados
// juntos (agruparAgendamentos), todos os ids do grupo mudam de status juntos.
export function usePagamentoFlow({ aoAtualizar } = {}) {
  const navigate = useNavigate();
  const [itemPendente, setItemPendente] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  async function solicitarMudancaStatus(item, novoStatus) {
    if (novoStatus === 'atendido') {
      setErroModal('');
      setItemPendente(item);
      return;
    }
    await Promise.all(item.ids.map((id) => api.put(`/agendamentos/${id}/status`, { status: novoStatus })));
    aoAtualizar && aoAtualizar();
  }

  async function confirmarPagamento(formaPagamento) {
    if (!itemPendente) return;
    setEnviando(true);
    setErroModal('');
    try {
      for (const id of itemPendente.ids) {
        await api.put(`/agendamentos/${id}/status`, { status: 'atendido' });
        const pagamento = await api.get(`/pagamentos/agendamento/${id}`);
        if (pagamento) {
          await api.put(`/pagamentos/${pagamento.id}`, { forma_pagamento: formaPagamento, status: 'pago' });
        }
      }

      setItemPendente(null);
      aoAtualizar && aoAtualizar();
      setMensagemSucesso('Atendimento encerrado ✓');
      setTimeout(() => {
        setMensagemSucesso('');
        navigate('/');
      }, 1200);
    } catch (e) {
      setErroModal(e.message);
    } finally {
      setEnviando(false);
    }
  }

  function cancelarPagamento() {
    if (enviando) return;
    setItemPendente(null);
    setErroModal('');
  }

  return {
    agendamentoPendente: itemPendente,
    enviando,
    erroModal,
    mensagemSucesso,
    solicitarMudancaStatus,
    confirmarPagamento,
    cancelarPagamento,
  };
}

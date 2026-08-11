import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

// Regras do fluxo (TELA CLIENTES #4 + TELA FINANCEIRO #1):
// - Se o novo status for "atendido", não aplica direto: abre o modal de forma
//   de pagamento primeiro.
// - Qualquer outro status (agendado/confirmado/cancelado/faltou) aplica na hora.
// - Depois de escolher a forma de pagamento: marca o agendamento como atendido,
//   marca o pagamento como pago com a forma escolhida, mostra "Atendimento
//   encerrado" e volta pra tela inicial.
export function usePagamentoFlow({ aoAtualizar } = {}) {
  const navigate = useNavigate();
  const [agendamentoPendente, setAgendamentoPendente] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  async function solicitarMudancaStatus(agendamento, novoStatus) {
    if (novoStatus === 'atendido') {
      setErroModal('');
      setAgendamentoPendente(agendamento);
      return;
    }
    await api.put(`/agendamentos/${agendamento.id}/status`, { status: novoStatus });
    aoAtualizar && aoAtualizar();
  }

  async function confirmarPagamento(formaPagamento) {
    if (!agendamentoPendente) return;
    setEnviando(true);
    setErroModal('');
    try {
      await api.put(`/agendamentos/${agendamentoPendente.id}/status`, { status: 'atendido' });

      const pagamento = await api.get(`/pagamentos/agendamento/${agendamentoPendente.id}`);
      if (pagamento) {
        await api.put(`/pagamentos/${pagamento.id}`, { forma_pagamento: formaPagamento, status: 'pago' });
      }

      setAgendamentoPendente(null);
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
    setAgendamentoPendente(null);
    setErroModal('');
  }

  return {
    agendamentoPendente,
    enviando,
    erroModal,
    mensagemSucesso,
    solicitarMudancaStatus,
    confirmarPagamento,
    cancelarPagamento,
  };
}
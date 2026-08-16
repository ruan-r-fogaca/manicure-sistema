-- Troca o status "faltou" por "pendente" nas opções de agendamento.
-- Ordem importa: solta a constraint antes do UPDATE (senão o UPDATE viola o
-- check antigo, que não conhece 'pendente' ainda).
alter table agendamentos drop constraint if exists agendamentos_status_check;

update agendamentos set status = 'pendente' where status = 'faltou';

alter table agendamentos add constraint agendamentos_status_check
  check (status in ('agendado','confirmado','atendido','cancelado','pendente'));

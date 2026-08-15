-- ============================================================
-- MIGRAÇÃO: cor por serviço (usada na Agenda/Início pra identificar
-- visualmente o tipo de atendimento)
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================

alter table servicos add column if not exists cor text not null default '#C14C74';

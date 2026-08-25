-- ============================================================
-- MIGRAÇÃO: remove a funcionalidade "cliente fixa" (não era usada)
-- Rode no SQL Editor do Supabase. Idempotente.
-- ATENÇÃO: irreversível — apaga os dados dessas duas colunas de vez.
-- ============================================================

alter table clientes drop column if exists cliente_fixa;
alter table clientes drop column if exists frequencia_dias;

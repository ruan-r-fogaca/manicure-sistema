-- ============================================================
-- MIGRAÇÃO: meta de atendimentos mensais (plano antigo com desconto)
-- Campo opcional pra clientes mensal_por_servico com um número de
-- referência no mês (ex: "5/6 atendimentos"). Puramente informativo —
-- não limita nem muda o valor cobrado além dele.
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================

alter table clientes add column if not exists meta_atendimentos_mes integer;

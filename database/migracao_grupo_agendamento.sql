-- ============================================================
-- MIGRAÇÃO: agrupar múltiplos serviços de um mesmo agendamento
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- Quando a cliente marca vários serviços de uma vez, cada serviço vira uma
-- linha em agendamentos, mas todas compartilham o mesmo grupo_id, para a
-- tela poder juntar tudo num único card (horário de início ao fim somado).
alter table agendamentos add column if not exists grupo_id uuid;

create index if not exists idx_agendamentos_grupo on agendamentos(grupo_id);

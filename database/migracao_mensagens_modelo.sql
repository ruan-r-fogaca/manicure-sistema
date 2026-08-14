-- ============================================================
-- MIGRAÇÃO: modelos de mensagem personalizáveis (macros de WhatsApp)
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================

create table if not exists mensagens_modelo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  texto text not null,
  criado_em timestamptz not null default now()
);

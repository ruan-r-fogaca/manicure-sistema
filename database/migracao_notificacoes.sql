-- ============================================================
-- MIGRAÇÃO: central de notificações (sino) + push notification
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================

-- Quando a cliente vai pagar um agendamento "pendente" (avulso, pagamento
-- adiado) — usado pra gerar o aviso "pagamento previsto pra hoje".
alter table pagamentos add column if not exists data_prevista date;

-- Notificações geradas pelo sistema (pagamento previsto vencendo,
-- agendamento esquecido em "Agendado"). Uma por agendamento+tipo — não gera
-- de novo se já existir (ver unique abaixo).
create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pagamento_pendente', 'agendamento_esquecido')),
  titulo text not null,
  mensagem text not null,
  agendamento_id uuid references agendamentos(id) on delete cascade,
  lida boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (agendamento_id, tipo)
);

create index if not exists idx_notificacoes_lida on notificacoes(lida);

-- Inscrições de notificação push (uma por aparelho/navegador que autorizou).
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- Sistema de Agendamento para Manicure - Schema do Banco de Dados
-- Rode este script inteiro no SQL Editor do Supabase
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ============================================================
-- TABELA: clientes
-- ============================================================
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  data_cadastro timestamptz not null default now(),
  cliente_fixa boolean not null default false,
  frequencia_dias integer, -- ex: 15 = a cada 15 dias
  servico_habitual_id uuid,
  horario_habitual time,
  observacoes text
);

-- ============================================================
-- TABELA: servicos
-- ============================================================
create table if not exists servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null,
  duracao_minutos integer not null,
  ativo boolean not null default true
);

-- ============================================================
-- TABELA: agendamentos
-- status possíveis: agendado, confirmado, atendido, cancelado, faltou
-- ============================================================
create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  servico_id uuid not null references servicos(id) on delete restrict,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  valor numeric(10,2) not null,
  status text not null default 'agendado'
    check (status in ('agendado','confirmado','atendido','cancelado','faltou')),
  observacao text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_agendamentos_data on agendamentos(data);
create index if not exists idx_agendamentos_cliente on agendamentos(cliente_id);

-- ============================================================
-- TABELA: pagamentos
-- status: pago | pendente
-- forma_pagamento: pix | dinheiro | cartao
-- ============================================================
create table if not exists pagamentos (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  valor numeric(10,2) not null,
  forma_pagamento text check (forma_pagamento in ('pix','dinheiro','cartao')),
  status text not null default 'pendente' check (status in ('pago','pendente')),
  data_pagamento timestamptz
);

create index if not exists idx_pagamentos_agendamento on pagamentos(agendamento_id);

-- ============================================================
-- TABELA: configuracoes (horário de funcionamento, editável na tela de Configurações)
-- ============================================================
create table if not exists configuracoes (
  id integer primary key default 1,
  horarios_funcionamento jsonb not null default '{
    "terca": {"abre": "08:00", "fecha": "20:00"},
    "quarta": {"abre": "08:00", "fecha": "20:00"},
    "quinta": {"abre": "08:00", "fecha": "20:00"},
    "sexta": {"abre": "08:00", "fecha": "20:00"},
    "sabado": {"abre": "08:00", "fecha": "17:00"},
    "domingo": null,
    "segunda": null
  }'::jsonb,
  intervalo_entre_atendimentos_minutos integer not null default 0,
  constraint single_row check (id = 1)
);

insert into configuracoes (id) values (1) on conflict (id) do nothing;

-- ============================================================
-- SEED: serviços iniciais (baseado na tabela do documento de requisitos)
-- ============================================================
insert into servicos (nome, preco, duracao_minutos, ativo) values
  ('Manicure', 35.00, 50, true),
  ('Pedicure', 35.00, 50, true),
  ('Plástica dos pés', 50.00, 90, true),
  ('Aplicação de alongamento', 150.00, 120, true),
  ('Manutenção', 100.00, 90, true),
  ('Banho de gel', 100.00, 60, true), -- duração assumida (a confirmar) - editável em Configurações
  ('Esmaltação em gel', 70.00, 60, true)
on conflict do nothing;

-- ============================================================
-- FUNÇÃO auxiliar: quando um agendamento é criado com status 'agendado' ou
-- 'confirmado', cria automaticamente um registro de pagamento 'pendente'.
-- ============================================================
create or replace function criar_pagamento_pendente()
returns trigger as $$
begin
  insert into pagamentos (agendamento_id, valor, status)
  values (new.id, new.valor, 'pendente');
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_criar_pagamento on agendamentos;
create trigger trg_criar_pagamento
after insert on agendamentos
for each row execute function criar_pagamento_pendente();

-- ============================================================
-- MIGRAÇÃO: módulo financeiro (tipos de cobrança e fechamento mensal)
-- Rode no SQL Editor do Supabase. Idempotente (pode rodar mais de uma vez).
-- ============================================================

-- CLIENTES: tipo de cobrança (avulso por atendimento, mensal fixo, ou mensal por serviço)
alter table clientes add column if not exists tipo_cobranca text not null default 'por_atendimento';
alter table clientes drop constraint if exists clientes_tipo_cobranca_check;
alter table clientes add constraint clientes_tipo_cobranca_check
  check (tipo_cobranca in ('por_atendimento','mensal_fixo','mensal_por_servico'));

alter table clientes add column if not exists valor_mensal_fixo numeric(10,2);
alter table clientes add column if not exists valor_por_servico numeric(10,2);
alter table clientes add column if not exists dia_cobranca integer;

-- TABELA: cobrancas (fechamento mensal para clientes com tipo_cobranca mensal)
create table if not exists cobrancas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  competencia date not null,
  tipo text not null check (tipo in ('mensal_fixo','mensal_por_servico')),
  quantidade_atendimentos integer,
  valor_cobrado numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente','pago','atrasado','cancelado')),
  forma_pagamento text check (forma_pagamento in ('pix','dinheiro','credito','debito')),
  data_pagamento timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists idx_cobrancas_competencia on cobrancas(competencia);
create index if not exists idx_cobrancas_cliente on cobrancas(cliente_id);

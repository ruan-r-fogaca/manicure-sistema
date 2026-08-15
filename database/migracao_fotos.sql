-- ============================================================
-- MIGRAÇÃO: galeria de fotos / portfólio
-- Rode no SQL Editor do Supabase. Idempotente.
-- ============================================================

create table if not exists fotos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  url text not null,
  legenda text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_fotos_cliente on fotos(cliente_id);

-- Bucket público de storage pra guardar as imagens (upload sempre passa pelo
-- backend com a service_role key, então não precisa de policy de escrita).
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

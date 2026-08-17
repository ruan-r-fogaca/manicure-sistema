-- ============================================================
-- MIGRAÇÃO: índices de performance
-- Nas últimas semanas várias telas passaram a filtrar por status/ativo/data
-- de pagamento (pendente, taxas de cartão, mensalidades vencidas etc.) sem
-- índice nessas colunas — o banco tinha que varrer a tabela inteira a cada
-- consulta. Roda no SQL Editor do Supabase. Idempotente.
-- ============================================================

create index if not exists idx_agendamentos_status on agendamentos(status);
create index if not exists idx_agendamentos_data_status on agendamentos(data, status);

create index if not exists idx_pagamentos_status on pagamentos(status);
create index if not exists idx_pagamentos_data_pagamento on pagamentos(data_pagamento);

create index if not exists idx_cobrancas_status on cobrancas(status);

create index if not exists idx_clientes_ativo on clientes(ativo);

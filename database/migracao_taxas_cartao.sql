-- Taxas de crédito/débito descontadas automaticamente no cálculo do
-- financeiro, pra "recebido" refletir o valor líquido que cai na conta (a
-- tabela configuracoes já existia sem uso desde a remoção do horário de
-- funcionamento — reaproveitada aqui).
alter table configuracoes
  add column if not exists taxa_credito_percentual numeric(5,2) not null default 3.14,
  add column if not exists taxa_debito_percentual numeric(5,2) not null default 1.37;

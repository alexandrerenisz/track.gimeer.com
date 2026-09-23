-- O webhook de compra deixou de ser Guru-específico (cliente novo usa
-- PagBank via Workflow do GHL) — renomeia a coluna que guardava o id da
-- transação pra refletir isso. Tabela ainda sem dado real (0 linhas neste
-- projeto), seguro renomear sem migração de dado.
alter table purchases rename column guru_transaction_id to transaction_id;

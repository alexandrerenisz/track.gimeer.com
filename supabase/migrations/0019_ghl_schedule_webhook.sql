-- Webhook separado para o agendamento (widget de booking do GHL/Lansar
-- embutido via iframe cross-origin na página /obrigado) — dispara só
-- Schedule, diferente do webhook de Lead (que dispara Lead + InitiateCheckout).
-- Mesmo motivo do webhook de Lead: o iframe do calendário é de outro domínio,
-- sem nenhum postMessage de volta pra página pai, então não dá pra capturar a
-- confirmação do agendamento via JS do nosso lado — o próprio GHL dispara via
-- automação (Workflow → Webhook). Mesmo padrão de segredo das migrations
-- anteriores: token no Vault, coluna guarda só o uuid.
alter table settings add column if not exists ghl_schedule_webhook_token_id uuid references vault.secrets (id);

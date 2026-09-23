-- Webhook separado para o evento "Formulário enviado" do GHL (dispara Lead +
-- InitiateCheckout) — diferente do webhook de Purchase (settings.webhook_token_id,
-- ainda no formato Guru, pendente de adaptação pro fluxo GHL/PagBank). O
-- popup de lead virou um formulário nativo do GHL (iframe cross-origin), então
-- não dá mais pra capturar o submit via JS do nosso lado — o próprio GHL
-- dispara esses eventos via automação (Workflow → Webhook). Mesmo padrão de
-- segredo das migrations anteriores: token no Vault, coluna guarda só o uuid.
alter table settings add column if not exists ghl_lead_webhook_token_id uuid references vault.secrets (id);

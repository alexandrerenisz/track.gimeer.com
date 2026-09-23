import { headers } from "next/headers";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/config/copy-button";
import { ConfigLinkCard } from "@/components/config/config-link-card";
import { SettingsForm } from "@/components/config/settings-form";
import { WebhookTokenForm } from "@/components/config/webhook-token-form";
import { GhlLeadWebhookTokenForm } from "@/components/config/ghl-lead-webhook-token-form";
import { GhlScheduleWebhookTokenForm } from "@/components/config/ghl-schedule-webhook-token-form";
import { getSettings } from "@/lib/config/settings";
import { readSecret } from "@/lib/vault/secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import { regenerateWebhookToken, regenerateGhlLeadWebhookToken, regenerateGhlScheduleWebhookToken } from "./actions";

export default async function ConfiguracoesPage() {
  const settings = await getSettings();
  const [webhookToken, ghlLeadWebhookToken, ghlScheduleWebhookToken] = await Promise.all([
    settings.webhook_token_id ? readSecret(settings.webhook_token_id) : null,
    settings.ghl_lead_webhook_token_id ? readSecret(settings.ghl_lead_webhook_token_id) : null,
    settings.ghl_schedule_webhook_token_id ? readSecret(settings.ghl_schedule_webhook_token_id) : null,
  ]);

  const headersList = await headers();
  const host = headersList.get("host") ?? "track.gimeer.com";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const webhookUrl = webhookToken ? `${protocol}://${host}/api/webhook/ghl-purchase/${webhookToken}` : null;
  const ghlLeadWebhookUrl = ghlLeadWebhookToken
    ? `${protocol}://${host}/api/webhook/ghl-lead/${ghlLeadWebhookToken}`
    : null;
  const ghlScheduleWebhookUrl = ghlScheduleWebhookToken
    ? `${protocol}://${host}/api/webhook/ghl-schedule/${ghlScheduleWebhookToken}`
    : null;

  const admin = createAdminClient();
  const [ga4, pixels, adAccounts] = await Promise.all([
    admin.from("ga4_accounts").select("*", { count: "exact", head: true }),
    admin.from("meta_pixels").select("*", { count: "exact", head: true }),
    admin.from("meta_ad_accounts").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Webhook, moeda e as contas de GA4/Meta que recebem os eventos.
        </p>
      </div>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Webhook de Compra</h2>
        {webhookUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {webhookUrl}
            </code>
            <CopyButton value={webhookUrl} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum token gerado ainda.</p>
        )}
        <form action={regenerateWebhookToken}>
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            {webhookUrl ? "Gerar novo token" : "Gerar token"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Cole essa URL na ação &quot;Webhook&quot; do Workflow do GHL disparado pelo gatilho
          nativo &quot;Pagamento recebido&quot;. Dispara Purchase. Trocar o token (gerado
          automaticamente ou definido manualmente abaixo) invalida o anterior — vai precisar
          atualizar lá também.
        </p>

        <div className="border-t border-border pt-4">
          <WebhookTokenForm />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Webhook de Lead</h2>
        {ghlLeadWebhookUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {ghlLeadWebhookUrl}
            </code>
            <CopyButton value={ghlLeadWebhookUrl} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum token gerado ainda.</p>
        )}
        <form action={regenerateGhlLeadWebhookToken}>
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            {ghlLeadWebhookUrl ? "Gerar novo token" : "Gerar token"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Cole essa URL na ação &quot;Webhook&quot; do Workflow do GHL disparado pelo gatilho
          nativo &quot;Formulário enviado&quot;. Dispara Lead + InitiateCheckout. Trocar o token
          invalida o anterior — vai precisar atualizar lá também.
        </p>

        <div className="border-t border-border pt-4">
          <GhlLeadWebhookTokenForm />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Webhook de Agendamento</h2>
        {ghlScheduleWebhookUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {ghlScheduleWebhookUrl}
            </code>
            <CopyButton value={ghlScheduleWebhookUrl} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum token gerado ainda.</p>
        )}
        <form action={regenerateGhlScheduleWebhookToken}>
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            {ghlScheduleWebhookUrl ? "Gerar novo token" : "Gerar token"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Cole essa URL na ação &quot;Webhook&quot; do Workflow do GHL disparado pelo gatilho
          nativo &quot;Formulário enviado&quot; do widget de agendamento (calendário embutido
          na página de obrigado). Dispara Schedule. Trocar o token invalida o anterior — vai
          precisar atualizar lá também.
        </p>

        <div className="border-t border-border pt-4">
          <GhlScheduleWebhookTokenForm />
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Geral</h2>
        <SettingsForm settings={settings} />
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <ConfigLinkCard href="/configuracoes/ga4" title="GA4" count={ga4.count ?? 0} />
        <ConfigLinkCard
          href="/configuracoes/meta-pixels"
          title="Pixels Meta"
          count={pixels.count ?? 0}
        />
        <ConfigLinkCard
          href="/configuracoes/meta-ad-accounts"
          title="Contas de anúncio"
          count={adAccounts.count ?? 0}
        />
      </div>
    </div>
  );
}

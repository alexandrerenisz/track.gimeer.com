"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSecret, updateSecret } from "@/lib/vault/secrets";
import { getSettings } from "@/lib/config/settings";
import { settingsSchema } from "@/lib/validation/config-schemas";

// Já aconteceu de alguém colar a URL inteira do webhook (em vez de só o
// token) nesse campo — quebra a comparação em produção, sem pista óbvia até
// inspecionar o valor cru no Vault (ver CLAUDE.md). O tamanho mínimo sozinho
// não pega isso, porque a URL também tem mais de 16 caracteres.
function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.includes("/");
}

export type SettingsActionState = { error: string } | undefined;

export async function updateSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const parsed = settingsSchema.safeParse({
    currency: formData.get("currency"),
    timezone: formData.get("timezone"),
    retention_days: formData.get("retention_days"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { error } = await admin
    .from("settings")
    .update({
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
      retention_days: parsed.data.retention_days,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) return { error: "Erro ao salvar: " + error.message };

  revalidatePath("/configuracoes");
  redirect("/configuracoes");
}

export async function regenerateWebhookToken() {
  const settings = await getSettings();
  const token = randomBytes(24).toString("hex");
  const admin = createAdminClient();

  if (settings.webhook_token_id) {
    await updateSecret(settings.webhook_token_id, token);
  } else {
    const secretId = await createSecret(token, "webhook_token");
    await admin.from("settings").update({ webhook_token_id: secretId }).eq("id", true);
  }

  revalidatePath("/configuracoes");
}

export type SetWebhookTokenState = { error: string } | undefined;

export async function setWebhookToken(
  _prev: SetWebhookTokenState,
  formData: FormData,
): Promise<SetWebhookTokenState> {
  const token = (formData.get("token") as string | null)?.trim();
  if (!token || token.length < 16) {
    return { error: "O token precisa ter pelo menos 16 caracteres." };
  }
  if (looksLikeUrl(token)) {
    return { error: "Isso parece uma URL, não um token — cole só o valor depois da última barra." };
  }

  const settings = await getSettings();
  const admin = createAdminClient();

  if (settings.webhook_token_id) {
    await updateSecret(settings.webhook_token_id, token);
  } else {
    const secretId = await createSecret(token, "webhook_token");
    await admin.from("settings").update({ webhook_token_id: secretId }).eq("id", true);
  }

  revalidatePath("/configuracoes");
}

export async function regenerateGhlLeadWebhookToken() {
  const settings = await getSettings();
  const token = randomBytes(24).toString("hex");
  const admin = createAdminClient();

  if (settings.ghl_lead_webhook_token_id) {
    await updateSecret(settings.ghl_lead_webhook_token_id, token);
  } else {
    const secretId = await createSecret(token, "ghl_lead_webhook_token");
    await admin.from("settings").update({ ghl_lead_webhook_token_id: secretId }).eq("id", true);
  }

  revalidatePath("/configuracoes");
}

export type SetGhlLeadWebhookTokenState = { error: string } | undefined;

export async function setGhlLeadWebhookToken(
  _prev: SetGhlLeadWebhookTokenState,
  formData: FormData,
): Promise<SetGhlLeadWebhookTokenState> {
  const token = (formData.get("token") as string | null)?.trim();
  if (!token || token.length < 16) {
    return { error: "O token precisa ter pelo menos 16 caracteres." };
  }
  if (looksLikeUrl(token)) {
    return { error: "Isso parece uma URL, não um token — cole só o valor depois da última barra." };
  }

  const settings = await getSettings();
  const admin = createAdminClient();

  if (settings.ghl_lead_webhook_token_id) {
    await updateSecret(settings.ghl_lead_webhook_token_id, token);
  } else {
    const secretId = await createSecret(token, "ghl_lead_webhook_token");
    await admin.from("settings").update({ ghl_lead_webhook_token_id: secretId }).eq("id", true);
  }

  revalidatePath("/configuracoes");
}

export async function regenerateGhlScheduleWebhookToken() {
  const settings = await getSettings();
  const token = randomBytes(24).toString("hex");
  const admin = createAdminClient();

  if (settings.ghl_schedule_webhook_token_id) {
    await updateSecret(settings.ghl_schedule_webhook_token_id, token);
  } else {
    const secretId = await createSecret(token, "ghl_schedule_webhook_token");
    await admin.from("settings").update({ ghl_schedule_webhook_token_id: secretId }).eq("id", true);
  }

  revalidatePath("/configuracoes");
}

export type SetGhlScheduleWebhookTokenState = { error: string } | undefined;

export async function setGhlScheduleWebhookToken(
  _prev: SetGhlScheduleWebhookTokenState,
  formData: FormData,
): Promise<SetGhlScheduleWebhookTokenState> {
  const token = (formData.get("token") as string | null)?.trim();
  if (!token || token.length < 16) {
    return { error: "O token precisa ter pelo menos 16 caracteres." };
  }
  if (looksLikeUrl(token)) {
    return { error: "Isso parece uma URL, não um token — cole só o valor depois da última barra." };
  }

  const settings = await getSettings();
  const admin = createAdminClient();

  if (settings.ghl_schedule_webhook_token_id) {
    await updateSecret(settings.ghl_schedule_webhook_token_id, token);
  } else {
    const secretId = await createSecret(token, "ghl_schedule_webhook_token");
    await admin.from("settings").update({ ghl_schedule_webhook_token_id: secretId }).eq("id", true);
  }

  revalidatePath("/configuracoes");
}

import "server-only";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchEvent } from "@/lib/tracking/dispatch-event";
import { matchVisitor, type VisitorMatch } from "@/lib/tracking/match-visitor";
import { hashEmail, hashPhone } from "@/lib/meta/hashing";
import { resolveLeadFields, type GhlLeadWebhookPayload } from "./lead-webhook-schema";
import { isMetaBotOrProxy } from "@/lib/tracking/meta-bot";
import type { Database } from "@/lib/types/database";

type VisitorUpdate = Database["public"]["Tables"]["visitors"]["Update"];

export type ProcessLeadResult = {
  dispatched: boolean;
  matchMethod: string;
};

// contact_id sozinho não é uma boa chave de idempotência permanente: a mesma
// pessoa pode legitimamente enviar o formulário de novo (testes, nova
// tentativa dias depois) e cada envio real deveria contar como um Lead
// separado no dashboard. O bucket de 5 minutos protege contra o caso real
// (retry do próprio Workflow/GHL por timeout, ou dois requests quase
// simultâneos) sem bloquear reenvios legítimos passados esses 5 minutos.
const IDEMPOTENCY_BUCKET_MS = 5 * 60 * 1000;

function idempotencyBucket(): number {
  return Math.floor(Date.now() / IDEMPOTENCY_BUCKET_MS);
}

type ResolvedLead = ReturnType<typeof resolveLeadFields>;

/**
 * Idempotente por contact_id + janela de 5 minutos: a reserva é um INSERT
 * síncrono (status "pending") protegido pela unique index de event_id
 * (migration 0017) — se dois requests concorrentes chegarem quase juntos
 * (mesmo contact_id, mesmo bucket), só um consegue inserir; o outro recebe
 * unique_violation (23505) e retorna sem disparar de novo. Um
 * SELECT-antes-de-INSERT não bastaria aqui porque o INSERT de verdade só
 * acontecia em segundo plano (waitUntil): dava tempo de dois requests
 * passarem pelo SELECT antes de qualquer um deles gravar a linha, duplicando
 * o disparo pro Meta/GA4 (bug real, visto em teste local).
 *
 * Dispara Lead e, na sequência, InitiateCheckout — no fluxo antigo (form
 * nosso) os dois eram disparados juntos no mesmo clique, e continuam sendo
 * conceitualmente simultâneos agora que o formulário é do GHL (enviar o
 * formulário e seguir pro checkout viraram uma coisa só, controlada pelo GHL).
 *
 * Nome/email/telefone/ip/user-agent vêm com prioridade pro payload NATIVO do
 * GHL (contact.attributionSource etc.) — ver resolveLeadFields em
 * lead-webhook-schema.ts, mesma descoberta documentada no webhook de Compra.
 *
 * Responde rápido (só a reserva) e dispara pro Meta/GA4 em segundo plano via
 * waitUntil — mesmo motivo documentado em lib/ghl/process-purchase.ts
 * (evitar timeout de entrega do webhook).
 */
export async function processGhlLead(
  payload: GhlLeadWebhookPayload,
  rawPayload: unknown,
): Promise<ProcessLeadResult> {
  const admin = createAdminClient();
  const resolved = resolveLeadFields(payload);

  // Mesma lógica do /api/identify e /api/event: se a atribuição desse
  // request específico (contact.attributionSource do GHL) veio do crawler ou
  // do IP da própria Meta, não grava nada nem dispara pro GA4/Meta CAPI.
  if (isMetaBotOrProxy(resolved.ip, resolved.userAgent)) {
    return { dispatched: false, matchMethod: "meta_bot_or_proxy" };
  }

  const leadEventId = `lead-ghl-${payload.contact_id}-${idempotencyBucket()}`;

  const match = await matchVisitor(admin, {
    trckUserId: resolved.trckUserId,
    email: resolved.email,
    phone: resolved.phone,
  });

  // Nome/email/telefone só chegam aqui (o formulário do GHL é a única fonte
  // dessa identidade agora que o popup não é mais nosso) — sempre sobrescreve
  // quando presente, mesma filosofia do /api/event (o dado mais recente
  // informado pelo próprio visitante é o que vale). Roda mesmo em reenvio
  // duplicado (idempotência abaixo é só pra não redisparar pro Meta/GA4) —
  // atualizar de novo com os mesmos dados é inofensivo.
  if (match.visitor && (resolved.email || resolved.phone || resolved.fullName)) {
    const identityPatch: VisitorUpdate = {};
    if (resolved.email) {
      identityPatch.email = resolved.email;
      identityPatch.email_hash = hashEmail(resolved.email);
    }
    if (resolved.phone) {
      identityPatch.phone = resolved.phone;
      identityPatch.phone_hash = hashPhone(resolved.phone);
    }
    if (resolved.fullName) identityPatch.name = resolved.fullName;
    await admin.from("visitors").update(identityPatch).eq("id", match.visitor.id);
  }

  const { error: claimError } = await admin.from("events_log").insert({
    event_id: leadEventId,
    event_name: "Lead",
    trck_user_id: resolved.trckUserId,
    visitor_id: match.visitor?.id ?? null,
    status: "pending",
  });

  if (claimError) {
    if (claimError.code === "23505") {
      return { dispatched: false, matchMethod: "already_processed" };
    }
    throw new Error(`Falha ao reservar evento de lead: ${claimError.message}`);
  }

  waitUntil(
    dispatchLeadEvents({ admin, resolved, leadEventId, match, contactId: payload.contact_id }).catch((err) => {
      console.error("Erro ao disparar Lead/InitiateCheckout (GHL) em segundo plano:", err);
    }),
  );

  return { dispatched: true, matchMethod: match.method };
}

async function dispatchLeadEvents(args: {
  admin: ReturnType<typeof createAdminClient>;
  resolved: ResolvedLead;
  leadEventId: string;
  match: VisitorMatch;
  contactId: string;
}): Promise<void> {
  const { admin, resolved, leadEventId, match, contactId } = args;

  const externalId = resolved.trckUserId ?? contactId;
  const eventSourceUrl = resolved.eventSourceUrl ?? match.visitor?.landing_url ?? undefined;
  const ip = resolved.ip ?? match.visitor?.ip ?? null;
  const userAgent = resolved.userAgent ?? match.visitor?.user_agent ?? null;
  const attribution = {
    utm_source: match.visitor?.utm_source ?? null,
    utm_medium: match.visitor?.utm_medium ?? null,
    utm_campaign: match.visitor?.utm_campaign ?? null,
    utm_term: match.visitor?.utm_term ?? resolved.trckUserId ?? null,
    utm_content: match.visitor?.utm_content ?? null,
    geo_country: match.visitor?.geo_country ?? null,
    geo_region: match.visitor?.geo_region ?? null,
    geo_city: match.visitor?.geo_city ?? null,
  };
  const userData = {
    email: resolved.email,
    phone: resolved.phone,
    fbp: match.visitor?.fbp,
    fbc: match.visitor?.fbc,
    externalId,
    firstName: resolved.firstName,
    lastName: resolved.lastName,
    city: match.visitor?.geo_city,
    state: match.visitor?.geo_region,
    zip: match.visitor?.geo_postal_code,
    country: match.visitor?.geo_country,
  };

  const leadResult = await dispatchEvent({
    ga4EventName: "generate_lead",
    metaEventName: "Lead",
    eventId: leadEventId,
    eventSourceUrl,
    ip,
    userAgent,
    userData,
    customData: { content_name: "Mini-Ensaio Fotográfico" },
    ga4: { clientId: match.visitor?.ga_client_id, sessionId: match.visitor?.ga_session_id },
    serverOnly: true,
  });

  await admin
    .from("events_log")
    .update({
      ...attribution,
      status: leadResult.status,
      payload_meta: leadResult.payloadMeta,
      response_meta: leadResult.responseMeta,
      payload_ga4: leadResult.payloadGa4,
      response_ga4: leadResult.responseGa4,
    })
    .eq("event_id", leadEventId);

  const checkoutEventId = leadEventId.replace(/^lead-/, "checkout-");
  const value = resolved.value ?? undefined;
  const currency = resolved.currency;

  const checkoutResult = await dispatchEvent({
    ga4EventName: "begin_checkout",
    metaEventName: "InitiateCheckout",
    eventId: checkoutEventId,
    eventSourceUrl,
    ip,
    userAgent,
    userData,
    customData: { value, currency },
    ga4Params: { value, currency },
    ga4: { clientId: match.visitor?.ga_client_id, sessionId: match.visitor?.ga_session_id },
    serverOnly: true,
  });

  await admin.from("events_log").insert({
    event_id: checkoutEventId,
    event_name: "InitiateCheckout",
    trck_user_id: resolved.trckUserId,
    visitor_id: match.visitor?.id ?? null,
    value: value ?? null,
    currency,
    ...attribution,
    status: checkoutResult.status,
    payload_meta: checkoutResult.payloadMeta,
    response_meta: checkoutResult.responseMeta,
    payload_ga4: checkoutResult.payloadGa4,
    response_ga4: checkoutResult.responseGa4,
  });
}

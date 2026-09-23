import "server-only";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchEvent } from "@/lib/tracking/dispatch-event";
import { matchVisitor, type VisitorMatch } from "@/lib/tracking/match-visitor";
import { hashEmail, hashPhone } from "@/lib/meta/hashing";
import { resolveScheduleFields, type GhlScheduleWebhookPayload } from "./schedule-webhook-schema";
import { isMetaBotOrProxy } from "@/lib/tracking/meta-bot";

export type ProcessScheduleResult = {
  dispatched: boolean;
  matchMethod: string;
};

// Mesmo raciocínio do webhook de Lead (lib/ghl/process-lead.ts): contact_id
// sozinho não é uma boa chave de idempotência permanente (a mesma pessoa pode
// legitimamente agendar de novo depois), mas protege contra retry do
// Workflow/GHL ou dois requests quase simultâneos dentro da mesma janela.
const IDEMPOTENCY_BUCKET_MS = 5 * 60 * 1000;

function idempotencyBucket(): number {
  return Math.floor(Date.now() / IDEMPOTENCY_BUCKET_MS);
}

type ResolvedSchedule = ReturnType<typeof resolveScheduleFields>;

/**
 * Idempotente por contact_id + janela de 5 minutos: a reserva é um INSERT
 * síncrono (status "pending") protegido pela unique index de event_id
 * (migration 0017) — mesmo padrão de lib/ghl/process-lead.ts, incluindo o
 * motivo de reservar antes de disparar em segundo plano (evita duplicar o
 * disparo pro Meta/GA4 quando dois requests concorrentes chegam quase
 * juntos).
 *
 * Dispara só Schedule (sem par com outro evento) — diferente do webhook de
 * Lead, que dispara Lead + InitiateCheckout juntos.
 *
 * Nome/email/telefone/ip/user-agent vêm com prioridade pro payload NATIVO do
 * GHL — ver resolveScheduleFields em schedule-webhook-schema.ts.
 *
 * Responde rápido (só a reserva) e dispara pro Meta/GA4 em segundo plano via
 * waitUntil — mesmo motivo documentado em lib/ghl/process-purchase.ts
 * (evitar timeout de entrega do webhook).
 */
export async function processGhlSchedule(
  payload: GhlScheduleWebhookPayload,
  rawPayload: unknown,
): Promise<ProcessScheduleResult> {
  const admin = createAdminClient();
  const resolved = resolveScheduleFields(payload);

  // Mesma lógica dos outros webhooks GHL: se a atribuição desse request
  // específico veio do crawler ou do IP da própria Meta, não grava nada nem
  // dispara pro GA4/Meta CAPI.
  if (isMetaBotOrProxy(resolved.ip, resolved.userAgent)) {
    return { dispatched: false, matchMethod: "meta_bot_or_proxy" };
  }

  const scheduleEventId = `schedule-ghl-${payload.contact_id}-${idempotencyBucket()}`;

  const match = await matchVisitor(admin, {
    trckUserId: resolved.trckUserId,
    email: resolved.email,
    phone: resolved.phone,
  });

  // Sempre sobrescreve quando presente, mesma filosofia dos outros webhooks
  // GHL (o dado mais recente informado pelo próprio visitante é o que vale).
  // Roda mesmo em reenvio duplicado — idempotência abaixo é só pra não
  // redisparar pro Meta/GA4.
  if (match.visitor && (resolved.email || resolved.phone || resolved.fullName)) {
    const identityPatch: Record<string, string> = {};
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
    event_id: scheduleEventId,
    event_name: "Schedule",
    trck_user_id: resolved.trckUserId,
    visitor_id: match.visitor?.id ?? null,
    status: "pending",
  });

  if (claimError) {
    if (claimError.code === "23505") {
      return { dispatched: false, matchMethod: "already_processed" };
    }
    throw new Error(`Falha ao reservar evento de agendamento: ${claimError.message}`);
  }

  waitUntil(
    dispatchScheduleEvent({ admin, resolved, scheduleEventId, match, contactId: payload.contact_id }).catch((err) => {
      console.error("Erro ao disparar Schedule (GHL) em segundo plano:", err);
    }),
  );

  return { dispatched: true, matchMethod: match.method };
}

async function dispatchScheduleEvent(args: {
  admin: ReturnType<typeof createAdminClient>;
  resolved: ResolvedSchedule;
  scheduleEventId: string;
  match: VisitorMatch;
  contactId: string;
}): Promise<void> {
  const { admin, resolved, scheduleEventId, match, contactId } = args;

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

  const scheduleResult = await dispatchEvent({
    ga4EventName: "schedule",
    metaEventName: "Schedule",
    eventId: scheduleEventId,
    eventSourceUrl,
    ip,
    userAgent,
    userData,
    customData: { content_name: "Conversa com Especialista" },
    ga4: { clientId: match.visitor?.ga_client_id, sessionId: match.visitor?.ga_session_id },
    serverOnly: true,
  });

  await admin
    .from("events_log")
    .update({
      ...attribution,
      status: scheduleResult.status,
      payload_meta: scheduleResult.payloadMeta,
      response_meta: scheduleResult.responseMeta,
      payload_ga4: scheduleResult.payloadGa4,
      response_ga4: scheduleResult.responseGa4,
    })
    .eq("event_id", scheduleEventId);
}

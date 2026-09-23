import "server-only";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashEmail, hashPhone } from "@/lib/meta/hashing";
import { dispatchEvent } from "@/lib/tracking/dispatch-event";
import { matchVisitor, type VisitorMatch } from "@/lib/tracking/match-visitor";
import { resolvePurchaseFields, type GhlPurchaseWebhookPayload } from "./purchase-webhook-schema";
import { isMetaBotOrProxy } from "@/lib/tracking/meta-bot";

export type ProcessPurchaseResult = {
  purchaseId: string;
  dispatched: boolean;
  matchMethod: string;
};

// Fallback pra quando payment.transaction_id não vem no payload (raro, mas
// visto em produção) — sem isso a compra inteira era perdida (400 antes de
// gravar qualquer coisa). Janela de 5 minutos: mesmo raciocínio do webhook
// de Lead (protege contra retry/corrida real sem correr risco de nunca mais
// registrar uma compra genuína do mesmo contato).
const IDEMPOTENCY_BUCKET_MS = 5 * 60 * 1000;

function fallbackTransactionId(contactId: string): string {
  return `ghl-${contactId}-${Math.floor(Date.now() / IDEMPOTENCY_BUCKET_MS)}`;
}

// funnel_counts/billing_summary/revenue_by_day (herdados da Fase 5, pensados
// pro vocabulário de status da Guru) só somam receita de linhas com status
// "approved"/"confirmed" — literal, comparação de string. O GHL manda seu
// próprio vocabulário em payment.payment_status ("succeeded", possivelmente
// outros dependendo do gateway/PagBank) que nunca bate com isso, deixando
// Receita/ROAS zerados mesmo com a compra certinha no funil (que conta por
// nome de evento em events_log, não por status). Como o gatilho "Pagamento
// Recebido" do GHL só dispara em pagamento já aprovado (não existe status
// intermediário aqui, diferente do webhook antigo da Guru), normaliza
// qualquer status reconhecido como sucesso pro valor canônico do sistema.
function normalizeStatus(rawStatus: string): string {
  const success = ["succeeded", "success", "paid", "completed", "complete", "approved", "confirmed"];
  return success.includes(rawStatus.toLowerCase()) ? "approved" : rawStatus;
}

type ResolvedPurchase = ReturnType<typeof resolvePurchaseFields>;

/**
 * Diferente do webhook antigo da Guru (um payload de status mutável cobrindo
 * pending → approved → refunded), o gatilho "Pagamento Recebido" do GHL só
 * dispara em pagamento aprovado — cada chamada aqui já significa uma compra
 * aprovada, sem precisar de state machine de status.
 *
 * Os campos reais (valor, moeda, status, id da transação, ip/user-agent de
 * origem) vêm do payload NATIVO do GHL (payment.*, contact.attributionSource),
 * não dos "Dados Personalizados" configurados manualmente na ação de Webhook
 * — ver resolvePurchaseFields em purchase-webhook-schema.ts pro porquê.
 *
 * Idempotente por transaction_id: o INSERT em purchases é síncrono e
 * protegido pela unique constraint da coluna — se o Workflow reenviar (retry,
 * teste duplicado), o segundo INSERT falha com unique_violation (23505) em
 * vez de duplicar a compra. Mesmo padrão do webhook de Lead (lib/ghl/process-lead.ts).
 *
 * Responde rápido (só o INSERT) e dispara pro Meta/GA4 em segundo plano via
 * waitUntil — mesmo motivo documentado no processo antigo da Guru (evitar
 * timeout de entrega do webhook).
 */
export async function processGhlPurchase(
  payload: GhlPurchaseWebhookPayload,
  rawPayload: unknown,
): Promise<ProcessPurchaseResult> {
  const admin = createAdminClient();
  const resolved = resolvePurchaseFields(payload);

  // Mesma lógica do webhook de Lead: se a atribuição desse pagamento
  // específico (contact.attributionSource do GHL) veio do crawler ou do IP
  // da própria Meta, não grava a compra nem dispara pro GA4/Meta CAPI. Como
  // é por requisição (não por visitante), uma compra real cujo próprio
  // attributionSource tenha IP genuíno passa normal — isso só bloqueia
  // quando o disparo específico da compra vem com sinal de bot/proxy.
  if (isMetaBotOrProxy(resolved.ip, resolved.userAgent)) {
    return { purchaseId: "", dispatched: false, matchMethod: "meta_bot_or_proxy" };
  }

  const match = await matchVisitor(admin, {
    trckUserId: resolved.trckUserId,
    email: resolved.email,
    phone: resolved.phone,
  });

  // Mesma lógica do webhook de Lead (lib/ghl/process-lead.ts): sempre
  // sobrescreve nome/email/telefone do visitante quando presente — o dado da
  // compra confirmada é, se algo, o mais confiável de todos.
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

  let transactionId = resolved.transactionId;
  if (!transactionId) {
    transactionId = fallbackTransactionId(resolved.contactId);
    console.error(
      "payment.transaction_id ausente no webhook de Compra (GHL) — usando id sintético:",
      transactionId,
      "payload:",
      JSON.stringify(rawPayload),
    );
  }

  const { data: inserted, error: claimError } = await admin
    .from("purchases")
    .insert({
      transaction_id: transactionId,
      trck_user_id: resolved.trckUserId,
      visitor_id: match.visitor?.id ?? null,
      match_method: match.method,
      status: normalizeStatus(resolved.status),
      gross_value: resolved.grossValue,
      net_value: resolved.grossValue,
      currency: resolved.currency,
      payment_method: resolved.paymentMethod,
      utm_source: match.visitor?.utm_source ?? null,
      utm_medium: match.visitor?.utm_medium ?? null,
      utm_campaign: match.visitor?.utm_campaign ?? null,
      utm_term: match.visitor?.utm_term ?? resolved.trckUserId ?? null,
      utm_content: match.visitor?.utm_content ?? null,
      contact_name: resolved.fullName,
      contact_email: resolved.email,
      contact_email_hash: resolved.email ? hashEmail(resolved.email) : null,
      contact_phone: resolved.phone,
      contact_phone_hash: resolved.phone ? hashPhone(resolved.phone) : null,
      geo_country: match.visitor?.geo_country ?? null,
      ga_client_id: match.visitor?.ga_client_id ?? null,
      ga_session_id: match.visitor?.ga_session_id ?? null,
      fbp: match.visitor?.fbp ?? null,
      fbc: match.visitor?.fbc ?? null,
      raw_payload: rawPayload,
      confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (claimError) {
    if (claimError.code === "23505") {
      return { purchaseId: "", dispatched: false, matchMethod: "already_processed" };
    }
    throw new Error(`Falha ao gravar compra: ${claimError.message}`);
  }

  const purchaseId = inserted.id as string;

  waitUntil(
    dispatchPurchaseEvent({ admin, resolved, transactionId, purchaseId, match }).catch((err) => {
      console.error("Erro ao disparar Purchase (GHL) em segundo plano:", err);
    }),
  );

  return { purchaseId, dispatched: true, matchMethod: match.method };
}

async function dispatchPurchaseEvent(args: {
  admin: ReturnType<typeof createAdminClient>;
  resolved: ResolvedPurchase;
  transactionId: string;
  purchaseId: string;
  match: VisitorMatch;
}): Promise<void> {
  const { admin, resolved, transactionId, purchaseId, match } = args;

  const eventId = `purchase-ghl-${transactionId}`;
  const value = resolved.grossValue ?? 0;
  const currency = resolved.currency;
  const externalId = resolved.trckUserId ?? resolved.contactId;

  const result = await dispatchEvent({
    ga4EventName: "purchase",
    metaEventName: "Purchase",
    eventId,
    eventSourceUrl: resolved.eventSourceUrl ?? match.visitor?.landing_url ?? undefined,
    ip: resolved.ip ?? match.visitor?.ip ?? null,
    userAgent: resolved.userAgent ?? match.visitor?.user_agent ?? null,
    userData: {
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
    },
    customData: {
      value,
      currency,
      content_name: "Mini-Ensaio Fotográfico",
      content_type: "product",
    },
    ga4Params: {
      transaction_id: transactionId,
      value,
      currency,
    },
    ga4: {
      clientId: match.visitor?.ga_client_id,
      sessionId: match.visitor?.ga_session_id,
    },
    serverOnly: true,
  });

  const { data: eventRow } = await admin
    .from("events_log")
    .insert({
      event_id: eventId,
      event_name: "Purchase",
      trck_user_id: resolved.trckUserId,
      visitor_id: match.visitor?.id ?? null,
      value,
      currency,
      utm_source: match.visitor?.utm_source ?? null,
      utm_medium: match.visitor?.utm_medium ?? null,
      utm_campaign: match.visitor?.utm_campaign ?? null,
      utm_term: match.visitor?.utm_term ?? resolved.trckUserId ?? null,
      utm_content: match.visitor?.utm_content ?? null,
      geo_country: match.visitor?.geo_country ?? null,
      geo_region: match.visitor?.geo_region ?? null,
      geo_city: match.visitor?.geo_city ?? null,
      status: result.status,
      payload_meta: result.payloadMeta,
      response_meta: result.responseMeta,
      payload_ga4: result.payloadGa4,
      response_ga4: result.responseGa4,
    })
    .select("id")
    .single();

  await admin.from("purchases").update({ purchase_event_id: eventRow?.id ?? null }).eq("id", purchaseId);
}

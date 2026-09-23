import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { corsHeaders, handleCorsPreflight } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/tracking/request-meta";
import { getGeo } from "@/lib/tracking/geo";
import { eventSchema } from "@/lib/validation/tracking-schemas";
import { dispatchEvent } from "@/lib/tracking/dispatch-event";
import { hashEmail, hashPhone } from "@/lib/meta/hashing";
import { splitName } from "@/lib/tracking/split-name";
import { isMetaBotOrProxy } from "@/lib/tracking/meta-bot";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// Grava em events_log e dispara pra todos os pixels Meta ativos (dedup com o
// navegador via event_id). GA4 aqui NUNCA dispara via MP — o gtag do
// navegador já cobre esses eventos; MP é só pra eventos server-only (Purchase
// do webhook, Fase 4).
export async function POST(request: NextRequest) {
  const headers = corsHeaders(request.headers.get("origin"));

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`event:${ip ?? "unknown"}`, 60, 60);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit excedido." }, { status: 429, headers });
  }

  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400, headers });
  }

  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400, headers });
  }
  const input = parsed.data;

  const userAgent = getUserAgent(request);
  const geo = getGeo(request);
  const admin = createAdminClient();

  // Mesma lógica do /api/identify: crawler oficial da Meta ou requisição
  // vinda do IP da própria infraestrutura deles — não grava em events_log
  // nem dispara pro GA4/Meta CAPI. Checagem por requisição, não por
  // visitante: um evento anterior desse mesmo trck_user_id pode ter passado
  // normal, só esse aqui (com IP/UA da Meta) é que fica de fora.
  if (isMetaBotOrProxy(ip, userAgent)) {
    return NextResponse.json({ ok: true, status: "skipped" }, { headers });
  }

  const { data: visitor } = await admin
    .from("visitors")
    .select("*")
    .eq("trck_user_id", input.trck_user_id)
    .maybeSingle();

  // Backfill de fbp/fbc: o /api/identify roda antes do Pixel da Meta setar
  // esses cookies (corrida entre dois fetch assíncronos) e costuma perder
  // essa corrida no primeiro carregamento de um visitante novo. Os eventos
  // disparam um pouco depois e já leem os cookies frescos — então qualquer
  // evento com fbp/fbc "cura" o buraco que o identify deixou na linha do
  // visitante, sem depender de acertar timing no navegador.
  if (visitor && ((input.fbp && !visitor.fbp) || (input.fbc && !visitor.fbc))) {
    const patch: Record<string, string> = {};
    if (input.fbp && !visitor.fbp) patch.fbp = input.fbp;
    if (input.fbc && !visitor.fbc) patch.fbc = input.fbc;
    await admin.from("visitors").update(patch).eq("id", visitor.id);
    Object.assign(visitor, patch);
  }

  // Identidade do lead (nome/email/telefone) só chega aqui — o /api/identify
  // roda antes do popup ser preenchido, então nunca carrega isso. Diferente
  // do backfill de fbp/fbc acima, aqui sempre sobrescreve quando presente
  // (mesma filosofia do /api/identify: o dado mais recente informado pelo
  // próprio visitante é o que vale).
  if (visitor && (input.email || input.phone || input.name)) {
    const identityPatch: Record<string, string> = {};
    if (input.email) {
      identityPatch.email = input.email;
      identityPatch.email_hash = hashEmail(input.email);
    }
    if (input.phone) {
      identityPatch.phone = input.phone;
      identityPatch.phone_hash = hashPhone(input.phone);
    }
    if (input.name) identityPatch.name = input.name;
    await admin.from("visitors").update(identityPatch).eq("id", visitor.id);
    Object.assign(visitor, identityPatch);
  }

  const { firstName, lastName } = splitName(input.name ?? visitor?.name);

  const result = await dispatchEvent({
    ga4EventName: input.event_name,
    metaEventName: input.event_name,
    eventId: input.event_id,
    eventSourceUrl: input.event_source_url,
    ip,
    userAgent,
    userData: {
      email: input.email ?? visitor?.email,
      phone: input.phone ?? visitor?.phone,
      fbp: input.fbp ?? visitor?.fbp,
      fbc: input.fbc ?? visitor?.fbc,
      externalId: input.trck_user_id,
      firstName,
      lastName,
      city: geo.city,
      state: geo.region,
      zip: geo.postalCode,
      country: geo.country,
    },
    customData: {
      value: input.value,
      currency: input.currency,
      content_ids: input.content_ids,
      content_name: input.content_name,
      content_type: input.content_type,
    },
    ga4: {
      clientId: input.ga_client_id ?? visitor?.ga_client_id,
      sessionId: input.ga_session_id ?? visitor?.ga_session_id,
    },
    serverOnly: false,
  });

  await admin.from("events_log").insert({
    event_id: input.event_id,
    event_name: input.event_name,
    trck_user_id: input.trck_user_id,
    visitor_id: visitor?.id ?? null,
    event_source_url: input.event_source_url,
    value: input.value,
    currency: input.currency,
    content_ids: input.content_ids,
    content_name: input.content_name,
    content_type: input.content_type,
    // Utms da página no momento DESSE evento, não do visitante (que reflete
    // a atribuição antiga e quase nunca muda) — sem isso, todo o histórico
    // de um visitante recorrente mostrava sempre a mesma utm de origem,
    // mesmo em visitas sem nenhuma utm ou com utms diferentes.
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    utm_term: input.utm_term ?? null,
    utm_content: input.utm_content ?? null,
    ip,
    geo_country: geo.country,
    geo_region: geo.region,
    geo_city: geo.city,
    status: result.status,
    payload_meta: result.payloadMeta,
    response_meta: result.responseMeta,
    payload_ga4: result.payloadGa4,
    response_ga4: result.responseGa4,
  });

  return NextResponse.json({ ok: true, status: result.status }, { headers });
}

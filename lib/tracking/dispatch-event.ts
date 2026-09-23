import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { readSecret } from "@/lib/vault/secrets";
import { getSettings } from "@/lib/config/settings";
import { sendMetaEvents, type MetaEvent } from "@/lib/meta/capi";
import { sendGa4Event } from "@/lib/ga4/measurement-protocol";
import { hashEmail, hashPhone, sha256Lower } from "@/lib/meta/hashing";

/** Estado por extenso -> sigla ANSI de 2 letras (Meta recomenda a sigla pra
 * "st"; sem isso o hash de "Paraná" nunca bate com o hash de "PR" que outra
 * fonte de dado da Meta possa ter pro mesmo usuário). Cobre só os estados
 * que o GHL manda por extenso — passthrough (lowercase) pros que não bater. */
const BR_STATE_TO_UF: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE",
  "distrito federal": "DF", "espirito santo": "ES", goias: "GO", maranhao: "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

const ACCENTS: Record<string, string> = { á: "a", â: "a", ã: "a", à: "a", é: "e", ê: "e", í: "i", ó: "o", ô: "o", õ: "o", ú: "u", ç: "c" };

function stripAccents(value: string): string {
  return value.replace(/[áâãàéêíóôõúç]/g, (c) => ACCENTS[c] ?? c);
}

function normalizeState(state: string): string {
  const key = stripAccents(state.trim().toLowerCase());
  return BR_STATE_TO_UF[key] ?? state;
}

export type DispatchInput = {
  /** Nome do evento pro GA4 (ex: "purchase"). */
  ga4EventName: string;
  /** Nome do evento pra Meta (ex: "Purchase", "PageView"). */
  metaEventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  ip: string | null;
  userAgent: string | null;
  userData: {
    email?: string | null;
    phone?: string | null;
    fbp?: string | null;
    fbc?: string | null;
    externalId?: string | null;
    /** fn/ln — parâmetros de match adicionais recomendados pela Meta pra
     * melhorar o Event Match Quality (EMQ) quando disponíveis. */
    firstName?: string | null;
    lastName?: string | null;
    /** ct/st/zp/country — mesma lógica, geo do visitante (captada via
     * @vercel/functions geolocation() no /api/identify). */
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  };
  customData?: Record<string, unknown>;
  ga4Params?: Record<string, unknown>;
  ga4: {
    clientId?: string | null;
    sessionId?: string | null;
  };
  /**
   * true: evento nasceu fora do navegador (ex: Purchase via webhook) — dispara
   * GA4 via Measurement Protocol. false/undefined: evento do navegador, o
   * gtag já cobre o GA4 — só dispara Meta CAPI (dedup com o pixel via event_id).
   */
  serverOnly?: boolean;
};

export type DispatchResult = {
  payloadMeta: unknown[];
  responseMeta: unknown[];
  payloadGa4: unknown[];
  responseGa4: unknown[];
  status: "sent" | "partial" | "error" | "skipped";
};

export async function dispatchEvent(input: DispatchInput): Promise<DispatchResult> {
  const admin = createAdminClient();
  const [pixelsRes, ga4Res, settings] = await Promise.all([
    admin.from("meta_pixels").select("*").eq("is_active", true),
    admin.from("ga4_accounts").select("*").eq("is_active", true),
    getSettings(),
  ]);

  const pixels = pixelsRes.data ?? [];
  const ga4Accounts = input.serverOnly ? (ga4Res.data ?? []) : [];

  const payloadMeta: unknown[] = [];
  const responseMeta: unknown[] = [];
  const payloadGa4: unknown[] = [];
  const responseGa4: unknown[] = [];

  const userData: Record<string, unknown> = {};
  if (input.userData.email) userData.em = [hashEmail(input.userData.email)];
  if (input.userData.phone) userData.ph = [hashPhone(input.userData.phone)];
  if (input.userData.fbp) userData.fbp = input.userData.fbp;
  if (input.userData.fbc) userData.fbc = input.userData.fbc;
  if (input.userData.externalId) userData.external_id = [sha256Lower(input.userData.externalId)];
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  // fn/ln/ct/st/zp/country: parâmetros de match adicionais (não obrigatórios,
  // mas recomendados pela Meta pra aumentar o Event Match Quality) — só
  // disponíveis quando a fonte do evento manda (ex: payload do webhook GHL).
  if (input.userData.firstName) userData.fn = [sha256Lower(input.userData.firstName)];
  if (input.userData.lastName) userData.ln = [sha256Lower(input.userData.lastName)];
  if (input.userData.city) userData.ct = [sha256Lower(stripAccents(input.userData.city).replace(/\s+/g, ""))];
  if (input.userData.state) userData.st = [sha256Lower(normalizeState(input.userData.state))];
  if (input.userData.zip) userData.zp = [sha256Lower(input.userData.zip.replace(/\D/g, ""))];
  if (input.userData.country) userData.country = [sha256Lower(input.userData.country)];

  const metaEvent: MetaEvent = {
    event_name: input.metaEventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: input.eventSourceUrl,
    user_data: userData,
    custom_data: input.customData ?? {},
  };

  await Promise.all(
    pixels.map(async (pixel) => {
      try {
        const token = await readSecret(pixel.capi_token_id);
        const result = await sendMetaEvents(
          pixel.pixel_id,
          token,
          [metaEvent],
          settings.meta_test_event_code ?? undefined,
        );
        payloadMeta.push({
          pixel_id: pixel.pixel_id,
          test_event_code: settings.meta_test_event_code ?? null,
          request: metaEvent,
        });
        responseMeta.push({
          pixel_id: pixel.pixel_id,
          ok: result.ok,
          status: result.status,
          body: result.body,
        });
      } catch (err) {
        payloadMeta.push({ pixel_id: pixel.pixel_id, request: metaEvent });
        responseMeta.push({
          pixel_id: pixel.pixel_id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }),
  );

  if (input.serverOnly && input.ga4.clientId) {
    const ga4Event = { name: input.ga4EventName, params: input.ga4Params ?? {} };
    await Promise.all(
      ga4Accounts.map(async (account) => {
        try {
          const secret = await readSecret(account.api_secret_id);
          const result = await sendGa4Event(account.measurement_id, secret, input.ga4.clientId!, [ga4Event], {
            sessionId: input.ga4.sessionId,
          });
          payloadGa4.push({ measurement_id: account.measurement_id, request: ga4Event });
          responseGa4.push({
            measurement_id: account.measurement_id,
            ok: result.ok,
            status: result.status,
          });
        } catch (err) {
          payloadGa4.push({ measurement_id: account.measurement_id, request: ga4Event });
          responseGa4.push({
            measurement_id: account.measurement_id,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }),
    );
  }

  const allResponses = [...responseMeta, ...responseGa4] as { ok: boolean }[];
  const anyFailed = allResponses.some((r) => !r.ok);
  const anySucceeded = allResponses.some((r) => r.ok);
  const status =
    allResponses.length === 0 ? "skipped" : anyFailed && anySucceeded ? "partial" : anyFailed ? "error" : "sent";

  return { payloadMeta, responseMeta, payloadGa4, responseGa4, status };
}

import { z } from "zod";
import { splitName } from "@/lib/tracking/split-name";

// Mesma descoberta documentada em lead-webhook-schema.ts/purchase-webhook-schema.ts:
// o GHL manda um payload nativo rico junto com os "Dados Personalizados"
// configurados na ação de Webhook, não só o que a gente configurou solto na
// raiz. Merge field sem valor normalmente vira string vazia, não fica ausente
// nem vira null — por isso o preprocess trata "" como undefined em todo campo
// opcional.
const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);
const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());

const attributionSource = z
  .object({
    ip: optionalString(),
    userAgent: optionalString(),
    url: optionalString(),
  })
  .passthrough()
  .optional();

export const ghlScheduleWebhookSchema = z
  .object({
    // Id do contato no GHL — vem solto na raiz nativamente, sempre presente.
    // Usado como chave de idempotência (o Workflow pode disparar mais de uma
    // vez pro mesmo agendamento) e como external_id de fallback pro Meta
    // quando não há trck_user_id.
    contact_id: z.string().min(1, "contact_id é obrigatório"),
    trck_user_id: optionalString(),
    name: optionalString(),
    first_name: optionalString(),
    last_name: optionalString(),
    full_name: optionalString(),
    email: optionalString(),
    phone: optionalString(),
    contact: z
      .object({
        attributionSource,
        lastAttributionSource: attributionSource,
      })
      .passthrough()
      .optional(),
    customData: z
      .object({
        trck_user_id: optionalString(),
        name: optionalString(),
        email: optionalString(),
        phone: optionalString(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type GhlScheduleWebhookPayload = z.infer<typeof ghlScheduleWebhookSchema>;

/** Mesma prioridade dos outros webhooks GHL: payload nativo primeiro, Dados
 * Personalizados como fallback. Sem value/currency — agendamento não tem
 * valor monetário próprio. */
export function resolveScheduleFields(payload: GhlScheduleWebhookPayload) {
  const trckUserId = payload.trck_user_id || payload.customData?.trck_user_id || null;
  const email = payload.email || payload.customData?.email || null;
  const phone = payload.phone || payload.customData?.phone || null;
  const fullName = payload.full_name || payload.name || payload.customData?.name || null;
  const firstName = payload.first_name || splitName(fullName).firstName;
  const lastName = payload.last_name || splitName(fullName).lastName;
  const attribution = payload.contact?.attributionSource ?? payload.contact?.lastAttributionSource;
  const ip = attribution?.ip || null;
  const userAgent = attribution?.userAgent || null;
  const eventSourceUrl = attribution?.url || null;

  return { trckUserId, email, phone, fullName, firstName, lastName, ip, userAgent, eventSourceUrl };
}

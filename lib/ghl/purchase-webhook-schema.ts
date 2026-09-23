import { z } from "zod";
import { splitName } from "@/lib/tracking/split-name";

// O GHL manda MUITO mais do que só os "Dados personalizados" configurados na
// ação de Webhook — a plataforma inclui automaticamente um payload nativo
// rico (contato completo, pagamento completo, atribuição) junto, como o
// próprio editor avisa ("Esses pares... serão incluídos junto com dados
// padrão"). Descoberto inspecionando um raw_payload real: os campos de
// pagamento (transaction_id, total_amount, currency_code, payment_status,
// method) só existem dentro de `payment.*`, NÃO na raiz nem em `customData`
// com os nomes que a gente configurou manualmente — o `customData` só reflete
// os itens que a própria ação "Webhook" gera a partir dos Dados
// Personalizados, aninhados, não soltos na raiz como o schema antigo
// assumia. `contact_id`/`email`/`phone`/`trck_user_id` (campo customizado do
// contato) por outro lado JÁ vêm soltos na raiz nativamente, por isso
// sempre resolveram certo mesmo com o bug do resto.
const emptyToUndefined = (val: unknown) => (typeof val === "string" && val.trim() === "" ? undefined : val);
const optionalString = () => z.preprocess(emptyToUndefined, z.string().optional());
const optionalNumber = () =>
  z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : (typeof val === "number" ? val : undefined)),
    z.number().optional(),
  );

const attributionSource = z
  .object({
    ip: optionalString(),
    userAgent: optionalString(),
    url: optionalString(),
  })
  .passthrough()
  .optional();

export const ghlPurchaseWebhookSchema = z
  .object({
    contact_id: optionalString(),
    trck_user_id: optionalString(),
    email: optionalString(),
    phone: optionalString(),
    first_name: optionalString(),
    last_name: optionalString(),
    full_name: optionalString(),
    contact: z
      .object({
        attributionSource,
        lastAttributionSource: attributionSource,
      })
      .passthrough()
      .optional(),
    payment: z
      .object({
        transaction_id: optionalString(),
        total_amount: optionalNumber(),
        sub_total_amount: optionalNumber(),
        currency_code: optionalString(),
        payment_status: optionalString(),
        method: optionalString(),
        customer: z
          .object({
            email: optionalString(),
            phone: optionalString(),
            name: optionalString(),
            first_name: optionalString(),
            last_name: optionalString(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    // Dados Personalizados configurados manualmente na ação de Webhook —
    // mantido como fallback secundário (redundante com os campos nativos
    // acima na maioria dos casos, mas não custa ter).
    customData: z
      .object({
        contact_id: optionalString(),
        transaction_id: optionalString(),
        trck_user_id: optionalString(),
        name: optionalString(),
        email: optionalString(),
        phone: optionalString(),
        value: optionalNumber(),
        currency: optionalString(),
        status: optionalString(),
        payment_method: optionalString(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type GhlPurchaseWebhookPayload = z.infer<typeof ghlPurchaseWebhookSchema>;

/**
 * Resolve os campos reais do pagamento com prioridade: payload nativo do GHL
 * (payment.*, sempre presente) -> Dados Personalizados (customData, pode
 * faltar ou estar desatualizado) -> valor calculado (contact_id + janela de
 * idempotência) só pro transaction_id, como último recurso.
 */
export function resolvePurchaseFields(payload: GhlPurchaseWebhookPayload) {
  const contactId = payload.contact_id || payload.customData?.contact_id || "";
  const transactionId = payload.payment?.transaction_id || payload.customData?.transaction_id || null;
  const grossValue = payload.payment?.total_amount ?? payload.payment?.sub_total_amount ?? payload.customData?.value ?? null;
  const currency = payload.payment?.currency_code || payload.customData?.currency || "BRL";
  const status = payload.payment?.payment_status || payload.customData?.status || "approved";
  const paymentMethod = payload.payment?.method || payload.customData?.payment_method || null;
  const email = payload.email || payload.payment?.customer?.email || payload.customData?.email || null;
  const phone = payload.phone || payload.payment?.customer?.phone || payload.customData?.phone || null;
  const fullName = payload.full_name || payload.payment?.customer?.name || payload.customData?.name || null;
  const firstName = payload.first_name || payload.payment?.customer?.first_name || splitName(fullName).firstName;
  const lastName = payload.last_name || payload.payment?.customer?.last_name || splitName(fullName).lastName;
  const trckUserId = payload.trck_user_id || payload.customData?.trck_user_id || null;
  const attribution = payload.contact?.attributionSource ?? payload.contact?.lastAttributionSource;
  const ip = attribution?.ip || null;
  const userAgent = attribution?.userAgent || null;
  const eventSourceUrl = attribution?.url || null;

  return {
    contactId,
    transactionId,
    grossValue,
    currency,
    status,
    paymentMethod,
    email,
    phone,
    fullName,
    firstName,
    lastName,
    trckUserId,
    ip,
    userAgent,
    eventSourceUrl,
  };
}

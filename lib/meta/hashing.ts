import { createHash } from "node:crypto";

/**
 * SHA-256 lowercase/trim, como exigido pelos parâmetros de customer
 * information da Conversions API. NUNCA usar em fbp/fbc/client_ip_address/
 * client_user_agent — esses vão em texto puro.
 * https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */
export function sha256Lower(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function hashEmail(email: string): string {
  return sha256Lower(email);
}

/**
 * Telefone: só dígitos antes de hashear (sem +, espaços, parênteses, hífen).
 * A Meta exige código do país incluído — na prática sempre vem (o campo de
 * telefone do formulário do GHL já formata em E.164, ex: +5548991596826),
 * mas alguns caminhos de fallback (Dados Personalizados configurados à mão)
 * podem vir só com DDD+número, sem o "55". Número local brasileiro (DDD +
 * 8 ou 9 dígitos) tem 10 ou 11 dígitos — nesse caso, assume Brasil e prefixa
 * "55" antes de hashear (mesma regra que a Meta documenta pra quando o
 * código do país não vem: assumir o país de destino do negócio).
 */
export function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return sha256Lower(withCountryCode);
}

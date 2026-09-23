/**
 * Detecta tráfego que não deve contar como visita real: o crawler oficial da
 * Meta (se identifica no próprio user-agent, ex: "meta-externalads" varrendo
 * a página de destino do anúncio) ou requisições que chegam através da
 * infraestrutura própria da Meta (IP dentro das faixas publicadas do ASN
 * 32934) — acontece quando o navegador in-app do Facebook/Instagram proxeia
 * a requisição do usuário por privacidade, fazendo o servidor ver o IP da
 * Meta em vez do IP real de quem clicou.
 *
 * As faixas de IP são uma lista curada best-effort (3 primeiras confirmadas
 * direto nos dados reais deste projeto; as demais são faixas conhecidas e
 * documentadas do mesmo ASN) — a Meta pode adicionar faixas novas sem aviso,
 * então isso nunca vai ser 100% completo. O user-agent do crawler, por
 * outro lado, é 100% determinístico.
 *
 * Importante: a checagem é por REQUISIÇÃO, não por visitante — um clique via
 * navegador in-app (IP da Meta) seguido de uma compra que chega com IP real
 * (ex: webhook do gateway de pagamento) não é bloqueado; só o que de fato
 * vier com IP/user-agent da Meta é que fica de fora do dashboard e do
 * disparo pro GA4/Meta CAPI.
 */
const META_BOT_USER_AGENT_MARKERS = ["meta-externalads", "facebookexternalhit", "facebookcatalog", "Facebot"];

const META_IP_RANGES: Array<[string, number]> = [
  ["173.252.64.0", 18],
  ["66.220.144.0", 20],
  ["69.63.176.0", 20],
  ["69.171.224.0", 19],
  ["31.13.24.0", 21],
  ["31.13.64.0", 18],
  ["157.240.0.0", 16],
];

function ipToInt(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpInRange(ip: string, base: string, prefixLength: number): boolean {
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  if (ipInt === null || baseInt === null) return false;
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

export function isMetaBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return META_BOT_USER_AGENT_MARKERS.some((marker) => userAgent.includes(marker));
}

export function isMetaOwnedIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  return META_IP_RANGES.some(([base, prefix]) => isIpInRange(ip, base, prefix));
}

export function isMetaBotOrProxy(ip: string | null | undefined, userAgent: string | null | undefined): boolean {
  return isMetaBotUserAgent(userAgent) || isMetaOwnedIp(ip);
}

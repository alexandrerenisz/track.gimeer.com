// Cor por tipo de evento, pra diferenciar rápido na tabela de Eventos e no
// histórico do drawer de visitante. Eventos conhecidos têm cor fixa; um
// evento futuro não mapeado cai num fallback determinístico (hash do nome)
// em vez de quebrar ou virar tudo cinza.
const KNOWN_EVENT_COLORS: Record<string, string> = {
  PageView: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Lead: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  InitiateCheckout: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Purchase: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ViewContent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Schedule: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  "Caiu na Página de Obrigado": "bg-pink-500/15 text-pink-400 border-pink-500/30",
  // Etapas do mini quiz da página /obrigado — cor fixa por etapa (em vez de
  // cair no hash fallback) pra garantir que fiquem visualmente distintas
  // mesmo se o hash colidir no mesmo bucket.
  "Quizz Step 1": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "Quizz Step 2": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "Quizz Step 3": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  "Quizz Step 4": "bg-lime-500/15 text-lime-400 border-lime-500/30",
  "Quizz Step 5": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "Quizz Completed": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

const FALLBACK_COLORS = [
  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "bg-teal-500/15 text-teal-400 border-teal-500/30",
  "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  "bg-lime-500/15 text-lime-400 border-lime-500/30",
  "bg-orange-500/15 text-orange-400 border-orange-500/30",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function eventColorClass(eventName: string): string {
  if (KNOWN_EVENT_COLORS[eventName]) return KNOWN_EVENT_COLORS[eventName];
  return FALLBACK_COLORS[hashString(eventName) % FALLBACK_COLORS.length];
}

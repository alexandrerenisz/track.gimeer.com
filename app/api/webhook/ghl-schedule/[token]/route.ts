import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSettings } from "@/lib/config/settings";
import { readSecret } from "@/lib/vault/secrets";
import { ghlScheduleWebhookSchema } from "@/lib/ghl/schedule-webhook-schema";
import { processGhlSchedule } from "@/lib/ghl/process-schedule";

/** Compara hashes (mesmo tamanho sempre) em vez dos tokens crus — evita
 * timing attack E o throw do timingSafeEqual quando os buffers têm tamanhos
 * diferentes. */
function tokensMatch(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/webhook/ghl-schedule/[token]">) {
  const { token } = await ctx.params;

  const settings = await getSettings();
  if (!settings.ghl_schedule_webhook_token_id) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const expectedToken = await readSecret(settings.ghl_schedule_webhook_token_id);
  if (!token || !tokensMatch(token, expectedToken)) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = ghlScheduleWebhookSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    console.error("Payload inválido no webhook de Agendamento (GHL):", issue, "payload recebido:", JSON.stringify(json));
    return NextResponse.json({ error: `${issue.path.join(".") || "(raiz)"}: ${issue.message}` }, { status: 400 });
  }

  try {
    const result = await processGhlSchedule(parsed.data, json);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Erro ao processar webhook de Agendamento do GHL:", err);
    return NextResponse.json({ error: "Erro ao processar." }, { status: 500 });
  }
}

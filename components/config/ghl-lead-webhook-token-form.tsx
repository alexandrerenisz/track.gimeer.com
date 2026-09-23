"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setGhlLeadWebhookToken } from "@/app/(dashboard)/configuracoes/actions";

export function GhlLeadWebhookTokenForm() {
  const [state, action, pending] = useActionState(setGhlLeadWebhookToken, undefined);

  return (
    <form action={action} className="space-y-2">
      <Label htmlFor="ghl-lead-token">Definir token manualmente</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="ghl-lead-token"
          name="token"
          placeholder="Cole um token customizado (mín. 16 caracteres)"
          className="flex-1 font-mono text-xs"
          autoComplete="off"
        />
        <Button type="submit" variant="outline" size="sm" disabled={pending} className="shrink-0">
          {pending ? "Salvando..." : "Salvar token"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

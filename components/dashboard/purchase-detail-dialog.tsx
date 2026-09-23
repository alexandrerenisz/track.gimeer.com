"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

export type PurchaseDetailData = {
  transaction_id: string;
  match_method: string;
  created_at: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  payment_method: string | null;
  geo_country: string | null;
};

function Field({ label, value }: { label: string; value: ReactNode }) {
  if (!value) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono">{value}</dd>
    </>
  );
}

export function PurchaseDetailDialog({ purchase, trigger }: { purchase: PurchaseDetailData; trigger: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{purchase.contact_name ?? purchase.contact_email ?? "Comprador"}</DialogTitle>
          <DialogDescription className="font-mono">
            {purchase.transaction_id} · {formatDateTime(purchase.created_at)}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <Field label="Nome" value={purchase.contact_name} />
          <Field label="Email" value={purchase.contact_email} />
          <Field label="Telefone" value={purchase.contact_phone} />
          <Field label="Pagamento" value={purchase.payment_method} />
          <Field label="Geo" value={purchase.geo_country} />
          <Field label="Match" value={purchase.match_method} />
        </dl>
      </DialogContent>
    </Dialog>
  );
}

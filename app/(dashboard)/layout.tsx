import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O proxy.ts já faz o check otimista; isto é a checagem "segura" (contata o
  // Auth server), como recomendado na doc de autenticação do Next.js.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* min-w-0: sem isso, um item flex não encolhe além do conteúdo (ex:
          uma tabela larga) — em vez de rolar dentro do próprio
          overflow-x-auto (já presente em cada tabela), ele empurra a página
          inteira mais larga que a viewport no mobile. */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <Topbar userEmail={user.email} />
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

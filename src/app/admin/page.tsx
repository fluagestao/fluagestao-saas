import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id, email, display_name, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  /* Sem vinculo com empresa a pessoa vai para /onboarding, que tenta criar a
     loja e mostra uma tela quando nao consegue. Mandar de volta para /login
     fechava um laco: ela logava, caia aqui, voltava para o login, logava de
     novo — com senha certa e e-mail confirmado, sem nunca entrar. */
  if (membroError || !membro) {
    redirect("/onboarding");
  }

  const { data: empresa } = await supabase
    .from("companies")
    .select("name, logo_url, street, address_number, complement, district, city, state, onboarding_completed_at")
    .eq("id", membro.company_id)
    .maybeSingle();

  const enderecoEmpresa =
    [
      empresa?.street,
      empresa?.address_number,
      empresa?.complement,
      empresa?.district,
    ]
      .filter(Boolean)
      .join(", ") || null;
  const cidadeEstadoEmpresa =
    [empresa?.city, empresa?.state].filter(Boolean).join(" / ") || null;

  return (
    <AdminClient
      email={membro.email}
      displayName={membro.display_name}
      companyName={empresa?.name ?? "Empresa"}
      companyLogoUrl={empresa?.logo_url ?? null}
      companyAddress={enderecoEmpresa}
      companyCityState={cidadeEstadoEmpresa}
    />
  );
}

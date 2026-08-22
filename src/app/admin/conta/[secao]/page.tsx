import { notFound, redirect } from "next/navigation";

import { ContaPageClient, type ContaSecao } from "@/components/admin/ContaPageClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SECOES: ContaSecao[] = ["empresa", "plano", "usuarios", "configuracoes"];

export default async function ContaPage({
  params,
}: {
  params: Promise<{ secao: string }>;
}) {
  const { secao } = await params;

  if (!SECOES.includes(secao as ContaSecao)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id,email,display_name,status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError || !membro) {
    redirect("/onboarding");
  }

  const { data: empresa } = await supabase
    .from("companies")
    .select("name")
    .eq("id", membro.company_id)
    .maybeSingle();

  return (
    <ContaPageClient
      secao={secao as ContaSecao}
      email={membro.email}
      displayName={membro.display_name}
      companyName={empresa?.name ?? "Empresa"}
    />
  );
}

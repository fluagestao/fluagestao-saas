import { redirect } from "next/navigation";

import AdminClient from "@/app/admin/admin-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) redirect("/login");

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id, email, display_name, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError || !membro) redirect("/onboarding");

  const { data: empresa } = await supabase
    .from("companies")
    .select("name")
    .eq("id", membro.company_id)
    .maybeSingle();

  return (
    <AdminClient
      email={membro.email}
      displayName={membro.display_name}
      companyName={empresa?.name ?? "Empresa"}
      initialAba="produtos"
    />
  );
}

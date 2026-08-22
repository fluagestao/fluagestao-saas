import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function requireCompany() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, display_name, email, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError) throw membroError;
  if (!membro) {
    throw new Error("Seu usuário ainda não está vinculado a uma empresa ativa.");
  }

  return {
    supabase,
    companyId: membro.company_id,
    memberId: membro.id,
    userId,
    email: membro.email,
    displayName: membro.display_name,
    role: membro.role,
  };
}

import { redirect } from "next/navigation";

import { NovoProdutoClient } from "./novo-produto-client";
import { carregarCatalogoAdmin } from "@/lib/admin";
import { listarEtiquetas } from "@/lib/etiquetas";
import { createClient } from "@/lib/supabase/server";
import type {
  CatalogoRow,
  CategoriaRow,
  EtiquetaRow,
} from "@/components/admin/tipos";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/login");
  }

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id, display_name, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError || !membro) {
    redirect("/onboarding");
  }

  const [{ data: empresa }, catalogo, etiquetas] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", membro.company_id)
      .maybeSingle(),
    carregarCatalogoAdmin(),
    listarEtiquetas(),
  ]);

  return (
    <NovoProdutoClient
      categorias={(catalogo.categorias ?? []) as CategoriaRow[]}
      catalogos={(catalogo.catalogos ?? []) as CatalogoRow[]}
      etiquetas={(etiquetas ?? []) as EtiquetaRow[]}
      companyName={empresa?.name ?? "Empresa"}
      displayName={membro.display_name ?? "Usuário"}
    />
  );
}

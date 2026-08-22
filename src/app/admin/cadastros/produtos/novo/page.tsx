import { redirect } from "next/navigation";

import { NovoProdutoClient } from "./novo-produto-client-v2";
import { carregarCatalogoAdmin, prepararNovoProduto } from "@/lib/admin";
import { listarEtiquetas } from "@/lib/etiquetas";
import { listarInsumos } from "@/lib/insumos";
import { createClient } from "@/lib/supabase/server";
import type {
  CatalogoRow,
  CategoriaRow,
  EtiquetaRow,
} from "@/components/admin/tipos";

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
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

  const params = await searchParams;
  let draft:
    | { id: string; sku: string; slug: string; rascunho: boolean }
    | null = null;

  if (params.draft) {
    const { data } = await supabase
      .from("produtos")
      .select("id, sku, slug, rascunho")
      .eq("company_id", membro.company_id)
      .eq("id", params.draft)
      .maybeSingle();

    if (data?.rascunho) {
      draft = {
        id: data.id,
        sku: data.sku,
        slug: data.slug,
        rascunho: true,
      };
    }
  }

  if (!draft) {
    const novo = await prepararNovoProduto();
    redirect(`/admin/cadastros/produtos/novo?draft=${novo.id}`);
  }

  const [{ data: empresa }, catalogo, etiquetas, insumos] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", membro.company_id)
      .maybeSingle(),
    carregarCatalogoAdmin(),
    listarEtiquetas(),
    listarInsumos(),
  ]);

  return (
    <NovoProdutoClient
      categorias={(catalogo.categorias ?? []) as CategoriaRow[]}
      catalogos={(catalogo.catalogos ?? []) as CatalogoRow[]}
      etiquetas={(etiquetas ?? []) as EtiquetaRow[]}
      insumos={insumos}
      companyName={empresa?.name ?? "Empresa"}
      displayName={membro.display_name ?? "Usuário"}
      draft={draft}
    />
  );
}

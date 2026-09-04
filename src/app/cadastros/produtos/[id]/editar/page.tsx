import { redirect } from "next/navigation";

import { NovoProdutoClient } from "@/app/admin/cadastros/produtos/novo/novo-produto-client-v2";
import { carregarCatalogoAdmin } from "@/lib/admin";
import { listarComposicaoProduto, listarInsumos } from "@/lib/insumos";
import { createClient } from "@/lib/supabase/server";
import type { CatalogoRow, CategoriaRow, ImagemRow } from "@/components/admin/tipos";

export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) redirect("/login");

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id, display_name, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError || !membro) redirect("/onboarding");

  const { data: produto, error: produtoError } = await supabase
    .from("produtos")
    .select(
      "id, sku, slug, rascunho, nome, categoria_id, preco, preco_label, serve, tempo_montagem_min, itens, precos_extra, observacao, ativo, ordem, badge, badge_cor, produto_imagens(id,url,ordem)",
    )
    .eq("company_id", membro.company_id)
    .eq("id", id)
    .maybeSingle();

  if (produtoError || !produto || produto.rascunho) redirect("/cadastros/produtos");

  const [{ data: empresa }, catalogo, insumos, composicao] = await Promise.all([
    supabase.from("companies").select("name").eq("id", membro.company_id).maybeSingle(),
    carregarCatalogoAdmin(),
    listarInsumos(),
    listarComposicaoProduto({ data: { id } }),
  ]);

  const custoInicial = (composicao ?? []).reduce((total: number, row: any) => {
    const insumo = Array.isArray(row.insumos) ? row.insumos[0] : row.insumos;
    return total + Number(row.quantidade ?? 0) * Number(insumo?.custo ?? 0);
  }, 0);

  return (
    <NovoProdutoClient
      categorias={(catalogo.categorias ?? []) as CategoriaRow[]}
      catalogos={(catalogo.catalogos ?? []) as CatalogoRow[]}
      insumos={insumos}
      companyName={empresa?.name ?? "Empresa"}
      displayName={membro.display_name ?? "Usuário"}
      draft={{ id: produto.id, sku: produto.sku, slug: produto.slug, rascunho: false }}
      produtoInicial={{
        nome: produto.nome,
        categoria_id: produto.categoria_id,
        preco: produto.preco,
        preco_label: produto.preco_label,
        serve: produto.serve,
        itens: produto.itens,
        precos_extra: produto.precos_extra,
        observacao: produto.observacao,
        ativo: produto.ativo,
        ordem: produto.ordem,
        badge: produto.badge,
        badge_cor: produto.badge_cor,
        imagens: (produto.produto_imagens ?? []) as ImagemRow[],
      }}
      custoInicial={custoInicial}
      temCustoInicial={(composicao ?? []).length > 0}
      /* A margem liquida do painel travado precisa do tempo: sem ele a mao de
         obra entra como zero e o numero sai igual a margem bruta. */
      tempoInicial={
        produto.tempo_montagem_min == null ? null : Number(produto.tempo_montagem_min)
      }
    />
  );
}

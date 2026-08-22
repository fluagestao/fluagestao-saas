import { redirect } from "next/navigation";

import {
  asPrecosExtra,
  type CatalogoRow,
  type CategoriaRow,
  type ProdutoRow,
} from "@/components/admin/tipos";
import type { ProdutoOpcao } from "@/components/admin/PedidoDialog";
import { carregarCatalogoAdmin } from "@/lib/admin";
import { carregarClientes } from "@/lib/pedidos";
import type { ClienteComHistorico } from "@/lib/pedidos-ops.server";
import { createClient } from "@/lib/supabase/server";
import { NovoPedidoPageClient } from "./novo-pedido-page-client";

export const dynamic = "force-dynamic";

export default async function NovoPedidoPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) redirect("/login");

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError || !membro) redirect("/onboarding");

  const [catalogo, clientes] = await Promise.all([
    carregarCatalogoAdmin(),
    carregarClientes(),
  ]);

  const catalogos = (catalogo.catalogos ?? []) as CatalogoRow[];
  const categorias = (catalogo.categorias ?? []) as CategoriaRow[];
  const produtosBase = (catalogo.produtos ?? []) as ProdutoRow[];

  const produtos: ProdutoOpcao[] = produtosBase.map((produto) => {
    const categoria = categorias.find((item) => item.id === produto.categoria_id);
    const colecao = catalogos.find((item) => item.id === categoria?.catalogo_id);

    return {
      slug: produto.slug,
      nome: produto.nome,
      preco: produto.preco,
      precos_extra: asPrecosExtra(produto.precos_extra),
      grupo: categoria
        ? colecao
          ? `${categoria.nome} · ${colecao.nome}`
          : categoria.nome
        : "Sem categoria",
      ordemGrupo: (colecao?.ordem ?? 99) * 100 + (categoria?.ordem ?? 99),
    };
  });

  return (
    <NovoPedidoPageClient
      produtos={produtos}
      clientes={clientes as ClienteComHistorico[]}
    />
  );
}

"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import { dataLocalISO } from "@/lib/vendas";

const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export type MargemProduto = {
  /** Necessário para abrir o custo do produto direto daqui. */
  id: string;
  slug: string;
  nome: string;
  categoria: string | null;
  colecao: string | null;
  preco: number | null;
  /** Soma dos insumos da composição. null = produto sem composição cadastrada. */
  custo: number | null;
  qtd: number;
  receita: number;
  custoTotal: number | null;
  lucro: number | null;
  margem: number | null;
};

/**
 * Margem por produto no mês.
 *
 * O custo vem da composição cadastrada hoje, não do custo no dia da venda —
 * insumo muda de preço e o sistema não guarda histórico. Serve para decidir
 * preço, não para fechar contabilidade, e a tela diz isso.
 *
 * Produto sem composição fica com custo nulo em vez de zero: margem de 100%
 * inventada é pior que margem faltando.
 */
export async function carregarMargemProdutos(input: { data: unknown }) {
  // Periodo livre, nao mais mes fechado: a tela virou relatorio e precisa
  // responder "esta semana", "mes passado", "o ano todo" com o mesmo codigo.
  const { de, ate } = z.object({ de: DATA, ate: DATA }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  // Fim do periodo e inclusivo na tela; a consulta usa o dia seguinte.
  const depoisDoFim = new Date(`${ate}T12:00:00Z`);
  depoisDoFim.setUTCDate(depoisDoFim.getUTCDate() + 1);
  const limite = depoisDoFim.toISOString().slice(0, 10);

  const [pedidosRes, produtosRes, compRes, insumosRes, categoriasRes, catalogosRes] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("itens, created_at")
        .eq("company_id", companyId)
        .neq("status", "cancelado")
        .gte("created_at", `${de}T00:00:00-03:00`)
        .lt("created_at", `${limite}T00:00:00-03:00`)
        .limit(5000),
      supabase
        .from("produtos")
        .select("id, slug, nome, preco, categoria_id")
        .eq("company_id", companyId)
        .limit(1000),
      supabase
        .from("produto_insumos")
        .select("produto_id, insumo_id, quantidade")
        .eq("company_id", companyId)
        .limit(5000),
      supabase
        .from("insumos")
        .select("id, custo")
        .eq("company_id", companyId)
        .limit(2000),
      supabase
        .from("categorias")
        .select("id, nome, catalogo_id")
        .eq("company_id", companyId)
        .limit(500),
      supabase
        .from("catalogos")
        .select("id, nome")
        .eq("company_id", companyId)
        .limit(200),
    ]);

  if (pedidosRes.error) throw pedidosRes.error;
  if (produtosRes.error) throw produtosRes.error;

  const custoInsumo = new Map(
    (insumosRes.data ?? []).map((i) => [i.id as string, Number(i.custo ?? 0)]),
  );
  const categorias = new Map(
    (categoriasRes.data ?? []).map((c) => [c.id as string, c]),
  );
  const catalogos = new Map(
    (catalogosRes.data ?? []).map((c) => [c.id as string, c.nome as string]),
  );

  // Custo de cada produto: soma de quantidade x custo unitario dos insumos.
  const custoProduto = new Map<string, number>();
  for (const linha of compRes.data ?? []) {
    const unitario = custoInsumo.get(linha.insumo_id as string) ?? 0;
    const atual = custoProduto.get(linha.produto_id as string) ?? 0;
    custoProduto.set(
      linha.produto_id as string,
      atual + Number(linha.quantidade ?? 0) * unitario,
    );
  }

  const porSlug = new Map<string, MargemProduto>();
  for (const p of produtosRes.data ?? []) {
    const categoria = p.categoria_id ? categorias.get(p.categoria_id as string) : undefined;
    porSlug.set(p.slug as string, {
      id: p.id as string,
      slug: p.slug as string,
      nome: p.nome as string,
      categoria: (categoria?.nome as string) ?? null,
      colecao: categoria?.catalogo_id ? (catalogos.get(categoria.catalogo_id) ?? null) : null,
      preco: p.preco == null ? null : Number(p.preco),
      custo: custoProduto.has(p.id as string) ? custoProduto.get(p.id as string)! : null,
      qtd: 0,
      receita: 0,
      custoTotal: null,
      lucro: null,
      margem: null,
    });
  }

  for (const pedido of pedidosRes.data ?? []) {
    const criado = pedido.created_at as string | null;
    if (!criado) continue;
    const dia = dataLocalISO(criado);
    if (dia < de || dia > ate) continue;

    const itens = Array.isArray(pedido.itens)
      ? (pedido.itens as { slug?: string | null; qtd?: number; preco?: number | null }[])
      : [];

    for (const item of itens) {
      if (!item.slug) continue;
      const alvo = porSlug.get(item.slug);
      if (!alvo) continue;
      const qtd = Number(item.qtd ?? 0);
      alvo.qtd += qtd;
      alvo.receita += Number(item.preco ?? 0) * qtd;
    }
  }

  const todos = [...porSlug.values()];
  const vendidos = todos.filter((p) => p.qtd > 0);
  for (const p of vendidos) {
    if (p.custo == null) continue;
    p.custoTotal = p.custo * p.qtd;
    p.lucro = p.receita - p.custoTotal;
    p.margem = p.receita > 0 ? p.lucro / p.receita : null;
  }

  /* Vendidos primeiro, por lucro; depois os que nao venderam, por nome. A tela
     e usada para duas coisas — ler a margem do mes e fechar os custos que
     faltam — e essa ordem serve as duas sem precisar de duas listas. */
  todos.sort((a, b) => {
    if (a.qtd > 0 && b.qtd > 0) return (b.lucro ?? -Infinity) - (a.lucro ?? -Infinity);
    if (a.qtd > 0) return -1;
    if (b.qtd > 0) return 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  const comCusto = vendidos.filter((p) => p.custo != null);
  const receita = vendidos.reduce((t, p) => t + p.receita, 0);
  const custoTotal = comCusto.reduce((t, p) => t + (p.custoTotal ?? 0), 0);
  const receitaComCusto = comCusto.reduce((t, p) => t + p.receita, 0);

  return {
    de,
    ate,
    produtos: todos,
    receita,
    custoTotal,
    lucro: receitaComCusto - custoTotal,
    margem: receitaComCusto > 0 ? (receitaComCusto - custoTotal) / receitaComCusto : null,
    /** Quantos venderam sem custo cadastrado: a margem acima ignora esses. */
    semComposicao: vendidos.length - comCusto.length,
    /** Total de produtos sem custo, tenham vendido ou não. */
    semCustoTotal: todos.filter((p) => p.custo == null).length,
    totalProdutos: todos.length,
  };
}

/**
 * Atualiza só o preço de venda.
 *
 * Existe separado do salvarProduto porque a Calculadora mexe em uma coisa só:
 * mandar o produto inteiro de volta ali arriscaria sobrescrever campo que a
 * tela nem carregou (foto, descrição, ordem).
 */
export async function atualizarPrecoProduto(input: { data: unknown }) {
  const { id, preco } = z
    .object({ id: z.string().uuid(), preco: z.number().nonnegative().max(1_000_000) })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("produtos")
    .update({ preco })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

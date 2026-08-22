"use client";

import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_HORARIOS,
  normalizarHorarios,
  type HorariosConfig,
} from "@/lib/horarios";

const typedSupabase = createClient();
const supabase = typedSupabase as unknown as {
  from: (table: string) => any;
};

export type Catalogo = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  ativo?: boolean;
  cor?: string | null;
  subtitulo?: string | null;
  msg_saudacao?: string | null;
  msg_fecho?: string | null;
  msg_produto?: string | null;
};

export type Categoria = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  ativa?: boolean;
  cor?: string | null;
  subtitulo?: string | null;
  catalogo_id?: string | null;
};

export type PrecoExtra = { label: string; valor: number };

export type Produto = {
  id: string;
  categoria_id: string;
  slug: string;
  nome: string;
  preco: number | null;
  preco_label: string | null;
  serve: string | null;
  itens: string[];
  precos_extra: PrecoExtra[];
  observacao: string | null;
  ativo: boolean;
  ordem: number;
  badge: string | null;
  badge_cor: string | null;
  imagens: { url: string; ordem: number }[];
  categoria?: Categoria;
};

type RawProduto = Omit<
  Produto,
  "imagens" | "itens" | "precos_extra" | "categoria"
> & {
  itens: unknown;
  precos_extra: unknown;
  produto_imagens: { url: string; ordem: number }[];
  categorias: Categoria | null;
};

function normalize(raw: RawProduto): Produto {
  return {
    ...raw,
    itens: Array.isArray(raw.itens) ? (raw.itens as string[]) : [],
    precos_extra: Array.isArray(raw.precos_extra)
      ? (raw.precos_extra as PrecoExtra[])
      : [],
    badge: raw.badge ?? null,
    badge_cor: raw.badge_cor ?? null,
    imagens: (raw.produto_imagens ?? []).sort((a, b) => a.ordem - b.ordem),
    categoria: raw.categorias ?? undefined,
  };
}

export async function fetchCatalogos(): Promise<Catalogo[]> {
  const { data, error } = await supabase
    .from("catalogos")
    .select(
      "id, slug, nome, ordem, ativo, cor, subtitulo, msg_saudacao, msg_fecho, msg_produto",
    )
    .eq("ativo", true)
    .order("ordem");

  if (error) return [];
  return (data ?? []) as Catalogo[];
}

async function idsCatalogosInativos(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("catalogos")
    .select("id")
    .eq("ativo", false);

  if (error) return new Set();
  return new Set(((data ?? []) as { id: string }[]).map((c) => c.id));
}

export async function fetchCategorias(): Promise<Categoria[]> {
  const [categoriasRes, inativos] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, slug, nome, ordem, ativa, cor, subtitulo, catalogo_id")
      .order("ordem"),
    idsCatalogosInativos(),
  ]);

  if (categoriasRes.error) return [];

  return ((categoriasRes.data ?? []) as Categoria[])
    .filter((c) => c.ativa !== false)
    .filter((c) => !c.catalogo_id || !inativos.has(c.catalogo_id));
}

export async function fetchProdutos(): Promise<Produto[]> {
  const [produtosRes, inativos] = await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, categoria_id, slug, nome, preco, preco_label, serve, badge, badge_cor, itens, precos_extra, observacao, ativo, ordem, produto_imagens(url, ordem), categorias(id, slug, nome, ordem, ativa, catalogo_id)",
      )
      .eq("ativo", true)
      .order("ordem"),
    idsCatalogosInativos(),
  ]);

  if (produtosRes.error) return [];

  return (produtosRes.data as unknown as RawProduto[])
    .filter((r) => r.categorias?.ativa !== false)
    .filter(
      (r) =>
        !r.categorias?.catalogo_id ||
        !inativos.has(r.categorias.catalogo_id),
    )
    .map(normalize);
}

export async function fetchProdutoBySlug(
  slug: string,
): Promise<Produto | null> {
  const [produtoRes, inativos] = await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, categoria_id, slug, nome, preco, preco_label, serve, badge, badge_cor, itens, precos_extra, observacao, ativo, ordem, produto_imagens(url, ordem), categorias(id, slug, nome, ordem, ativa, catalogo_id)",
      )
      .eq("slug", slug)
      .maybeSingle(),
    idsCatalogosInativos(),
  ]);

  if (produtoRes.error || !produtoRes.data) return null;

  const raw = produtoRes.data as unknown as RawProduto;
  if (
    raw.ativo === false ||
    raw.categorias?.ativa === false ||
    (raw.categorias?.catalogo_id &&
      inativos.has(raw.categorias.catalogo_id))
  ) {
    return null;
  }

  return normalize(raw);
}

export function formatPreco(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function fetchHorarios(): Promise<HorariosConfig> {
  const { data, error } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", "horarios")
    .maybeSingle();

  if (error || !data) return DEFAULT_HORARIOS;
  return normalizarHorarios(data.valor as Partial<HorariosConfig>);
}

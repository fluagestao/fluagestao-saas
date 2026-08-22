import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "produtos";

export type ProdutoInput = {
  id?: string;
  nome: string;
  slug?: string;
  categoria_id: string | null;
  preco: number | null;
  preco_label: string | null;
  serve: string | null;
  itens: string[];
  precos_extra: { label: string; valor: number }[];
  observacao: string | null;
  ativo: boolean;
  ordem: number;
  badge?: string | null;
  badge_cor?: string | null;
};

export type CategoriaInput = {
  id?: string;
  nome: string;
  slug?: string;
  ordem: number;
  ativa: boolean;
  cor?: string | null;
  subtitulo?: string | null;
  catalogo_id?: string | null;
};

export type CatalogoInput = {
  id?: string;
  nome: string;
  slug?: string;
  ordem: number;
  ativo: boolean;
  cor?: string | null;
  subtitulo?: string | null;
  msg_saudacao?: string | null;
  msg_fecho?: string | null;
  msg_produto?: string | null;
};

export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function listCatalogo(
  db: SupabaseClient,
  companyId: string,
) {
  const [catalogosRes, categoriasRes, produtosRes] = await Promise.all([
    db
      .from("catalogos")
      .select(
        "id, slug, nome, ordem, ativo, cor, subtitulo, msg_saudacao, msg_fecho, msg_produto",
      )
      .eq("company_id", companyId)
      .order("ordem"),
    db
      .from("categorias")
      .select("id, slug, nome, ordem, ativa, cor, subtitulo, catalogo_id")
      .eq("company_id", companyId)
      .order("ordem"),
    db
      .from("produtos")
      .select(
        "id, categoria_id, slug, nome, preco, preco_label, serve, badge, badge_cor, itens, precos_extra, observacao, ativo, ordem, produto_imagens(id, url, ordem)",
      )
      .eq("company_id", companyId)
      .order("ordem"),
  ]);

  if (catalogosRes.error) throw catalogosRes.error;
  if (categoriasRes.error) throw categoriasRes.error;
  if (produtosRes.error) throw produtosRes.error;

  const produtos = (produtosRes.data ?? []).map((produto) => ({
    ...produto,
    produto_imagens: [...(produto.produto_imagens ?? [])].sort(
      (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0),
    ),
  }));

  return {
    catalogos: catalogosRes.data ?? [],
    categorias: categoriasRes.data ?? [],
    produtos,
  };
}

export async function upsertProduto(
  db: SupabaseClient,
  companyId: string,
  input: ProdutoInput,
) {
  const slug = (input.slug?.trim() || slugify(input.nome)).slice(0, 80);

  let ordem = input.ordem;

  if (!input.id) {
    let q = db
      .from("produtos")
      .select("ordem")
      .eq("company_id", companyId);

    q = input.categoria_id
      ? q.eq("categoria_id", input.categoria_id)
      : q.is("categoria_id", null);

    const { data: existentes, error } = await q;
    if (error) throw error;

    ordem =
      (existentes ?? []).reduce(
        (max, item) => Math.max(max, item.ordem ?? 0),
        -1,
      ) + 1;
  }

  const row = {
    company_id: companyId,
    nome: input.nome,
    slug,
    categoria_id: input.categoria_id,
    preco: input.preco,
    preco_label: input.preco_label,
    serve: input.serve,
    itens: input.itens,
    precos_extra: input.precos_extra,
    observacao: input.observacao,
    ativo: input.ativo,
    ordem,
    badge: input.badge ?? null,
    badge_cor: input.badge_cor ?? null,
  };

  if (input.id) {
    const { data, error } = await db
      .from("produtos")
      .update(row)
      .eq("id", input.id)
      .eq("company_id", companyId)
      .select("id, slug")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await db
    .from("produtos")
    .insert(row)
    .select("id, slug")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduto(
  db: SupabaseClient,
  companyId: string,
  id: string,
) {
  const { data: imagens, error: imagensError } = await db
    .from("produto_imagens")
    .select("url")
    .eq("company_id", companyId)
    .eq("produto_id", id);

  if (imagensError) throw imagensError;

  const paths = (imagens ?? [])
    .map((imagem) => storagePathFromUrl(imagem.url))
    .filter((path): path is string => Boolean(path));

  if (paths.length) {
    const { error } = await db.storage.from(BUCKET).remove(paths);
    if (error) throw error;
  }

  const { error } = await db
    .from("produtos")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true };
}

export async function upsertCategoria(
  db: SupabaseClient,
  companyId: string,
  input: CategoriaInput,
) {
  const slug = (input.slug?.trim() || slugify(input.nome)).slice(0, 60);

  const row = {
    company_id: companyId,
    nome: input.nome,
    slug,
    ordem: input.ordem,
    ativa: input.ativa,
    cor: input.cor ?? null,
    subtitulo: input.subtitulo ?? null,
    catalogo_id: input.catalogo_id ?? null,
  };

  if (input.id) {
    const { data, error } = await db
      .from("categorias")
      .update(row)
      .eq("id", input.id)
      .eq("company_id", companyId)
      .select("id, slug")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await db
    .from("categorias")
    .insert(row)
    .select("id, slug")
    .single();

  if (error) throw error;
  return data;
}

export async function upsertCatalogo(
  db: SupabaseClient,
  companyId: string,
  input: CatalogoInput,
) {
  const slug = (input.slug?.trim() || slugify(input.nome)).slice(0, 60);

  const row = {
    company_id: companyId,
    nome: input.nome,
    slug,
    ordem: input.ordem,
    ativo: input.ativo,
    cor: input.cor ?? null,
    subtitulo: input.subtitulo ?? null,
    msg_saudacao: input.msg_saudacao ?? null,
    msg_fecho: input.msg_fecho ?? null,
    msg_produto: input.msg_produto ?? null,
  };

  if (input.id) {
    const { data, error } = await db
      .from("catalogos")
      .update(row)
      .eq("id", input.id)
      .eq("company_id", companyId)
      .select("id, slug")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await db
    .from("catalogos")
    .insert(row)
    .select("id, slug")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCatalogo(
  db: SupabaseClient,
  companyId: string,
  id: string,
) {
  const { error: desligarError } = await db
    .from("categorias")
    .update({ catalogo_id: null })
    .eq("company_id", companyId)
    .eq("catalogo_id", id);

  if (desligarError) throw desligarError;

  const { error } = await db
    .from("catalogos")
    .delete()
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
  return { ok: true };
}

export async function deleteCategoria(
  db: SupabaseClient,
  companyId: string,
  id: string,
) {
  const { error: desligarError } = await db
    .from("produtos")
    .update({ categoria_id: null })
    .eq("company_id", companyId)
    .eq("categoria_id", id);

  if (desligarError) throw desligarError;

  const { error } = await db
    .from("categorias")
    .delete()
    .eq("company_id", companyId)
    .eq("id", id);

  if (error) throw error;
  return { ok: true };
}

export async function getConfig(
  db: SupabaseClient,
  companyId: string,
  chave: string,
) {
  const { data, error } = await db
    .from("configuracoes")
    .select("valor")
    .eq("company_id", companyId)
    .eq("chave", chave)
    .maybeSingle();

  if (error) throw error;
  return data?.valor ?? null;
}

export async function setConfig(
  db: SupabaseClient,
  companyId: string,
  chave: string,
  valor: unknown,
) {
  const { error } = await db.from("configuracoes").upsert(
    {
      company_id: companyId,
      chave,
      valor,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,chave" },
  );

  if (error) throw error;
  return { ok: true };
}

export async function uploadImagem(
  db: SupabaseClient,
  companyId: string,
  input: {
    produtoId: string;
    slug: string;
    base64: string;
    contentType: string;
  },
) {
  const { data: produto, error: produtoError } = await db
    .from("produtos")
    .select("id")
    .eq("company_id", companyId)
    .eq("id", input.produtoId)
    .single();

  if (produtoError) throw produtoError;
  if (!produto) throw new Error("Produto não encontrado.");

  const ext = extFromContentType(input.contentType);
  const rand = crypto.randomUUID().slice(0, 8);
  const path = `${companyId}/${slugify(input.slug)}-${rand}.${ext}`;
  const bytes = Buffer.from(input.base64, "base64");

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: input.contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = db.storage.from(BUCKET).getPublicUrl(path);

  const { data: existentes, error: ordemError } = await db
    .from("produto_imagens")
    .select("ordem")
    .eq("company_id", companyId)
    .eq("produto_id", input.produtoId);

  if (ordemError) throw ordemError;

  const proximaOrdem =
    (existentes ?? []).reduce(
      (max, item) => Math.max(max, item.ordem ?? 0),
      -1,
    ) + 1;

  const { data, error } = await db
    .from("produto_imagens")
    .insert({
      company_id: companyId,
      produto_id: input.produtoId,
      url: publicUrl,
      ordem: proximaOrdem,
    })
    .select("id, url, ordem")
    .single();

  if (error) {
    await db.storage.from(BUCKET).remove([path]);
    throw error;
  }

  return data;
}

export async function deleteImagem(
  db: SupabaseClient,
  companyId: string,
  input: { id: string; url: string },
) {
  const { data: imagem, error: imagemError } = await db
    .from("produto_imagens")
    .select("id, url")
    .eq("company_id", companyId)
    .eq("id", input.id)
    .single();

  if (imagemError) throw imagemError;

  const path = storagePathFromUrl(imagem.url);

  if (path) {
    const { error } = await db.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }

  const { error } = await db
    .from("produto_imagens")
    .delete()
    .eq("company_id", companyId)
    .eq("id", input.id);

  if (error) throw error;
  return { ok: true };
}

export async function reordenarProdutos(
  db: SupabaseClient,
  companyId: string,
  orderedIds: string[],
) {
  for (const [ordem, id] of orderedIds.entries()) {
    const { error } = await db
      .from("produtos")
      .update({ ordem })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
  }

  return { ok: true };
}

export async function reordenarImagens(
  db: SupabaseClient,
  companyId: string,
  orderedIds: string[],
) {
  for (const [ordem, id] of orderedIds.entries()) {
    const { error } = await db
      .from("produto_imagens")
      .update({ ordem })
      .eq("company_id", companyId)
      .eq("id", id);

    if (error) throw error;
  }

  return { ok: true };
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("avif")) return "avif";
  return "img";
}

function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);

  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  deleteCatalogo,
  deleteCategoria,
  deleteImagem,
  deleteProduto,
  getConfig,
  listCatalogo,
  reordenarImagens as reordenarImagensOp,
  reordenarProdutos as reordenarProdutosOp,
  setConfig,
  uploadImagem,
  upsertCatalogo,
  upsertCategoria,
  upsertProduto,
} from "@/lib/admin-ops.server";

const precoExtraSchema = z.object({
  label: z.string().min(1),
  valor: z.number().nonnegative(),
});

const produtoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, "Nome obrigatório"),
  slug: z.string().optional(),
  categoria_id: z.string().uuid().nullable(),
  preco: z.number().nonnegative().nullable(),
  preco_label: z.string().nullable(),
  serve: z.string().nullable(),
  itens: z.array(z.string()),
  precos_extra: z.array(precoExtraSchema),
  observacao: z.string().nullable(),
  ativo: z.boolean(),
  ordem: z.number().int(),
  badge: z.string().nullable().optional(),
  badge_cor: z.string().nullable().optional(),
});

const categoriaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, "Nome obrigatório"),
  slug: z.string().optional(),
  ordem: z.number().int(),
  ativa: z.boolean(),
  cor: z.string().nullable().optional(),
  subtitulo: z.string().nullable().optional(),
  catalogo_id: z.string().uuid().nullable().optional(),
});

const catalogoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1, "Nome obrigatório"),
  slug: z.string().optional(),
  ordem: z.number().int(),
  ativo: z.boolean(),
  cor: z.string().nullable().optional(),
  subtitulo: z.string().nullable().optional(),
  msg_saudacao: z.string().nullable().optional(),
  msg_fecho: z.string().nullable().optional(),
  msg_produto: z.string().nullable().optional(),
});

const horariosSchema = z.object({
  modo: z.enum(["auto", "aberto", "fechado"]),
  mensagem_fechado: z.string(),
  dias: z.record(
    z.string(),
    z.object({
      aberto: z.boolean(),
      abre: z.string(),
      fecha: z.string(),
    }),
  ),
});

const idSchema = z.object({ id: z.string().uuid() });
const reorderSchema = z.object({ ids: z.array(z.string().uuid()) });

const imagemSchema = z.object({
  produtoId: z.string().uuid(),
  slug: z.string().min(1),
  base64: z.string().min(1),
  contentType: z.string().min(1),
});

const removerImagemSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
});

type ActionInput<T> = { data: T };

async function contextoEmpresa() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    throw new Error("Sessão inválida. Entre novamente.");
  }

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("company_id, email, display_name, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError) throw membroError;

  if (!membro) {
    throw new Error("Seu usuário não está vinculado a uma empresa ativa.");
  }

  return {
    supabase,
    companyId: membro.company_id,
    email: membro.email,
    displayName: membro.display_name,
    role: membro.role,
  };
}

/**
 * Mantém o mesmo nome usado pelo painel legado.
 * No Flua, "admin" significa membro ativo de uma empresa.
 * As permissões de cada operação são aplicadas pelo RLS do Supabase.
 */
export async function verificarAdmin() {
  const ctx = await contextoEmpresa();

  return {
    admin: true as const,
    email: ctx.email,
    companyId: ctx.companyId,
    displayName: ctx.displayName,
    role: ctx.role,
  };
}

export async function carregarCatalogoAdmin() {
  const { supabase, companyId } = await contextoEmpresa();
  const catalogo = await listCatalogo(supabase, companyId);

  const { data: codigos, error } = await supabase
    .from("produtos")
    .select("id, sku, rascunho")
    .eq("company_id", companyId);

  if (error) throw error;

  const estadoPorId = new Map(
    (codigos ?? []).map((item) => [
      item.id,
      { sku: item.sku ?? "", rascunho: item.rascunho === true },
    ]),
  );

  return {
    ...catalogo,
    produtos: (catalogo.produtos ?? [])
      .filter((produto) => !estadoPorId.get(produto.id)?.rascunho)
      .map((produto) => ({
        ...produto,
        sku: estadoPorId.get(produto.id)?.sku ?? "",
      })),
  };
}

export async function prepararNovoProduto() {
  const { supabase, companyId } = await contextoEmpresa();
  const id = crypto.randomUUID();
  const slug = `rascunho-${id}`;

  const { data, error } = await supabase
    .from("produtos")
    .insert({
      id,
      company_id: companyId,
      categoria_id: null,
      slug,
      nome: "Novo produto",
      preco: null,
      preco_label: null,
      serve: null,
      itens: [],
      precos_extra: [],
      observacao: null,
      ativo: false,
      ordem: 0,
      badge: null,
      badge_cor: null,
      rascunho: true,
    })
    .select("id, slug, sku")
    .single();

  if (error) throw error;
  return data;
}

export async function carregarConfig() {
  const { supabase, companyId } = await contextoEmpresa();
  return {
    horarios: await getConfig(supabase, companyId, "horarios"),
  };
}

export async function salvarHorarios(input: ActionInput<unknown>) {
  const data = horariosSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return setConfig(supabase, companyId, "horarios", data);
}

export async function salvarProduto(input: ActionInput<unknown>) {
  const data = produtoSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  const salvo = await upsertProduto(supabase, companyId, data);

  const { error: finalizarError } = await supabase
    .from("produtos")
    .update({ rascunho: false })
    .eq("company_id", companyId)
    .eq("id", salvo.id);

  if (finalizarError) throw finalizarError;

  const { data: produto, error } = await supabase
    .from("produtos")
    .select("id, slug, sku")
    .eq("company_id", companyId)
    .eq("id", salvo.id)
    .single();

  if (error) throw error;
  return produto;
}

export async function removerProduto(input: ActionInput<unknown>) {
  const data = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return deleteProduto(supabase, companyId, data.id);
}

export async function salvarCategoria(input: ActionInput<unknown>) {
  const data = categoriaSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return upsertCategoria(supabase, companyId, data);
}

export async function salvarCatalogo(input: ActionInput<unknown>) {
  const data = catalogoSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return upsertCatalogo(supabase, companyId, data);
}

export async function removerCatalogo(input: ActionInput<unknown>) {
  const data = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return deleteCatalogo(supabase, companyId, data.id);
}

export async function removerCategoria(input: ActionInput<unknown>) {
  const data = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return deleteCategoria(supabase, companyId, data.id);
}

export async function enviarImagem(input: ActionInput<unknown>) {
  const data = imagemSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return uploadImagem(supabase, companyId, data);
}

export async function removerImagem(input: ActionInput<unknown>) {
  const data = removerImagemSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return deleteImagem(supabase, companyId, data);
}

export async function reordenarImagens(input: ActionInput<unknown>) {
  const data = reorderSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return reordenarImagensOp(supabase, companyId, data.ids);
}

export async function reordenarProdutos(input: ActionInput<unknown>) {
  const data = reorderSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();
  return reordenarProdutosOp(supabase, companyId, data.ids);
}

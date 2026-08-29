"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import { calcularFrete } from "@/lib/frete";
import {
  filtroPedidosSchema,
  pedidoManualSchema,
  type FiltroPedidos,
  type PedidoManualInput,
} from "@/lib/pedidos-schema";
import type {
  Cliente,
  ClienteComHistorico,
  DashboardVendas,
  VendaAgrupada,
} from "@/lib/pedidos-ops.server";
import {
  dataLocalISO,
  normalizarPedido,
  subtotalItens,
  totalPedido,
  type ItemPedido,
  type Pedido,
  type StatusPedido,
} from "@/lib/vendas";

type Contexto = Awaited<ReturnType<typeof requireCompany>>;
type Supabase = Contexto["supabase"];

const idSchema = z.object({ id: z.string().uuid() });
const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const DATA_OPC = DATA.nullable().default(null);

function sanitizarBusca(busca: string) {
  return busca.replace(/[,()'"\\%]/g, " ").trim();
}

async function resolverTaxa(
  supabase: Supabase,
  companyId: string,
  input: {
    tipo: string | null;
    taxa_entrega: number | null;
    taxa_manual?: boolean;
    bairro_id?: string | null;
    data_entrega: string | null;
  },
): Promise<number | null> {
  if (input.tipo === "retirada") return null;
  if (input.taxa_manual) return input.taxa_entrega;
  if (!input.bairro_id) return input.taxa_entrega;

  const [bairroRes, configRes] = await Promise.all([
    supabase
      .from("bairros")
      .select("id, nome, taxa, observacao, ordem, ativo")
      .eq("company_id", companyId)
      .eq("id", input.bairro_id)
      .maybeSingle(),
    supabase
      .from("entrega_config")
      .select("adicional_domingo")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (bairroRes.error || !bairroRes.data) return input.taxa_entrega;

  const frete = calcularFrete(
    {
      id: bairroRes.data.id,
      nome: bairroRes.data.nome,
      taxa: Number(bairroRes.data.taxa ?? 0),
      observacao: bairroRes.data.observacao,
      ordem: Number(bairroRes.data.ordem ?? 0),
      ativo: bairroRes.data.ativo,
    },
    input.data_entrega,
    Number(configRes.data?.adicional_domingo ?? 0),
  );

  return frete?.total ?? input.taxa_entrega;
}

async function garantirCliente(
  supabase: Supabase,
  companyId: string,
  input: PedidoManualInput,
): Promise<string | null> {
  const digitos = (input.cliente_whatsapp ?? "").replace(/\D/g, "");
  if (digitos.length < 10 || !input.cliente_nome?.trim()) return null;

  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("id, whatsapp")
    .eq("company_id", companyId);

  if (error) return null;

  const achado = (clientes ?? []).find(
    (cliente) => (cliente.whatsapp ?? "").replace(/\D/g, "") === digitos,
  );
  if (achado) return achado.id;

  const { data: criado, error: insertError } = await supabase
    .from("clientes")
    .insert({
      company_id: companyId,
      nome: input.cliente_nome.trim(),
      whatsapp: input.cliente_whatsapp,
      cep: input.cep,
      endereco: input.endereco,
      bairro: input.bairro,
      referencia: input.referencia,
    })
    .select("id")
    .maybeSingle();

  if (!insertError) return criado?.id ?? null;
  if (insertError.code !== "23505") return null;

  const { data: relidos } = await supabase
    .from("clientes")
    .select("id, whatsapp")
    .eq("company_id", companyId);

  return (
    (relidos ?? []).find(
      (cliente) => (cliente.whatsapp ?? "").replace(/\D/g, "") === digitos,
    )?.id ?? null
  );
}

async function buscarPedidos(
  supabase: Supabase,
  companyId: string,
  filtro: FiltroPedidos,
): Promise<{ pedidos: Pedido[]; total: number }> {
  const porEntrega = ["todos", "novo", "producao", "pronto"].includes(
    filtro.status,
  );

  let query = supabase
    .from("pedidos")
    .select("*", { count: "exact" })
    .eq("company_id", companyId);

  query = porEntrega
    ? query.order("data_entrega", { ascending: true, nullsFirst: false })
    : query.order("created_at", { ascending: false });

  query = query.range(filtro.offset, filtro.offset + filtro.limite - 1);

  if (filtro.status !== "todos") {
    query = query.eq("status", filtro.status);
  }

  const busca = filtro.busca ? sanitizarBusca(filtro.busca) : "";
  if (busca) {
    query = query.or(
      `cliente_nome.ilike.%${busca}%,cliente_whatsapp.ilike.%${busca}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    pedidos: (data ?? []).map((row) =>
      normalizarPedido(row as Record<string, unknown>),
    ),
    total: count ?? 0,
  };
}

export async function carregarPedidos(input: { data: unknown }) {
  const filtro = filtroPedidosSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();
  return buscarPedidos(supabase, companyId, filtro);
}

export async function carregarResumoPedidos() {
  const { supabase, companyId } = await requireCompany();

  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const inicioMes = `${ano}-${mes}-01`;

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("company_id", companyId)
    .or(
      `created_at.gte.${inicioMes}T00:00:00-03:00,status.in.(novo,producao,pronto)`,
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizarPedido(row as Record<string, unknown>),
  );
}

/**
 * Total faturado por dia de um mês (YYYY-MM), para o gráfico da tela inicial.
 *
 * Existe separado de carregarResumoPedidos porque aquele só traz o mês corrente
 * — o alternador "Mês passado" precisa de um período arbitrário. Agrega aqui no
 * servidor para não trafegar o pedido inteiro só para somar totais.
 */
export async function carregarFaturamentoDoMes(input: { data: unknown }) {
  const { mes } = z
    .object({ mes: z.string().regex(/^\d{4}-\d{2}$/) })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const [ano, numeroMes] = mes.split("-").map(Number);
  const proximo =
    numeroMes === 12
      ? `${ano + 1}-01-01`
      : `${ano}-${String(numeroMes + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("pedidos")
    .select("created_at, total")
    .eq("company_id", companyId)
    .neq("status", "cancelado")
    .gte("created_at", `${mes}-01T00:00:00-03:00`)
    .lt("created_at", `${proximo}T00:00:00-03:00`)
    .limit(3000);

  if (error) throw error;

  const diasNoMes = new Date(ano, numeroMes, 0).getDate();
  const dias = Array.from({ length: diasNoMes }, (_, i) => ({
    dia: i + 1,
    valor: 0,
  }));

  let total = 0;
  let pedidos = 0;

  for (const linha of data ?? []) {
    const criadoEm = linha.created_at as string | null;
    if (!criadoEm) continue;

    // Reaproveita a conversão para o fuso de São Paulo usada no resto do app.
    const iso = dataLocalISO(criadoEm);
    if (!iso.startsWith(mes)) continue;

    const dia = Number(iso.slice(-2));
    const valor = Number(linha.total) || 0;
    if (dias[dia - 1]) dias[dia - 1].valor += valor;
    total += valor;
    pedidos += 1;
  }

  return { mes, dias, total, pedidos, ticket: pedidos ? total / pedidos : 0 };
}

export async function salvarPedido(input: { data: unknown }) {
  const data = pedidoManualSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const itens = data.itens as ItemPedido[];
  const taxa = await resolverTaxa(supabase, companyId, data);
  const clienteId =
    data.cliente_id ?? (await garantirCliente(supabase, companyId, data));

  const row = {
    cliente_nome: data.cliente_nome,
    cliente_whatsapp: data.cliente_whatsapp,
    cliente_id: clienteId,
    itens,
    subtotal: subtotalItens(itens),
    taxa_entrega: taxa,
    taxa_manual: data.taxa_manual ?? false,
    total: totalPedido(itens, taxa),
    tipo: data.tipo,
    cep: data.cep,
    endereco: data.endereco,
    bairro: data.bairro,
    referencia: data.referencia,
    destinatario_nome: data.destinatario_nome,
    destinatario_whatsapp: data.destinatario_whatsapp,
    bairro_id: data.tipo === "retirada" ? null : (data.bairro_id ?? null),
    cartao_de: data.cartao_de,
    cartao_para: data.cartao_para,
    cartao_mensagem: data.cartao_mensagem,
    data_entrega: data.data_entrega,
    janela_entrega: data.janela_entrega,
    forma_pagamento: data.forma_pagamento,
    status: data.status,
    observacao: data.observacao,
    ...(data.recebido_em ? { recebido_em: data.recebido_em } : {}),
  };

  if (data.id) {
    const { data: salvo, error } = await supabase
      .from("pedidos")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return { id: salvo?.id ?? data.id };
  }

  const { data: salvo, error } = await supabase
    .from("pedidos")
    .insert({
      company_id: companyId,
      ...row,
      origem: "manual",
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!salvo) throw new Error("Não foi possível salvar o pedido.");
  return { id: salvo.id };
}

export async function mudarStatusPedido(input: { data: unknown }) {
  const data = idSchema
    .extend({
      status: z.enum(["novo", "producao", "pronto", "entregue", "cancelado"]),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();
  const { error } = await supabase
    .from("pedidos")
    .update({ status: data.status })
    .eq("id", data.id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

export async function removerPedido(input: { data: unknown }) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("pedidos")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

export async function carregarAReceber(input: { data: unknown }) {
  const data = z.object({ de: DATA_OPC, ate: DATA_OPC }).parse(input.data ?? {});
  const { supabase, companyId } = await requireCompany();

  let query = supabase
    .from("pedidos")
    .select("*")
    .eq("company_id", companyId)
    .is("recebido_em", null)
    .neq("status", "cancelado")
    .order("data_entrega", { ascending: true, nullsFirst: false })
    .limit(500);

  if (data.de) query = query.gte("data_entrega", data.de);
  if (data.ate) query = query.lte("data_entrega", data.ate);

  const { data: pedidos, error } = await query;
  if (error) throw error;

  return (pedidos ?? []).map((row) =>
    normalizarPedido(row as Record<string, unknown>),
  );
}

export async function marcarRecebimento(input: { data: unknown }) {
  const data = idSchema
    .extend({ recebido_em: DATA.nullable() })
    .parse(input.data);

  const { supabase } = await requireCompany();
  const { error } = await supabase.rpc("marcar_recebimento_pedido", {
    p_pedido_id: data.id,
    p_recebido_em: data.recebido_em,
  });

  if (error) throw error;
  return { ok: true as const };
}

export async function receberEmLote(input: { data: unknown }) {
  const data = z
    .object({
      ids: z.array(z.string().uuid()).min(1).max(200),
      recebido_em: DATA,
    })
    .parse(input.data);

  const { supabase } = await requireCompany();
  const { error } = await supabase.rpc("marcar_recebimentos_pedidos", {
    p_pedido_ids: data.ids,
    p_recebido_em: data.recebido_em,
  });

  if (error) throw error;
  return { ok: true as const };
}

export async function carregarRealizadas(input: { data: unknown }) {
  const data = z.object({ de: DATA, ate: DATA }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "entregue")
    .not("recebido_em", "is", null)
    .gte("data_entrega", data.de)
    .lte("data_entrega", data.ate)
    .order("data_entrega", { ascending: false })
    .order("numero", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (pedidos ?? []).map((row) =>
    normalizarPedido(row as Record<string, unknown>),
  );
}

export async function registrarPagamento(input: { data: unknown }) {
  const data = z
    .object({
      id: z.string().uuid(),
      recebido_em: DATA,
      forma_pagamento: z.string().max(40).nullable(),
      taxa_entrega: z.number().min(0).max(10_000).nullable(),
      taxa_manual: z.boolean().default(false),
      bairro_id: z.string().uuid().nullable().default(null),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { data: pedido, error: buscaError } = await supabase
    .from("pedidos")
    .select("itens, tipo, bairro_id, data_entrega")
    .eq("company_id", companyId)
    .eq("id", data.id)
    .maybeSingle();

  if (buscaError) throw buscaError;
  if (!pedido) throw new Error("Pedido não encontrado.");

  const itens = Array.isArray(pedido.itens)
    ? (pedido.itens as unknown as ItemPedido[])
    : [];

  const taxa = await resolverTaxa(supabase, companyId, {
    tipo: pedido.tipo ?? "entrega",
    taxa_entrega: data.taxa_entrega,
    taxa_manual: data.taxa_manual,
    bairro_id: data.bairro_id ?? pedido.bairro_id ?? null,
    data_entrega: pedido.data_entrega ?? null,
  });

  const subtotal = subtotalItens(itens);
  const total = totalPedido(itens, taxa);

  const { error } = await supabase.rpc("registrar_pagamento_pedido", {
    p_pedido_id: data.id,
    p_recebido_em: data.recebido_em,
    p_forma_pagamento: data.forma_pagamento,
    p_taxa_entrega: taxa,
    p_subtotal: subtotal,
    p_total: total,
  });

  if (error) throw error;
  return { ok: true as const };
}

export async function carregarClientes() {
  const { supabase, companyId } = await requireCompany();

  const [clientesRes, pedidosRes] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, nome, whatsapp, email, documento, cep, endereco, bairro, referencia, aniversario, observacao, ativo",
      )
      .eq("company_id", companyId)
      .order("nome"),
    supabase
      .from("pedidos")
      .select("cliente_id, total, data_entrega, created_at, status")
      .eq("company_id", companyId)
      .neq("status", "cancelado")
      .limit(5000),
  ]);

  if (clientesRes.error) throw clientesRes.error;
  if (pedidosRes.error) throw pedidosRes.error;

  const historico = new Map<
    string,
    { pedidos: number; gasto: number; ultimo: string | null }
  >();

  for (const pedido of pedidosRes.data ?? []) {
    const clienteId = pedido.cliente_id;
    if (!clienteId) continue;

    const dia =
      pedido.data_entrega ?? String(pedido.created_at ?? "").slice(0, 10);

    const atual = historico.get(clienteId) ?? {
      pedidos: 0,
      gasto: 0,
      ultimo: null,
    };

    atual.pedidos += 1;
    atual.gasto += Number(pedido.total ?? 0);
    if (!atual.ultimo || dia > atual.ultimo) atual.ultimo = dia;
    historico.set(clienteId, atual);
  }

  return (clientesRes.data ?? []).map((cliente) => ({
    ...(cliente as Cliente),
    ...(historico.get(cliente.id) ?? {
      pedidos: 0,
      gasto: 0,
      ultimo: null,
    }),
  })) as ClienteComHistorico[];
}

export async function carregarAgenda(input: { data: unknown }) {
  const data = z.object({ de: DATA, ate: DATA }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("company_id", companyId)
    .gte("data_entrega", data.de)
    .lte("data_entrega", data.ate)
    .neq("status", "cancelado")
    .order("data_entrega")
    .limit(500);

  if (error) throw error;

  return {
    pedidos: (pedidos ?? []).map((row) =>
      normalizarPedido(row as Record<string, unknown>),
    ),
  };
}

export async function carregarPedidosDoCliente(input: { data: unknown }) {
  const { cliente_id } = z
    .object({ cliente_id: z.string().uuid() })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("company_id", companyId)
    .eq("cliente_id", cliente_id)
    .order("data_entrega", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return {
    pedidos: (pedidos ?? []).map((row) =>
      normalizarPedido(row as Record<string, unknown>),
    ),
  };
}

const clienteSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(120),
  whatsapp: z.string().trim().max(24).nullable(),
  email: z.string().max(120).nullable(),
  documento: z.string().max(30).nullable(),
  cep: z.string().max(12).nullable(),
  endereco: z.string().max(200).nullable(),
  bairro: z.string().max(80).nullable(),
  referencia: z.string().max(160).nullable(),
  aniversario: DATA.nullable(),
  observacao: z.string().max(1000).nullable(),
  ativo: z.boolean(),
});

export async function salvarCliente(input: { data: unknown }) {
  const data = clienteSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const row = {
    nome: data.nome,
    whatsapp: data.whatsapp,
    email: data.email,
    documento: data.documento,
    cep: data.cep,
    endereco: data.endereco,
    bairro: data.bairro,
    referencia: data.referencia,
    aniversario: data.aniversario,
    observacao: data.observacao,
    ativo: data.ativo,
  };

  if (data.id) {
    const { data: salvo, error } = await supabase
      .from("clientes")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um cliente com esse WhatsApp.");
      }
      throw error;
    }
    return { id: salvo?.id ?? data.id };
  }

  const { data: salvo, error } = await supabase
    .from("clientes")
    .insert({ company_id: companyId, ...row })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um cliente com esse WhatsApp.");
    }
    throw error;
  }
  if (!salvo) throw new Error("Não foi possível salvar o cliente.");
  return { id: salvo.id };
}

export async function removerCliente(input: { data: unknown }) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

export async function carregarDashboard(input: { data: unknown }) {
  const filtro = z
    .object({
      de: DATA,
      ate: DATA,
      colecaoId: z.string().uuid().nullable().default(null),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const [pedidosRes, produtosRes, categoriasRes, catalogosRes] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select("itens, total, data_entrega, created_at, forma_pagamento, status")
        .eq("company_id", companyId)
        .neq("status", "cancelado")
        .limit(3000),
      supabase
        .from("produtos")
        .select("slug, nome, categoria_id")
        .eq("company_id", companyId)
        .limit(1000),
      supabase
        .from("categorias")
        .select("id, nome, slug, catalogo_id")
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
  if (categoriasRes.error) throw categoriasRes.error;
  if (catalogosRes.error) throw catalogosRes.error;

  type CategoriaRef = {
    id: string;
    nome: string;
    slug: string;
    catalogo_id: string | null;
  };
  type CatalogoRef = { id: string; nome: string };
  type ProdutoRef = {
    slug: string;
    nome: string;
    categoria_id: string | null;
  };

  const categoriasLinhas = (categoriasRes.data ?? []) as CategoriaRef[];
  const catalogosLinhas = (catalogosRes.data ?? []) as CatalogoRef[];
  const produtosLinhas = (produtosRes.data ?? []) as ProdutoRef[];

  const categorias = new Map<string, CategoriaRef>(
    categoriasLinhas.map((categoria) => [categoria.id, categoria]),
  );
  const catalogos = new Map<string, CatalogoRef>(
    catalogosLinhas.map((catalogo) => [catalogo.id, catalogo]),
  );
  const produtos = new Map<string, ProdutoRef>(
    produtosLinhas.map((produto) => [produto.slug, produto]),
  );

  const noPeriodo = (pedidosRes.data ?? []).filter((pedido) => {
    const dia =
      String(pedido.created_at ?? "").slice(0, 10) ||
      pedido.data_entrega ||
      "";
    return dia >= filtro.de && dia <= filtro.ate;
  });

  const somar = (
    mapa: Map<string, VendaAgrupada>,
    chave: string,
    nome: string,
    qtd: number,
    valor: number,
    sub?: string,
  ) => {
    const atual = mapa.get(chave) ?? {
      chave,
      nome,
      sub,
      qtd: 0,
      valor: 0,
    };
    atual.qtd += qtd;
    atual.valor += valor;
    mapa.set(chave, atual);
  };

  const porProduto = new Map<string, VendaAgrupada>();
  const adicionais = new Map<string, VendaAgrupada>();
  const porCategoria = new Map<string, VendaAgrupada>();
  const porColecao = new Map<string, VendaAgrupada>();
  const porPagamento = new Map<string, VendaAgrupada>();

  let totalVendido = 0;
  let totalPedidos = 0;

  for (const pedido of noPeriodo) {
    const itens = Array.isArray(pedido.itens)
      ? (pedido.itens as unknown as ItemPedido[])
      : [];

    const relevante = filtro.colecaoId
      ? itens.some((item) => {
          const produto = item.slug ? produtos.get(item.slug) : undefined;
          const categoria = produto?.categoria_id
            ? categorias.get(produto.categoria_id)
            : undefined;
          return categoria?.catalogo_id === filtro.colecaoId;
        })
      : true;

    if (!relevante) continue;

    totalPedidos += 1;
    totalVendido += Number(pedido.total ?? 0);

    const forma = pedido.forma_pagamento || "A combinar";
    somar(
      porPagamento,
      forma,
      forma,
      1,
      Number(pedido.total ?? 0),
    );

    for (const item of itens) {
      const produto = item.slug ? produtos.get(item.slug) : undefined;
      const categoria = produto?.categoria_id
        ? categorias.get(produto.categoria_id)
        : undefined;

      if (
        filtro.colecaoId &&
        categoria?.catalogo_id !== filtro.colecaoId
      ) {
        continue;
      }

      const valor = (item.preco ?? 0) * item.qtd;
      const nome = produto?.nome ?? item.nome;
      const ehAdicional = (categoria?.slug ?? "").includes("adicionais");

      somar(
        ehAdicional ? adicionais : porProduto,
        item.slug ?? nome,
        nome,
        item.qtd,
        valor,
      );

      const colecao = categoria?.catalogo_id
        ? catalogos.get(categoria.catalogo_id)
        : undefined;

      if (categoria) {
        somar(
          porCategoria,
          categoria.id,
          categoria.nome,
          item.qtd,
          valor,
          colecao?.nome,
        );
      }

      if (colecao) {
        somar(
          porColecao,
          colecao.id,
          colecao.nome,
          item.qtd,
          valor,
        );
      }
    }
  }

  const ordenar = (mapa: Map<string, VendaAgrupada>) =>
    [...mapa.values()].sort(
      (a, b) => b.qtd - a.qtd || b.valor - a.valor,
    );

  const resultado: DashboardVendas = {
    totalVendido,
    totalPedidos,
    ticketMedio: totalPedidos ? totalVendido / totalPedidos : 0,
    produtos: ordenar(porProduto),
    adicionais: ordenar(adicionais),
    porCategoria: ordenar(porCategoria).sort((a, b) => b.valor - a.valor),
    porColecao: ordenar(porColecao).sort((a, b) => b.valor - a.valor),
    porPagamento: ordenar(porPagamento).sort((a, b) => b.valor - a.valor),
    colecoes: [...catalogos.values()].map((catalogo) => ({
      id: catalogo.id,
      nome: catalogo.nome,
    })),
  };

  return resultado;
}

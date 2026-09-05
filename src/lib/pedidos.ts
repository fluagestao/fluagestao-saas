"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import { chaveFormaPagamento, rotuloFormaPagamento } from "@/lib/vendas";
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
  MesDaSerie,
  VendaAgrupada,
  ClienteDoPeriodo,
} from "@/lib/pedidos-ops.server";
import { mensagemDeErro } from "@/lib/erros";
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
const JANELA_ENTREGUE_MS = 24 * 60 * 60 * 1000;

function sanitizarBusca(busca: string) {
  return busca.replace(/[,()'"\\%]/g, " ").trim();
}

function limiteEntregueISO(agora = new Date()) {
  return new Date(agora.getTime() - JANELA_ENTREGUE_MS).toISOString();
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
  const NAO_ENTREGUES = ["novo", "producao", "pronto"];

  const porEntrega = ["todos", "nao_entregue", ...NAO_ENTREGUES].includes(
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

  if (filtro.status === "nao_entregue") {
    query = query.in("status", NAO_ENTREGUES);
  } else if (filtro.status !== "todos") {
    query = query.eq("status", filtro.status);
  }

  if (filtro.status === "entregue") {
    query = query.gte("entregue_em", limiteEntregueISO());
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
  const limiteEntregue = limiteEntregueISO(agora);

  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("company_id", companyId)
    .or(
      `created_at.gte.${inicioMes}T00:00:00-03:00,status.in.(novo,producao,pronto),and(status.eq.entregue,entregue_em.gte.${limiteEntregue})`,
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
  // A faixa do mês precisa entrar no regex: "2026-00"/"2026-13" passavam e
  // viravam erro cru do Postgres na montagem da data.
  const { mes } = z
    .object({ mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) })
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
    // Sem ORDER BY o Postgres pode devolver 3000 linhas diferentes a cada
    // chamada, e o mesmo mês exibiria totais distintos entre recarregamentos.
    .order("created_at", { ascending: true })
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

/**
 * Faturamento mes a mes do ano inteiro.
 *
 * Uma consulta so para os doze meses, agrupando aqui: doze chamadas de
 * carregarFaturamentoDoMes custariam doze idas ao banco para desenhar um
 * grafico. A base e created_at, a mesma do resumo mensal — trocar isso faria
 * o ano discordar do mes.
 */
export async function carregarFaturamentoDoAno(input: { data: unknown }) {
  const { ano } = z
    .object({ ano: z.number().int().min(2000).max(2100) })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("pedidos")
    .select("created_at, total")
    .eq("company_id", companyId)
    .neq("status", "cancelado")
    .gte("created_at", `${ano}-01-01T00:00:00-03:00`)
    .lt("created_at", `${ano + 1}-01-01T00:00:00-03:00`)
    .order("created_at", { ascending: true })
    .limit(20000);

  if (error) throw error;

  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, valor: 0 }));
  let total = 0;
  let pedidos = 0;

  for (const linha of data ?? []) {
    const criadoEm = linha.created_at as string | null;
    if (!criadoEm) continue;

    const iso = dataLocalISO(criadoEm);
    if (!iso.startsWith(String(ano))) continue;

    const mes = Number(iso.slice(5, 7));
    const valor = Number(linha.total) || 0;
    if (meses[mes - 1]) meses[mes - 1].valor += valor;
    total += valor;
    pedidos += 1;
  }

  return { ano, meses, total, pedidos, ticket: pedidos ? total / pedidos : 0 };
}

export async function salvarPedido(input: { data: unknown }) {
  const data = pedidoManualSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const itens = data.itens as ItemPedido[];

  /* RETORNA o erro em vez de lançar.
     Em produção o React descarta a mensagem de um Error vindo de arquivo
     "use server" e manda só um digest — a pessoa lia um texto minificado em
     inglês. Aqui dói mais que em qualquer outro lugar: é por esta função que
     TODO pedido nasce, e as falhas daqui são justamente as que ela precisa
     ler ("esse WhatsApp já está em outro cliente", "bairro não encontrado").

     Estas duas linhas entram no try porque as duas tocam o banco: resolverTaxa
     lê o bairro e garantirCliente pode CRIAR uma cliente, que é onde mora o
     conflito de duplicado. */
  let taxa: number | null;
  let clienteId: string | null;
  try {
    taxa = await resolverTaxa(supabase, companyId, data);
    clienteId = data.cliente_id ?? (await garantirCliente(supabase, companyId, data));
  } catch (e) {
    return { ok: false as const, id: null, erro: mensagemDeErro(e, "salvar o pedido") };
  }

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
    cidade: data.cidade,
    referencia: data.referencia,
    destinatario_nome: data.destinatario_nome,
    destinatario_whatsapp: data.destinatario_whatsapp,
    bairro_id: data.tipo === "retirada" ? null : (data.bairro_id ?? null),
    cartao_habilitado: data.cartao_habilitado,
    cartao_de: data.cartao_de,
    cartao_para: data.cartao_para,
    cartao_mensagem: data.cartao_mensagem,
    data_entrega: data.data_entrega,
    janela_entrega: data.janela_entrega,
    ocasiao: data.ocasiao,
    ocasiao_confirmada: data.ocasiao_confirmada,
    /* Canoniza aqui, e nao so na leitura: o campo "Outro" e texto livre, e sem
       isto cada "PIX", "pix " e "Pix" digitado vira uma linha nova no grafico
       que alguem tem que dobrar de novo depois. */
    forma_pagamento: data.forma_pagamento
      ? rotuloFormaPagamento(data.forma_pagamento)
      : null,
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

    if (error) {
      return { ok: false as const, id: null, erro: mensagemDeErro(error, "salvar o pedido") };
    }
    return { ok: true as const, id: salvo?.id ?? data.id, erro: null };
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

  if (error) {
    return { ok: false as const, id: null, erro: mensagemDeErro(error, "salvar o pedido") };
  }
  if (!salvo) {
    /* Insert sem erro e sem linha: o RLS recusou em silêncio. Dizer "não foi
       possível" não ajudava ninguém a fazer nada. */
    return {
      ok: false as const,
      id: null,
      erro: "O pedido não foi gravado e o banco não disse por quê. Tente de novo; se repetir, avise o Lucas.",
    };
  }
  return { ok: true as const, id: salvo.id, erro: null };
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
  const data = z
    .object({
      de: z.union([DATA, z.literal("")]).default(""),
      ate: z.union([DATA, z.literal("")]).default(""),
    })
    .parse(input.data);
  const { supabase, companyId } = await requireCompany();

  let query = supabase
    .from("pedidos")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "entregue")
    .not("entregue_em", "is", null)
    .order("entregue_em", { ascending: false })
    .order("numero", { ascending: false })
    .limit(1000);

  if (data.de) query = query.gte("entregue_em", `${data.de}T00:00:00-03:00`);
  if (data.ate) query = query.lte("entregue_em", `${data.ate}T23:59:59.999-03:00`);

  const { data: pedidos, error } = await query;

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
  whatsapp: z.string().trim().min(1, "O WhatsApp é obrigatório.").max(24),
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

const DUPLICADO = "Já existe um cliente com esse WhatsApp.";

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
      // Devolvido, nao lancado: ver a nota do insert abaixo.
      if (error.code === "23505") return { id: null, erro: DUPLICADO };
      throw error;
    }
    return { id: salvo?.id ?? data.id };
  }

  const { data: salvo, error } = await supabase
    .from("clientes")
    .insert({ company_id: companyId, ...row })
    .select("id")
    .maybeSingle();

  /* Duplicado e resposta, nao excecao. Erro LANCADO dentro de server action e
     redigido pelo React em producao: a tela recebia "Minified React error #441"
     no lugar da frase, e quem cadastrava nao tinha como saber que o problema
     era um WhatsApp ja usado. A mensagem certa existia e nunca chegava. */
  if (error) {
    if (error.code === "23505") return { id: null, erro: DUPLICADO };
    throw error;
  }
  if (!salvo) return { id: null, erro: "Não foi possível salvar o cliente." };
  return { id: salvo.id, erro: null };
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

const NOMES_MES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export async function carregarDashboard(input: { data: unknown }) {
  const filtro = z
    .object({
      de: DATA,
      ate: DATA,
      colecaoId: z.string().uuid().nullable().default(null),
      /* Slug, nao rotulo — o mesmo que pedidos.ocasiao guarda. */
      ocasiao: z
        .string()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        .max(40)
        .nullable()
        .default(null),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const [pedidosRes, produtosRes, categoriasRes, catalogosRes] =
    await Promise.all([
      supabase
        .from("pedidos")
        .select(
          "cliente_id, cliente_nome, cliente_whatsapp, itens, total, data_entrega, created_at, recebido_em, forma_pagamento, status, ocasiao",
        )
        .eq("company_id", companyId)
        .neq("status", "cancelado")
        .limit(3000),
      supabase
        .from("produtos")
        .select("slug, nome, categoria_id")
        .eq("company_id", companyId)
        .limit(1000),
      supabase
        // "*" de proposito: e_adicional entrou depois e, listando coluna a
        // coluna, o dashboard quebraria inteiro entre o deploy e a migration.
        .from("categorias")
        .select("*")
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
    e_adicional?: boolean | null;
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

  /* DOIS RELOGIOS, de proposito.
   *
   * Dinheiro conta quando ENTRA: pedido sem recebido_em nao virou faturamento,
   * por mais que ja tenha saido da cozinha. E o mesmo criterio do Financeiro,
   * que sempre usou recebido_em — antes disto o Inicio e o Dashboard contavam
   * pela entrada do pedido e os tres se contradiziam na mesma tela.
   *
   * Producao conta quando SAI: e a data de entrega que diz em que mes a cesta
   * foi feita. Contar cesta pela data do pagamento mandaria o Plano de Compras
   * comprar em setembro o ingrediente de um trabalho feito em agosto — e cesta
   * entregue e nao paga sumiria da contagem, mostrando menos trabalho do que
   * de fato houve. */
  type LinhaPedido = { created_at?: unknown; data_entrega?: unknown; recebido_em?: unknown };

  const diaDoDinheiro = (pedido: LinhaPedido) =>
    String(pedido.recebido_em ?? "").slice(0, 10);

  // Sem data de entrega cai na entrada do pedido: aproximar e melhor do que
  // sumir com a cesta da contagem.
  const diaDaProducao = (pedido: LinhaPedido) =>
    String(pedido.data_entrega ?? "") || String(pedido.created_at ?? "").slice(0, 10) || "";

  const dentro = (dia: string) => Boolean(dia) && dia >= filtro.de && dia <= filtro.ate;

  /* CLIENTES NOVAS x RECORRENTES.
   *
   * "Nova" e quem fez a PRIMEIRA compra dentro do periodo — nao quem foi
   * cadastrada nele. A diferenca importa: cadastro pode ter sido feito meses
   * antes, no dia em que ela pediu orcamento, e contar isso como aquisicao
   * inflaria o numero justamente no mes em que a pessoa nao comprou.
   *
   * Da para responder sem consulta nova porque a query ja traz o historico
   * inteiro, nao so o periodo: a primeira compra de cada cliente sai do mesmo
   * conjunto. Conta pelo dia da producao, a mesma regua das unidades. */
  const primeiraCompra = new Map<string, string>();
  for (const pedido of pedidosRes.data ?? []) {
    const id = (pedido as { cliente_id?: string | null }).cliente_id;
    if (!id) continue;
    const dia = diaDaProducao(pedido as LinhaPedido);
    if (!dia) continue;
    const atual = primeiraCompra.get(id);
    if (!atual || dia < atual) primeiraCompra.set(id, dia);
  }

  /* QUEM, nao so quantos.
   *
   * O cartao contava "3 clientes novas" e parava ali. Um numero desses nao
   * vira trabalho: quem quer mandar mensagem para a cliente nova precisa saber
   * o nome dela, e quem quer entender a recompra precisa ver a lista. Entao o
   * cartao virou porta — clicar abre quem esta atras do numero.
   *
   * Sai da mesma consulta, sem round-trip novo: o historico inteiro ja esta
   * carregado aqui para achar a primeira compra de cada uma. */
  const porCliente = new Map<string, ClienteDoPeriodo>();

  for (const pedido of pedidosRes.data ?? []) {
    const linha = pedido as LinhaPedido & {
      cliente_id?: string | null;
      cliente_nome?: string | null;
      cliente_whatsapp?: string | null;
      total?: number | string | null;
    };
    const id = linha.cliente_id;
    if (!id || !dentro(diaDaProducao(linha))) continue;

    const atual = porCliente.get(id) ?? {
      id,
      nome: String(linha.cliente_nome ?? "").trim() || "sem nome",
      whatsapp: linha.cliente_whatsapp ?? null,
      pedidos: 0,
      total: 0,
      primeiraCompra: primeiraCompra.get(id) ?? "",
    };
    atual.pedidos += 1;
    atual.total += Number(linha.total ?? 0);
    porCliente.set(id, atual);
  }

  const listaNovos: ClienteDoPeriodo[] = [];
  const listaRecorrentes: ClienteDoPeriodo[] = [];
  for (const cliente of porCliente.values()) {
    const primeira = primeiraCompra.get(cliente.id);
    (primeira && dentro(primeira) ? listaNovos : listaRecorrentes).push(cliente);
  }

  /* Maior primeiro: a lista existe para agir, e quem gastou mais e por onde se
     comeca a agir. */
  const porValor = (a: ClienteDoPeriodo, b: ClienteDoPeriodo) => b.total - a.total;
  listaNovos.sort(porValor);
  listaRecorrentes.sort(porValor);

  const clientes = {
    novos: listaNovos.length,
    recorrentes: listaRecorrentes.length,
    total: porCliente.size,
    listaNovos,
    listaRecorrentes,
  };

  /* O filtro de ocasiao corta ANTES de tudo, porque a pergunta muda: "como foi
     o Dia das Maes" nao e um recorte de periodo, e sim de intencao. Fica fora
     da contagem de clientes novas de proposito — "primeira compra" e sobre a
     relacao inteira, nao sobre uma data. */
  const todos = (pedidosRes.data ?? []).filter(
    (pedido) =>
      !filtro.ocasiao ||
      (pedido as { ocasiao?: string | null }).ocasiao === filtro.ocasiao,
  );
  const noPeriodo = todos.filter(
    (pedido) => dentro(diaDoDinheiro(pedido)) || dentro(diaDaProducao(pedido)),
  );

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

  /**
   * Categoria de adicionais.
   *
   * A flag manda. O reconhecimento pelo slug fica como ponte: antes da coluna
   * existir, chamar a categoria de "Adicionais" era a unica forma de marcar, e
   * quem fez isso nao pode ver o historico mudar de leitura.
   */
  const adicional = (categoria?: CategoriaRef) =>
    Boolean(categoria?.e_adicional) || (categoria?.slug ?? "").includes("adicionais");

  const categoriaDoItem = (item: ItemPedido) => {
    const produto = item.slug ? produtos.get(item.slug) : undefined;
    return produto?.categoria_id ? categorias.get(produto.categoria_id) : undefined;
  };

  // Taxa de anexo: de cada cem pedidos com cesta, quantos levaram adicional.
  let pedidosComAdicional = 0;
  let pedidosSemAdicional = 0;
  let pedidosSoAdicional = 0;
  let valorComAdicional = 0;
  let valorSemAdicional = 0;

  const porProduto = new Map<string, VendaAgrupada>();
  const adicionais = new Map<string, VendaAgrupada>();
  const porCategoria = new Map<string, VendaAgrupada>();
  const porColecao = new Map<string, VendaAgrupada>();
  const porPagamento = new Map<string, VendaAgrupada>();

  let totalVendido = 0;
  let totalPedidos = 0;
  let unidadesPrincipais = 0;
  let unidadesAdicionais = 0;

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

    const contaDinheiro = dentro(diaDoDinheiro(pedido));
    const foiEntregue = String((pedido as { status?: unknown }).status ?? "") === "entregue";
    const contaProducao = foiEntregue && dentro(diaDaProducao(pedido));

    if (contaDinheiro) {
      totalPedidos += 1;
      totalVendido += Number(pedido.total ?? 0);
    }

    const temAdicional = itens.some((item) => adicional(categoriaDoItem(item)));
    const temPrincipal = itens.some((item) => !adicional(categoriaDoItem(item)));
    const valorPedido = Number(pedido.total ?? 0);

    if (contaDinheiro) {
      if (temAdicional && temPrincipal) {
        pedidosComAdicional += 1;
        valorComAdicional += valorPedido;
      } else if (temAdicional) {
        pedidosSoAdicional += 1;
      } else if (temPrincipal) {
        pedidosSemAdicional += 1;
        valorSemAdicional += valorPedido;
      }

      const forma = pedido.forma_pagamento as string | null;
      somar(
        porPagamento,
        chaveFormaPagamento(forma) || "a combinar",
        rotuloFormaPagamento(forma),
        1,
        Number(pedido.total ?? 0),
      );
    }

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
      const ehAdicional = adicional(categoria);

      /* Cada bloco da tela tem UM relogio, nunca os dois. Unidades e o ranking
         "Mais vendidos" sao producao; as pizzas mostram R$ e seguem o dinheiro.
         Misturar as bases dentro do mesmo par (qtd e valor na mesma linha)
         produziria uma cesta que soma unidade num mes e reais em outro. */
      if (contaProducao) {
        if (ehAdicional) unidadesAdicionais += item.qtd;
        else unidadesPrincipais += item.qtd;

        somar(ehAdicional ? adicionais : porProduto, item.slug ?? nome, nome, item.qtd, valor);
      }

      if (contaDinheiro) {
        const colecao = categoria?.catalogo_id
          ? catalogos.get(categoria.catalogo_id)
          : undefined;

        if (categoria) {
          somar(porCategoria, categoria.id, categoria.nome, item.qtd, valor, colecao?.nome);
        }

        if (colecao) {
          somar(porColecao, colecao.id, colecao.nome, item.qtd, valor);
        }
      }
    }
  }

  /* Conta um pedido sem montar ranking: serve para os 12 meses do ano e para o
     periodo anterior, que so precisam de totais. Respeita o filtro de colecao —
     um grafico que ignorasse a colecao contradiria os cartoes acima dele. */
  const resumir = (pedido: (typeof todos)[number]) => {
    const itens = Array.isArray(pedido.itens) ? (pedido.itens as unknown as ItemPedido[]) : [];

    const daColecao = (item: ItemPedido) => {
      if (!filtro.colecaoId) return true;
      const produto = item.slug ? produtos.get(item.slug) : undefined;
      const categoria = produto?.categoria_id ? categorias.get(produto.categoria_id) : undefined;
      return categoria?.catalogo_id === filtro.colecaoId;
    };

    if (filtro.colecaoId && !itens.some(daColecao)) return null;

    let principais = 0;
    let adicionaisQtd = 0;
    for (const item of itens) {
      if (!daColecao(item)) continue;
      if (adicional(categoriaDoItem(item))) adicionaisQtd += item.qtd;
      else principais += item.qtd;
    }

    return { principais, adicionais: adicionaisQtd, valor: Number(pedido.total ?? 0) };
  };

  const anoBase = Number(filtro.de.slice(0, 4));
  const serieMensal: MesDaSerie[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    pedidos: 0,
    principais: 0,
    adicionais: 0,
    valor: 0,
  }));

  // O grafico e "cestas por mes": producao, e e dele que sai a media que vira
  // meta. Por data de pagamento, a barra de agosto contaria trabalho de julho.
  for (const pedido of todos) {
    const dia = diaDaProducao(pedido);
    if (dia.slice(0, 4) !== String(anoBase)) continue;
    const resumo = resumir(pedido);
    if (!resumo) continue;
    const alvo = serieMensal[Number(dia.slice(5, 7)) - 1];
    if (!alvo) continue;
    alvo.pedidos += 1;
    alvo.principais += resumo.principais;
    alvo.adicionais += resumo.adicionais;
    alvo.valor += resumo.valor;
  }

  /* Periodo anterior. O cliente sempre manda mes cheio ou ano cheio, entao dá
     para devolver o mes/ano calendario anterior de verdade em vez de deslocar
     por dias — o que compararia fevereiro com "os 28 dias antes de fevereiro". */
  const mesCheio = filtro.de.endsWith("-01") && filtro.ate.slice(0, 7) === filtro.de.slice(0, 7);
  const anoCheio = filtro.de.endsWith("-01-01") && filtro.ate.endsWith("-12-31");

  let antDe = "";
  let antAte = "";
  let rotuloAnterior = "";

  if (anoCheio) {
    antDe = `${anoBase - 1}-01-01`;
    antAte = `${anoBase - 1}-12-31`;
    rotuloAnterior = String(anoBase - 1);
  } else if (mesCheio) {
    const mesBase = Number(filtro.de.slice(5, 7));
    const ano = mesBase === 1 ? anoBase - 1 : anoBase;
    const mes = mesBase === 1 ? 12 : mesBase - 1;
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const mm = String(mes).padStart(2, "0");
    antDe = `${ano}-${mm}-01`;
    antAte = `${ano}-${mm}-${ultimo}`;
    rotuloAnterior = `${NOMES_MES[mes - 1]}${ano !== anoBase ? `/${ano}` : ""}`;
  }

  let anterior: DashboardVendas["anterior"] = null;
  if (antDe) {
    let pedidosAnt = 0;
    let principaisAnt = 0;
    let valorAnt = 0;
    /* Compara o que os cartoes mostram: pedidos e valor sao caixa. As
       "principais" aqui alimentam a variacao do cartao de cestas, que e
       producao — por isso as duas datas convivem neste laco. */
    for (const pedido of todos) {
      const diaMoeda = diaDoDinheiro(pedido);
      const diaObra = diaDaProducao(pedido);
      const noCaixa = Boolean(diaMoeda) && diaMoeda >= antDe && diaMoeda <= antAte;
      const naObra = Boolean(diaObra) && diaObra >= antDe && diaObra <= antAte;
      if (!noCaixa && !naObra) continue;
      const resumo = resumir(pedido);
      if (!resumo) continue;
      if (noCaixa) {
        pedidosAnt += 1;
        valorAnt += resumo.valor;
      }
      if (naObra) principaisAnt += resumo.principais;
    }
    // Sem nada no periodo anterior nao ha comparacao: "+100%" sobre zero e
    // um numero que nao significa nada.
    if (pedidosAnt > 0) {
      anterior = { pedidos: pedidosAnt, principais: principaisAnt, valor: valorAnt };
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
    unidades: { principais: unidadesPrincipais, adicionais: unidadesAdicionais },
    serieMensal,
    anterior,
    rotuloAnterior,
    produtos: ordenar(porProduto),
    adicionais: ordenar(adicionais),
    porCategoria: ordenar(porCategoria).sort((a, b) => b.valor - a.valor),
    porColecao: ordenar(porColecao).sort((a, b) => b.valor - a.valor),
    porPagamento: ordenar(porPagamento).sort((a, b) => b.valor - a.valor),
    anexo: {
      comAdicional: pedidosComAdicional,
      semAdicional: pedidosSemAdicional,
      soAdicional: pedidosSoAdicional,
      taxa:
        pedidosComAdicional + pedidosSemAdicional
          ? pedidosComAdicional / (pedidosComAdicional + pedidosSemAdicional)
          : 0,
      ticketComAdicional: pedidosComAdicional ? valorComAdicional / pedidosComAdicional : 0,
      ticketSemAdicional: pedidosSemAdicional ? valorSemAdicional / pedidosSemAdicional : 0,
    },
    colecoes: [...catalogos.values()].map((catalogo) => ({
      id: catalogo.id,
      nome: catalogo.nome,
    })),
    /* So as ocasioes que existem no historico da empresa: um seletor com as
       dezenove do calendario encheria a tela de opcoes que devolvem nada. */
    ocasioes: [
      ...new Set(
        (pedidosRes.data ?? [])
          .map((p) => (p as { ocasiao?: string | null }).ocasiao)
          .filter((o): o is string => Boolean(o)),
      ),
    ].sort(),
    clientes,
  };

  return resultado;
}

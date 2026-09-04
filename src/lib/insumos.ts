"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";

export type UnidadeInsumo = "UN" | "KG" | "G" | "L" | "ML" | "CX" | "PCT";

export type FrequenciaCompra = "semanal" | "quinzenal" | "mensal" | "esporadica";

export type InsumoRow = {
  id: string;
  nome: string;
  unidade: UnidadeInsumo;
  quantidade_referencia: number;
  custo_referencia: number;
  ativo: boolean;
  categoria: string | null;
  tipo_embalagem: string | null;
  /** Preco pago na embalagem inteira — e assim que se compra. */
  preco_embalagem: number;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  frequencia_compra: FrequenciaCompra | null;
  observacao: string | null;
};

export type FornecedorOpcao = { id: string; nome: string };

export type CustoHistorico = {
  id: string;
  custo: number;
  qtd_embalagem: number | null;
  preco_pacote: number | null;
  registrado_em: string;
};

/** Tudo que a tela de cadastro precisa, numa ida so ao banco. */
export type CadastroInsumos = {
  insumos: InsumoRow[];
  fornecedores: FornecedorOpcao[];
  /** Valores ja usados, para sugerir sem virar tabela de tipos. */
  categorias: string[];
  embalagens: string[];
};

export type ProdutoInsumoInput = {
  insumoId: string;
  quantidade: number;
};

const unidadeSchema = z.enum(["UN", "KG", "G", "L", "ML", "CX", "PCT"]);

const frequenciaSchema = z.enum(["semanal", "quinzenal", "mensal", "esporadica"]);

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((valor) => (valor ? valor : null));

const insumoSchema = z
  .object({
    id: z.string().uuid().optional(),
    nome: z.string().trim().min(1, "Nome obrigatório").max(160),
    unidade: unidadeSchema,
    quantidade_referencia: z.number().positive(),
    /* A tela cadastra pelo preco da embalagem, que e como se compra: um pacote
       de 400 g por R$ 12,00. O unitario sai da divisao. `custo_referencia`
       continua aceito porque outras telas ja salvam pelo valor unitario. */
    preco_embalagem: z.number().nonnegative().optional(),
    custo_referencia: z.number().nonnegative().optional(),
    ativo: z.boolean().default(true),
    categoria: textoOpcional(60),
    tipo_embalagem: textoOpcional(40),
    fornecedor_id: z.string().uuid().nullish(),
    frequencia_compra: frequenciaSchema.nullish(),
    observacao: textoOpcional(500),
  })
  .refine(
    (valor) => valor.preco_embalagem !== undefined || valor.custo_referencia !== undefined,
    { message: "Informe o custo do insumo." },
  );

const idSchema = z.object({ id: z.string().uuid() });
const composicaoSchema = z.object({
  produtoId: z.string().uuid(),
  itens: z.array(
    z.object({
      insumoId: z.string().uuid(),
      quantidade: z.number().positive(),
    }),
  ),
});

type ActionInput<T> = { data: T };

const COLUNAS_INSUMO =
  "id, nome, unidade, qtd_embalagem, preco_pacote, custo, ativo, categoria, tipo_embalagem, fornecedor_id, frequencia_compra, observacao";

/* Delega para requireCompany de proposito.

   Estes tres arquivos montavam o cliente Supabase cru e nunca liam a
   assinatura. Como a trava do teste vencido vive no Proxy que requireCompany
   devolve, quem nao passava por ela continuava gravando depois do 7o dia:
   produto, categoria, colecao, foto, insumo, ficha tecnica e movimento de
   estoque. Onze acoes furando o paywall, em silencio — a falha nao aparece
   como erro, aparece como "funciona".

   O comentario de company-context.server.ts ja avisava: "bastava esquecer uma
   para o teste vencido continuar gravando por ali". Eram tres.

   O nome local fica porque as 29 chamadas ja o usam, e requireCompany devolve
   um superconjunto do que estas funcoes devolviam. */
async function contextoEmpresa() {
  return requireCompany();
}

function normalizarUnidade(unidade: string | null | undefined): UnidadeInsumo {
  const valor = (unidade ?? "UN").toUpperCase();
  return unidadeSchema.safeParse(valor).success ? (valor as UnidadeInsumo) : "UN";
}

type InsumoDb = {
  id: string;
  nome: string;
  unidade: string | null;
  qtd_embalagem: number | string | null;
  preco_pacote: number | string | null;
  custo: number | string | null;
  ativo: boolean | null;
  categoria: string | null;
  tipo_embalagem: string | null;
  fornecedor_id: string | null;
  frequencia_compra: FrequenciaCompra | null;
  observacao: string | null;
};

function paraInsumoRow(item: InsumoDb, nomePorFornecedor?: Map<string, string>): InsumoRow {
  const quantidade = Number(item.qtd_embalagem ?? 1) || 1;
  const custo = Number(item.custo ?? 0);
  return {
    id: item.id,
    nome: item.nome,
    unidade: normalizarUnidade(item.unidade),
    quantidade_referencia: quantidade,
    custo_referencia: custo,
    ativo: item.ativo !== false,
    categoria: item.categoria ?? null,
    tipo_embalagem: item.tipo_embalagem ?? null,
    // Embalagens antigas nao tinham preco proprio: reconstroi pelo unitario.
    preco_embalagem: Number(item.preco_pacote ?? 0) || quantidade * custo,
    fornecedor_id: item.fornecedor_id ?? null,
    fornecedor_nome: item.fornecedor_id
      ? (nomePorFornecedor?.get(item.fornecedor_id) ?? null)
      : null,
    frequencia_compra: item.frequencia_compra ?? null,
    observacao: item.observacao ?? null,
  };
}

export async function listarInsumos(): Promise<InsumoRow[]> {
  const { supabase, companyId } = await contextoEmpresa();
  const { data, error } = await supabase
    .from("insumos")
    .select(COLUNAS_INSUMO)
    .eq("company_id", companyId)
    .order("nome");

  if (error) throw error;
  return (data ?? []).map((item) => paraInsumoRow(item));
}

/**
 * Carga da tela de cadastro: insumos, fornecedores para o seletor e os valores
 * ja digitados em categoria e tipo de embalagem, que viram sugestoes.
 *
 * Sugestao em vez de tabela de tipos: sao rotulos que ninguem filtra em
 * relatorio, entao mais uma tabela seria manutencao sem ganho.
 */
export async function carregarCadastroInsumos(): Promise<CadastroInsumos> {
  const { supabase, companyId } = await contextoEmpresa();

  const [insumosRes, fornecedoresRes] = await Promise.all([
    supabase.from("insumos").select(COLUNAS_INSUMO).eq("company_id", companyId).order("nome"),
    supabase
      .from("fornecedores")
      .select("id, nome")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("nome"),
  ]);

  if (insumosRes.error) throw insumosRes.error;
  if (fornecedoresRes.error) throw fornecedoresRes.error;

  const fornecedores = (fornecedoresRes.data ?? []) as FornecedorOpcao[];
  const nomePorFornecedor = new Map(fornecedores.map((f) => [f.id, f.nome]));
  const insumos = (insumosRes.data ?? []).map((item) => paraInsumoRow(item, nomePorFornecedor));

  const distintos = (valores: (string | null)[]) =>
    Array.from(new Set(valores.filter((v): v is string => Boolean(v && v.trim())))).sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );

  return {
    insumos,
    fornecedores,
    categorias: distintos(insumos.map((i) => i.categoria)),
    embalagens: distintos(insumos.map((i) => i.tipo_embalagem)),
  };
}

/** Historico de preco do insumo. Gravado por trigger, nunca pela tela. */
export async function historicoCustoInsumo(input: ActionInput<unknown>): Promise<CustoHistorico[]> {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { data, error } = await supabase
    .from("insumo_custo_historico")
    .select("id, custo, qtd_embalagem, preco_pacote, registrado_em")
    .eq("company_id", companyId)
    .eq("insumo_id", id)
    .order("registrado_em", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw error;
  return (data ?? []).map((linha) => ({
    id: linha.id,
    custo: Number(linha.custo ?? 0),
    qtd_embalagem: linha.qtd_embalagem === null ? null : Number(linha.qtd_embalagem),
    preco_pacote: linha.preco_pacote === null ? null : Number(linha.preco_pacote),
    registrado_em: linha.registrado_em,
  }));
}

export async function salvarInsumo(input: ActionInput<unknown>) {
  const data = insumoSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  /* Quem manda e o preco da embalagem, quando ele vem: e o numero que esta na
     nota. O unitario e derivado. Quando so vem o unitario (telas antigas), a
     conta corre no sentido inverso, como antes. */
  const quantidade = data.quantidade_referencia;
  const custoUnitario =
    data.preco_embalagem !== undefined
      ? Math.round((data.preco_embalagem / quantidade) * 10000) / 10000
      : (data.custo_referencia ?? 0);
  const precoEmbalagem =
    data.preco_embalagem !== undefined ? data.preco_embalagem : quantidade * custoUnitario;

  const row = {
    company_id: companyId,
    nome: data.nome,
    unidade: data.unidade,
    qtd_embalagem: quantidade,
    preco_pacote: precoEmbalagem,
    custo: custoUnitario,
    ativo: data.ativo,
    categoria: data.categoria ?? null,
    tipo_embalagem: data.tipo_embalagem ?? null,
    fornecedor_id: data.fornecedor_id ?? null,
    frequencia_compra: data.frequencia_compra ?? null,
    observacao: data.observacao ?? null,
    updated_at: new Date().toISOString(),
  };

  if (data.id) {
    const { data: atualizado, error } = await supabase
      .from("insumos")
      .update(row)
      .eq("id", data.id)
      .eq("company_id", companyId)
      .select(COLUNAS_INSUMO)
      .single();
    if (error) throw error;
    return atualizado;
  }

  const { data: criado, error } = await supabase
    .from("insumos")
    .insert(row)
    .select(COLUNAS_INSUMO)
    .single();
  if (error) throw error;
  return criado;
}

export async function removerInsumo(input: ActionInput<unknown>) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { count, error: usoError } = await supabase
    .from("produto_insumos")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("insumo_id", id);
  if (usoError) throw usoError;
  if ((count ?? 0) > 0) {
    return {
      ok: false as const,
      motivo:
        "Este insumo está sendo usado em um ou mais produtos. Remova-o da composição dos produtos antes de excluir.",
    };
  }

  /* Movimento de estoque cai por cascade junto com o insumo. Sem esta
     checagem, excluir o cadastro apagava toda entrada, baixa e contagem
     daquele insumo — em silencio e sem volta. A pessoa limpava a lista de um
     insumo que parou de usar e perdia o registro de quanto comprou, quando e
     por quanto; o "Parado em estoque" mudava de valor sem explicacao.

     Mesma forma da checagem de produto_insumos acima: contar antes e devolver
     motivo, em vez de confiar que ela sabe o que o cascade faz. */
  const { count: movimentos, error: histError } = await supabase
    .from("estoque_movimentos")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("insumo_id", id);
  if (histError) throw histError;

  if ((movimentos ?? 0) > 0) {
    return {
      ok: false as const,
      motivo:
        `Este insumo tem ${movimentos} movimento(s) de estoque no histórico, e excluir apagaria todos. ` +
        "Se você só parou de comprá-lo, desligue-o do controle de estoque em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("insumos")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true as const };
}

export async function salvarComposicaoProduto(input: ActionInput<unknown>) {
  const data = composicaoSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { data: produto, error: produtoError } = await supabase
    .from("produtos")
    .select("id")
    .eq("id", data.produtoId)
    .eq("company_id", companyId)
    .single();
  if (produtoError || !produto) throw produtoError ?? new Error("Produto não encontrado.");

  const selecionados = data.itens.map((item) => item.insumoId);

  if (data.itens.length > 0) {
    const { error: upsertError } = await supabase
      .from("produto_insumos")
      .upsert(
        data.itens.map((item, index) => ({
          company_id: companyId,
          produto_id: data.produtoId,
          insumo_id: item.insumoId,
          quantidade: item.quantidade,
          ordem: index,
        })),
        { onConflict: "company_id,produto_id,insumo_id" },
      );
    if (upsertError) throw upsertError;
  }

  let removerQuery = supabase
    .from("produto_insumos")
    .delete()
    .eq("company_id", companyId)
    .eq("produto_id", data.produtoId);

  if (selecionados.length > 0) {
    removerQuery = removerQuery.not("insumo_id", "in", `(${selecionados.join(",")})`);
  }

  const { error: removerError } = await removerQuery;
  if (removerError) throw removerError;

  return { ok: true };
}

export async function listarComposicaoProduto(input: ActionInput<unknown>) {
  const { id: produtoId } = idSchema.parse(input.data);
  const { supabase, companyId } = await contextoEmpresa();

  const { data, error } = await supabase
    .from("produto_insumos")
    .select("id, insumo_id, quantidade, ordem, insumos!inner(id, nome, unidade, qtd_embalagem, preco_pacote, custo, ativo)")
    .eq("company_id", companyId)
    .eq("produto_id", produtoId)
    .order("ordem");

  if (error) throw error;
  return data ?? [];
}

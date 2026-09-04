"use server";

import { z } from "zod";

import { slugify } from "@/lib/admin-ops.server";
import { requireCompany } from "@/lib/company-context.server";

/**
 * Simulador: rascunho de cesta.
 *
 * Nada do que se monta aqui existe no sistema até você mandar. A simulação
 * mistura insumo cadastrado (custo vem do cadastro, sempre atual) com item
 * avulso digitado (valor congelado).
 *
 * "Virar produto" só funciona quando TODO item já é insumo cadastrado. Produto
 * com composição pela metade não parece errado — o custo sai baixo, a margem
 * sai alta, e isso vai direto para o relatório de Margem sem nada indicando
 * que falta. Por isso o caminho é: cadastrar os avulsos primeiro.
 */

export type ItemSimulacao = {
  id: string;
  insumo_id: string | null;
  descricao: string;
  quantidade: number;
  /** Avulso: o valor digitado. Cadastrado: o custo de hoje. */
  valor_unitario: number;
  unidade: string | null;
  /** true = ainda não é insumo cadastrado; é o que trava o "Virar produto". */
  avulso: boolean;
};

export type Simulacao = {
  id: string;
  nome: string;
  colecao: string | null;
  preco: number | null;
  margem_alvo: number | null;
  observacao: string | null;
  /** Minutos de montagem, para a mão de obra entrar na conta. */
  tempo_montagem_min: number | null;
  produto_id: string | null;
  virou_produto_em: string | null;
  itens: ItemSimulacao[];
  custo_total: number;
  avulsos: number;
};

type ActionInput<T> = { data: T };

const simulacaoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Dê um nome à simulação.").max(160),
  colecao: z.string().trim().max(80).nullish().transform((v) => (v ? v : null)),
  preco: z.number().nonnegative().nullish(),
  margem_alvo: z.number().min(0).max(0.99).nullish(),
  observacao: z.string().trim().max(500).nullish().transform((v) => (v ? v : null)),
  tempo_montagem_min: z.number().int().min(0).max(6000).nullish(),
  itens: z
    .array(
      z.object({
        insumo_id: z.string().uuid().nullish(),
        descricao: z.string().trim().min(1, "Todo item precisa de nome.").max(160),
        quantidade: z.number().positive(),
        valor_unitario: z.number().nonnegative(),
      }),
    )
    .max(120, "No máximo 120 itens por simulação."),
});

export async function carregarSimulacoes(): Promise<Simulacao[]> {
  const { supabase, companyId } = await requireCompany();

  const [simRes, itensRes, insumosRes] = await Promise.all([
    supabase
      .from("simulacoes")
      .select("id, nome, colecao, preco, margem_alvo, observacao, tempo_montagem_min, produto_id, virou_produto_em")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("simulacao_itens")
      .select("id, simulacao_id, insumo_id, descricao, quantidade, valor_unitario, ordem")
      .eq("company_id", companyId)
      .order("ordem"),
    supabase
      .from("insumos")
      .select("id, nome, unidade, custo")
      .eq("company_id", companyId)
      .limit(20000),
  ]);

  if (simRes.error) throw simRes.error;
  if (itensRes.error) throw itensRes.error;
  if (insumosRes.error) throw insumosRes.error;

  const insumos = new Map(
    (insumosRes.data ?? []).map((i) => [
      i.id as string,
      { nome: i.nome as string, unidade: (i.unidade as string) ?? "UN", custo: Number(i.custo ?? 0) },
    ]),
  );

  const porSimulacao = new Map<string, ItemSimulacao[]>();
  for (const linha of itensRes.data ?? []) {
    const insumoId = (linha.insumo_id as string | null) ?? null;
    const doCadastro = insumoId ? insumos.get(insumoId) : undefined;

    const lista = porSimulacao.get(linha.simulacao_id as string) ?? [];
    lista.push({
      id: linha.id as string,
      insumo_id: insumoId,
      // O nome do cadastro manda quando existe: se o insumo foi renomeado, o
      // rascunho acompanha em vez de mostrar o nome velho.
      descricao: doCadastro?.nome ?? (linha.descricao as string),
      quantidade: Number(linha.quantidade ?? 0),
      // Cadastrado usa o custo de hoje; o valor gravado é só reserva para o
      // caso de o insumo ter sido apagado.
      valor_unitario: doCadastro ? doCadastro.custo : Number(linha.valor_unitario ?? 0),
      unidade: doCadastro?.unidade ?? null,
      avulso: !doCadastro,
    });
    porSimulacao.set(linha.simulacao_id as string, lista);
  }

  return (simRes.data ?? []).map((s) => {
    const itens = porSimulacao.get(s.id as string) ?? [];
    return {
      id: s.id as string,
      nome: s.nome as string,
      colecao: (s.colecao as string | null) ?? null,
      preco: s.preco == null ? null : Number(s.preco),
      margem_alvo: s.margem_alvo == null ? null : Number(s.margem_alvo),
      observacao: (s.observacao as string | null) ?? null,
      tempo_montagem_min:
        s.tempo_montagem_min == null ? null : Number(s.tempo_montagem_min),
      produto_id: (s.produto_id as string | null) ?? null,
      virou_produto_em: (s.virou_produto_em as string | null) ?? null,
      itens,
      custo_total: itens.reduce((soma, i) => soma + i.quantidade * i.valor_unitario, 0),
      avulsos: itens.filter((i) => i.avulso).length,
    };
  });
}

/* Erro ESPERADO volta no retorno, nao lancado.

   Em producao o React descarta a mensagem de um Error lancado dentro de
   arquivo "use server": so um digest chega ao navegador e a pessoa le
   "Minified React error #441" no lugar da frase escrita para ela. Toda
   mensagem em portugues deste arquivo passa a viajar pelo retorno; falha de
   rede e erro cru do banco continuam sendo lancados, porque para esses o texto
   generico ja serve e nao ha o que a pessoa faca.

   Mesmo remedio ja aplicado em salvarCliente (pedidos.ts) e em usuarios.ts. */
export async function salvarSimulacao(input: ActionInput<unknown>) {
  const data = simulacaoSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const cabecalho = {
    company_id: companyId,
    nome: data.nome,
    colecao: data.colecao,
    preco: data.preco ?? null,
    margem_alvo: data.margem_alvo ?? null,
    observacao: data.observacao,
    tempo_montagem_min: data.tempo_montagem_min ?? null,
    updated_at: new Date().toISOString(),
  };

  let simulacaoId = data.id;

  if (simulacaoId) {
    const { error } = await supabase
      .from("simulacoes")
      .update(cabecalho)
      .eq("id", simulacaoId)
      .eq("company_id", companyId);
    if (error) throw error;
  } else {
    const { data: criada, error } = await supabase
      .from("simulacoes")
      .insert(cabecalho)
      .select("id")
      .single();
    if (error) throw error;
    // Insert que volta sem linha: e o unico caso aqui em que existe frase
    // propria para mostrar, entao ela vai no retorno.
    if (!criada) return { id: null, erro: "Não consegui criar a simulação." };
    simulacaoId = criada.id as string;
  }

  const { error: limpaError } = await supabase
    .from("simulacao_itens")
    .delete()
    .eq("company_id", companyId)
    .eq("simulacao_id", simulacaoId);
  if (limpaError) throw limpaError;

  if (data.itens.length > 0) {
    const { error: insError } = await supabase.from("simulacao_itens").insert(
      data.itens.map((i, ordem) => ({
        company_id: companyId,
        simulacao_id: simulacaoId,
        insumo_id: i.insumo_id ?? null,
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        ordem,
      })),
    );
    if (insError) throw insError;
  }

  return { id: simulacaoId, erro: null };
}

export async function removerSimulacao(input: ActionInput<unknown>) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("simulacoes")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  if (error) throw error;

  return { ok: true as const };
}

/**
 * Cria insumos a partir dos itens avulsos e liga a simulação a eles.
 *
 * O avulso já tem nome e valor — que é exatamente um insumo de embalagem 1.
 * Nada é digitado de novo.
 */
export async function cadastrarAvulsos(input: ActionInput<unknown>) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data: itens, error } = await supabase
    .from("simulacao_itens")
    .select("id, insumo_id, descricao, valor_unitario")
    .eq("company_id", companyId)
    .eq("simulacao_id", id)
    .is("insumo_id", null);
  if (error) throw error;
  if (!itens?.length) return { criados: 0, reaproveitados: 0, erro: null };

  // Insumo com o mesmo nome já cadastrado é reaproveitado, não duplicado.
  const { data: existentes, error: exError } = await supabase
    .from("insumos")
    .select("id, nome")
    .eq("company_id", companyId)
    .limit(20000);
  if (exError) throw exError;

  const chave = (t: string) =>
    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const porNome = new Map((existentes ?? []).map((i) => [chave(i.nome as string), i.id as string]));

  let criados = 0;
  let reaproveitados = 0;

  for (const item of itens) {
    const nome = (item.descricao as string).trim();
    let insumoId = porNome.get(chave(nome));

    if (insumoId) {
      reaproveitados += 1;
    } else {
      const valor = Number(item.valor_unitario ?? 0);
      const { data: criado, error: insError } = await supabase
        .from("insumos")
        .insert({
          company_id: companyId,
          nome,
          unidade: "UN",
          qtd_embalagem: 1,
          preco_pacote: valor,
          custo: valor,
          ativo: true,
          observacao: "Criado a partir de uma simulação",
        })
        .select("id")
        .single();
      if (insError) throw insError;
      /* Devolvido com a conta parcial de proposito: o laco ja cadastrou alguns
         itens antes de parar, e a pessoa precisa saber ONDE parou para nao
         mandar tudo de novo. Lancado, o nome do item sumiria no digest. */
      if (!criado) {
        return { criados, reaproveitados, erro: `Não consegui cadastrar "${nome}".` };
      }
      insumoId = criado.id as string;
      porNome.set(chave(nome), insumoId);
      criados += 1;
    }

    const { error: ligaError } = await supabase
      .from("simulacao_itens")
      .update({ insumo_id: insumoId })
      .eq("id", item.id as string)
      .eq("company_id", companyId);
    if (ligaError) throw ligaError;
  }

  return { criados, reaproveitados, erro: null };
}

/** Promove a simulação a produto. Exige que todo item já seja insumo. */
export async function virarProduto(input: ActionInput<unknown>) {
  const { id, categoriaId } = z
    .object({ id: z.string().uuid(), categoriaId: z.string().uuid().nullish() })
    .parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { data: simulacao, error } = await supabase
    .from("simulacoes")
    .select("id, nome, preco, tempo_montagem_min, produto_id")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  /* Falha real do banco primeiro, para nao ser confundida com "sumiu": so
     depois trata a ausencia da linha. PGRST116 e o codigo do PostgREST para
     single() que nao achou nada — nesse caso a linha vem nula e o erro nao e
     de infraestrutura. Nao encontrada e ESPERADO: a simulacao pode ter sido
     excluida em outra aba enquanto este dialogo estava aberto. */
  if (error && error.code !== "PGRST116") throw error;
  if (!simulacao) {
    return { produtoId: null, itens: 0, erro: "Simulação não encontrada." };
  }

  /* As tres recusas abaixo sao o motivo de esta funcao existir: cada uma diz o
     que fazer antes de tentar de novo. Lancadas, viravam digest em producao e
     o botao "Virar produto" so falhava sem explicar nada. */
  if (simulacao.produto_id) {
    return { produtoId: null, itens: 0, erro: "Essa simulação já virou produto." };
  }

  const { data: itens, error: itensError } = await supabase
    .from("simulacao_itens")
    .select("insumo_id, quantidade, descricao")
    .eq("company_id", companyId)
    .eq("simulacao_id", id);
  if (itensError) throw itensError;
  if (!itens?.length) {
    return { produtoId: null, itens: 0, erro: "A simulação está sem itens." };
  }

  const semInsumo = itens.filter((i) => !i.insumo_id);
  if (semInsumo.length > 0) {
    return {
      produtoId: null,
      itens: 0,
      erro: `Ainda tem ${semInsumo.length} item(ns) sem insumo cadastrado: ${semInsumo
        .map((i) => i.descricao as string)
        .join(", ")}.`,
    };
  }

  // Slug único: o banco recusa repetido e a tela de produto não trata colisão.
  const { data: produtos, error: prodError } = await supabase
    .from("produtos")
    .select("slug, ordem, categoria_id")
    .eq("company_id", companyId)
    .limit(20000);
  if (prodError) throw prodError;

  const slugs = new Set((produtos ?? []).map((p) => p.slug as string).filter(Boolean));
  const base = slugify(simulacao.nome as string).slice(0, 76) || "produto";
  let slug = base;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${base}-${n}`;

  const ordem =
    (produtos ?? [])
      .filter((p) => (p.categoria_id ?? null) === (categoriaId ?? null))
      .reduce((max, p) => Math.max(max, Number(p.ordem) || 0), -1) + 1;

  const { data: produto, error: criarError } = await supabase
    .from("produtos")
    .insert({
      company_id: companyId,
      nome: simulacao.nome,
      slug,
      categoria_id: categoriaId ?? null,
      preco: simulacao.preco,
      // Herda o tempo: sem isso o preço simulado sai por uma conta e o
      // produto criado por outra.
      tempo_montagem_min: simulacao.tempo_montagem_min ?? null,
      preco_label: null,
      serve: null,
      itens: [],
      precos_extra: [],
      observacao: null,
      ativo: true,
      ordem,
      badge: null,
      badge_cor: null,
      rascunho: false,
    })
    .select("id")
    .single();
  if (criarError) throw criarError;
  // Insert sem linha de volta: unica frase propria daqui para baixo.
  if (!produto) {
    return { produtoId: null, itens: 0, erro: "Não consegui criar o produto." };
  }

  const { error: compError } = await supabase.from("produto_insumos").upsert(
    itens.map((item, ordemItem) => ({
      company_id: companyId,
      produto_id: produto.id as string,
      insumo_id: item.insumo_id as string,
      quantidade: Number(item.quantidade ?? 0),
      ordem: ordemItem,
    })),
    { onConflict: "company_id,produto_id,insumo_id" },
  );
  if (compError) throw compError;

  const { error: marcarError } = await supabase
    .from("simulacoes")
    .update({ produto_id: produto.id as string, virou_produto_em: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);
  if (marcarError) throw marcarError;

  return { produtoId: produto.id as string, itens: itens.length, erro: null };
}

"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import { hojeISO } from "@/lib/prazo";

const DATA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Quantos meses à frente a geração mantém as contas mensais criadas. */
const MESES_A_FRENTE = 3;

export type ContaAPagar = {
  id: string;
  grupo_id: string;
  descricao: string;
  fornecedor: string | null;
  tipo_despesa_id: string | null;
  tipo_despesa: string | null;
  valor: number;
  vencimento: string;
  parcela: number;
  parcelas: number;
  recorrencia: "unica" | "mensal";
  pago_em: string | null;
  movimento_id: string | null;
  observacao: string | null;
};

/** Soma meses preservando o fim de mês: 31/01 + 1 mês vira 28/02, não 03/03. */
function somarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  const ultimoDia = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const diaFinal = Math.min(dia, ultimoDia);
  return `${alvo.getUTCFullYear()}-${String(alvo.getUTCMonth() + 1).padStart(2, "0")}-${String(
    diaFinal,
  ).padStart(2, "0")}`;
}

/**
 * Cria as parcelas que faltam das contas mensais.
 *
 * Geração sob demanda, em vez de agendador: roda quando a tela abre. Se
 * ninguém abrir, nada é gerado — e ninguém veria de qualquer jeito. O dia em
 * que existir aviso chegando de fora do sistema, aí sim precisa de cron.
 */
async function gerarRecorrentes(
  supabase: Awaited<ReturnType<typeof requireCompany>>["supabase"],
  companyId: string,
) {
  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select(
      "grupo_id, descricao, fornecedor, tipo_despesa_id, valor, vencimento, observacao",
    )
    .eq("company_id", companyId)
    .eq("recorrencia", "mensal")
    /* Sem isto o grupo se regenera de si mesmo: apagar as parcelas abertas
       deixa a paga como a mais recente, e ela vira o modelo da proxima. */
    .is("encerrado_em", null)
    .order("vencimento", { ascending: false });

  if (error || !data?.length) return;

  // A linha mais recente de cada grupo é o modelo da próxima.
  const ultimaPorGrupo = new Map<string, (typeof data)[number]>();
  for (const linha of data) {
    if (!ultimaPorGrupo.has(linha.grupo_id)) ultimaPorGrupo.set(linha.grupo_id, linha);
  }

  const limite = somarMeses(hojeISO(), MESES_A_FRENTE);
  const novas: Record<string, unknown>[] = [];

  for (const modelo of ultimaPorGrupo.values()) {
    let proximo = somarMeses(modelo.vencimento, 1);
    // Trava de segurança: no máximo doze por grupo por rodada, para uma conta
    // antiga esquecida não gerar anos de parcelas de uma vez.
    for (let i = 0; proximo <= limite && i < 12; i += 1) {
      novas.push({
        company_id: companyId,
        grupo_id: modelo.grupo_id,
        descricao: modelo.descricao,
        fornecedor: modelo.fornecedor,
        tipo_despesa_id: modelo.tipo_despesa_id,
        valor: modelo.valor,
        vencimento: proximo,
        recorrencia: "mensal",
        observacao: modelo.observacao,
      });
      proximo = somarMeses(proximo, 1);
    }
  }

  if (novas.length) await supabase.from("contas_a_pagar").insert(novas);
}

export async function carregarContasAPagar(input: { data: unknown }) {
  const { de, ate } = z.object({ de: DATA, ate: DATA }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  await gerarRecorrentes(supabase, companyId);

  const [contasRes, tiposRes] = await Promise.all([
    supabase
      .from("contas_a_pagar")
      .select(
        "id, grupo_id, descricao, fornecedor, tipo_despesa_id, valor, vencimento, parcela, parcelas, recorrencia, pago_em, movimento_id, observacao",
      )
      .eq("company_id", companyId)
      .gte("vencimento", de)
      .lte("vencimento", ate)
      .order("vencimento", { ascending: true })
      .limit(1000),
    supabase
      .from("tipos_despesa")
      .select("id, nome")
      .eq("company_id", companyId)
      .order("nome"),
  ]);

  if (contasRes.error) throw contasRes.error;
  if (tiposRes.error) throw tiposRes.error;

  const nomePorTipo = new Map((tiposRes.data ?? []).map((t) => [t.id, t.nome]));

  const contas: ContaAPagar[] = (contasRes.data ?? []).map((c) => ({
    ...(c as unknown as ContaAPagar),
    valor: Number(c.valor ?? 0),
    tipo_despesa: c.tipo_despesa_id ? (nomePorTipo.get(c.tipo_despesa_id) ?? null) : null,
  }));

  // Em aberto, de qualquer período: é o compromisso total, não o do recorte.
  const { data: abertas } = await supabase
    .from("contas_a_pagar")
    .select("valor")
    .eq("company_id", companyId)
    .is("pago_em", null)
    .limit(5000);

  return {
    contas,
    tiposDespesa: tiposRes.data ?? [],
    totalEmAberto: (abertas ?? []).reduce((t, c) => t + Number(c.valor ?? 0), 0),
  };
}

const novaContaSchema = z.object({
  descricao: z.string().trim().min(1).max(200),
  fornecedor: z.string().trim().max(120).nullable().default(null),
  tipo_despesa_id: z.string().uuid().nullable().default(null),
  valor: z.number().positive().max(1_000_000),
  vencimento: DATA,
  /** Quantas parcelas gerar. 1 = conta única. Ignorado quando mensal. */
  parcelas: z.number().int().min(1).max(60).default(1),
  recorrencia: z.enum(["unica", "mensal"]).default("unica"),
  observacao: z.string().trim().max(500).nullable().default(null),
});

export async function criarContaAPagar(input: { data: unknown }) {
  const dados = novaContaSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const grupoId = crypto.randomUUID();

  // Mensal nasce com MESES_A_FRENTE parcelas; a geração sob demanda cuida do
  // resto. Parcelada nasce inteira, porque o total é conhecido desde já.
  const quantas = dados.recorrencia === "mensal" ? MESES_A_FRENTE + 1 : dados.parcelas;

  const linhas = Array.from({ length: quantas }, (_, i) => ({
    company_id: companyId,
    grupo_id: grupoId,
    descricao: dados.descricao,
    fornecedor: dados.fornecedor,
    tipo_despesa_id: dados.tipo_despesa_id,
    valor: dados.valor,
    vencimento: somarMeses(dados.vencimento, i),
    parcela: dados.recorrencia === "mensal" ? 1 : i + 1,
    parcelas: dados.recorrencia === "mensal" ? 1 : dados.parcelas,
    recorrencia: dados.recorrencia,
    observacao: dados.observacao,
  }));

  const { error } = await supabase.from("contas_a_pagar").insert(linhas);
  if (error) throw error;
  return { ok: true as const, parcelas: linhas.length };
}

export async function editarContaAPagar(input: { data: unknown }) {
  const dados = z
    .object({
      id: z.string().uuid(),
      descricao: z.string().trim().min(1).max(200),
      fornecedor: z.string().trim().max(120).nullable().default(null),
      tipo_despesa_id: z.string().uuid().nullable().default(null),
      valor: z.number().positive().max(1_000_000),
      vencimento: DATA,
      observacao: z.string().trim().max(500).nullable().default(null),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();
  const { id, ...campos } = dados;

  const { error } = await supabase
    .from("contas_a_pagar")
    .update(campos)
    .eq("id", id)
    .eq("company_id", companyId)
    .is("pago_em", null);

  if (error) throw error;
  return { ok: true as const };
}

/**
 * Paga a conta: nasce o movimento e a conta guarda o elo.
 *
 * O valor pago mora no movimento e pode divergir do previsto (juros, desconto).
 * A data do caixa é o dia do pagamento, não o vencimento: pagar em setembro um
 * boleto vencido em agosto tira o dinheiro em setembro, que é quando saiu.
 */
export async function pagarContaAPagar(input: { data: unknown }) {
  const dados = z
    .object({
      id: z.string().uuid(),
      data: DATA,
      valor: z.number().positive().max(1_000_000),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { data: conta, error: buscaErro } = await supabase
    .from("contas_a_pagar")
    .select("descricao, fornecedor, tipo_despesa_id, pago_em")
    .eq("id", dados.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (buscaErro) throw buscaErro;

  /* Erro ESPERADO volta no retorno, nao lanca.

     Em producao o React descarta a mensagem de um Error lancado dentro de um
     arquivo "use server" e manda so um digest — "Esta conta ja foi paga."
     morria no servidor e a tela mostrava um codigo. A pessoa clicava em
     "Paguei" de novo sem descobrir que o pagamento ja tinha entrado.

     Sao os dois casos em que ela pode agir: atualizar a lista, ou parar de
     tentar. Falha de infraestrutura (os throws acima e abaixo) continua
     lancada: para essa o texto generico serve e nao ha o que fazer.
     Mesmo remedio ja aplicado em salvarComposicaoProduto (insumos.ts). */
  if (!conta) {
    return {
      ok: false as const,
      erro: "Conta não encontrada. Atualize a lista e tente de novo.",
    };
  }
  if (conta.pago_em) {
    return { ok: false as const, erro: "Esta conta já foi paga." };
  }

  const { data: movimento, error: movErro } = await supabase
    .from("movimentos")
    .insert({
      company_id: companyId,
      tipo: "saida",
      data: dados.data,
      valor: dados.valor,
      descricao: conta.descricao,
      fornecedor: conta.fornecedor,
      tipo_despesa_id: conta.tipo_despesa_id,
    })
    .select("id")
    .single();

  if (movErro) throw movErro;

  const { error } = await supabase
    .from("contas_a_pagar")
    .update({ pago_em: dados.data, movimento_id: movimento.id })
    .eq("id", dados.id)
    .eq("company_id", companyId);

  if (error) throw error;
  // erro: null tambem no sucesso — sem o campo nos dois lados, quem chama nao le.
  return { ok: true as const, erro: null };
}

export async function excluirContaAPagar(input: { data: unknown }) {
  const { id, grupo } = z
    .object({ id: z.string().uuid(), grupo: z.boolean().default(false) })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  if (!grupo) {
    const { error } = await supabase
      .from("contas_a_pagar")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)
      .is("pago_em", null);
    if (error) throw error;
    return { ok: true as const };
  }

  // Encerrar a recorrência: some o que ainda não foi pago do grupo. O que já
  // virou movimento fica, porque é histórico de caixa.
  const { data: alvo } = await supabase
    .from("contas_a_pagar")
    .select("grupo_id")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!alvo) return { ok: true as const };

  /* Carimba ANTES de apagar. Se a ordem fosse a inversa e a segunda escrita
     falhasse, as abertas teriam sumido e o grupo continuaria vivo — voltaria a
     gerar tudo na proxima abertura, que e exatamente o defeito de origem.
     Carimbando primeiro, uma falha no delete deixa o grupo parado, que e o
     resultado que a pessoa pediu. */
  const { error: erroCarimbo } = await supabase
    .from("contas_a_pagar")
    .update({ encerrado_em: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("grupo_id", alvo.grupo_id)
    .is("encerrado_em", null);

  if (erroCarimbo) throw erroCarimbo;

  // As pagas ficam: viraram movimento e sao historico de caixa.
  const { error } = await supabase
    .from("contas_a_pagar")
    .delete()
    .eq("company_id", companyId)
    .eq("grupo_id", alvo.grupo_id)
    .is("pago_em", null);

  if (error) throw error;
  return { ok: true as const };
}

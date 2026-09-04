"use server";

import { z } from "zod";

import { getConfig, setConfig } from "@/lib/admin-ops.server";
import { requireCompany } from "@/lib/company-context.server";
import { ocasiaoSugerida } from "@/lib/datas-comemorativas";
import { hojeISO } from "@/lib/prazo";
import { MODELOS_PADRAO, type ModelosRelacionamento } from "@/lib/relacionamento-mensagem";
import type { ItemPedido } from "@/lib/vendas";

/**
 * Quem comprou e sumiu.
 *
 * O Follow-up já existe e trabalha no eixo oposto: ele olha ENTREGAS RECENTES
 * para pedir avaliação. Aqui a pergunta é o silêncio — faz quanto tempo que
 * essa cliente não aparece. São perguntas contrárias e por isso duas telas:
 * juntá-las obrigaria uma lista a responder as duas ao mesmo tempo.
 *
 * O agrupamento é por `cliente_id`, e não pelos dígitos do WhatsApp como o
 * Follow-up faz. O número quebra quando a pessoa troca de linha ou alguém
 * digita com o 9 a mais; o id não. Pedido sem cliente cadastrado fica de fora,
 * o que é correto: sem cadastro não há relacionamento para retomar.
 */

/** Teto das duas consultas. Mesmo valor que o Follow-up usa. */
const TETO = 5000;

/** Pedido em aberto: ela ainda vai receber. Não é hora de chamar de volta. */
const EM_ABERTO = new Set(["novo", "producao", "pronto"]);

export type ClienteParado = {
  id: string;
  nome: string;
  whatsapp: string | null;
  /** Dias desde a última compra concluída. */
  diasParado: number;
  ultimaCompraEm: string;
  compras: number;
  totalGasto: number;
  /** O que ela mais leva, somando quantidades. Null quando não dá para dizer. */
  produtoFrequente: string | null;
  /** Tem pedido a caminho. Não é hora de chamar de volta. */
  temPedidoAberto: boolean;
  /** Quando foi chamada pela última vez. Null = nunca. */
  contatadoEm: string | null;
  /** Chamada hoje: o "desfazer" ainda vale. */
  chamadaHoje: boolean;
  /** Dias das compras concluídas, para o filtro por período. */
  datas: string[];
  /** Ocasiões em que ela já comprou, para o filtro por ocasião. */
  ocasioes: string[];
  /* A última compra COM ocasião. É o que a mensagem "repetir o presente"
     precisa — sem ela, a terceira opção do botão Chamar seria inventada, e por
     isso ela só aparece para quem tem esta compra. */
  ultimaOcasiao: {
    slug: string;
    produto: string | null;
    destinatario: string | null;
    ano: number;
    dia: string;
  } | null;
};

type PedidoLinha = {
  cliente_id: string | null;
  status: string | null;
  data_entrega: string | null;
  entregue_em: string | null;
  created_at: string | null;
  total: number | null;
  itens: ItemPedido[] | null;
  ocasiao: string | null;
  destinatario_nome: string | null;
};

/**
 * O dia que conta é o da ENTREGA, com a criação de reserva.
 *
 * É a mesma régua que o Dashboard usa para unidades. A alternativa — contar
 * pela criação — diria que a cliente "comprou" no dia em que encomendou, e não
 * no dia em que recebeu; para saber há quanto tempo ela não aparece, o que
 * importa é a última vez que algo chegou na mão dela.
 */
function diaDaCompra(p: PedidoLinha): string {
  /* `entregue_em` primeiro: e o carimbo que o banco poe quando o pedido VIRA
     entregue, entao e o dia real. `data_entrega` e uma promessa — a dona marca
     entregue ao despachar e a data combinada pode estar la na frente. Antes,
     data futura fazia o pedido inteiro ser descartado: quem gastou R$ 260 na
     semana passada aparecia como parada ha seis meses, e recebia a mensagem. */
  return (
    String(p.entregue_em ?? "").slice(0, 10) ||
    String(p.data_entrega ?? "") ||
    String(p.created_at ?? "").slice(0, 10) ||
    ""
  );
}

function diasEntre(de: string, ate: string): number {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export async function carregarRelacionamento(): Promise<{ clientes: ClienteParado[] }> {
  const { supabase, companyId } = await requireCompany();
  const hoje = hojeISO();

  const [clientesRes, pedidosRes] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, whatsapp, contatado_em")
      .eq("company_id", companyId)
      /* `not.is.false` e nao `eq true`: cliente criada a partir de um pedido
         (garantirCliente, pedidos.ts) nasce sem escrever `ativo`, e no Postgres
         `ativo = true` e FALSO para nulo — some justamente quem forma a
         populacao desta aba. E o filtro nao perde nada: nada no sistema grava
         `ativo = false` (o cadastro escreve true literal e excluir e DELETE de
         verdade), entao no melhor caso ele excluia zero linhas. */
      .not("ativo", "is", false)
      .limit(TETO),
    supabase
      .from("pedidos")
      .select("cliente_id, status, data_entrega, entregue_em, created_at, total, itens, ocasiao, destinatario_nome")
      .eq("company_id", companyId)
      .not("cliente_id", "is", null)
      .limit(TETO),
  ]);

  if (clientesRes.error) throw clientesRes.error;
  if (pedidosRes.error) throw pedidosRes.error;

  const comAberto = new Set<string>();
  /* Antes esta funcao ja descartava quem tinha pedido a caminho e quem foi
     chamada ha pouco. Passou a devolver todos, com o estado marcado: a aba
     tambem serve para ACOMPANHAR a base, e uma lista que so mostra quem pode
     ser chamado hoje aparece vazia justamente em quem esta indo bem. Quem
     decide o que esconder e a tela, que sabe qual faixa esta aberta. */
  const porCliente = new Map<
    string,
    {
      ultima: string;
      compras: number;
      total: number;
      produtos: Map<string, number>;
      datas: string[];
      ocasioes: Set<string>;
      ultimaOcasiao: ClienteParado["ultimaOcasiao"];
    }
  >();

  for (const p of (pedidosRes.data ?? []) as PedidoLinha[]) {
    const id = p.cliente_id;
    if (!id) continue;

    const status = String(p.status ?? "");
    if (EM_ABERTO.has(status)) {
      comAberto.add(id);
      continue;
    }
    /* Cancelado não conta em nada: não é compra, e deixá-lo definir a "última
       compra" faria a cliente parecer ativa por um pedido que ela desistiu. */
    if (status === "cancelado") continue;

    const bruto = diaDaCompra(p);
    if (!bruto) continue;
    // Limitar em vez de descartar: o pedido aconteceu, so a data esta adiantada.
    const dia = bruto > hoje ? hoje : bruto;

    const atual = porCliente.get(id) ?? {
      ultima: dia,
      compras: 0,
      total: 0,
      produtos: new Map<string, number>(),
      datas: [] as string[],
      ocasioes: new Set<string>(),
      ultimaOcasiao: null as ClienteParado["ultimaOcasiao"],
    };

    if (dia > atual.ultima) atual.ultima = dia;
    atual.compras += 1;
    atual.total += Number(p.total ?? 0);
    atual.datas.push(dia);

    const ocasiao = (p.ocasiao as string | null) ?? null;
    if (ocasiao) {
      atual.ocasioes.add(ocasiao);
      // A mais recente vence: é a que ela vai querer oferecer de novo.
      if (!atual.ultimaOcasiao || dia > atual.ultimaOcasiao.dia) {
        let produto: string | null = null;
        let maior = 0;
        for (const item of p.itens ?? []) {
          const q = Number(item?.qtd ?? 1);
          if (item?.nome && q > maior) {
            maior = q;
            produto = String(item.nome);
          }
        }
        atual.ultimaOcasiao = {
          slug: ocasiao,
          produto,
          destinatario: (p.destinatario_nome as string | null) ?? null,
          ano: Number(dia.slice(0, 4)) || 0,
          dia,
        };
      }
    }

    // Soma por quantidade, não por vezes que apareceu: quem leva 6 tábuas num
    // pedido leva tábua, mesmo tendo pedido uma vez só.
    for (const item of p.itens ?? []) {
      const nome = String(item?.nome ?? "").trim();
      if (!nome) continue;
      atual.produtos.set(nome, (atual.produtos.get(nome) ?? 0) + Number(item?.qtd ?? 1));
    }

    porCliente.set(id, atual);
  }

  const clientes: ClienteParado[] = [];

  for (const c of clientesRes.data ?? []) {
    const id = String(c.id);
    const contatada = (c.contatado_em as string | null) ?? null;

    // Sem compra concluída não há relacionamento para acompanhar.
    const dados = porCliente.get(id);
    if (!dados) continue;

    let produtoFrequente: string | null = null;
    let maior = 0;
    for (const [nome, qtd] of dados.produtos) {
      if (qtd > maior) {
        maior = qtd;
        produtoFrequente = nome;
      }
    }

    clientes.push({
      id,
      nome: String(c.nome ?? ""),
      whatsapp: (c.whatsapp as string | null) ?? null,
      diasParado: diasEntre(dados.ultima, hoje),
      ultimaCompraEm: dados.ultima,
      compras: dados.compras,
      totalGasto: dados.total,
      produtoFrequente,
      datas: dados.datas,
      ocasioes: [...dados.ocasioes],
      ultimaOcasiao: dados.ultimaOcasiao,
      temPedidoAberto: comAberto.has(id),
      contatadoEm: contatada,
      chamadaHoje: contatada === hoje,
    });
  }

  // Quem está parado há mais tempo primeiro: é quem está mais perto de sumir
  // de vez, e é a conversa mais urgente.
  clientes.sort((a, b) => b.diasParado - a.diasParado);

  return { clientes };
}

const idSchema = z.object({ id: z.string().uuid() });

/**
 * Carimba que a cliente foi chamada hoje.
 *
 * Registra a ABERTURA da conversa, não o envio — o Flua não manda a mensagem,
 * e afirmar que mandou seria inventar. É o limite do que este dado pode dizer
 * com honestidade, e é o bastante para o que a lista precisa saber: já falei
 * com essa pessoa recentemente?
 */
export async function marcarContatado(input: { data: unknown }) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("clientes")
    .update({ contatado_em: hojeISO() })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

/**
 * Tira o carimbo.
 *
 * Existe porque abrir o WhatsApp e desistir de mandar é comum, e sem desfazer
 * a cliente sumiria da tela por trinta dias por causa de um clique — sem
 * nenhum caminho de volta, já que é justamente desta lista que ela some.
 */
export async function desfazerContato(input: { data: unknown }) {
  const { id } = idSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("clientes")
    .update({ contatado_em: null })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const };
}

/* Chave em `configuracoes`, a tabela generica de chave/valor por empresa — o
   mesmo lugar onde os horarios ja moram. Nao precisou de migration nenhuma. */
const CHAVE_MODELO = "relacionamento_modelo";

export async function carregarModeloRelacionamento(): Promise<ModelosRelacionamento> {
  const { supabase, companyId } = await requireCompany();
  const valor = (await getConfig(supabase, companyId, CHAVE_MODELO)) as {
    texto?: string;
    comData?: string;
    semData?: string;
    repetir?: string;
  } | null;

  const limpo = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

  /* `texto` e a forma antiga, de quando existia um modelo so. Quem ja salvou
     nao perde o que escreveu: aquele texto vira o "com ocasiao", que era
     exatamente o papel dele. */
  return {
    comData: limpo(valor?.comData) ?? limpo(valor?.texto) ?? MODELOS_PADRAO.comData,
    semData: limpo(valor?.semData) ?? MODELOS_PADRAO.semData,
    repetir: limpo(valor?.repetir) ?? MODELOS_PADRAO.repetir,
  };
}

export async function salvarModeloRelacionamento(input: { data: unknown }) {
  const modelos = z
    .object({
      comData: z.string().trim().min(1).max(1200),
      semData: z.string().trim().min(1).max(1200),
      repetir: z.string().trim().min(1).max(1200),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();
  await setConfig(supabase, companyId, CHAVE_MODELO, modelos);
  return { ok: true as const };
}

export type CompraNaOcasiao = {
  clienteId: string;
  nome: string;
  whatsapp: string | null;
  /** O que ela mandou naquela ocasião. */
  produto: string | null;
  /** Para quem foi, quando o pedido registrou destinatário. */
  destinatario: string | null;
  data: string;
  total: number;
  /** false = palpite do retroativo. A tela avisa em vez de esconder. */
  confirmada: boolean;
};

/**
 * Quem comprou numa ocasião, num ano.
 *
 * É a consulta que justifica a coluna: "quem mandou cesta no Dia das Mães do
 * ano passado" para oferecer a deste ano. Filtrar por janela de data não
 * resolveria — as datas andam (Dia das Mães é o 2o domingo de maio) e a janela
 * mistura quem comprou aniversário na mesma semana.
 */
export async function carregarPorOcasiao(input: { data: unknown }) {
  const { ocasiao, ano } = z
    .object({
      ocasiao: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
      ano: z.number().int().min(2000).max(2100),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "cliente_id, cliente_nome, cliente_whatsapp, destinatario_nome, itens, total, data_entrega, created_at, ocasiao_confirmada",
    )
    .eq("company_id", companyId)
    .eq("ocasiao", ocasiao)
    .neq("status", "cancelado")
    .gte("data_entrega", `${ano}-01-01`)
    .lte("data_entrega", `${ano}-12-31`)
    .order("data_entrega", { ascending: false })
    .limit(TETO);

  if (error) throw error;

  const compras: CompraNaOcasiao[] = [];

  for (const p of data ?? []) {
    const itens = (p.itens ?? []) as { nome?: string; qtd?: number }[];
    // O item de maior quantidade representa o pedido: é o que ela vai citar.
    let produto: string | null = null;
    let maior = 0;
    for (const i of itens) {
      const q = Number(i?.qtd ?? 1);
      if (i?.nome && q > maior) {
        maior = q;
        produto = String(i.nome);
      }
    }

    compras.push({
      clienteId: String(p.cliente_id ?? ""),
      nome: String(p.cliente_nome ?? ""),
      whatsapp: (p.cliente_whatsapp as string | null) ?? null,
      produto,
      destinatario: (p.destinatario_nome as string | null) ?? null,
      data: String(p.data_entrega ?? "").slice(0, 10),
      total: Number(p.total ?? 0),
      confirmada: Boolean(p.ocasiao_confirmada),
    });
  }

  return { compras };
}

/** Anos que têm pedido com ocasião marcada, para a tela oferecer só o que existe. */
export async function anosComOcasiao(): Promise<{ anos: number[] }> {
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("pedidos")
    .select("data_entrega")
    .eq("company_id", companyId)
    .not("ocasiao", "is", null)
    .not("data_entrega", "is", null)
    .limit(TETO);

  if (error) throw error;

  const anos = new Set<number>();
  for (const p of data ?? []) {
    const a = Number(String(p.data_entrega ?? "").slice(0, 4));
    if (Number.isFinite(a)) anos.add(a);
  }
  return { anos: [...anos].sort((a, b) => b - a) };
}

/* ------------------------------------------------- preenchimento retroativo ---
   Sem isto a ocasião só serve daqui a um ano: ela grava neste Natal e a
   consulta "quem comprou no Natal passado" só responde em 2027.

   O palpite vem da proximidade entre a data de entrega e uma data comemorativa,
   usando o MESMO ocasiaoSugerida que sugere o chip no pedido — uma
   implementação só. Foi por isso que ele não entrou na migration: reescrever o
   cálculo da Páscoa em PL/pgSQL criaria uma segunda versão para divergir.

   Duas regras que fazem a diferença entre útil e perigoso:
     - nunca sobrescreve. Só toca em pedido com ocasiao NULA; o que uma pessoa
       marcou fica como está.
     - grava ocasiao_confirmada = false. É palpite, e a tela mostra como
       palpite. Sem essa marca a suposição vira verdade no dia seguinte e não
       há mais como saber o que foi conferido.
*/

/** Janela em dias entre a entrega e a data comemorativa. */
const JANELA_RETROATIVO = 10;

export type PreviaRetroativo = {
  /** Quantos pedidos ganhariam ocasião. */
  total: number;
  porOcasiao: { slug: string; label: string; quantidade: number }[];
  /** Entregas que não caem perto de nenhuma data: ficam sem ocasião mesmo. */
  semPalpite: number;
};

async function palpitesRetroativos(
  supabase: Awaited<ReturnType<typeof requireCompany>>["supabase"],
  companyId: string,
) {
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, data_entrega")
    .eq("company_id", companyId)
    .is("ocasiao", null)
    .neq("status", "cancelado")
    .not("data_entrega", "is", null)
    .limit(TETO);

  if (error) throw error;

  const porSlug = new Map<string, { label: string; ids: string[] }>();
  let semPalpite = 0;

  for (const p of data ?? []) {
    const sugerida = ocasiaoSugerida(p.data_entrega as string, JANELA_RETROATIVO);
    if (!sugerida) {
      semPalpite += 1;
      continue;
    }
    const atual = porSlug.get(sugerida.slug) ?? { label: sugerida.label, ids: [] };
    atual.ids.push(String(p.id));
    porSlug.set(sugerida.slug, atual);
  }

  return { porSlug, semPalpite };
}

/** O que seria marcado, sem gravar nada. */
export async function previaRetroativo(): Promise<PreviaRetroativo> {
  const { supabase, companyId } = await requireCompany();
  const { porSlug, semPalpite } = await palpitesRetroativos(supabase, companyId);

  const porOcasiao = [...porSlug.entries()]
    .map(([slug, v]) => ({ slug, label: v.label, quantidade: v.ids.length }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return {
    total: porOcasiao.reduce((soma, o) => soma + o.quantidade, 0),
    porOcasiao,
    semPalpite,
  };
}

/** Grava os palpites. Um update por ocasião, não um por pedido. */
export async function aplicarRetroativo(): Promise<{ marcados: number }> {
  const { supabase, companyId } = await requireCompany();
  const { porSlug } = await palpitesRetroativos(supabase, companyId);

  let marcados = 0;

  for (const [slug, { ids }] of porSlug) {
    if (!ids.length) continue;

    const { error } = await supabase
      .from("pedidos")
      .update({ ocasiao: slug, ocasiao_confirmada: false })
      .eq("company_id", companyId)
      /* `is null` de novo no update, e nao so na leitura: entre ler e gravar a
         pessoa pode ter marcado a ocasiao a mao noutra aba. O filtro garante
         que o palpite nunca passa por cima de uma escolha. */
      .is("ocasiao", null)
      .in("id", ids);

    if (error) throw error;
    marcados += ids.length;
  }

  return { marcados };
}

/**
 * Desfaz o preenchimento retroativo.
 *
 * Só apaga PALPITE — `ocasiao_confirmada = false`. O que uma pessoa escolheu na
 * tela do pedido fica intacto, e é justamente para essa distinção que a coluna
 * existe. Sem este caminho, uma ação que escreve suposição no histórico seria
 * de mão única, e um clique sem querer viraria dado que ninguém sabe separar.
 */
export async function desfazerRetroativo(): Promise<{ limpos: number }> {
  const { supabase, companyId } = await requireCompany();

  const { data, error } = await supabase
    .from("pedidos")
    .update({ ocasiao: null })
    .eq("company_id", companyId)
    .eq("ocasiao_confirmada", false)
    .not("ocasiao", "is", null)
    .select("id");

  if (error) throw error;
  return { limpos: (data ?? []).length };
}

"use server";

import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type {
  Conversa,
  MensagemSalva,
  ResultadoBia,
} from "@/lib/bia-ops.server";
import { PROMPT_PADRAO } from "@/lib/bia-prompt";

const WA_SIMULADOR = "5548999990000";

type Contexto = Awaited<ReturnType<typeof requireCompany>>;
type Supabase = Contexto["supabase"];

async function garantirConversa(
  supabase: Supabase,
  companyId: string,
  input: { canal: string; wa_id: string; nome?: string | null },
): Promise<Conversa> {
  const { data: achada, error: buscaError } = await supabase
    .from("conversas")
    .select(
      "id, canal, wa_id, nome, cliente_id, atendimento_humano, ultima_em, created_at",
    )
    .eq("company_id", companyId)
    .eq("canal", input.canal)
    .eq("wa_id", input.wa_id)
    .maybeSingle();

  if (buscaError) throw buscaError;
  if (achada) return achada as Conversa;

  const { data, error } = await supabase
    .from("conversas")
    .insert({
      company_id: companyId,
      canal: input.canal,
      wa_id: input.wa_id,
      nome: input.nome ?? null,
    })
    .select(
      "id, canal, wa_id, nome, cliente_id, atendimento_humano, ultima_em, created_at",
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Não foi possível criar a conversa.");
  return data as Conversa;
}

async function mensagensDaConversa(
  supabase: Supabase,
  companyId: string,
  conversaId: string,
): Promise<MensagemSalva[]> {
  const { data, error } = await supabase
    .from("mensagens")
    .select("id, conversa_id, papel, texto, created_at")
    .eq("company_id", companyId)
    .eq("conversa_id", conversaId)
    .order("created_at")
    .limit(300);

  if (error) throw error;
  return (data ?? []) as MensagemSalva[];
}

async function listarConversas(
  supabase: Supabase,
  companyId: string,
  canal?: string,
): Promise<Conversa[]> {
  let query = supabase
    .from("conversas")
    .select(
      "id, canal, wa_id, nome, cliente_id, atendimento_humano, ultima_em, created_at",
    )
    .eq("company_id", companyId)
    .order("ultima_em", { ascending: false })
    .limit(100);

  if (canal) query = query.eq("canal", canal);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Conversa[];
}

async function salvarMensagem(
  supabase: Supabase,
  companyId: string,
  input: {
    conversa_id: string;
    papel: MensagemSalva["papel"];
    texto: string;
  },
) {
  const { error } = await supabase.from("mensagens").insert({
    company_id: companyId,
    conversa_id: input.conversa_id,
    papel: input.papel,
    texto: input.texto,
  });

  if (error) throw error;
}

async function respostaDaIa(input: {
  modelo: string;
  prompt: string;
  historico: MensagemSalva[];
  texto: string;
}): Promise<string> {
  const chave = process.env.ANTHROPIC_API_KEY?.trim();

  if (!chave) {
    return "A BIA ainda não possui uma chave de IA configurada. O histórico da conversa foi salvo normalmente.";
  }

  const messages = input.historico
    .filter((m) => m.texto?.trim() && m.papel !== "sistema")
    .slice(-20)
    .map((m) => ({
      role: m.papel === "cliente" ? ("user" as const) : ("assistant" as const),
      content: m.texto!,
    }));

  messages.push({ role: "user", content: input.texto });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": chave,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: input.modelo,
      max_tokens: 900,
      system: input.prompt,
      messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detalhe = await response.text();
    throw new Error(
      `A BIA não conseguiu responder (${response.status}): ${detalhe.slice(0, 180)}`,
    );
  }

  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const texto = (json.content ?? [])
    .filter((bloco) => bloco.type === "text" && bloco.text)
    .map((bloco) => bloco.text)
    .join("\n\n")
    .trim();

  return texto || "Não consegui formular uma resposta agora.";
}

export async function carregarBia() {
  const { supabase, companyId } = await requireCompany();

  const conversa = await garantirConversa(supabase, companyId, {
    canal: "simulador",
    wa_id: WA_SIMULADOR,
  });

  const [configRes, mensagens, conversas] = await Promise.all([
    supabase
      .from("bia_config")
      .select("ativa, modelo, prompt, max_turnos")
      .eq("company_id", companyId)
      .maybeSingle(),
    mensagensDaConversa(supabase, companyId, conversa.id),
    listarConversas(supabase, companyId, "whatsapp"),
  ]);

  if (configRes.error) throw configRes.error;

  const config = configRes.data ?? {
    ativa: false,
    modelo: "claude-sonnet-4-20250514",
    prompt: PROMPT_PADRAO,
    max_turnos: 20,
  };

  return {
    configurada: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    config: {
      ...config,
      prompt: config.prompt ?? PROMPT_PADRAO,
      max_turnos: Number(config.max_turnos ?? 20),
    },
    simulador: { conversa, mensagens },
    conversas,
  };
}

export async function enviarParaBia(input: { data: unknown }) {
  const data = z
    .object({
      conversa_id: z.string().uuid(),
      texto: z.string().trim().min(1).max(2000),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { data: conversa, error: conversaError } = await supabase
    .from("conversas")
    .select("id, atendimento_humano")
    .eq("company_id", companyId)
    .eq("id", data.conversa_id)
    .maybeSingle();

  if (conversaError) throw conversaError;
  if (!conversa) throw new Error("Conversa não encontrada.");

  await salvarMensagem(supabase, companyId, {
    conversa_id: data.conversa_id,
    papel: "cliente",
    texto: data.texto,
  });

  await supabase
    .from("conversas")
    .update({ ultima_em: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("id", data.conversa_id);

  if (conversa.atendimento_humano) {
    const resultado: ResultadoBia = {
      texto: "",
      partes: [],
      chamouHumano: null,
      silenciada: true,
      ferramentas: [],
    };
    return resultado;
  }

  const [historico, configRes] = await Promise.all([
    mensagensDaConversa(supabase, companyId, data.conversa_id),
    supabase
      .from("bia_config")
      .select("ativa, modelo, prompt, max_turnos")
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (configRes.error) throw configRes.error;
  const config = configRes.data;

  if (config && config.ativa === false) {
    const resultado: ResultadoBia = {
      texto: "",
      partes: [],
      chamouHumano: null,
      silenciada: true,
      ferramentas: [],
    };
    return resultado;
  }

  const texto = await respostaDaIa({
    modelo: config?.modelo || "claude-sonnet-4-20250514",
    prompt: config?.prompt || PROMPT_PADRAO,
    historico: historico.slice(0, -1),
    texto: data.texto,
  });

  await salvarMensagem(supabase, companyId, {
    conversa_id: data.conversa_id,
    papel: "bia",
    texto,
  });

  const resultado: ResultadoBia = {
    texto,
    partes: [texto],
    chamouHumano: null,
    silenciada: false,
    ferramentas: [],
  };

  return resultado;
}

export async function limparConversaBia(input: { data: unknown }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("mensagens")
    .delete()
    .eq("company_id", companyId)
    .eq("conversa_id", id);

  if (error) throw error;

  const { error: conversaError } = await supabase
    .from("conversas")
    .update({ atendimento_humano: false })
    .eq("company_id", companyId)
    .eq("id", id);

  if (conversaError) throw conversaError;
  return { ok: true as const };
}

export async function carregarConversaBia(input: { data: unknown }) {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  return {
    mensagens: await mensagensDaConversa(supabase, companyId, id),
  };
}

export async function definirAtendimentoHumano(input: { data: unknown }) {
  const data = z
    .object({ id: z.string().uuid(), humano: z.boolean() })
    .parse(input.data);
  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase
    .from("conversas")
    .update({ atendimento_humano: data.humano })
    .eq("company_id", companyId)
    .eq("id", data.id);

  if (error) throw error;
  return { ok: true as const };
}

export async function salvarConfigBia(input: { data: unknown }) {
  const data = z
    .object({
      ativa: z.boolean(),
      modelo: z.string().trim().min(1).max(100),
      prompt: z.string().max(20_000).nullable(),
      max_turnos: z.number().int().min(1).max(200),
    })
    .parse(input.data);

  const { supabase, companyId } = await requireCompany();

  const { error } = await supabase.from("bia_config").upsert(
    {
      company_id: companyId,
      ativa: data.ativa,
      modelo: data.modelo,
      prompt: data.prompt,
      max_turnos: data.max_turnos,
    },
    { onConflict: "company_id" },
  );

  if (error) throw error;
  return { ok: true as const };
}

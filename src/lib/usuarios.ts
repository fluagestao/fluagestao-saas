"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireCompany } from "@/lib/company-context.server";
import type { Usuario } from "@/lib/usuarios-ops.server";

const SENHA = z
  .string()
  .min(6, "A senha precisa ter pelo menos 6 caracteres.")
  .max(72);

/**
 * Pessoas com acesso por empresa.
 *
 * Um por enquanto: o plano vendido hoje é individual, e acesso de equipe é o
 * tipo de coisa que se abre quando existe plano para ela — não por descuido.
 * Está aqui, com nome, para o dia em que virar dois não ser uma caçada.
 */
const LIMITE_USUARIOS = 1;

export async function carregarUsuarios() {
  const { supabase, companyId, email } = await requireCompany();

  const { data, error } = await supabase
    .from("company_members")
    .select("email, display_name, role, status, created_at")
    .eq("company_id", companyId)
    .order("created_at");

  if (error) throw error;

  const usuarios: Usuario[] = (data ?? []).map((m) => ({
    email: m.email,
    nome: m.display_name,
    created_at: m.created_at,
    temConta: true,
    ultimoAcesso: null,
    role: m.role as Usuario["role"],
    status: m.status as Usuario["status"],
  }));

  return { usuarios, eu: email };
}

export async function criarUsuario(input: { data: unknown }) {
  const data = z
    .object({
      email: z.string().trim().email("E-mail inválido.").max(160),
      senha: SENHA,
      nome: z.string().trim().max(120).default(""),
    })
    .parse(input.data);

/* Erro ESPERADO volta no retorno, nao lancado.

   Em producao o React descarta a mensagem de um Error vindo de arquivo
   "use server" e manda so um digest — "Somente o proprietario pode criar
   usuarios" virava um codigo, e a pessoa nao descobria por que o botao nao
   funcionou. Falha de infraestrutura continua sendo lancada: para essa o texto
   generico serve, e nao ha o que a pessoa possa fazer com ele. */
  const { supabase, companyId, role } = await requireCompany();
  if (role !== "owner") {
    return { ok: false as const, erro: "Somente o proprietário da empresa pode criar usuários." };
  }

  /* UMA PESSOA POR EMPRESA.

     A checagem vive no SERVIDOR, não só na tela: esconder o formulário impede
     o clique, não a chamada — quem souber o endereço da ação continua criando
     usuário. Regra que vale dinheiro se valida onde ninguém alcança.

     Conta só vínculo ATIVO: quem foi removido não ocupa a vaga, senão a
     empresa ficaria travada por uma pessoa que não trabalha mais ali. */
  const { count, error: contagemErro } = await supabase
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "active");

  if (contagemErro) {
    return {
      ok: false as const,
      erro: "Não consegui conferir quantas pessoas já usam esta conta. Tente de novo.",
    };
  }

  if ((count ?? 0) >= LIMITE_USUARIOS) {
    return {
      ok: false as const,
      erro: "Este plano permite apenas um usuário. Para liberar acessos para a sua equipe, fale com a gente.",
    };
  }

  const email = data.email.trim().toLowerCase();

  const isolated = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { data: signup, error: signupError } = await isolated.auth.signUp({
    email,
    password: data.senha,
    options: {
      data: {
        full_name: data.nome.trim() || email.split("@")[0],
      },
    },
  });

  if (signupError) {
    throw new Error(`Não consegui criar a conta: ${signupError.message}`);
  }

  const userId = signup.user?.id;
  if (!userId) {
    throw new Error(
      "A conta não retornou um identificador. Se esse e-mail já existe, use outro endereço ou faça o vínculo por convite.",
    );
  }

  const { error: membroError } = await supabase.from("company_members").insert({
    company_id: companyId,
    user_id: userId,
    display_name: data.nome.trim() || email.split("@")[0],
    email,
    role: "admin",
    status: "active",
  });

  if (membroError) {
    if (membroError.code === "23505") {
      return { ok: false as const, erro: "Esse usuário já está vinculado à empresa." };
    }
    throw membroError;
  }

  return {
    ok: true as const,
    precisaConfirmarEmail: !signup.session,
  };
}

export async function trocarSenhaUsuario(input: { data: unknown }) {
  const data = z
    .object({ email: z.string().trim().email(), senha: SENHA })
    .parse(input.data);

  const { supabase, email } = await requireCompany();

  if (data.email.toLowerCase() !== email.toLowerCase()) {
    throw new Error(
      "Por segurança, a senha de outro usuário não pode ser alterada pelo painel. O próprio usuário deve redefinir a senha.",
    );
  }

  const { error } = await supabase.auth.updateUser({ password: data.senha });
  if (error) throw error;
  return { ok: true as const, erro: null };
}

export async function removerUsuario(input: { data: unknown }) {
  const { email: alvo } = z
    .object({ email: z.string().trim().email() })
    .parse(input.data);

  const { supabase, companyId, email, role } = await requireCompany();
  if (role !== "owner") {
    return { ok: false as const, erro: "Somente o proprietário da empresa pode remover usuários." };
  }

  if (alvo.toLowerCase() === email.toLowerCase()) {
    return { ok: false as const, erro: "Você não pode remover o seu próprio acesso." };
  }

  const { data: membro, error: buscaError } = await supabase
    .from("company_members")
    .select("id, role")
    .eq("company_id", companyId)
    .ilike("email", alvo)
    .maybeSingle();

  if (buscaError) throw buscaError;
  if (!membro) return { ok: true as const, erro: null };
  if (membro.role === "owner") {
    return { ok: false as const, erro: "O proprietário da empresa não pode ser removido." };
  }

  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", membro.id)
    .eq("company_id", companyId);

  if (error) throw error;
  return { ok: true as const, erro: null };
}

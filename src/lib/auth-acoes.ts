"use server";

import { z } from "zod";

import {
  contarTentativa,
  limparTentativas,
  mensagemBloqueio,
  registrarEvento,
} from "@/lib/auth-limite";
import { avaliarSenha, mensagemSenha } from "@/lib/senha";
import { createClient } from "@/lib/supabase/server";

/**
 * Autenticação no servidor.
 *
 * Antes disso o login saía do navegador direto para o Supabase: não havia onde
 * contar tentativa, validar CAPTCHA ou registrar abuso. Passando por aqui, o
 * pedido cruza o nosso servidor e essas três coisas passam a existir.
 *
 * Regra de ouro deste arquivo: a resposta para o navegador é sempre genérica.
 * O motivo real vai para a trilha de eventos, que só nós lemos.
 */

export type Resultado = {
  ok: boolean;
  /** Mensagem já pronta para a tela. Nunca revela se a conta existe. */
  mensagem?: string;
  /** Para onde ir quando ok. */
  destino?: string;
  /** A tela deve exigir CAPTCHA na próxima tentativa. */
  exigirCaptcha?: boolean;
  /** Cadastro que precisa de confirmação de e-mail. */
  confirmarEmail?: boolean;
};

const ERRO_CREDENCIAL = "E-mail ou senha inválidos.";
const ERRO_GENERICO = "Não foi possível concluir agora. Tente novamente em instantes.";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1).max(200),
});

export async function entrar(input: { data: unknown }): Promise<Resultado> {
  const analise = loginSchema.safeParse(input.data);
  // Formato inválido responde igual a credencial errada: dizer "e-mail
  // inválido" já separa o que é conta do que é digitação.
  if (!analise.success) return { ok: false, mensagem: ERRO_CREDENCIAL };

  const { email, senha } = analise.data;

  const limite = await contarTentativa("login", email);
  if (limite.bloqueado) {
    await registrarEvento("login", "bloqueado", email, "limite por IP");
    return { ok: false, mensagem: mensagemBloqueio(limite.esperaSegundos), exigirCaptcha: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error || !data.user) {
    await registrarEvento("login", "falha", email, error?.message?.slice(0, 200));

    /* "E-mail nao confirmado" so acontece com a senha CERTA — com a senha
       errada o Supabase responde credencial invalida. Como quem chega aqui ja
       provou ser dono da conta, dizer o motivo nao entrega nada a estranho, e
       e o que faz o botao de reenviar aparecer. Sem isso a pessoa lia "e-mail
       ou senha invalidos", trocava a senha achando que errou, e nunca entrava. */
    const naoConfirmado =
      error?.code === "email_not_confirmed" ||
      /email not confirmed/i.test(error?.message ?? "");

    if (naoConfirmado) {
      return {
        ok: false,
        mensagem: "Confirme seu e-mail para entrar. Enviamos um link quando você se cadastrou.",
        confirmarEmail: true,
      };
    }

    return { ok: false, mensagem: ERRO_CREDENCIAL, exigirCaptcha: limite.exigirCaptcha };
  }

  /* E-mail não confirmado não entra. O Supabase pode devolver sessão quando o
     projeto está com a confirmação desligada; a checagem fica aqui para o
     bloqueio não depender de um botão no painel. */
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    await registrarEvento("login", "falha", email, "email nao confirmado");
    return {
      ok: false,
      mensagem: "Confirme seu e-mail para entrar. Enviamos um link quando você se cadastrou.",
      confirmarEmail: true,
    };
  }

  await limparTentativas("login", email);
  await registrarEvento("login", "ok", email);

  // Para onde ir: mesma regra de antes, agora decidida no servidor.
  let destino = "/inicio";
  const { data: membro } = await supabase
    .from("company_members")
    .select("company_id, role")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membro) {
    destino = "/onboarding";
  } else if (membro.role === "owner") {
    const { data: empresa } = await supabase
      .from("companies")
      .select("onboarding_completed_at")
      .eq("id", membro.company_id)
      .maybeSingle();
    if (empresa && !empresa.onboarding_completed_at) destino = "/onboarding";
  }

  return { ok: true, destino };
}

const cadastroSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1).max(200),
  nome: z.string().trim().min(1).max(160),
  loja: z.string().trim().min(1).max(160),
  documento: z.string().trim().max(30),
  telefone: z.string().trim().max(30).nullish(),
  origem: z.string().url(),
});

export async function cadastrar(input: { data: unknown }): Promise<Resultado> {
  const analise = cadastroSchema.safeParse(input.data);
  if (!analise.success) return { ok: false, mensagem: ERRO_GENERICO };

  const { email, senha, nome, loja, documento, telefone, origem } = analise.data;

  const limite = await contarTentativa("cadastro", email);
  if (limite.bloqueado) {
    await registrarEvento("cadastro", "bloqueado", email);
    return { ok: false, mensagem: mensagemBloqueio(limite.esperaSegundos), exigirCaptcha: true };
  }

  // A mesma política que a tela mostra, revalidada aqui: a do cliente é
  // conveniência e pode ser pulada.
  const forca = avaliarSenha(senha, email);
  if (!forca.valida) {
    return { ok: false, mensagem: mensagemSenha(forca) ?? ERRO_GENERICO };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      // Fixo, montado no servidor: aceitar origem do navegador abriria
      // redirecionamento para fora do domínio no e-mail de confirmação.
      emailRedirectTo: `${origem}/auth/callback`,
      data: {
        full_name: nome,
        store_name: loja,
        document: documento,
        document_type: documento.replace(/\D/g, "").length === 14 ? "cnpj" : "cpf",
        phone: telefone ?? null,
      },
    },
  });

  if (error) {
    await registrarEvento("cadastro", "falha", email, error.message?.slice(0, 200));
    /* Sempre a mesma resposta, inclusive para "e-mail já cadastrado": dizer que
       existe confirma para um estranho que aquela pessoa é cliente da Flua. */
    return {
      ok: false,
      mensagem:
        "Não foi possível concluir o cadastro com esses dados. Se você já tem conta, entre ou use “Esqueci minha senha”.",
      exigirCaptcha: limite.exigirCaptcha,
    };
  }

  /* O Supabase devolve sucesso mesmo para e-mail ja cadastrado, sinalizando com
     `identities` vazio. A tela antiga lia isso e dizia "este e-mail ja possui
     cadastro" — ou seja, desfazia a ofuscacao que o proprio Supabase faz de
     proposito. Aqui o caso e tratado como sucesso, e quem ja tem conta recebe
     o e-mail de aviso do proprio Supabase. */
  const jaExistia = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
  await registrarEvento("cadastro", "ok", email, jaExistia ? "email ja cadastrado" : undefined);

  if (jaExistia) return { ok: true, confirmarEmail: true };

  // Sem sessão = o projeto exige confirmação, que é o esperado.
  if (!data.session) return { ok: true, confirmarEmail: true };

  // Com sessão (confirmação desligada no projeto), a empresa nasce aqui.
  const { error: onboardingError } = await supabase.rpc("complete_onboarding", {
    p_full_name: nome,
    p_cpf: documento.replace(/\D/g, "").length === 11 ? documento.replace(/\D/g, "") : "",
    p_store_name: loja,
    p_document_type: documento.replace(/\D/g, "").length === 14 ? "cnpj" : "cpf",
    p_document: documento.replace(/\D/g, ""),
    p_email: email,
    p_phone: telefone ?? null,
    p_postal_code: null,
    p_street: null,
    p_address_number: null,
    p_complement: null,
    p_district: null,
    p_city: null,
    p_state: null,
  });

  if (onboardingError) {
    // Erro cru do Postgres nunca vai para a tela.
    await registrarEvento("cadastro", "falha", email, onboardingError.message?.slice(0, 200));
    return { ok: false, mensagem: ERRO_GENERICO };
  }

  return { ok: true, destino: "/inicio?onboarding=1" };
}

const recuperarSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  origem: z.string().url(),
});

export async function recuperarSenha(input: { data: unknown }): Promise<Resultado> {
  const analise = recuperarSchema.safeParse(input.data);
  const email = analise.success ? analise.data.email : undefined;

  const limite = await contarTentativa("recuperar", email);
  if (limite.bloqueado) {
    await registrarEvento("recuperar", "bloqueado", email);
    return { ok: false, mensagem: mensagemBloqueio(limite.esperaSegundos), exigirCaptcha: true };
  }

  /* Daqui para baixo a resposta é SEMPRE a mesma, dê certo ou errado — até o
     formato inválido. Qualquer diferença de mensagem ou de tempo vira um jeito
     de descobrir se um e-mail tem conta. */
  const generica = {
    ok: true,
    mensagem:
      "Se existir uma conta associada a este e-mail, enviaremos as instruções para recuperação de senha.",
  };

  if (!analise.success || !email) return generica;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${analise.data.origem}/auth/callback?next=/redefinir-senha`,
  });

  await registrarEvento("recuperar", error ? "falha" : "ok", email, error?.message?.slice(0, 200));
  return generica;
}

export async function reenviarConfirmacao(input: { data: unknown }): Promise<Resultado> {
  const analise = recuperarSchema.safeParse(input.data);
  const email = analise.success ? analise.data.email : undefined;

  const limite = await contarTentativa("reenviar", email);
  if (limite.bloqueado) {
    await registrarEvento("reenviar", "bloqueado", email);
    return { ok: false, mensagem: mensagemBloqueio(limite.esperaSegundos) };
  }

  const generica = {
    ok: true,
    mensagem: "Se existir uma conta pendente com este e-mail, enviamos o link de confirmação.",
  };

  if (!analise.success || !email) return generica;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${analise.data.origem}/auth/callback` },
  });

  await registrarEvento("reenviar", error ? "falha" : "ok", email, error?.message?.slice(0, 200));
  return generica;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  Store,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

function somenteNumeros(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarDocumento(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 14);

  if (numeros.length <= 11) {
    return numeros
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return numeros
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarWhatsapp(valor: string) {
  const numeros = somenteNumeros(valor).slice(0, 11);
  if (numeros.length <= 10) {
    return numeros
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numeros
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nomeLoja, setNomeLoja] = useState("");
  const [documento, setDocumento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMensagem("");

    const nomeLojaLimpo = nomeLoja.trim();
    const documentoNumeros = somenteNumeros(documento);
    const whatsappNumeros = somenteNumeros(whatsapp);
    const responsavelLimpo = responsavel.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (
      !nomeLojaLimpo ||
      !documentoNumeros ||
      !whatsappNumeros ||
      !responsavelLimpo ||
      !emailLimpo ||
      !senha ||
      !confirmar
    ) {
      setErro("Preencha todos os campos obrigatórios para criar sua conta.");
      return;
    }

    if (documentoNumeros.length !== 11 && documentoNumeros.length !== 14) {
      setErro("Informe um CPF ou CNPJ válido.");
      return;
    }

    if (whatsappNumeros.length < 10) {
      setErro("Informe um WhatsApp válido com DDD.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro("Informe um e-mail de acesso válido.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);

    const tipoDocumento = documentoNumeros.length === 14 ? "cnpj" : "cpf";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || window.location.origin;

    const { data, error } = await supabase.auth.signUp({
      email: emailLimpo,
      password: senha,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/cadastro/sucesso`,
        data: {
          full_name: responsavelLimpo,
          store_name: nomeLojaLimpo,
          document: documentoNumeros,
          document_type: tipoDocumento,
          phone: whatsappNumeros,
        },
      },
    });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }

    setMensagem("Conta criada. Confirme o e-mail que enviamos para liberar seu acesso à Flua.");
  }

  const campos = "h-12 rounded-xl border-[#D9C6B2]/80 bg-white text-[#3F2422] shadow-[0_2px_8px_rgba(112,61,58,0.05)] placeholder:text-[#74745B]/50 focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/15";

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#F7F1E8] text-[#2C2421]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(169,79,69,0.07),transparent_34%),radial-gradient(circle_at_88%_72%,rgba(116,116,91,0.06),transparent_30%)]" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1460px] items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[.92fr_1.08fr] lg:px-12 xl:gap-16 xl:px-16">
        <section className="hidden lg:flex lg:min-h-[620px] lg:flex-col lg:justify-center">
          <Link href="/" className="inline-flex w-fit" aria-label="Voltar ao site da Flua">
            <Image
              src="/flua-logo.webp"
              alt="Flua Gestão"
              width={220}
              height={95}
              priority
              className="h-auto w-[158px] object-contain"
            />
          </Link>

          <div className="mt-10 max-w-[560px]">
            <h1 className="text-[clamp(2.45rem,3.6vw,4rem)] font-semibold leading-[.99] tracking-[-0.05em] text-[#2C2421]">
              Comece sua operação com <span className="text-[#A94F45]">tudo organizado.</span>
            </h1>

            <p className="mt-5 max-w-[520px] text-base leading-7 text-[#703D3A]/68">
              Pedidos, clientes, produtos, entregas e financeiro em um só lugar, desde o primeiro dia.
            </p>

            <div className="mt-8 grid max-w-[520px] grid-cols-2 gap-x-8 gap-y-4 border-t border-[#D9C6B2]/70 pt-6 text-sm text-[#703D3A]/78">
              {[
                "Pedidos centralizados",
                "Entregas organizadas",
                "Estoque controlado",
                "Operação integrada",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A94F45]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[620px] rounded-[28px] border border-white/90 bg-white/92 p-6 shadow-[0_28px_80px_rgba(112,61,58,0.13)] backdrop-blur-xl sm:p-8 lg:p-9">
          <div className="lg:hidden">
            <Image
              src="/flua-logo.webp"
              alt="Flua Gestão"
              width={180}
              height={78}
              priority
              className="h-auto w-[138px] object-contain"
            />
          </div>

          <div className="mt-4 lg:mt-0">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A94F45]">Criar conta</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#2C2421] sm:text-[2.05rem]">Comece seu teste grátis</h2>
            <p className="mt-2 text-sm leading-6 text-[#703D3A]/60">Cadastre sua loja e crie o acesso principal à Flua Gestão.</p>
          </div>

          <form onSubmit={cadastrar} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loja" className="text-[#3F2422]">Nome da loja <span className="text-[#A94F45]">*</span></Label>
              <div className="relative">
                <Store className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="loja" value={nomeLoja} onChange={(e) => setNomeLoja(e.target.value)} placeholder="Ex.: Café com Afeto" autoComplete="organization" required className={`${campos} pl-11`} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="documento" className="text-[#3F2422]">CNPJ/CPF <span className="text-[#A94F45]">*</span></Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="documento" value={documento} onChange={(e) => setDocumento(formatarDocumento(e.target.value))} inputMode="numeric" placeholder="00.000.000/0000-00" required className={`${campos} pl-11`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-[#3F2422]">WhatsApp <span className="text-[#A94F45]">*</span></Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" autoComplete="tel" required className={`${campos} pl-11`} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="responsavel" className="text-[#3F2422]">Nome do responsável <span className="text-[#A94F45]">*</span></Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Seu nome" autoComplete="name" required className={`${campos} pl-11`} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#3F2422]">E-mail de acesso <span className="text-[#A94F45]">*</span></Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@empresa.com.br" autoComplete="email" required className={`${campos} pl-11`} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-[#3F2422]">Senha <span className="text-[#A94F45]">*</span></Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="senha" type={mostrarSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" required className={`${campos} px-11`} />
                  <button type="button" onClick={() => setMostrarSenha((valor) => !valor)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#74745B] hover:bg-[#D9C6B2]/30" aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmar" className="text-[#3F2422]">Confirmar senha <span className="text-[#A94F45]">*</span></Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="confirmar" type={mostrarSenha ? "text" : "password"} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" placeholder="Repita sua senha" required className={`${campos} pl-11`} />
                </div>
              </div>
            </div>

            {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{erro}</p>}
            {mensagem && <p role="status" className="rounded-xl border border-[#74745B]/25 bg-[#74745B]/10 px-3.5 py-3 text-sm font-medium text-[#55553F]">{mensagem}</p>}

            <Button type="submit" disabled={carregando} className="h-12 w-full rounded-xl bg-[#A94F45] text-sm font-semibold text-white shadow-[0_12px_28px_rgba(169,79,69,0.2)] hover:bg-[#703D3A]">
              {carregando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : <>Criar minha conta <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>

            <p className="text-center text-xs text-[#703D3A]/60">
              Já possui uma conta? <Link href="/login" className="font-semibold text-[#A94F45] hover:text-[#703D3A]">Entrar</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

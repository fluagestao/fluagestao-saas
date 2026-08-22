"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShoppingBag,
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

    const documentoNumeros = somenteNumeros(documento);
    const whatsappNumeros = somenteNumeros(whatsapp);

    if (documentoNumeros.length !== 11 && documentoNumeros.length !== 14) {
      setErro("Informe um CPF ou CNPJ válido.");
      return;
    }

    if (whatsappNumeros.length < 10) {
      setErro("Informe um WhatsApp válido com DDD.");
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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
      options: {
        data: {
          full_name: responsavel.trim(),
          store_name: nomeLoja.trim(),
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

  const campos = "h-12 rounded-2xl border-[#D9C6B2] bg-[#FFFDF9] text-[#3F2422] shadow-sm placeholder:text-[#74745B]/55 focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20";

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#F7F1E8] text-[#2C2421]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(169,79,69,0.12),transparent_35%),radial-gradient(circle_at_88%_70%,rgba(116,116,91,0.11),transparent_31%)]" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1540px] items-center gap-8 px-5 py-7 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-12 xl:px-16">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex" aria-label="Voltar ao site da Flua">
            <Image src="/flua-logo.webp" alt="Flua Gestão" width={220} height={95} priority className="h-auto w-[178px] object-contain" />
          </Link>

          <div className="mt-10 max-w-[650px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D9C6B2] bg-white/76 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#703D3A] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#A94F45]" />
              7 dias para conhecer a Flua
            </span>

            <h1 className="mt-6 text-[clamp(3rem,4.8vw,5.35rem)] font-semibold leading-[.97] tracking-[-0.055em] text-[#2C2421]">
              Comece sua operação com <span className="text-[#A94F45]">tudo organizado.</span>
            </h1>

            <p className="mt-6 max-w-[610px] text-lg leading-8 text-[#703D3A]/76">
              Pedidos, clientes, produtos, entregas e financeiro em um único ambiente, com informação centralizada desde o primeiro dia.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 rounded-2xl border border-white/80 bg-white/65 px-5 py-4 text-sm font-medium text-[#703D3A]/74 shadow-sm">
              {['Sem cartão', 'Cadastro rápido', 'Acesso imediato'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#A94F45]" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <article className="rounded-[22px] border border-[#D9C6B2]/70 bg-white/72 p-5 shadow-[0_16px_45px_rgba(112,61,58,0.07)]">
                <ShoppingBag className="h-5 w-5 text-[#A94F45]" />
                <h2 className="mt-3 text-sm font-semibold text-[#3F2422]">Pedidos centralizados</h2>
                <p className="mt-1 text-xs leading-5 text-[#703D3A]/65">Todos os pedidos organizados para você acompanhar a operação com clareza.</p>
              </article>
              <article className="rounded-[22px] border border-[#D9C6B2]/70 bg-white/72 p-5 shadow-[0_16px_45px_rgba(112,61,58,0.07)]">
                <Check className="h-5 w-5 text-[#74745B]" />
                <h2 className="mt-3 text-sm font-semibold text-[#3F2422]">Teste gratuito</h2>
                <p className="mt-1 text-xs leading-5 text-[#703D3A]/65">Conheça a plataforma na prática antes de decidir o próximo passo.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[620px] rounded-[32px] border border-white/85 bg-white/90 p-6 shadow-[0_34px_100px_rgba(112,61,58,0.17)] backdrop-blur-xl sm:p-8 lg:p-9">
          <div className="lg:hidden">
            <Image src="/flua-logo.webp" alt="Flua Gestão" width={180} height={78} priority className="h-auto w-[145px] object-contain" />
          </div>

          <div className="mt-4 lg:mt-0">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A94F45]">Criar conta</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#2C2421] sm:text-[2.15rem]">Comece seu teste grátis</h2>
            <p className="mt-2 text-sm leading-6 text-[#703D3A]/65">Cadastre sua loja e crie o acesso principal à Flua Gestão.</p>
          </div>

          <form onSubmit={cadastrar} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="loja" className="text-[#3F2422]">Nome da loja</Label>
              <div className="relative">
                <Store className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="loja" value={nomeLoja} onChange={(e) => setNomeLoja(e.target.value)} placeholder="Ex.: Café com Afeto" autoComplete="organization" required className={`${campos} pl-11`} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="documento" className="text-[#3F2422]">CNPJ/CPF</Label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="documento" value={documento} onChange={(e) => setDocumento(formatarDocumento(e.target.value))} inputMode="numeric" placeholder="00.000.000/0000-00" required className={`${campos} pl-11`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-[#3F2422]">WhatsApp</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" autoComplete="tel" required className={`${campos} pl-11`} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="responsavel" className="text-[#3F2422]">Nome do responsável</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Seu nome" autoComplete="name" required className={`${campos} pl-11`} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#3F2422]">E-mail de acesso</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@empresa.com.br" autoComplete="email" required className={`${campos} pl-11`} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="text-[#3F2422]">Senha</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="senha" type={mostrarSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" required className={`${campos} px-11`} />
                  <button type="button" onClick={() => setMostrarSenha((valor) => !valor)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#74745B] hover:bg-[#D9C6B2]/30" aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmar" className="text-[#3F2422]">Confirmar senha</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                  <Input id="confirmar" type={mostrarSenha ? "text" : "password"} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" placeholder="Repita sua senha" required className={`${campos} pl-11`} />
                </div>
              </div>
            </div>

            {erro && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{erro}</p>}
            {mensagem && <p role="status" className="rounded-xl border border-[#74745B]/25 bg-[#74745B]/10 px-3.5 py-3 text-sm font-medium text-[#55553F]">{mensagem}</p>}

            <Button type="submit" disabled={carregando} className="h-12 w-full rounded-2xl bg-[#A94F45] text-sm font-semibold text-white shadow-[0_14px_34px_rgba(169,79,69,0.24)] hover:bg-[#703D3A]">
              {carregando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</> : <>Criar minha conta <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>

            <p className="text-center text-xs text-[#703D3A]/65">
              Já possui uma conta? <Link href="/login" className="font-semibold text-[#A94F45] hover:text-[#703D3A]">Entrar</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}

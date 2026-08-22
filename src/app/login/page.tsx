"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShoppingBag,
  Truck,
  Workflow,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const EMAIL_STORAGE_KEY = "flua.login.email";

const beneficios = [
  { icon: ShoppingBag, title: "Pedidos centralizados", text: "O cliente compra pelo seu site e o pedido cai na Flua." },
  { icon: Truck, title: "Entregas organizadas", text: "Administre datas, rotas e pedidos em um único lugar." },
  { icon: PackageCheck, title: "Estoque controlado", text: "Acompanhe produtos e insumos sem planilhas espalhadas." },
  { icon: Workflow, title: "Operação funcional", text: "Vendas, financeiro e rotina conectados de ponta a ponta." },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarEmail, setLembrarEmail] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const emailSalvo = window.localStorage.getItem(EMAIL_STORAGE_KEY);
    if (emailSalvo) {
      setEmail(emailSalvo);
      setLembrarEmail(true);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("senha") === "alterada") {
      setSucesso("Senha alterada com sucesso. Entre novamente para continuar.");
      window.history.replaceState({}, "", "/login");
    }

    if (params.get("erro") === "link-invalido") {
      setErro("O link de recuperação expirou ou não é mais válido.");
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);
    setCarregando(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha inválidos.");
        return;
      }

      if (lembrarEmail) {
        window.localStorage.setItem(EMAIL_STORAGE_KEY, email.trim().toLowerCase());
      } else {
        window.localStorage.removeItem(EMAIL_STORAGE_KEY);
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setErro("Não foi possível entrar agora. Tente novamente em instantes.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#F7F1E8] text-[#2C2421]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(169,79,69,0.13),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(116,116,91,0.12),transparent_30%)]" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1500px] items-center gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14 lg:px-12 xl:px-16">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex" aria-label="Voltar ao site da Flua">
            <Image src="/flua-logo.webp" alt="Flua Gestão" width={220} height={95} priority className="h-auto w-[180px] object-contain" />
          </Link>

          <div className="mt-12 max-w-[650px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D9C6B2] bg-white/75 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#703D3A] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#A94F45]" />
              Gestão simples para negócios reais
            </span>

            <h1 className="mt-6 text-[clamp(3rem,5vw,5.7rem)] font-semibold leading-[.96] tracking-[-0.055em] text-[#2C2421]">
              Tenha todos os pedidos em <span className="text-[#A94F45]">apenas um local.</span>
            </h1>

            <p className="mt-6 max-w-[610px] text-lg leading-8 text-[#703D3A]/78">
              Chega de anotar seus pedidos em papéis e planilhas. Centralize a operação da sua loja e acompanhe tudo com clareza.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#703D3A]/75">
              {['Sem cartão', 'Acesso pelo navegador', 'Funciona no celular'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#A94F45]/10 text-[#A94F45]"><Check className="h-3 w-3" /></span>
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {beneficios.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-[22px] border border-[#D9C6B2]/75 bg-white/72 p-4 shadow-[0_16px_45px_rgba(112,61,58,0.07)] backdrop-blur-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A94F45]/10 text-[#A94F45]"><Icon className="h-4 w-4" /></div>
                  <h2 className="mt-3 text-sm font-semibold text-[#3F2422]">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#703D3A]/66">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[500px] rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_32px_90px_rgba(112,61,58,0.18)] backdrop-blur-xl sm:p-8 lg:p-9">
          <div className="text-center lg:text-left">
            <Image src="/flua-logo.webp" alt="Flua Gestão" width={190} height={82} priority className="mx-auto h-auto w-[150px] object-contain lg:mx-0 lg:hidden" />
            <span className="mt-3 inline-flex text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A94F45] lg:mt-0">Login</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#2C2421]">Entre na Flua</h2>
            <p className="mt-2 text-sm leading-6 text-[#703D3A]/65">Acesse sua empresa e continue de onde parou.</p>
          </div>

          <form onSubmit={entrar} className="mt-7 space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#3F2422]">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com.br" required className="h-13 rounded-2xl border-[#D9C6B2] bg-[#FFFDF9] pl-11 text-[#3F2422] shadow-sm placeholder:text-[#74745B]/60 focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="senha" className="text-[#3F2422]">Senha</Label>
                <Link href="/recuperar-senha" className="text-xs font-semibold text-[#A94F45] hover:text-[#703D3A]">Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                <Input id="senha" type={mostrarSenha ? "text" : "password"} autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} required className="h-13 rounded-2xl border-[#D9C6B2] bg-[#FFFDF9] px-11 text-[#3F2422] shadow-sm focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/20" />
                <button type="button" onClick={() => setMostrarSenha((valor) => !valor)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#74745B] hover:bg-[#D9C6B2]/30" aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-medium text-[#703D3A]/70">
              <input type="checkbox" checked={lembrarEmail} onChange={(event) => setLembrarEmail(event.target.checked)} className="h-4 w-4 rounded border-[#D9C6B2] accent-[#A94F45]" />
              Lembrar meu e-mail
            </label>

            {erro && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">{erro}</div>}
            {sucesso && <div role="status" className="rounded-xl border border-[#74745B]/25 bg-[#74745B]/10 px-3.5 py-3 text-sm font-medium text-[#55553F]">{sucesso}</div>}

            <Button type="submit" disabled={carregando} className="h-13 w-full rounded-2xl bg-[#A94F45] text-sm font-semibold text-white shadow-[0_14px_32px_rgba(169,79,69,0.24)] hover:bg-[#703D3A]">
              {carregando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-[#703D3A]/65">
            Ainda não tem uma conta? <Link href="/cadastro" className="font-semibold text-[#A94F45] hover:text-[#703D3A]">Começar teste grátis</Link>
          </p>

          <div className="mt-7 border-t border-[#D9C6B2]/70 pt-5 text-center text-[11px] font-medium text-[#703D3A]/50">Ambiente protegido e autenticação segura.</div>
        </section>
      </div>
    </main>
  );
}

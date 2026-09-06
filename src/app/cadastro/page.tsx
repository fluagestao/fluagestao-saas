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
import { avaliarSenha, mensagemSenha } from "@/lib/senha";
import { cadastrar as cadastrarConta, reenviarConfirmacao } from "@/lib/auth-acoes";

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
  const [nomeLoja, setNomeLoja] = useState("");
  const [documento, setDocumento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);

  /* Derivado, não estado: a força da senha é sempre função do que está
     digitado. Guardar em useState abriria espaço para os dois discordarem. */
  const faltaNaSenha = mensagemSenha(avaliarSenha(senha, email.trim().toLowerCase()));
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [cadastroConcluido, setCadastroConcluido] = useState(false);
  const [emailConfirmacao, setEmailConfirmacao] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [avisoReenvio, setAvisoReenvio] = useState("");

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

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

    /* A MESMA função do servidor, não uma regra parecida.
       A tela pedia 6 caracteres e o servidor exigia 8 com maiúscula, número e
       símbolo: a pessoa passava na validação daqui e era recusada lá, sem
       nunca ter lido a regra de verdade. */
    const forca = avaliarSenha(senha, emailLimpo);
    if (!forca.valida) {
      setErro(mensagemSenha(forca) ?? "Escolha uma senha mais forte.");
      return;
    }

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (!aceiteTermos) {
      setErro("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setCarregando(true);

    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        "https://www.fluagestao.com.br";

      const resultado = await cadastrarConta({
        data: {
          email: emailLimpo,
          senha,
          nome: responsavelLimpo,
          loja: nomeLojaLimpo,
          documento: documentoNumeros,
          telefone: whatsappNumeros,
          origem: siteUrl,
          aceite_termos: aceiteTermos,
        },
      });

      if (!resultado.ok) {
        setErro(resultado.mensagem ?? "Não foi possível concluir o cadastro. Tente novamente.");
        return;
      }

      if (resultado.destino) {
        router.replace(resultado.destino);
        router.refresh();
        return;
      }

      setEmailConfirmacao(emailLimpo);
      setCadastroConcluido(true);
    } finally {
      setCarregando(false);
    }
  }

  const campos =
    "h-[clamp(2.25rem,5.2dvh,3rem)] rounded-xl border-[#D9C6B2]/80 bg-white text-[clamp(.75rem,1.7dvh,.95rem)] text-[#3F2422] shadow-[0_2px_8px_rgba(112,61,58,0.05)] placeholder:text-[#74745B]/50 focus-visible:border-[#A94F45] focus-visible:ring-[#A94F45]/15";
  const label =
    "text-[clamp(.67rem,1.45dvh,.82rem)] leading-none text-[#3F2422]";
  const grupo = "space-y-[clamp(.2rem,.55dvh,.375rem)]";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#F7F1E8] text-[#2C2421]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(169,79,69,0.07),transparent_34%),radial-gradient(circle_at_88%_72%,rgba(116,116,91,0.06),transparent_30%)]" />

      <div className="relative mx-auto grid h-full w-full max-w-[1460px] items-center gap-[clamp(.75rem,3vw,4rem)] px-[clamp(.75rem,3vw,4rem)] py-[clamp(.4rem,1.5dvh,1.5rem)] xl:grid-cols-[.92fr_1.08fr]">
        <section className="hidden h-full flex-col justify-center xl:flex">
          <Link href="/" className="inline-flex w-fit" aria-label="Voltar ao site da Flua">
            <Image
              src="/flua-logo.webp"
              alt="Flua Gestão"
              width={220}
              height={95}
              priority
              className="h-auto w-[clamp(128px,10vw,158px)] object-contain"
            />
          </Link>

          <div className="mt-[clamp(1.25rem,4dvh,2.5rem)] max-w-[560px]">
            <h1 className="text-[clamp(2.35rem,3.6vw,4rem)] font-semibold leading-[.99] tracking-[-0.05em] text-[#2C2421]">
              Comece sua operação com{" "}
              <span className="text-[#A94F45]">tudo organizado.</span>
            </h1>

            <p className="mt-[clamp(.7rem,2dvh,1.25rem)] max-w-[520px] text-[clamp(.82rem,1.45vw,1rem)] leading-7 text-[#703D3A]/68">
              Pedidos, clientes, produtos, entregas e financeiro em um só lugar,
              desde o primeiro dia.
            </p>

            <div className="mt-[clamp(1rem,3dvh,2rem)] grid max-w-[520px] grid-cols-2 gap-x-8 gap-y-[clamp(.4rem,1.2dvh,1rem)] border-t border-[#D9C6B2]/70 pt-[clamp(.8rem,2dvh,1.5rem)] text-sm text-[#703D3A]/78">
              {["Pedidos centralizados", "Entregas organizadas", "Estoque controlado", "Operação integrada"].map((item) => (
                <span key={item} className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A94F45]" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-h-[calc(100dvh-.8rem)] w-full max-w-[620px] overflow-hidden rounded-[clamp(18px,3dvh,28px)] border border-white/90 bg-white/92 p-[clamp(.7rem,2.2dvh,2.25rem)] shadow-[0_28px_80px_rgba(112,61,58,0.13)] backdrop-blur-xl">
          <div className="xl:hidden">
            <Image
              src="/flua-logo.webp"
              alt="Flua Gestão"
              width={180}
              height={78}
              priority
              className="h-auto w-[clamp(90px,18dvh,138px)] object-contain"
            />
          </div>

          {cadastroConcluido ? (
            <div className="flex h-full min-h-[min(430px,80dvh)] flex-col items-center justify-center text-center">
              <div className="flex h-[clamp(2.8rem,8dvh,4rem)] w-[clamp(2.8rem,8dvh,4rem)] items-center justify-center rounded-full bg-[#A94F45]/10">
                <Mail className="h-7 w-7 text-[#A94F45]" />
              </div>
              <span className="mt-[clamp(.6rem,2dvh,1.5rem)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A94F45]">
                Cadastro realizado
              </span>
              <h2 className="mt-2 text-[clamp(1.45rem,4dvh,2.05rem)] font-semibold tracking-[-0.045em] text-[#2C2421]">
                Conta criada com sucesso!
              </h2>
              <p className="mt-[clamp(.5rem,1.5dvh,1rem)] max-w-[460px] text-[clamp(.78rem,1.8dvh,1rem)] leading-6 text-[#703D3A]/75">
                Confirme o e-mail que enviamos para liberar seu acesso à Flua.
              </p>
              {emailConfirmacao && (
                <p className="mt-2 max-w-[460px] break-all text-sm font-semibold text-[#703D3A]">
                  {emailConfirmacao}
                </p>
              )}
              <p className="mt-[clamp(.35rem,1dvh,.7rem)] max-w-[460px] text-[clamp(.7rem,1.5dvh,.8rem)] leading-5 text-[#703D3A]/60">
                Não achou? Olhe também no spam e nas promoções — o primeiro
                e-mail costuma cair lá.
              </p>
              <Button asChild className="mt-[clamp(.7rem,2dvh,1.75rem)] h-[clamp(2.4rem,6dvh,3rem)] w-full max-w-[460px] rounded-xl bg-[#A94F45] text-sm font-semibold text-white hover:bg-[#703D3A]">
                <Link href="/login">
                  Ir para o login <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {/* Sem este botao, quem nao recebe o e-mail nao tem saida nenhuma:
                  a conta ja existe, entao cadastrar de novo falha, e o botao de
                  reenviar do login so aparecia depois de acertar a senha. */}
              <button
                type="button"
                disabled={reenviando}
                onClick={async () => {
                  setReenviando(true);
                  try {
                    const r = await reenviarConfirmacao({
                      data: {
                        email: emailConfirmacao.trim().toLowerCase(),
                        origem: window.location.origin,
                      },
                    });
                    setAvisoReenvio(r.mensagem ?? "");
                  } finally {
                    setReenviando(false);
                  }
                }}
                className="mt-[clamp(.5rem,1.4dvh,1rem)] text-[clamp(.72rem,1.6dvh,.85rem)] font-medium text-[#A94F45] underline underline-offset-2 disabled:opacity-60"
              >
                {reenviando ? "Enviando..." : "Não recebi o e-mail — reenviar"}
              </button>
              {avisoReenvio && (
                <p
                  role="status"
                  className="mt-2 max-w-[460px] text-[clamp(.7rem,1.5dvh,.8rem)] leading-5 text-[#55553f]"
                >
                  {avisoReenvio}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mt-[clamp(.2rem,.8dvh,1rem)] text-center xl:mt-0">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#A94F45]">
                  Criar conta
                </span>
                <h2 className="mt-[clamp(.15rem,.6dvh,.5rem)] text-center text-[clamp(1.45rem,4dvh,2.05rem)] font-semibold leading-tight tracking-[-0.045em] text-[#2C2421]">
                  Teste grátis por 30 dias
                </h2>
                <p className="mt-[clamp(.15rem,.6dvh,.5rem)] text-[clamp(.7rem,1.5dvh,.875rem)] leading-5 text-[#703D3A]/60">
                  Cadastre sua loja e use todos os recursos da Flua gratuitamente por 30 dias.
                </p>
              </div>

              <form onSubmit={cadastrar} className="mt-[clamp(.45rem,1.3dvh,1.5rem)] space-y-[clamp(.3rem,.8dvh,1rem)]">
                <div className={grupo}>
                  <Label htmlFor="loja" className={label}>Nome da loja <span className="text-[#A94F45]">*</span></Label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                    <Input id="loja" value={nomeLoja} onChange={(e) => setNomeLoja(e.target.value)} placeholder="Ex.: Café com Afeto" autoComplete="organization" required className={`${campos} pl-9`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[clamp(.4rem,1vw,1rem)]">
                  <div className={grupo}>
                    <Label htmlFor="documento" className={label}>CNPJ/CPF <span className="text-[#A94F45]">*</span></Label>
                    <div className="relative">
                      <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                      <Input id="documento" value={documento} onChange={(e) => setDocumento(formatarDocumento(e.target.value))} inputMode="numeric" placeholder="00.000.000/0000-00" required className={`${campos} pl-9`} />
                    </div>
                  </div>
                  <div className={grupo}>
                    <Label htmlFor="whatsapp" className={label}>WhatsApp <span className="text-[#A94F45]">*</span></Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                      <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(formatarWhatsapp(e.target.value))} inputMode="tel" placeholder="(00) 00000-0000" autoComplete="tel" required className={`${campos} pl-9`} />
                    </div>
                  </div>
                </div>

                <div className={grupo}>
                  <Label htmlFor="responsavel" className={label}>Nome do responsável <span className="text-[#A94F45]">*</span></Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                    <Input id="responsavel" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Seu nome" autoComplete="name" required className={`${campos} pl-9`} />
                  </div>
                </div>

                <div className={grupo}>
                  <Label htmlFor="email" className={label}>E-mail de acesso <span className="text-[#A94F45]">*</span></Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seuemail@empresa.com.br" autoComplete="email" required className={`${campos} pl-9`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-[clamp(.4rem,1vw,1rem)]">
                  <div className={grupo}>
                    <Label htmlFor="senha" className={label}>Senha <span className="text-[#A94F45]">*</span></Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                      <Input id="senha" type={mostrarSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="Mínimo 8 caracteres" required className={`${campos} px-9`} />
                      <button type="button" onClick={() => setMostrarSenha((valor) => !valor)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#74745B] hover:bg-[#D9C6B2]/30" aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>
                        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className={grupo}>
                    <Label htmlFor="confirmar" className={label}>Confirmar senha <span className="text-[#A94F45]">*</span></Label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#74745B]" />
                      <Input id="confirmar" type={mostrarSenha ? "text" : "password"} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" placeholder="Repita sua senha" required className={`${campos} pl-9`} />
                    </div>
                  </div>
                </div>

                {/* O que falta, ENQUANTO ela digita — e não depois de o botão
                    recusar. A regra é dura (8 caracteres, maiúscula, minúscula,
                    número e símbolo) e descobri-la por tentativa e erro custava
                    caro: cada envio recusado gastava uma das três tentativas
                    por hora, e três erros trancavam a conta antes de existir.

                    Só aparece depois de a pessoa começar a digitar: em branco
                    seria uma lista de exigências recebendo quem chegou. */}
                {senha.length > 0 && faltaNaSenha && (
                  <p className="text-[clamp(.64rem,1.3dvh,.74rem)] leading-[1.4] text-[#8a5a45]">
                    {faltaNaSenha}
                  </p>
                )}

                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg py-0.5 text-[clamp(.66rem,1.35dvh,.76rem)] leading-[1.35] text-[#703D3A]/80">
                  <input
                    type="checkbox"
                    checked={aceiteTermos}
                    onChange={(e) => setAceiteTermos(e.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#A94F45] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A94F45]"
                    aria-describedby="aceite-termos-texto"
                  />
                  <span id="aceite-termos-texto">
                    Li e aceito os{" "}
                    <Link
                      href="/documentos/termos-de-uso"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#A94F45] underline underline-offset-2 hover:text-[#703D3A]"
                    >
                      Termos de Uso
                    </Link>{" "}
                    e a{" "}
                    <Link
                      href="/documentos/termos-de-uso/privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#A94F45] underline underline-offset-2 hover:text-[#703D3A]"
                    >
                      Política de Privacidade
                    </Link>
                    .
                  </span>
                </label>

                {erro && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-[clamp(.35rem,.8dvh,.65rem)] text-[clamp(.68rem,1.45dvh,.8rem)] font-medium leading-tight text-red-700">
                    {erro}
                  </p>
                )}

                <Button type="submit" disabled={carregando} className="h-[clamp(2.35rem,5.8dvh,3rem)] w-full rounded-xl bg-[#A94F45] text-[clamp(.75rem,1.6dvh,.875rem)] font-semibold text-white shadow-[0_12px_28px_rgba(169,79,69,0.2)] hover:bg-[#703D3A]">
                  {carregando ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validando cadastro...</>
                  ) : (
                    <>Criar minha conta <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>

                <p className="text-center text-[clamp(.62rem,1.35dvh,.75rem)] leading-none text-[#703D3A]/60">
                  Já possui uma conta?{" "}
                  <Link href="/login" className="font-semibold text-[#A94F45] hover:text-[#703D3A]">Entrar</Link>
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

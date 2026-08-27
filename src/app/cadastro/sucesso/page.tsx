import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function CadastroSucessoPage() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#F7F1E8] text-[#2C2421]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(169,79,69,0.07),transparent_34%),radial-gradient(circle_at_88%_72%,rgba(116,116,91,0.06),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-dvh max-w-[1460px] items-center justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16">
        <section className="w-full max-w-[620px] rounded-[28px] border border-white/90 bg-white/92 p-8 shadow-[0_28px_80px_rgba(112,61,58,0.13)] backdrop-blur-xl sm:p-10">
          <div className="flex justify-center">
            <Image
              src="/flua-logo.webp"
              alt="Flua Gestão"
              width={190}
              height={82}
              priority
              className="h-auto w-[150px] object-contain"
            />
          </div>

          <div className="mt-8 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#A94F45]/10">
              <CheckCircle2 className="h-9 w-9 text-[#A94F45]" />
            </div>
          </div>

          <div className="mt-6 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A94F45]">
              Conta criada
            </span>

            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#2C2421] sm:text-[2.1rem]">
              Conta criada com sucesso
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#703D3A]/70 sm:text-base">
              Seu e-mail foi confirmado e sua conta principal na Flua já está pronta.
              Agora você já pode entrar e começar sua operação.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#A94F45] text-sm font-semibold text-white shadow-[0_12px_28px_rgba(169,79,69,0.2)] transition hover:bg-[#703D3A]"
            >
              Ir para o login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

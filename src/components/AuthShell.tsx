import Image from "next/image";
import { ShieldCheck } from "lucide-react";

import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  hideIntro?: boolean;
};

/**
 * Moldura das três telas de acesso: entrar, recuperar e redefinir senha.
 *
 * O fundo é um ARQUIVO, não CSS. Antes eram três manchas desfocadas sobre
 * bordô sólido — uma imitação de arte feita com blur, que envelhece mal e
 * nunca fica igual em dois navegadores. As formas agora são a arte de
 * verdade, e as três telas usam a mesma: "Esqueceu a senha?" fica a um
 * clique do login, e cair num fundo diferente ali denunciaria a costura.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  hideIntro = false,
}: AuthShellProps) {
  /* DUAS ARTES, uma por formato — e o navegador baixa só a que serve.

     A arte é 900x1600, feita para celular. Numa tela de 1440 de largura o
     `cover` amplia 1,6x para preencher: a altura vai a 2560px e só aparece a
     faixa do meio, que é a área lisa. As formas terracota ficam 700px fora da
     tela e o fundo vira creme chapado — foi exatamente o que aconteceu.

     Por isso a versão deitada (1672x941) entra a partir de `md`. E por isso é
     background do CSS e não next/image: com duas <Image> e uma escondida por
     classe, o navegador baixa AS DUAS. A media query decide antes do download.
     As duas já são WebP, 15 e 17 KB — não há o que o otimizador melhore. */
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#F4EBE1] bg-[url('/flua-auth-bg.webp')] bg-cover bg-center bg-no-repeat px-4 py-10 sm:px-6 md:bg-[url('/flua-auth-bg-wide.webp')]">

      {/* O cartão é mais CLARO que o fundo, não igual. Creme sobre creme faz o
          contorno sumir no meio da tela; a sombra sozinha não segura. E a
          sombra ficou leve: a antiga (0 28px 90px a 34%) foi desenhada para
          fundo bordô — sobre fundo claro ela vira uma mancha suja. */}
      <section className="relative z-10 w-full max-w-[398px] rounded-[28px] border border-white/70 bg-[#FDFAF6] p-6 shadow-[0_18px_50px_rgba(112,61,58,0.13)] sm:max-w-[430px] sm:rounded-[32px] sm:p-9">
        <div className="text-center">
          <div className="mx-auto flex min-h-20 items-center justify-center sm:min-h-24">
            <Image
              src="/flua-logo.webp"
              alt="Flua Gestão"
              width={230}
              height={100}
              priority
              className="h-auto w-[176px] object-contain sm:w-[210px]"
            />
          </div>

          {!hideIntro && (
            <>
              <h1 className="mt-4 text-[1.72rem] font-semibold tracking-[-0.035em] text-[#3f2422]">
                {title}
              </h1>
              <p className="mx-auto mt-2.5 max-w-xs text-sm leading-6 text-[#703D3A]/70">
                {subtitle}
              </p>
            </>
          )}
        </div>

        <div className={hideIntro ? "mt-1.5" : "mt-7 sm:mt-8"}>{children}</div>

        <div className="mt-7 flex items-center justify-center gap-2 border-t border-[#D9C6B2]/70 pt-5 text-[11px] font-medium text-[#703D3A]/60 sm:mt-8">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ambiente protegido e autenticação segura</span>
        </div>
      </section>
    </main>
  );
}

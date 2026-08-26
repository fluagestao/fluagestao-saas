import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  hideIntro?: boolean;
};

export default function AuthShell({
  title,
  subtitle,
  children,
  hideIntro = false,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#703D3A] px-4 py-8 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#A94F45]/70 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 h-96 w-96 rounded-full bg-[#74745B]/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(247,241,232,0.10),transparent_38%)]"
      />

      <section className="relative z-10 w-full max-w-[398px] rounded-[28px] border border-white/35 bg-[#F7F1E8] p-5 shadow-[0_28px_90px_rgba(37,17,16,0.34)] sm:max-w-[430px] sm:rounded-[30px] sm:p-8">
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
              <h1 className="mt-1 text-[1.72rem] font-semibold tracking-[-0.035em] text-[#3f2422]">
                {title}
              </h1>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#703D3A]/70">
                {subtitle}
              </p>
            </>
          )}
        </div>

        <div className={hideIntro ? "mt-1.5" : "mt-6 sm:mt-7"}>{children}</div>

        <div className="mt-6 flex items-center justify-center gap-2 border-t border-[#D9C6B2]/75 pt-4 text-[11px] font-medium text-[#703D3A]/60 sm:mt-7 sm:pt-5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ambiente protegido e autenticação segura</span>
        </div>
      </section>
    </main>
  );
}

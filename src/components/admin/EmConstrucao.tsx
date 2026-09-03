"use client";

import { Hammer } from "lucide-react";

import { PageHeader } from "./shell";

/**
 * Tela reservada, ainda sem função.
 *
 * Existe para o menu não mentir: o item aparece porque o lugar dele já está
 * decidido, e quem clica descobre na hora que ainda não faz nada — em vez de
 * achar que quebrou. A descrição guarda a intenção da tela para quando a gente
 * sentar para construí-la.
 */
export function EmConstrucao({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <section className="min-w-0">
      <PageHeader titulo={titulo} descricao={descricao} />

      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--cream-deep)] bg-[var(--cream-soft)] px-6 py-14 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--peach-soft)]">
          <Hammer className="h-5 w-5 text-[var(--coral)]" />
        </div>
        <p className="t-item text-[var(--admin-ink)]">Ainda em construção</p>
        <p className="t-body max-w-md text-[var(--admin-muted)]">
          O lugar já está reservado no menu. Quando a gente estruturar esta tela, ela aparece
          aqui — nada do que você cadastrou some ou muda por causa dela.
        </p>
      </div>
    </section>
  );
}

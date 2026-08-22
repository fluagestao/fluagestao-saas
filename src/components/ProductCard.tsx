"use client";

import { useState } from "react";
import Link from "next/link";
import type { Produto } from "@/lib/catalog";
import { PriceTag } from "./PriceTag";
import { AddToCartButton } from "./AddToCartButton";
import { Heart, ImageIcon, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  produto: Produto;
}

export function ProductCard({ produto }: Props) {
  const principal = produto.imagens[0];
  const [favorito, setFavorito] = useState(false);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--cream-deep)]/70 bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:rounded-3xl">
      <div className="relative aspect-square overflow-hidden bg-[var(--cream-deep)]">
        <Link
          href={`/produto/${produto.slug}`}
          className="block h-full w-full"
          aria-label={produto.nome}
        >
          {principal ? (
            <img
              src={principal.url}
              alt={produto.nome}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--bronze)]">
              <ImageIcon className="h-10 w-10 opacity-40" strokeWidth={1.2} />
              <span className="font-script text-xl opacity-70">em breve</span>
            </div>
          )}
        </Link>

        <span className="pointer-events-none absolute left-2 top-2 rounded-lg bg-foreground/80 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--cream-soft)] backdrop-blur-sm sm:left-3 sm:top-3 sm:px-2.5 sm:text-[10px]">
          Sob encomenda
        </span>

        {produto.badge && (
          <span
            className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-[var(--shadow-soft)] sm:bottom-3 sm:left-3 sm:text-[10px]"
            style={{ backgroundColor: produto.badge_cor || "#B8893B" }}
          >
            <Star className="h-3 w-3 fill-current" strokeWidth={0} />
            {produto.badge}
          </span>
        )}

        <button
          type="button"
          onClick={() => setFavorito((v) => !v)}
          aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          aria-pressed={favorito}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] sm:right-3 sm:top-3 sm:h-9 sm:w-9"
        >
          <Heart
            className={cn(
              "h-[18px] w-[18px] transition-colors",
              favorito
                ? "fill-[var(--terracotta)] text-[var(--terracotta)]"
                : "text-[var(--bronze)]",
            )}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <Link href={`/produto/${produto.slug}`} className="block">
          <h3 className="font-display text-base leading-snug text-foreground transition-colors group-hover:text-[var(--terracotta)] sm:text-2xl">
            {produto.nome}
          </h3>
        </Link>
        {produto.serve && (
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--bronze)] sm:text-xs sm:tracking-[0.16em]">
            {produto.serve}
          </p>
        )}

        <div className="mt-auto pt-3">
          <PriceTag produto={produto} />
        </div>

        <div className="mt-2.5 sm:mt-3">
          <AddToCartButton produto={produto} size="md" fullWidth />
        </div>

        <Link
          href={`/produto/${produto.slug}`}
          className="mt-2.5 hidden text-center text-xs font-medium text-[var(--bronze)] underline-offset-4 transition-colors hover:text-[var(--terracotta)] hover:underline sm:block"
        >
          ver detalhes
        </Link>
      </div>
    </article>
  );
}

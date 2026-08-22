import { Sparkles } from "lucide-react";

import type { Categoria } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const categoriaCores: Record<string, string> = {
  "cafe-da-manha": "#A12820",
  "presentes-especiais": "#9B5C3C",
  "tabuas-de-frios": "#7A5A2E",
  "pra-receber": "#3d5a66",
  adicionais: "#8C6B4F",
};

interface Props {
  categorias: Categoria[];
  selecionada: string | null;
  onChange: (slug: string | null) => void;
}

export function CategoryTabs({ categorias, selecionada, onChange }: Props) {
  const unica = categorias.length === 1;

  return (
    <div
      className={cn(
        unica
          ? "flex justify-center"
          : "grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-center md:gap-3",
      )}
    >
      {categorias.map((c, i) => {
        const ativa = selecionada === c.slug;
        const cor = c.cor || categoriaCores[c.slug] || "#A12820";
        const destaque = Boolean(c.subtitulo);

        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => onChange(c.slug)}
            className={cn(
              "flex shrink-0 items-center justify-center gap-1.5 rounded-full text-center font-display transition-all duration-200",
              unica ? "gap-2 px-10 py-4 text-2xl" : "w-full px-5 py-2 text-base md:w-auto",
              !unica && i === 0 && "col-span-2",
              ativa
                ? "bg-[var(--cor)] text-[var(--cream-soft)] shadow-[0_4px_16px_-4px_var(--cor)]"
                : "border border-[var(--cor)]/30 bg-white text-[var(--cor)] hover:bg-[var(--cor)]/10",
              destaque && !ativa && "ring-1 ring-[var(--cor)]/40",
              unica && "shadow-[0_10px_30px_-8px_var(--cor)]",
            )}
            style={{ "--cor": cor } as React.CSSProperties}
            aria-pressed={ativa}
          >
            {destaque && <Sparkles className={unica ? "h-5 w-5" : "h-3.5 w-3.5"} strokeWidth={2} />}
            {c.nome}
          </button>
        );
      })}
    </div>
  );
}

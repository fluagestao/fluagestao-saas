import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Categoria } from "@/lib/catalog";

interface Props {
  categorias: Categoria[];
  selecionada: string | null;
  onSelect: (slug: string | null) => void;
}

/** Faixa de categorias em pills (estilo loja), grudada logo abaixo do cabeçalho. */
export function CategoryBar({ categorias, selecionada, onSelect }: Props) {
  // Mede a altura do <header> (que varia com a faixa de status) para grudar a
  // barra exatamente abaixo dele ao rolar.
  const [top, setTop] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const update = () => setTop(header.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  if (categorias.length === 0) return null;

  const pill = (ativo: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200",
      ativo
        ? "bg-[var(--cream-soft)] text-[var(--terracotta)] shadow-sm"
        : "bg-white/12 text-[var(--cream-soft)] hover:bg-white/20",
    );

  return (
    <nav
      aria-label="Categorias"
      style={{ top }}
      className="sticky z-30 border-b border-black/10 bg-[var(--terracotta)] shadow-[var(--shadow-soft)]"
    >
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selecionada === null}
          className={pill(selecionada === null)}
        >
          Todos
        </button>
        {categorias.map((c) => (
          <button
            key={c.slug}
            type="button"
            onClick={() => onSelect(c.slug)}
            aria-pressed={selecionada === c.slug}
            className={pill(selecionada === c.slug)}
          >
            {c.nome}
          </button>
        ))}
      </div>
    </nav>
  );
}

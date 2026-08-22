import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import type { Produto } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

interface Props {
  produto: Produto;
  size?: Size;
  className?: string;
  fullWidth?: boolean;
  /** Quando o produto tem precos_extra e a variação já está escolhida fora do componente */
  variacaoFixa?: { label: string; valor: number } | null;
}

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function AddToCartButton({ produto, size = "sm", className, fullWidth, variacaoFixa }: Props) {
  const { add, setOpen } = useCart();
  const [escolha, setEscolha] = useState<string>("");
  const [feedback, setFeedback] = useState(false);

  const temVariacoes = produto.precos_extra.length > 0;
  const variacaoAtiva =
    variacaoFixa ??
    (temVariacoes ? produto.precos_extra.find((p) => p.label === escolha) ?? null : null);

  const podeAdicionar = !temVariacoes || !!variacaoAtiva;

  function handleAdd() {
    if (!podeAdicionar) return;
    const preco = temVariacoes ? (variacaoAtiva ? variacaoAtiva.valor : null) : produto.preco;
    const variacao = temVariacoes && variacaoAtiva ? variacaoAtiva.label : undefined;
    const catalogo = produto.categoria?.catalogo_id ?? undefined;
    add({ slug: produto.slug, nome: produto.nome, preco, variacao, catalogo }, 1);
    // Meta Pixel: sinal de interesse no produto (opcional, não quebra se ausente)
    try {
      if (typeof window !== "undefined" && (window as any).fbq && preco != null) {
        (window as any).fbq("track", "AddToCart", {
          content_name: produto.nome,
          content_type: "product",
          value: preco,
          currency: "BRL",
        });
      }
    } catch {
      /* pixel opcional */
    }
    setFeedback(true);
    setOpen(true);
    setTimeout(() => setFeedback(false), 1400);
  }

  const base =
    "inline-flex items-center justify-center rounded-full font-medium tracking-wide transition-all duration-200 active:scale-[0.98]";
  const styles = podeAdicionar
    ? "bg-[var(--terracotta)] text-[var(--cream-soft)] hover:brightness-105 shadow-[var(--shadow-soft)]"
    : "bg-[var(--cream-deep)] text-foreground/50 cursor-not-allowed";

  return (
    <div className={cn("flex items-center gap-2", fullWidth && "w-full")}>
      {temVariacoes && !variacaoFixa && (
        <select
          value={escolha}
          onChange={(e) => setEscolha(e.target.value)}
          aria-label="Escolha a variação"
          className="h-9 rounded-full border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)]/40"
        >
          <option value="">Variação…</option>
          {produto.precos_extra.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!podeAdicionar}
        className={cn(base, sizeClasses[size], styles, fullWidth && "flex-1", className)}
      >
        {feedback ? (
          <>
            <Check className="h-4 w-4" strokeWidth={2.4} /> Adicionado
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" strokeWidth={2} /> Adicionar
          </>
        )}
      </button>
    </div>
  );
}

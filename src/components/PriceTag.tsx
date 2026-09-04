import type { Produto } from "@/lib/catalog";
import { formatPreco } from "@/lib/catalog";

interface Props {
  produto: Pick<Produto, "preco" | "preco_label" | "precos_extra">;
  size?: "sm" | "lg";
  className?: string;
}

export function PriceTag({ produto, size = "sm", className = "" }: Props) {
  const big = size === "lg";
  const numCls = big ? "text-3xl" : "text-xl";
  const labelCls = big ? "text-sm" : "text-xs";

  if (produto.precos_extra && produto.precos_extra.length > 0) {
    return (
      <div className={className}>
        <span className={`${labelCls} uppercase tracking-[0.18em] text-[var(--bronze)]`}>
          a partir de
        </span>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {produto.precos_extra.map((p) => (
            <span key={p.label} className="font-display text-foreground">
              <span className={`${numCls} font-medium`}>{formatPreco(p.valor)}</span>
              <span className={`ml-1 ${labelCls} text-muted-foreground`}>/ {p.label}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (produto.preco == null) {
    return (
      <div className={className}>
        <span
          className={`font-display italic text-[var(--terracotta)] ${big ? "text-2xl" : "text-lg"}`}
        >
          {/* Rede para linha antiga: com preco null o rotulo era o preco
              inteiro, nao um prefixo. Nada escreve mais aqui. */}
          {produto.preco_label?.trim() || "Sob consulta"}
        </span>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={`font-display font-medium text-foreground ${numCls}`}>
        {formatPreco(produto.preco)}
      </span>
    </div>
  );
}

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartButton() {
  const { totalItens, setOpen, hidratado } = useCart();
  const temItens = totalItens > 0;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Abrir carrinho${totalItens > 0 ? ` (${totalItens} itens)` : ""}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all hover:scale-105 ${
        temItens
          ? "border-transparent bg-[var(--terracotta)] text-[var(--cream-soft)] shadow-sm hover:bg-[var(--terracotta-dark)]"
          : "border-[var(--bronze)]/30 bg-[var(--cream-deep)] text-[var(--terracotta)] hover:bg-[var(--bronze)]/20"
      }`}
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={1.8} />
      {hidratado && totalItens > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--cream-soft)] px-1 text-[10px] font-semibold text-[var(--terracotta)] ring-1 ring-[var(--terracotta)]">
          {totalItens}
        </span>
      )}
    </button>
  );
}

import { Check } from "lucide-react";

interface Props {
  itens: string[];
}

export function ItemsList({ itens }: Props) {
  if (!itens.length) return null;
  return (
    <ul className="flex flex-col">
      {itens.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 border-b border-[var(--bronze)]/10 py-2 text-foreground/90 last:border-b-0"
        >
          <span
            aria-hidden
            className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--terracotta)]/10"
          >
            <Check className="h-3 w-3 text-[var(--terracotta)]" />
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

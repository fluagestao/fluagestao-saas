import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  className?: string;
  size?: "sm" | "md";
}

export function QtyStepper({ value, onChange, min = 0, className, size = "md" }: Props) {
  const btn =
    size === "sm"
      ? "h-7 w-7 text-sm"
      : "h-9 w-9 text-base";
  const val = size === "sm" ? "w-8 text-sm" : "w-10 text-base";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[var(--cream-deep)] bg-[var(--cream-soft)]",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Diminuir"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn("flex items-center justify-center rounded-full text-foreground/70 hover:text-[var(--terracotta)]", btn)}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
      <span className={cn("text-center font-medium tabular-nums", val)}>{value}</span>
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(value + 1)}
        className={cn("flex items-center justify-center rounded-full text-foreground/70 hover:text-[var(--terracotta)]", btn)}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

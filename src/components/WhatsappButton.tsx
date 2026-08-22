import { MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/config";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

interface Props {
  mensagem: string;
  size?: Size;
  variant?: "solid" | "outline";
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-14 px-7 text-base gap-2.5",
};

export function WhatsappButton({
  mensagem,
  size = "md",
  variant = "solid",
  className,
  children,
}: Props) {
  const base =
    "inline-flex items-center justify-center rounded-full font-medium tracking-wide transition-all duration-200 active:scale-[0.98]";
  const styles =
    variant === "solid"
      ? "bg-[var(--whatsapp)] text-[var(--whatsapp-foreground)] hover:brightness-105 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)]"
      : "border border-[var(--whatsapp)] text-[var(--whatsapp)] hover:bg-[var(--whatsapp)] hover:text-[var(--whatsapp-foreground)]";

  return (
    <a
      href={whatsappLink(mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(base, sizeClasses[size], styles, className)}
    >
      <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
      {children ?? "Pedir no WhatsApp"}
    </a>
  );
}

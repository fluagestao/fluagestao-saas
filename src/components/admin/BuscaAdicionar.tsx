import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type OpcaoBusca = {
  valor: string;
  rotulo: string;
  /** Texto secundário à direita (preço, custo…). Também entra na busca. */
  detalhe?: string;
};

export type GrupoBusca = { nome: string; itens: OpcaoBusca[] };

/**
 * Campo de "adicionar" com busca por digitação.
 *
 * Substituiu o <select> nativo: com 53 produtos (ou 150 insumos) numa lista
 * corrida, rolar até achar era mais lento do que digitar duas letras. Não
 * guarda seleção — dispara onEscolher e fecha, porque o uso é sempre
 * "adicionar mais um".
 */
export function BuscaAdicionar({
  grupos,
  onEscolher,
  placeholder,
  buscaPlaceholder = "Digite para buscar…",
  vazio = "Nada encontrado.",
  disabled,
  className,
}: {
  grupos: GrupoBusca[];
  onEscolher: (valor: string) => void;
  placeholder: string;
  buscaPlaceholder?: string;
  vazio?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground transition-colors hover:border-[var(--terracotta)] focus:border-[var(--terracotta)] focus:outline-none disabled:opacity-50",
            className,
          )}
        >
          <span className="truncate text-[var(--terracotta)]">{placeholder}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[var(--bronze)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,90vw)] p-0" align="start">
        <Command
          // Sem isso, "cafe" não acha "Café" — acento é regra, não exceção, em pt-BR.
          filter={(value, search) => {
            const norm = (s: string) =>
              s
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .toLowerCase();
            return norm(value).includes(norm(search)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={buscaPlaceholder} />
          <CommandList className="busca-adicionar-lista max-h-72 overflow-y-scroll overscroll-contain [scrollbar-gutter:stable]">
            <CommandEmpty>{vazio}</CommandEmpty>
            {grupos.map((g) => (
              <CommandGroup key={g.nome} heading={g.nome}>
                {g.itens.map((o) => (
                  <CommandItem
                    key={o.valor}
                    // O value é o que o cmdk busca — inclui o detalhe de propósito.
                    value={`${o.rotulo} ${o.detalhe ?? ""}`}
                    onSelect={() => {
                      onEscolher(o.valor);
                      setAberto(false);
                    }}
                  >
                    <span className="flex-1 truncate">{o.rotulo}</span>
                    {o.detalhe && (
                      <span className="ml-2 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {o.detalhe}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

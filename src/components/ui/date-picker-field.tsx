"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseData(valor: string) {
  const [ano, mes, dia] = valor.split("-").map(Number);
  if (!ano || !mes || !dia) return undefined;
  return new Date(ano, mes - 1, dia);
}

function paraISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function DatePickerField({
  value,
  onChange,
  className,
  ariaLabel = "Selecionar data",
}: {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionada = useMemo(() => parseData(value), [value]);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            "h-10 justify-between rounded-xl border-[var(--cream-deep)] bg-white px-3.5 text-sm font-normal shadow-sm hover:bg-[var(--cream-soft)]",
            className,
          )}
        >
          <span>{selecionada ? format(selecionada, "dd/MM/yyyy") : "Selecionar data"}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-auto rounded-3xl border border-[var(--cream-deep)] bg-white p-2 shadow-[0_22px_55px_rgba(84,52,48,0.18)]"
      >
        <Calendar
          mode="single"
          selected={selecionada}
          defaultMonth={selecionada}
          locale={ptBR}
          onSelect={(data) => {
            if (!data) return;
            onChange(paraISO(data));
            setAberto(false);
          }}
          className="rounded-2xl bg-white p-2"
          classNames={{
            today: "rounded-xl bg-[var(--cream)] text-[var(--wine)]",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

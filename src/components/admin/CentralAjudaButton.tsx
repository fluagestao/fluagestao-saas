"use client";

import { BookOpen, CircleHelp, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function abrirGuia(modo: "checklist" | "revisar") {
  window.dispatchEvent(
    new CustomEvent("flua:abrir-guia", { detail: { modo } }),
  );
}

export function CentralAjudaButton() {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  function escolher(modo: "checklist" | "revisar") {
    abrirGuia(modo);
    setAberto(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] transition hover:bg-[var(--cream)] hover:text-[var(--terracotta)]"
        aria-label="Central de ajuda"
        aria-expanded={aberto}
      >
        <CircleHelp className="h-[18px] w-[18px]" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-[80] mt-2 w-64 rounded-2xl border border-[var(--admin-border)] bg-white p-2 shadow-[var(--shadow-lift)]">
          <div className="px-3 pb-2 pt-1">
            <p className="text-sm font-bold text-foreground">Central de ajuda</p>
            <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
              Aprenda e tire dúvidas usando o guia.
            </p>
          </div>

          <button
            type="button"
            onClick={() => escolher("checklist")}
            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--cream-soft)]"
          >
            <BookOpen className="mt-0.5 h-4 w-4 text-[var(--terracotta)]" />
            <span>
              <span className="block text-sm font-semibold">Abrir Guia do Flua</span>
              <span className="block text-xs text-[var(--admin-muted)]">
                Veja seu checklist e continue de onde parou.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => escolher("revisar")}
            className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--cream-soft)]"
          >
            <RotateCcw className="mt-0.5 h-4 w-4 text-[var(--terracotta)]" />
            <span>
              <span className="block text-sm font-semibold">Rever desde o início</span>
              <span className="block text-xs text-[var(--admin-muted)]">
                Revise as orientações sem perder seu progresso.
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

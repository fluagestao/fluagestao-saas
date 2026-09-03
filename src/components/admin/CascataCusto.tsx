"use client";

import { cn } from "@/lib/utils";
import type { Cascata } from "@/lib/calculo-tipos";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function corDaMargem(margem: number | null) {
  if (margem == null) return "text-muted-foreground";
  if (margem >= 0.5) return "text-[var(--green-ink)]";
  if (margem >= 0.25) return "text-[var(--bronze)]";
  return "text-destructive";
}

/**
 * A cascata do preço até o que sobra.
 *
 * Dois resultados de propósito. A margem de contribuição responde "esse produto
 * se paga?"; a sobra real responde "o negócio sobrevive?". Guardar só a segunda
 * esconderia qual produto vale empurrar; só a primeira é o que a tela mostrava
 * antes — e é otimista demais para quem monta à mão.
 */
export function CascataCusto({ cascata }: { cascata: Cascata }) {
  const c = cascata;
  const semPreco = c.preco == null;

  const Linha = ({
    rotulo,
    valor,
    negativo,
    nota,
  }: {
    rotulo: string;
    valor: number;
    negativo?: boolean;
    nota?: string;
  }) => (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="t-body text-[var(--admin-ink-soft)]">
        {negativo ? "− " : ""}
        {rotulo}
        {nota && <span className="t-support ml-1.5 text-muted-foreground">{nota}</span>}
      </span>
      <span
        className={cn(
          "t-body shrink-0 tabular-nums",
          negativo ? "text-[var(--terracotta)]" : "text-[var(--admin-ink)]",
        )}
      >
        {moeda(valor)}
      </span>
    </div>
  );

  return (
    <div className="rounded-2xl border border-[var(--admin-border)] bg-card p-4">
      {semPreco ? (
        <p className="t-body text-muted-foreground">
          Informe o preço de venda para ver quanto sobra.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 pb-1">
            <span className="t-item text-[var(--admin-ink)]">Preço de venda</span>
            <span className="t-item shrink-0 tabular-nums text-[var(--admin-ink)]">
              {moeda(c.preco!)}
            </span>
          </div>

          <Linha rotulo="Insumos" valor={c.insumos} negativo />

          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-[var(--cream-deep)] pt-2">
            <span className="t-body font-semibold text-[var(--admin-ink)]">
              Margem de contribuição
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="t-body tabular-nums text-[var(--admin-ink)]">
                {moeda(c.contribuicao ?? 0)}
              </span>
              <span className={cn("t-item tabular-nums", corDaMargem(c.margemContribuicao))}>
                {pct(c.margemContribuicao)}
              </span>
            </span>
          </div>

          {c.completa ? (
            <>
              <div className="mt-2 border-t border-dashed border-[var(--cream-deep)] pt-2">
                {c.maoDeObra > 0 && <Linha rotulo="Mão de obra" valor={c.maoDeObra} negativo />}
                {c.custoFixo > 0 && <Linha rotulo="Custo fixo" valor={c.custoFixo} negativo />}
                {c.taxa > 0 && <Linha rotulo="Taxa de pagamento" valor={c.taxa} negativo />}
                {c.perdas > 0 && <Linha rotulo="Outros" valor={c.perdas} negativo />}
              </div>

              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-[var(--cream-deep)] pt-2">
                <span className="t-item font-semibold text-[var(--admin-ink)]">Sobra real</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="t-item tabular-nums text-[var(--admin-ink)]">
                    {moeda(c.sobraReal ?? 0)}
                  </span>
                  <span className={cn("t-hero tabular-nums", corDaMargem(c.margemReal))}>
                    {pct(c.margemReal)}
                  </span>
                </span>
              </div>

              {c.precoMinimo != null && (
                <p
                  className={cn(
                    "t-support mt-2 rounded-lg px-2.5 py-1.5",
                    (c.sobraReal ?? 0) < 0
                      ? "bg-[var(--peach)] font-semibold text-[var(--coral)]"
                      : "bg-[var(--cream-soft)] text-muted-foreground",
                  )}
                >
                  {(c.sobraReal ?? 0) < 0
                    ? `Está dando prejuízo. Abaixo de ${moeda(c.precoMinimo)} esse produto não se paga.`
                    : `Abaixo de ${moeda(c.precoMinimo)} esse produto passa a dar prejuízo.`}
                </p>
              )}
            </>
          ) : (
            <p className="t-support mt-2 rounded-lg bg-[var(--cream-soft)] px-2.5 py-1.5 text-muted-foreground">
              Mão de obra e custo fixo estão fora desta conta. Ligue em Ajustes do cálculo para ver
              o que sobra de verdade.
            </p>
          )}
        </>
      )}
    </div>
  );
}

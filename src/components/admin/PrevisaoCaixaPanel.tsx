"use client";

import { ArrowDownCircle, ArrowUpCircle, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { mensagemDeErro } from "@/lib/erros";
import { formatarDataLonga } from "@/lib/prazo";
import { carregarPrevisao, type DiaPrevisto } from "@/lib/previsao";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader } from "./shell";

const JANELAS = [
  { dias: 30, rotulo: "30 dias" },
  { dias: 60, rotulo: "60 dias" },
  { dias: 90, rotulo: "90 dias" },
] as const;

/**
 * Previsão de caixa.
 *
 * As três peças já existiam separadas — saldo, a receber e a pagar. Aqui elas
 * viram uma linha do tempo com o saldo correndo dia a dia, que é o que
 * responde "vou ter dinheiro dia 15?".
 */
export function PrevisaoCaixaPanel() {
  const [dias, setDias] = useState<number>(60);
  const [dados, setDados] = useState<Awaited<ReturnType<typeof carregarPrevisao>> | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregarPrevisao({ data: { dias } }));
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar a previsão"));
    }
    setCarregando(false);
  }, [dias]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const negativo = dados?.menorSaldo && dados.menorSaldo.valor < 0;

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="Previsão de caixa"
        descricao="O saldo de hoje, mais o que os pedidos ainda vão trazer, menos as contas que vencem. Nada aqui é lançamento — é projeção."
      />

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao rotulo="Saldo hoje" valor={dados?.saldoHoje ?? 0} />
        <Cartao rotulo="Ainda entra" valor={dados?.totalAReceber ?? 0} cor="var(--whatsapp)" />
        <Cartao rotulo="Ainda sai" valor={dados?.totalAPagar ?? 0} cor="var(--terracotta)" />
        <Cartao
          rotulo="Saldo no fim"
          valor={dados?.saldoFinal ?? 0}
          cor={(dados?.saldoFinal ?? 0) < 0 ? "var(--destructive)" : undefined}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {JANELAS.map((j) => (
          <button
            key={j.dias}
            type="button"
            onClick={() => setDias(j.dias)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              dias === j.dias
                ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                : "border border-[var(--cream-deep)] bg-card text-foreground",
            )}
          >
            {j.rotulo}
          </button>
        ))}
      </div>

      {negativo && dados?.menorSaldo && (
        // O aviso e o produto da tela: sem ele, o usuario teria que ler a
        // tabela inteira procurando o dia em que o dinheiro acaba.
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-destructive bg-destructive/5 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="t-item text-destructive">
              O caixa fica negativo em {formatarDataLonga(dados.menorSaldo.data)}
            </p>
            <p className="t-support text-muted-foreground">
              Chega a {formatBRL(dados.menorSaldo.valor)}. Antecipar um recebimento ou
              adiar uma conta antes dessa data resolve.
            </p>
          </div>
        </div>
      )}

      {carregando ? (
        <Carregando texto="somando o que entra e o que sai…" />
      ) : !dados?.dias.length ? (
        <EstadoVazio
          titulo="Nada previsto no período"
          descricao="Quando houver pedido entregue sem pagamento ou conta a pagar em aberto, a projeção aparece aqui."
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {dados.dias.map((dia) => (
            <LinhaDia key={dia.data} dia={dia} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LinhaDia({ dia }: { dia: DiaPrevisto }) {
  const [aberto, setAberto] = useState(false);

  return (
    <li
      className={cn(
        "rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-soft)]",
        dia.saldo < 0 ? "border-destructive bg-destructive/5" : "border-[var(--admin-border)]",
      )}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full flex-wrap items-center gap-3 text-left"
      >
        <span className="t-item min-w-[7rem] shrink-0 text-foreground">
          {formatarDataLonga(dia.data)}
        </span>

        <span className="flex min-w-0 flex-1 flex-wrap gap-3">
          {dia.entradas > 0 && (
            <span className="t-support inline-flex items-center gap-1 text-[var(--whatsapp)]">
              <ArrowUpCircle className="h-3.5 w-3.5" />
              <Num>{formatBRL(dia.entradas)}</Num>
            </span>
          )}
          {dia.saidas > 0 && (
            <span className="t-support inline-flex items-center gap-1 text-[var(--terracotta)]">
              <ArrowDownCircle className="h-3.5 w-3.5" />
              <Num>{formatBRL(dia.saidas)}</Num>
            </span>
          )}
          <span className="t-support text-muted-foreground">
            {dia.itens.length} lançamento(s)
          </span>
        </span>

        <span
          className={cn(
            "t-item shrink-0 tabular-nums",
            dia.saldo < 0 ? "text-destructive" : "text-foreground",
          )}
        >
          <Num>{formatBRL(dia.saldo)}</Num>
        </span>
      </button>

      {aberto && (
        <ul className="mt-2 space-y-1 border-t border-[var(--admin-border)] pt-2">
          {dia.itens.map((item, i) => (
            <li key={`${item.descricao}-${i}`} className="flex items-center gap-2">
              <span className="t-body min-w-0 flex-1 truncate text-muted-foreground">
                {item.descricao}
              </span>
              <span
                className={cn(
                  "t-support shrink-0 tabular-nums",
                  item.tipo === "entrada" ? "text-[var(--whatsapp)]" : "text-[var(--terracotta)]",
                )}
              >
                {item.tipo === "entrada" ? "+" : "−"} {formatBRL(item.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Cartao({ rotulo, valor, cor }: { rotulo: string; valor: number; cor?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="t-support uppercase tracking-[0.14em] text-[var(--bronze)]">{rotulo}</p>
      <p className="mt-1 t-hero tabular-nums" style={{ color: cor ?? "var(--admin-ink)" }}>
        <Num>{formatBRL(valor)}</Num>
      </p>
    </div>
  );
}

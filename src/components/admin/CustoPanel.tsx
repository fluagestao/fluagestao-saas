"use client";

import { Calculator, Download, Pencil, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { carregarMargemProdutos, type MargemProduto } from "@/lib/custo";
import { mensagemDeErro } from "@/lib/erros";
import { listarInsumos, type InsumoRow } from "@/lib/insumos";
import { hojeISO } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/vendas";
import { ProdutoInsumosEditor } from "./ProdutoInsumosEditor";
import { Carregando, EstadoVazio, Num, PageHeader, ValorCarregando } from "./shell";

type Filtro = "vendidos" | "sem_custo" | "todos";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function porcento(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

/** Verde acima de 50, âmbar entre 25 e 50, vermelho abaixo. */
function corDaMargem(margem: number | null) {
  if (margem == null) return "text-muted-foreground";
  if (margem >= 0.5) return "text-[var(--green-ink)]";
  if (margem >= 0.25) return "text-[var(--bronze)]";
  return "text-destructive";
}

/**
 * Custo e margem por produto.
 *
 * O sistema já tinha as duas metades separadas — composição de insumo no
 * produto, preço na venda — e ninguém multiplicava uma pela outra. É a conta
 * que diz qual cesta vale empurrar.
 */
export function CustoPanel() {
  const hoje = hojeISO();
  const [mes, setMes] = useState(() => hoje.slice(0, 7));
  const [dados, setDados] = useState<Awaited<ReturnType<typeof carregarMargemProdutos>> | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("vendidos");
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [editando, setEditando] = useState<MargemProduto | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregarMargemProdutos({ data: { mes } }));
    } catch (e) {
      setErro(mensagemDeErro(e, "calcular a margem"));
    }
    setCarregando(false);
  }, [mes]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  // Os insumos nao dependem do mes: carrega uma vez e serve todos os dialogos.
  useEffect(() => {
    listarInsumos()
      .then(setInsumos)
      .catch(() => setInsumos([]));
  }, []);

  const visiveis = useMemo(() => {
    const lista = dados?.produtos ?? [];
    if (filtro === "vendidos") return lista.filter((p) => p.qtd > 0);
    if (filtro === "sem_custo") return lista.filter((p) => p.custo == null);
    return lista;
  }, [dados, filtro]);

  const anos = [Number(hoje.slice(0, 4)), Number(hoje.slice(0, 4)) - 1];

  function baixarCsv() {
    if (!visiveis.length) return;
    const campo = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const linhas = [
      ["Produto", "Categoria", "Coleção", "Vendidos", "Preço", "Custo", "Receita", "Lucro", "Margem"],
      ...visiveis.map((p) => [
        p.nome,
        p.categoria ?? "",
        p.colecao ?? "",
        String(p.qtd),
        p.preco?.toFixed(2).replace(".", ",") ?? "",
        p.custo?.toFixed(2).replace(".", ",") ?? "",
        p.receita.toFixed(2).replace(".", ","),
        p.lucro?.toFixed(2).replace(".", ",") ?? "",
        p.margem == null ? "" : `${Math.round(p.margem * 100)}%`,
      ]),
    ];
    const csv = linhas.map((l) => l.map(campo).join(";")).join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custo-e-margem-${mes}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="Margem"
        descricao="Quanto sobra em cada produto depois de pagar os insumos. Não desconta aluguel, luz e outras despesas fixas — para isso, veja o Financeiro."
        acoes={
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Mês
              <select
                value={mes.slice(5)}
                onChange={(e) => setMes(`${mes.slice(0, 4)}-${e.target.value}`)}
                className="h-9 min-w-36 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
              >
                {MESES.map((nome, i) => (
                  <option key={nome} value={String(i + 1).padStart(2, "0")}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Ano
              <select
                value={mes.slice(0, 4)}
                onChange={(e) => setMes(`${e.target.value}-${mes.slice(5)}`)}
                className="h-9 min-w-28 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
              >
                {anos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao rotulo="Receita" valor={formatBRL(dados?.receita ?? 0)} carregando={carregando} />
        <Cartao rotulo="Custo dos insumos" valor={formatBRL(dados?.custoTotal ?? 0)} cor="var(--terracotta)" carregando={carregando} />
        <Cartao rotulo="Sobrou" valor={formatBRL(dados?.lucro ?? 0)} cor="var(--green-ink)" carregando={carregando} />
        <Cartao
          rotulo="Margem"
          carregando={carregando}
          valor={porcento(dados?.margem ?? null)}
          nota="sobre o que tem custo cadastrado"
        />
      </div>

      {dados && dados.semComposicao > 0 && (
        // Sem esse aviso, a margem do topo parece valer para tudo e nao vale.
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--bronze)]" />
          <div className="min-w-0 flex-1">
            <p className="t-support text-muted-foreground">
              {dados.semComposicao} produto(s) venderam sem custo cadastrado e ficam fora da
              margem acima. Lance o custo deles aqui mesmo para a conta fechar.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltro("sem_custo")}
            className="h-8 shrink-0 rounded-lg"
          >
            Ver só esses
          </Button>
        </div>
      )}

      {/* Filtro: a tela serve para ler a margem do mes E para fechar os custos
          que faltam. Sem isso, produto que nunca vendeu nao aparece — e e
          justamente nele que costuma faltar custo. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(
          [
            ["vendidos", `Vendidos no mês${dados ? ` (${dados.produtos.filter((p) => p.qtd > 0).length})` : ""}`],
            ["sem_custo", `Sem custo${dados ? ` (${dados.semCustoTotal})` : ""}`],
            ["todos", `Todos${dados ? ` (${dados.totalProdutos})` : ""}`],
          ] as [Filtro, string][]
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={cn(
              "t-support h-8 rounded-full border px-3 font-medium transition-colors",
              filtro === id
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                : "border-[var(--cream-deep)] bg-card text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={baixarCsv}
          disabled={!visiveis.length}
          className="t-support inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--cream-deep)] bg-card px-3 font-medium text-foreground transition-colors hover:bg-[var(--cream-soft)] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar CSV
        </button>
      </div>

      {carregando ? (
        <Carregando texto="cruzando custo e venda…" />
      ) : !visiveis.length ? (
        <EstadoVazio
          titulo={
            filtro === "sem_custo"
              ? "Todo produto já tem custo cadastrado"
              : filtro === "vendidos"
                ? "Nenhum produto vendido no mês"
                : "Nenhum produto cadastrado"
          }
          descricao={
            filtro === "vendidos"
              ? "A conta usa os pedidos do mês com produto do catálogo. Item avulso, digitado à mão no pedido, não entra."
              : "Cadastre produtos em Cadastros → Produtos."
          }
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {visiveis.map((p) => (
            <Linha key={p.slug} produto={p} onEditar={() => setEditando(p)} />
          ))}
        </ul>
      )}

      <Dialog
        open={editando !== null}
        onOpenChange={(estado) => {
          if (!estado) {
            setEditando(null);
            // O editor salva sozinho; recarrega para a margem refletir na hora.
            recarregar();
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Custo do produto</DialogTitle>
            <DialogDescription>
              Lance os insumos e as quantidades usados em <strong>{editando?.nome}</strong>. O
              custo é a soma deles, e a margem sai do preço de venda.
            </DialogDescription>
          </DialogHeader>

          {editando && (
            <ProdutoInsumosEditor produtoId={editando.id} insumos={insumos} autoSave />
          )}

          <DialogFooter className="pt-1">
            <Button
              onClick={() => {
                setEditando(null);
                recarregar();
              }}
            >
              Pronto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Linha({ produto: p, onEditar }: { produto: MargemProduto; onEditar: () => void }) {
  const semCusto = p.custo == null;
  return (
    <li
      onClick={onEditar}
      className={cn(
        "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--terracotta)] sm:flex sm:flex-wrap",
        semCusto ? "border-[var(--cream-deep)] bg-[var(--cream-soft)]" : "border-[var(--admin-border)]",
      )}
    >
      <div className="min-w-0 sm:min-w-[14rem] sm:flex-1">
        <p className="t-item truncate text-foreground">{p.nome}</p>
        <p className="t-support truncate text-muted-foreground">
          {[p.colecao, p.categoria].filter(Boolean).join(" · ") || "sem categoria"}
        </p>
      </div>

      <div className="hidden w-24 text-right sm:block">
        <p className="t-support text-muted-foreground">vendidos</p>
        <p className="t-body tabular-nums text-foreground">{p.qtd}</p>
      </div>

      <div className="hidden w-28 text-right lg:block">
        <p className="t-support text-muted-foreground">custo un.</p>
        <p className="t-body tabular-nums text-foreground">
          {p.custo == null ? "—" : formatBRL(p.custo)}
        </p>
      </div>

      <div className="w-28 text-right">
        <p className="t-support text-muted-foreground">receita</p>
        <p className="t-body tabular-nums text-foreground">
          <Num>{formatBRL(p.receita)}</Num>
        </p>
      </div>

      <div className="w-28 text-right">
        <p className="t-support text-muted-foreground">sobrou</p>
        <p className="t-item tabular-nums text-foreground">
          {p.lucro == null ? "—" : <Num>{formatBRL(p.lucro)}</Num>}
        </p>
      </div>

      <div className="w-20 text-right">
        <p className="t-support text-muted-foreground">margem</p>
        <p className={cn("t-item tabular-nums", corDaMargem(p.margem))}>{porcento(p.margem)}</p>
      </div>

      <div className="shrink-0 pl-1">
        {semCusto ? (
          <span className="t-support inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--peach)] px-2.5 font-semibold text-[var(--coral)]">
            <Calculator className="h-3.5 w-3.5" />
            Lançar custo
          </span>
        ) : (
          <span className="t-support inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </span>
        )}
      </div>
    </li>
  );
}

function Cartao({
  rotulo,
  valor,
  cor,
  nota,
  carregando,
}: {
  rotulo: string;
  valor: string;
  cor?: string;
  nota?: string;
  carregando?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="t-support uppercase tracking-[0.14em] text-[var(--bronze)]">{rotulo}</p>
      {carregando ? (
        <ValorCarregando />
      ) : (
        <p className="mt-1 t-hero tabular-nums" style={{ color: cor ?? "var(--admin-ink)" }}>
          <Num>{valor}</Num>
        </p>
      )}
      {nota && <p className="t-support mt-0.5 text-muted-foreground">{nota}</p>}
    </div>
  );
}

"use client";

import { Download, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { carregarMargemProdutos, type MargemProduto } from "@/lib/custo";
import { mensagemDeErro } from "@/lib/erros";
import { hojeISO } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader } from "./shell";

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

  const anos = [Number(hoje.slice(0, 4)), Number(hoje.slice(0, 4)) - 1];

  function baixarCsv() {
    if (!dados?.produtos.length) return;
    const campo = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const linhas = [
      ["Produto", "Categoria", "Coleção", "Vendidos", "Preço", "Custo", "Receita", "Lucro", "Margem"],
      ...dados.produtos.map((p) => [
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
        titulo="Custo"
        descricao="Quanto cada produto custa para montar e quanto sobra depois de vender. O custo vem da composição de insumos cadastrada hoje."
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
        <Cartao rotulo="Receita" valor={formatBRL(dados?.receita ?? 0)} />
        <Cartao rotulo="Custo dos insumos" valor={formatBRL(dados?.custoTotal ?? 0)} cor="var(--terracotta)" />
        <Cartao rotulo="Sobrou" valor={formatBRL(dados?.lucro ?? 0)} cor="var(--green-ink)" />
        <Cartao
          rotulo="Margem"
          valor={porcento(dados?.margem ?? null)}
          nota="sobre o que tem custo cadastrado"
        />
      </div>

      {dados && dados.semComposicao > 0 && (
        // Sem esse aviso, a margem do topo parece valer para tudo e nao vale.
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--bronze)]" />
          <p className="t-support text-muted-foreground">
            {dados.semComposicao} produto(s) venderam sem composição de insumos cadastrada e
            ficam fora da margem acima. Cadastre os insumos deles em Cadastros → Produtos para
            a conta fechar.
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={baixarCsv}
          disabled={!dados?.produtos.length}
          className="t-support inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--cream-deep)] bg-card px-3 font-medium text-foreground transition-colors hover:bg-[var(--cream-soft)] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar CSV
        </button>
      </div>

      {carregando ? (
        <Carregando texto="cruzando custo e venda…" />
      ) : !dados?.produtos.length ? (
        <EstadoVazio
          titulo="Nenhum produto vendido no mês"
          descricao="A conta usa os pedidos do mês com produto do catálogo. Item avulso, digitado à mão no pedido, não entra."
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {dados.produtos.map((p) => (
            <Linha key={p.slug} produto={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Linha({ produto: p }: { produto: MargemProduto }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl border border-[var(--admin-border)] bg-card px-4 py-3 shadow-[var(--shadow-soft)] sm:flex sm:flex-wrap">
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
    </li>
  );
}

function Cartao({ rotulo, valor, cor, nota }: { rotulo: string; valor: string; cor?: string; nota?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="t-support uppercase tracking-[0.14em] text-[var(--bronze)]">{rotulo}</p>
      <p className="mt-1 t-hero tabular-nums" style={{ color: cor ?? "var(--admin-ink)" }}>
        <Num>{valor}</Num>
      </p>
      {nota && <p className="t-support mt-0.5 text-muted-foreground">{nota}</p>}
    </div>
  );
}

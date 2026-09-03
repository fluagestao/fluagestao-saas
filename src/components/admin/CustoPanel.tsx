"use client";

import { Download, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { carregarMargemProdutos, type MargemProduto } from "@/lib/custo";
import { mensagemDeErro } from "@/lib/erros";
import {
  hojeISO,
  intervaloAno,
  intervaloMes,
  intervaloSemana,
  type Intervalo,
} from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader, ValorCarregando } from "./shell";

type Filtro = "vendidos" | "sem_custo" | "todos";

type Atalho = "hoje" | "semana" | "mes" | "mes_passado" | "ano" | "escolher";

/* Atalhos de calendario, nao janelas moveis: um relatorio precisa fechar com o
   que a pessoa confere em outro lugar. "Ultimos 30 dias" nao bate com mes
   nenhum. Mesma regra ja usada em Vendas realizadas. */
const ATALHOS: { id: Atalho; label: string; intervalo: (hoje: string) => Intervalo }[] = [
  { id: "hoje", label: "Hoje", intervalo: (h) => ({ de: h, ate: h }) },
  { id: "semana", label: "Esta semana", intervalo: (h) => intervaloSemana(h, 0) },
  { id: "mes", label: "Este mês", intervalo: (h) => intervaloMes(h, 0) },
  { id: "mes_passado", label: "Mês passado", intervalo: (h) => intervaloMes(h, -1) },
  { id: "ano", label: "Este ano", intervalo: (h) => intervaloAno(h, 0) },
];

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
  const [atalho, setAtalho] = useState<Atalho>("mes");
  const [periodo, setPeriodo] = useState<Intervalo>(() => intervaloMes(hoje, 0));
  const [dados, setDados] = useState<Awaited<ReturnType<typeof carregarMargemProdutos>> | null>(
    null,
  );
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("vendidos");

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await carregarMargemProdutos({ data: periodo }));
    } catch (e) {
      setErro(mensagemDeErro(e, "calcular a margem"));
    }
    setCarregando(false);
  }, [periodo]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

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
      ["Produto", "Categoria", "Coleção", "Vendidos", "Preço", "Custo", "Receita", "Lucro", "Margem bruta", "Markup", "Mão de obra", "Custo fixo", "Sobra real", "Margem líquida"],
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
        markup(p.receita, p.custo != null ? p.custo * p.qtd : 0) ?? "",
        p.maoDeObraTotal?.toFixed(2).replace(".", ",") ?? "",
        p.descontosTotal?.toFixed(2).replace(".", ",") ?? "",
        p.sobraReal?.toFixed(2).replace(".", ",") ?? "",
        p.margemReal == null ? "" : `${Math.round(p.margemReal * 100)}%`,
      ]),
    ];
    const csv = linhas.map((l) => l.map(campo).join(";")).join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `margem-${periodo.de}-a-${periodo.ate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="Margem"
        descricao="O que vendeu no período e quanto sobrou depois dos insumos. Não desconta aluguel, luz e outras despesas fixas — para isso, veja o Financeiro. Para lançar custo, use a Calculadora."
        acoes={
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Período
              <select
                value={atalho}
                onChange={(e) => {
                  const id = e.target.value as Atalho;
                  setAtalho(id);
                  // "escolher" só libera os campos e preserva o intervalo, para
                  // dar pra partir de um atalho e ajustar só a ponta.
                  const escolhido = ATALHOS.find((a) => a.id === id);
                  if (escolhido) setPeriodo(escolhido.intervalo(hoje));
                }}
                className="h-9 min-w-44 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
              >
                {ATALHOS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
                <option value="escolher">Escolher datas</option>
              </select>
            </label>

            <label className="grid gap-1 text-xs text-muted-foreground">
              De
              <input
                type="date"
                value={periodo.de}
                max={periodo.ate}
                onChange={(e) => {
                  setAtalho("escolher");
                  setPeriodo((p) => ({ ...p, de: e.target.value }));
                }}
                className="h-9 rounded-lg border border-[var(--cream-deep)] bg-background px-2 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
              />
            </label>

            <label className="grid gap-1 text-xs text-muted-foreground">
              Até
              <input
                type="date"
                value={periodo.ate}
                min={periodo.de}
                onChange={(e) => {
                  setAtalho("escolher");
                  setPeriodo((p) => ({ ...p, ate: e.target.value }));
                }}
                className="h-9 rounded-lg border border-[var(--cream-deep)] bg-background px-2 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
              />
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
          rotulo={dados?.calculoCompleto ? "Margem bruta" : "Margem"}
          carregando={carregando}
          valor={porcento(dados?.margem ?? null)}
          nota="depois só dos insumos"
          ladoRotulo="Markup"
          ladoValor={markup(dados?.receita ?? 0, dados?.custoTotal ?? 0) ?? undefined}
          ladoNota="sobre o insumo"
        />
      </div>

      {/* So aparece com a conta completa ligada: sem mao de obra e sem fixo,
          repetir os mesmos numeros com outro nome seria enganoso. */}
      {dados?.calculoCompleto && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Cartao
            rotulo="Mão de obra"
            valor={formatBRL(dados.maoDeObra)}
            cor="var(--terracotta)"
            carregando={carregando}
          />
          <Cartao
            rotulo="Custo fixo e taxas"
            valor={formatBRL(dados.descontos)}
            cor="var(--terracotta)"
            carregando={carregando}
          />
          <Cartao
            rotulo="Sobra real"
            valor={formatBRL(dados.sobraReal ?? 0)}
            cor={(dados.sobraReal ?? 0) < 0 ? "var(--destructive)" : "var(--green-ink)"}
            carregando={carregando}
            nota="depois de tudo"
          />
          <Cartao
            rotulo="Margem líquida"
            valor={porcento(dados.margemReal ?? null)}
            carregando={carregando}
            nota="depois de mão de obra e fixos"
            ladoRotulo="Markup"
            ladoValor={
              markup(dados.receita, dados.custoTotal + dados.maoDeObra + dados.descontos) ?? undefined
            }
            ladoNota="sobre o custo total"
          />
        </div>
      )}

      {dados && dados.semComposicao > 0 && (
        // Sem esse aviso, a margem do topo parece valer para tudo e nao vale.
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--bronze)]" />
          <div className="min-w-0 flex-1">
            <p className="t-support text-muted-foreground">
              {dados.semComposicao} produto(s) venderam sem custo cadastrado e ficam fora da
              margem acima. Lance o custo deles na Calculadora para a conta fechar.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="h-8 shrink-0 rounded-lg">
            <a href="/custo/calculadora">Abrir Calculadora</a>
          </Button>
        </div>
      )}

      {/* Filtro: a tela serve para ler a margem do mes E para fechar os custos
          que faltam. Sem isso, produto que nunca vendeu nao aparece — e e
          justamente nele que costuma faltar custo. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(
          [
            ["vendidos", `Vendidos no período${dados ? ` (${dados.produtos.filter((p) => p.qtd > 0).length})` : ""}`],
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
              ? "A conta usa os pedidos do período com produto do catálogo. Item avulso, digitado à mão no pedido, não entra."
              : "Cadastre produtos em Cadastros → Produtos."
          }
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {visiveis.map((p) => (
            <Linha key={p.slug} produto={p} />
          ))}
        </ul>
      )}

    </section>
  );
}

function Linha({ produto: p }: { produto: MargemProduto }) {
  const semCusto = p.custo == null;
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-soft)] sm:flex sm:flex-wrap",
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
        <p className="t-support text-muted-foreground">
          {p.margemReal == null ? "margem" : "bruta"}
        </p>
        <p className={cn("t-item tabular-nums", corDaMargem(p.margem))}>{porcento(p.margem)}</p>
      </div>

      {/* Markup ao lado da margem, no espaco que ja sobrava. Mesma relacao
          vista do outro lado: por quanto o preco multiplica o custo. */}
      <div className="hidden w-20 text-right sm:block">
        <p className="t-support text-muted-foreground">markup</p>
        <p className="t-item tabular-nums text-[var(--admin-ink-soft)]">
          {markup(p.receita, p.custo != null ? p.custo * p.qtd : 0) ?? "—"}
        </p>
      </div>

      {p.margemReal != null && (
        <div className="w-24 text-right">
          <p className="t-support text-muted-foreground">líquida</p>
          <p className={cn("t-item tabular-nums", corDaMargem(p.margemReal))}>
            {porcento(p.margemReal)}
          </p>
        </div>
      )}

      {semCusto && (
        <span className="t-support shrink-0 rounded-lg bg-[var(--peach)] px-2.5 py-1 font-semibold text-[var(--coral)]">
          sem custo
        </span>
      )}
    </li>
  );
}

/**
 * Quanto se acrescenta ao custo, em porcentagem: 2,2x de preco sobre custo e
 * +120% em cima dele.
 *
 * Vai com o sinal de mais de proposito. Sem ele, "120%" na mesma linha de uma
 * margem de "65%" parece a mesma unidade e nao e — margem mede sobre o preco,
 * markup mede sobre o custo. Null sem custo: dividir por zero daria infinito.
 */
function markup(receita: number, custo: number): string | null {
  if (!custo || custo <= 0 || !receita) return null;
  const pct = (receita / custo - 1) * 100;
  return `+${pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

function Cartao({
  rotulo,
  valor,
  cor,
  nota,
  carregando,
  ladoRotulo,
  ladoValor,
  ladoNota,
}: {
  rotulo: string;
  valor: string;
  cor?: string;
  nota?: string;
  carregando?: boolean;
  /* Segunda leitura do MESMO numero, no espaco que sobrava a direita.
     Margem responde "quanto do preco sobra"; markup responde "por quanto
     multiplico o custo". Sao a mesma relacao vista dos dois lados, e quem
     forma preco pensa no segundo. */
  ladoRotulo?: string;
  ladoValor?: string;
  ladoNota?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="min-w-0">
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

      {!carregando && ladoValor && (
        <div className="min-w-0 shrink-0 border-l border-[var(--cream-deep)] pl-3 text-right">
          <p className="t-support uppercase tracking-[0.14em] text-[var(--bronze)]">{ladoRotulo}</p>
          <p className="mt-1 t-hero tabular-nums text-[var(--admin-ink-soft)]">
            <Num>{ladoValor}</Num>
          </p>
          {ladoNota && <p className="t-support mt-0.5 text-muted-foreground">{ladoNota}</p>}
        </div>
      )}
    </div>
  );
}

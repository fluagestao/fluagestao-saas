"use client";

import { ChefHat, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  carregarReceitas,
  removerReceita,
  salvarReceita,
  type Receita,
} from "@/lib/cozinha";
import { mensagemDeErro } from "@/lib/erros";
import { Carregando, EstadoVazio, PageHeader, useConfirmar } from "./shell";

type LinhaIngrediente = {
  chave: string;
  descricao: string;
  quantidade: string;
  valor: string;
};

let sequencia = 0;
function linhaVazia(): LinhaIngrediente {
  sequencia += 1;
  return { chave: `i${sequencia}`, descricao: "", quantidade: "1", valor: "" };
}

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

/** Receita barata rende porção de centavos: duas casas esconderiam o valor. */
function moedaFina(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: valor > 0 && valor < 1 ? 4 : 2,
  }).format(valor || 0);
}

function numeroBr(valor: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(valor || 0);
}

function paraNumero(texto: string): number {
  const bruto = texto.trim();
  if (!bruto) return Number.NaN;
  return Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
}

/**
 * Cozinha: livro de receitas.
 *
 * Autocontida de propósito — os ingredientes são digitados, não puxados do
 * cadastro de insumos. Anotar uma receita tem que ser rápido; obrigar a
 * cadastrar cada ovo antes mataria o uso.
 */
export function CozinhaPanel() {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Receita | "nova" | null>(null);
  const confirmar = useConfirmar();

  async function carregar() {
    setCarregando(true);
    try {
      setReceitas(await carregarReceitas());
    } catch (e) {
      toast.error(mensagemDeErro(e, "carregar as receitas"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return receitas;
    return receitas.filter((r) => r.nome.toLocaleLowerCase("pt-BR").includes(termo));
  }, [receitas, busca]);

  async function excluir(r: Receita) {
    const ok = await confirmar({
      titulo: `Excluir "${r.nome}"?`,
      descricao: "A receita e os ingredientes dela somem. Isso não tem volta.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    try {
      await removerReceita({ data: { id: r.id } });
      toast.success("Receita excluída.");
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir a receita"));
    }
  }

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="Cozinha"
        descricao="Suas receitas com o custo por porção. Os ingredientes são digitados aqui mesmo — não precisa cadastrar insumo para anotar."
        acoes={
          <Button onClick={() => setEditando("nova")} className="h-11">
            <Plus className="mr-1.5 h-4 w-4" />
            Nova receita
          </Button>
        }
      />

      <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar receita"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {carregando ? (
        <Carregando texto="carregando receitas…" />
      ) : !visiveis.length ? (
        <EstadoVazio
          titulo={receitas.length === 0 ? "Nenhuma receita ainda" : "Nenhuma receita encontrada"}
          descricao={
            receitas.length === 0
              ? "Anote uma receita para saber quanto custa cada porção."
              : "Tente outro nome."
          }
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {visiveis.map((r) => (
            <li
              key={r.id}
              onClick={() => setEditando(r)}
              className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-[var(--admin-border)] bg-card px-4 py-3 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--terracotta)]"
            >
              <div className="min-w-0 flex-1 sm:min-w-[14rem]">
                <p className="t-item truncate text-foreground">{r.nome}</p>
                <p className="t-support truncate text-muted-foreground">
                  {r.ingredientes.length} ingrediente{r.ingredientes.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="w-28 text-right">
                <p className="t-support text-muted-foreground">custo</p>
                <p className="t-body tabular-nums text-foreground">{moeda(r.custo_total)}</p>
              </div>

              <div className="w-28 text-right">
                <p className="t-support text-muted-foreground">rende</p>
                <p className="t-body tabular-nums text-foreground">
                  {numeroBr(r.rendimento)} {r.unidade_rendimento}
                </p>
              </div>

              <div className="w-32 text-right">
                <p className="t-support text-muted-foreground">por {r.unidade_rendimento}</p>
                <p className="t-item tabular-nums font-bold text-[var(--wine)]">
                  {moedaFina(r.custo_por_porcao)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  excluir(r);
                }}
                aria-label={`Excluir ${r.nome}`}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <DialogoReceita
          receita={editando === "nova" ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvo={async () => {
            setEditando(null);
            await carregar();
          }}
        />
      )}
    </section>
  );
}

function DialogoReceita({
  receita,
  onFechar,
  onSalvo,
}: {
  receita: Receita | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(receita?.nome ?? "");
  const [rendimento, setRendimento] = useState(
    receita ? String(receita.rendimento).replace(".", ",") : "1",
  );
  const [unidade, setUnidade] = useState(receita?.unidade_rendimento ?? "porção");
  const [modoPreparo, setModoPreparo] = useState(receita?.modo_preparo ?? "");
  const [observacao, setObservacao] = useState(receita?.observacao ?? "");
  const [linhas, setLinhas] = useState<LinhaIngrediente[]>(() =>
    receita && receita.ingredientes.length
      ? receita.ingredientes.map((i) => ({
          chave: i.id,
          descricao: i.descricao,
          quantidade: String(i.quantidade).replace(".", ","),
          valor: i.valor_unitario.toFixed(2).replace(".", ","),
        }))
      : [linhaVazia()],
  );
  const [salvando, setSalvando] = useState(false);

  const custoTotal = linhas.reduce((soma, l) => {
    const q = paraNumero(l.quantidade);
    const v = paraNumero(l.valor);
    if (!Number.isFinite(q) || !Number.isFinite(v)) return soma;
    return soma + q * v;
  }, 0);

  const rendimentoNumero = paraNumero(rendimento);
  const temRendimento = Number.isFinite(rendimentoNumero) && rendimentoNumero > 0;
  const porPorcao = temRendimento ? custoTotal / rendimentoNumero : null;

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Dê um nome à receita.");
      return;
    }
    if (!temRendimento) {
      toast.error("Informe quanto a receita rende.");
      return;
    }

    const ingredientes: { descricao: string; quantidade: number; valor_unitario: number }[] = [];
    for (const l of linhas) {
      if (!l.descricao.trim() && !l.valor.trim()) continue; // linha em branco: ignora
      if (!l.descricao.trim()) {
        toast.error("Tem um ingrediente sem nome.");
        return;
      }
      const q = paraNumero(l.quantidade);
      const v = paraNumero(l.valor);
      if (!Number.isFinite(q) || q <= 0) {
        toast.error(`Quantidade inválida em "${l.descricao}".`);
        return;
      }
      if (!Number.isFinite(v) || v < 0) {
        toast.error(`Valor inválido em "${l.descricao}".`);
        return;
      }
      ingredientes.push({ descricao: l.descricao.trim(), quantidade: q, valor_unitario: v });
    }

    setSalvando(true);
    try {
      await salvarReceita({
        data: {
          id: receita?.id,
          nome: nome.trim(),
          rendimento: rendimentoNumero,
          unidade_rendimento: unidade.trim() || "porção",
          modo_preparo: modoPreparo.trim() || null,
          observacao: observacao.trim() || null,
          ingredientes,
        },
      });
      toast.success(receita ? "Receita atualizada." : "Receita salva.");
      onSalvo();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar a receita"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="flex max-h-[calc(100dvh-8rem)] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0 pr-6 text-left">
          <DialogTitle>{receita ? "Editar receita" : "Nova receita"}</DialogTitle>
          <DialogDescription>
            Anote os ingredientes com o que você pagou. O custo por porção sai da divisão pelo
            rendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
            Nome
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Bolo de cenoura"
              className="h-11"
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Rende
            <Input
              value={rendimento}
              onChange={(e) => setRendimento(e.target.value)}
              inputMode="decimal"
              placeholder="5"
              className="h-11"
            />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Unidade
            <Input
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              placeholder="porção"
              className="h-11"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-3">
          <p className="mb-2 text-sm font-semibold text-foreground">Ingredientes</p>

          <div className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
            {linhas.map((linha) => (
              <div key={linha.chave} className="flex items-start gap-2">
                <Input
                  value={linha.descricao}
                  onChange={(e) =>
                    setLinhas((atual) =>
                      atual.map((l) =>
                        l.chave === linha.chave ? { ...l, descricao: e.target.value } : l,
                      ),
                    )
                  }
                  placeholder="Ex.: Cenoura"
                  className="h-10 min-w-0 flex-1 bg-white"
                />
                <Input
                  value={linha.quantidade}
                  onChange={(e) =>
                    setLinhas((atual) =>
                      atual.map((l) =>
                        l.chave === linha.chave ? { ...l, quantidade: e.target.value } : l,
                      ),
                    )
                  }
                  inputMode="decimal"
                  placeholder="qtd"
                  className="h-10 w-20 shrink-0 bg-white text-center"
                />
                <Input
                  value={linha.valor}
                  onChange={(e) =>
                    setLinhas((atual) =>
                      atual.map((l) =>
                        l.chave === linha.chave ? { ...l, valor: e.target.value } : l,
                      ),
                    )
                  }
                  inputMode="decimal"
                  placeholder="R$ un."
                  className="h-10 w-24 shrink-0 bg-white text-center"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setLinhas((atual) =>
                      atual.length === 1 ? [linhaVazia()] : atual.filter((l) => l.chave !== linha.chave),
                    )
                  }
                  aria-label="Remover ingrediente"
                  className="h-10 w-9 shrink-0"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setLinhas((atual) => [...atual, linhaVazia()])}
            className="mt-2 h-9 w-full rounded-lg border border-dashed border-[var(--cream-deep)] text-[var(--admin-ink-soft)]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar ingrediente
          </Button>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5">
            <span className="text-sm text-[var(--admin-ink-soft)]">
              Custo da receita: <strong className="font-bold">{moeda(custoTotal)}</strong>
            </span>
            <span className="text-sm text-[var(--admin-ink-soft)]">
              {porPorcao == null ? (
                "Informe o rendimento para ver o custo por porção."
              ) : (
                <>
                  Cada {unidade.trim() || "porção"}:{" "}
                  <strong className="font-bold text-[var(--wine)]">{moedaFina(porPorcao)}</strong>
                </>
              )}
            </span>
          </div>
        </div>

        <label className="space-y-1.5 text-sm font-medium">
          Modo de preparo <span className="font-normal text-muted-foreground">(opcional)</span>
          <Textarea
            value={modoPreparo}
            onChange={(e) => setModoPreparo(e.target.value)}
            placeholder="Passo a passo, tempo de forno, ponto..."
            rows={4}
          />
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          Observação <span className="font-normal text-muted-foreground">(opcional)</span>
          <Input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Rende mais se a forma for maior..."
            className="h-11"
          />
        </label>
        </div>

        <DialogFooter className="shrink-0 border-t border-[var(--admin-border)] pt-3">
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            <ChefHat className="mr-1.5 h-4 w-4" />
            {receita ? "Salvar alterações" : "Salvar receita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

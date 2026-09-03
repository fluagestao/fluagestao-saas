"use client";

import { Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import {
  listarComposicaoProduto,
  salvarComposicaoProduto,
  type InsumoRow,
} from "@/lib/insumos";
import { mensagemDeErro } from "@/lib/erros";

export type ItemComposicaoProduto = {
  insumoId: string;
  quantidade: number;
};

type ChangePayload = {
  itens: ItemComposicaoProduto[];
  custoTotal: number;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function ProdutoInsumosEditor({
  produtoId,
  insumos,
  autoSave = true,
  onChange,
}: {
  produtoId: string;
  insumos: InsumoRow[];
  autoSave?: boolean;
  onChange?: (payload: ChangePayload) => void;
}) {
  const [itens, setItens] = useState<ItemComposicaoProduto[]>([]);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    listarComposicaoProduto({ data: { id: produtoId } })
      .then((rows) => {
        setItens(
          (rows ?? []).map((row: any) => ({
            insumoId: row.insumo_id,
            quantidade: Number(row.quantidade),
          })),
        );
      })
      .catch(() => undefined);
  }, [produtoId]);

  const ativos = useMemo(() => insumos.filter((item) => item.ativo), [insumos]);

  const sugestoes = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return [];

    return ativos
      .filter((insumo) => !itens.some((item) => item.insumoId === insumo.id))
      .filter((insumo) => normalizar(insumo.nome).includes(termo))
      .slice(0, 8);
  }, [ativos, busca, itens]);

  const custoTotal = useMemo(
    () =>
      itens.reduce((total, item) => {
        const insumo = insumos.find((i) => i.id === item.insumoId);
        if (!insumo) return total;
        return total + item.quantidade * insumo.custo_referencia;
      }, 0),
    [itens, insumos],
  );

  useEffect(() => {
    onChange?.({ itens, custoTotal });
  }, [itens, custoTotal, onChange]);

  async function aplicar(proximos: ItemComposicaoProduto[]) {
    setItens(proximos);
    if (!autoSave) return;

    setSalvando(true);
    try {
      await salvarComposicaoProduto({
        data: {
          produtoId,
          itens: proximos,
        },
      });
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar composição"));
    } finally {
      setSalvando(false);
    }
  }

  function selecionarInsumo(insumoId: string) {
    if (itens.some((item) => item.insumoId === insumoId)) return;
    aplicar([...itens, { insumoId, quantidade: 1 }]);
    setBusca("");
  }

  function alterarQuantidade(insumoId: string, valor: string) {
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) return;

    aplicar(
      itens.map((item) =>
        item.insumoId === insumoId ? { ...item, quantidade: numero } : item,
      ),
    );
  }

  function remover(insumoId: string) {
    aplicar(itens.filter((item) => item.insumoId !== insumoId));
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Insumos do produto</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Pesquise um insumo, selecione e informe a quantidade utilizada.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Custo estimado
          </p>
          <p className="text-xl font-bold text-[var(--terracotta)]">{moeda(custoTotal)}</p>
        </div>
      </div>

      <div className="relative mt-5">
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-[var(--admin-border)] bg-white px-4 shadow-sm transition focus-within:border-[var(--terracotta)] focus-within:ring-2 focus-within:ring-[color:rgba(169,79,69,0.10)]">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar insumo pelo nome..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
        </label>

        {busca.trim() && (
          <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-[var(--admin-border)] bg-white p-2 shadow-[0_20px_50px_rgba(84,52,48,0.16)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sugestoes.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                Nenhum insumo disponível com esse nome.
              </p>
            ) : (
              sugestoes.map((insumo) => (
                <button
                  key={insumo.id}
                  type="button"
                  onClick={() => selecionarInsumo(insumo.id)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--cream-soft)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{insumo.nome}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {insumo.unidade} · custo unitário {moeda(insumo.custo_referencia)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-[var(--terracotta)]">
                    Selecionar
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-2.5 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[360px] sm:overflow-y-auto">
        {itens.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--admin-border)] px-4 py-8 text-center text-sm text-muted-foreground">
            Pesquise acima para adicionar os insumos deste produto.
          </div>
        ) : (
          itens.map((item) => {
            const insumo = insumos.find((i) => i.id === item.insumoId);
            if (!insumo) return null;
            const custo = item.quantidade * insumo.custo_referencia;

            return (
              <div
                key={item.insumoId}
                className="grid grid-cols-[minmax(0,1fr)_96px_44px] items-center gap-2 rounded-2xl border border-[var(--admin-border)] bg-[var(--cream-soft)] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_130px_130px_40px] sm:gap-3 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{insumo.nome}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {moeda(insumo.custo_referencia)} / {insumo.unidade}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                    Quantidade
                  </p>
                  <Input
                    defaultValue={String(item.quantidade).replace(".", ",")}
                    onChange={(e) => alterarQuantidade(item.insumoId, e.target.value)}
                    inputMode="decimal"
                    className="h-11 bg-white px-3 text-sm sm:h-9"
                    aria-label={`Quantidade de ${insumo.nome}`}
                  />
                </div>

                <div className="col-span-2 col-start-1 row-start-2 text-left sm:col-span-1 sm:col-start-auto sm:row-start-auto sm:text-right">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                    Custo
                  </p>
                  <p className="h-9 content-center text-sm font-bold text-[var(--wine)]">{moeda(custo)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => remover(item.insumoId)}
                  disabled={salvando}
                  className="col-start-3 row-start-1 grid h-11 w-11 place-items-center rounded-xl text-destructive transition hover:bg-red-50 disabled:opacity-50 sm:col-start-auto sm:row-start-auto sm:h-9 sm:w-9"
                  aria-label={`Remover ${insumo.nome}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

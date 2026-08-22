"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listarComposicaoProduto,
  salvarComposicaoProduto,
  type InsumoRow,
} from "@/lib/insumos";
import { mensagemDeErro } from "@/lib/erros";

type ItemComposicao = {
  insumoId: string;
  quantidade: number;
};

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function ProdutoInsumosEditor({
  produtoId,
  insumos,
}: {
  produtoId: string;
  insumos: InsumoRow[];
}) {
  const [itens, setItens] = useState<ItemComposicao[]>([]);
  const [novoInsumoId, setNovoInsumoId] = useState("");
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

  const custoTotal = useMemo(
    () =>
      itens.reduce((total, item) => {
        const insumo = insumos.find((i) => i.id === item.insumoId);
        if (!insumo || insumo.quantidade_referencia <= 0) return total;
        return total + (item.quantidade / insumo.quantidade_referencia) * insumo.custo_referencia;
      }, 0),
    [itens, insumos],
  );

  async function persistir(proximos: ItemComposicao[]) {
    setItens(proximos);
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

  function adicionar() {
    if (!novoInsumoId || itens.some((item) => item.insumoId === novoInsumoId)) return;
    persistir([...itens, { insumoId: novoInsumoId, quantidade: 1 }]);
    setNovoInsumoId("");
  }

  function alterarQuantidade(insumoId: string, valor: string) {
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) return;
    persistir(
      itens.map((item) =>
        item.insumoId === insumoId ? { ...item, quantidade: numero } : item,
      ),
    );
  }

  function remover(insumoId: string) {
    persistir(itens.filter((item) => item.insumoId !== insumoId));
  }

  return (
    <div className="mt-5 border-t border-[var(--admin-border)] pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Insumos do produto</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">O custo é calculado automaticamente.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Custo estimado</p>
          <p className="text-base font-bold text-[var(--terracotta)]">{moeda(custoTotal)}</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <select
          value={novoInsumoId}
          onChange={(e) => setNovoInsumoId(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs"
        >
          <option value="">Selecionar insumo</option>
          {ativos
            .filter((insumo) => !itens.some((item) => item.insumoId === insumo.id))
            .map((insumo) => (
              <option key={insumo.id} value={insumo.id}>
                {insumo.nome} · {insumo.unidade}
              </option>
            ))}
        </select>
        <Button type="button" size="sm" variant="outline" onClick={adicionar} disabled={!novoInsumoId || salvando}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      <div className="mt-3 max-h-[210px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {itens.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--admin-border)] px-3 py-4 text-center text-xs text-muted-foreground">
            Nenhum insumo adicionado.
          </div>
        ) : (
          itens.map((item) => {
            const insumo = insumos.find((i) => i.id === item.insumoId);
            if (!insumo) return null;
            const custo = insumo.quantidade_referencia > 0
              ? (item.quantidade / insumo.quantidade_referencia) * insumo.custo_referencia
              : 0;
            return (
              <div key={item.insumoId} className="grid grid-cols-[minmax(0,1fr)_76px_76px_30px] items-center gap-2 rounded-xl bg-[var(--cream-soft)] px-2.5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{insumo.nome}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {moeda(insumo.custo_referencia)} / {String(insumo.quantidade_referencia).replace(".", ",")} {insumo.unidade}
                  </p>
                </div>
                <Input
                  key={`${item.insumoId}-${item.quantidade}`}
                  defaultValue={String(item.quantidade).replace(".", ",")}
                  onBlur={(e) => alterarQuantidade(item.insumoId, e.target.value)}
                  inputMode="decimal"
                  className="h-8 px-2 text-xs"
                  aria-label={`Quantidade de ${insumo.nome}`}
                />
                <span className="text-right text-xs font-semibold text-[var(--wine)]">{moeda(custo)}</span>
                <button type="button" onClick={() => remover(item.insumoId)} className="grid h-7 w-7 place-items-center rounded-lg text-destructive hover:bg-red-50" aria-label={`Remover ${insumo.nome}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

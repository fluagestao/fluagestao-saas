import { useEffect, useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { hojeISO } from "@/lib/prazo";
import { carregarBairros } from "@/lib/bairros";
import { calcularFrete, type Bairro } from "@/lib/frete";
import { registrarPagamento } from "@/lib/pedidos";
import { formatBRL, subtotalItens, totalPedido, type Pedido } from "@/lib/vendas";
import { Num } from "./shell";
import { mensagemDeErro } from "@/lib/erros";
import { paraNumero as paraNumeroBase } from "@/lib/numero";

const FORMAS = ["Pix", "Cartão", "Dinheiro", "Cortesia", "Outro"] as const;

const campoCls =
  "h-10 w-full rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground focus:border-[var(--terracotta)] focus:outline-none";

// Contrato local preservado; a leitura vem de lib/numero.ts.
function paraNumero(v: string): number | null {
  return paraNumeroBase(v);
}

/**
 * Registro do pagamento: confere os valores, ajusta a forma (que muda na hora
 * mais do que parece) e a taxa de entrega, e grava a data.
 */
export function PagamentoDialog({
  pedido: p,
  onClose,
  onSaved,
}: {
  pedido: Pedido;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formaSalva = p.forma_pagamento ?? "";
  const listada = (FORMAS as readonly string[]).includes(formaSalva);
  const [data, setData] = useState(hojeISO());
  const [forma, setForma] = useState(listada ? formaSalva : formaSalva ? "Outro" : "");
  const [formaOutro, setFormaOutro] = useState(listada ? "" : formaSalva);
  const [taxa, setTaxa] = useState(p.taxa_entrega != null ? String(p.taxa_entrega) : "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Mexer na taxa aqui é assumir o valor: sem isso o servidor recalcularia
  // pelo cadastro do bairro e a correção se perderia.
  const [taxaTocada, setTaxaTocada] = useState(p.taxa_manual ?? false);
  const [frete, setFrete] = useState<ReturnType<typeof calcularFrete>>(null);

  useEffect(() => {
    if (!p.bairro_id) return;
    carregarBairros()
      .then((d) => {
        const b = (d.bairros as Bairro[]).find((x) => x.id === p.bairro_id) ?? null;
        setFrete(calcularFrete(b, p.data_entrega, d.adicional_domingo));
      })
      .catch(() => {
        // sem cadastro a taxa continua editável, como antes
      });
  }, [p.bairro_id, p.data_entrega]);

  const taxaNum = paraNumero(taxa);
  const subtotal = subtotalItens(p.itens);
  const total = totalPedido(p.itens, taxaNum);
  const mudouTotal = Math.abs(total - p.total) > 0.005;

  async function salvar() {
    if (!data) {
      setErro("Informe a data do pagamento.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await registrarPagamento({
        data: {
          id: p.id,
          recebido_em: data,
          forma_pagamento: (forma === "Outro" ? formaOutro.trim() : forma) || null,
          taxa_entrega: taxaNum,
          taxa_manual: taxaTocada,
          bairro_id: p.bairro_id ?? null,
        },
      });
      toast.success(`Pagamento do #${p.numero} registrado — ${formatBRL(total)}.`);
      onSaved();
      onClose();
    } catch (e) {
      setErro(mensagemDeErro(e, "registrar o pagamento"));
    }
    setSalvando(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BadgeDollarSign className="h-5 w-5 text-[var(--whatsapp)]" />
            Registrar pagamento
          </DialogTitle>
        </DialogHeader>

        <p className="-mt-2 text-sm text-muted-foreground">
          Pedido #{p.numero} · {p.cliente_nome ?? "Sem nome"}
        </p>

        {/* conferência dos valores */}
        <div className="rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-4">
          <ul className="space-y-1 text-sm">
            {p.itens.map((i, idx) => (
              <li key={`${i.slug ?? i.nome}-${idx}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-muted-foreground">
                  {i.qtd}x {i.nome}
                  {i.variacao ? ` (${i.variacao})` : ""}
                </span>
                <Num className="shrink-0 text-muted-foreground">
                  {i.preco != null ? formatBRL(i.preco * i.qtd) : "a combinar"}
                </Num>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--cream-deep)] pt-3 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <Num className="text-foreground">{formatBRL(subtotal)}</Num>
          </div>

          <label className="mt-2 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Taxa de entrega</span>
            <Input
              value={taxa}
              onChange={(e) => {
                setTaxa(e.target.value);
                setTaxaTocada(true);
              }}
              placeholder="0,00"
              className="h-8 w-28 text-right"
            />
          </label>
          {frete && (
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {frete.explicacao}
              {taxaTocada && " · valor ajustado à mão"}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--cream-deep)] pt-3">
            <span className="font-medium text-foreground">Total</span>
            <Num className="text-2xl font-semibold text-foreground">{formatBRL(total)}</Num>
          </div>
          {mudouTotal && (
            <p className="mt-1 text-right text-xs text-[var(--terracotta)]">
              era {formatBRL(p.total)} — o pedido será atualizado
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Data do pagamento
            </span>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Forma de pagamento
            </span>
            <select className={campoCls} value={forma} onChange={(e) => setForma(e.target.value)}>
              <option value="">—</option>
              {FORMAS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            {forma === "Outro" && (
              <Input
                className="mt-2"
                value={formaOutro}
                onChange={(e) => setFormaOutro(e.target.value)}
                placeholder="Qual?"
                autoFocus
              />
            )}
          </label>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Lightbulb, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { salvarCalculoConfig, type SugestaoFixo } from "@/lib/calculo";
import type { CalculoConfig } from "@/lib/calculo-tipos";
import { mensagemDeErro } from "@/lib/erros";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function paraNumero(texto: string): number {
  const bruto = texto.trim();
  if (!bruto) return Number.NaN;
  return Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
}

/** Fração (0.13) → texto de porcentagem ("13"). */
function paraPct(fracao: number) {
  return String(Math.round(fracao * 1000) / 10).replace(".", ",");
}

/* Fora do componente de proposito. Definido dentro, cada tecla criava um tipo
   novo e o React desmontava e remontava o input — por isso so dava para digitar
   um caractere por vez. */
function CampoPct({
  rotulo,
  valor,
  onMudar,
  ajuda,
}: {
  rotulo: string;
  valor: string;
  onMudar: (v: string) => void;
  ajuda: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      {rotulo}
      <div className="flex items-center gap-1.5">
        <Input value={valor} onChange={(e) => onMudar(e.target.value)} inputMode="decimal" className="h-11" />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <span className="t-support block font-normal text-muted-foreground">{ajuda}</span>
    </label>
  );
}

export function AjustesCalculo({
  config,
  sugestao,
  onSalvo,
}: {
  config: CalculoConfig;
  sugestao: SugestaoFixo;
  onSalvo: () => Promise<void> | void;
}) {
  const [aberto, setAberto] = useState(false);
  const [custoHora, setCustoHora] = useState(config.custo_hora.toFixed(2).replace(".", ","));
  const [fixo, setFixo] = useState(paraPct(config.percentual_fixo));
  const [taxa, setTaxa] = useState(paraPct(config.percentual_taxa));
  const [perdas, setPerdas] = useState(paraPct(config.percentual_perdas));
  const [incluir, setIncluir] = useState(config.incluir_no_calculo);
  const [salvando, setSalvando] = useState(false);

  const soma =
    (paraNumero(fixo) || 0) + (paraNumero(taxa) || 0) + (paraNumero(perdas) || 0);

  async function salvar() {
    const hora = paraNumero(custoHora);
    if (!Number.isFinite(hora) || hora < 0) {
      toast.error("Informe um custo por hora válido.");
      return;
    }
    if (soma > 90) {
      toast.error("Os percentuais somados passam de 90% do preço.");
      return;
    }

    setSalvando(true);
    try {
      await salvarCalculoConfig({
        data: {
          custo_hora: hora,
          percentual_fixo: (paraNumero(fixo) || 0) / 100,
          percentual_taxa: (paraNumero(taxa) || 0) / 100,
          percentual_perdas: (paraNumero(perdas) || 0) / 100,
          incluir_no_calculo: incluir,
        },
      });
      toast.success("Ajustes salvos.");
      setAberto(false);
      await onSalvo();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar os ajustes"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setAberto(true)} className="h-11">
        <SlidersHorizontal className="mr-1.5 h-4 w-4" />
        Ajustes do cálculo
        {!config.incluir_no_calculo && (
          <span className="ml-1.5 rounded-full bg-[var(--cream)] px-1.5 text-[11px] font-normal text-[var(--admin-muted)]">
            desligado
          </span>
        )}
      </Button>

      <Dialog open={aberto} onOpenChange={(estado) => !estado && setAberto(false)}>
        <DialogContent className="flex max-h-[calc(100dvh-8rem)] flex-col gap-0 overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0 border-b border-[var(--admin-border)] pb-3 pr-6 text-left">
            <DialogTitle>Ajustes do cálculo</DialogTitle>
            <DialogDescription>
              O que entra na conta além dos insumos. Vale para a Calculadora e para o Simulador.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-2">
            <label className="flex items-center gap-3 rounded-xl border border-input px-3.5 py-3 text-sm font-medium">
              <Switch checked={incluir} onCheckedChange={setIncluir} />
              <span className="min-w-0">
                {incluir ? "Entrando na conta" : "Fora da conta"}
                <span className="t-support block font-normal text-muted-foreground">
                  Desligado, a margem considera só os insumos — como era antes.
                </span>
              </span>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Custo por hora de produção (R$)
              <Input
                value={custoHora}
                onChange={(e) => setCustoHora(e.target.value)}
                inputMode="decimal"
                placeholder="25,00"
                className="h-11"
              />
              <span className="t-support block font-normal text-muted-foreground">
                Multiplica o tempo de montagem de cada produto. Não é salário: é o que o negócio
                precisa pagar pelo tempo para o preço fechar.
              </span>
            </label>

            {/* A sugestão é o coração deste card: o sistema já sabe os fixos. */}
            {sugestao.percentual != null && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3.5 py-3">
                <Lightbulb className="h-4 w-4 shrink-0 text-[var(--bronze)]" />
                <p className="t-support min-w-0 flex-1 text-[var(--admin-ink-soft)]">
                  Suas contas mensais somaram <strong>{moeda(sugestao.fixos)}</strong> sobre{" "}
                  <strong>{moeda(sugestao.faturamento)}</strong> de faturamento no mês passado —{" "}
                  <strong>{(sugestao.percentual * 100).toFixed(1).replace(".", ",")}%</strong>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFixo(paraPct(sugestao.percentual!))}
                  className="h-8 shrink-0"
                >
                  Usar
                </Button>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <CampoPct
                rotulo="Custo fixo"
                valor={fixo}
                onMudar={setFixo}
                ajuda="Aluguel, luz, sistema"
              />
              <CampoPct
                rotulo="Taxa de pagamento"
                valor={taxa}
                onMudar={setTaxa}
                ajuda="Cartão, maquininha"
              />
              <CampoPct
                rotulo="Perdas"
                valor={perdas}
                onMudar={setPerdas}
                ajuda="Estrago, quebra"
              />
            </div>

            <p
              className={`t-support rounded-lg px-2.5 py-1.5 ${
                soma > 90
                  ? "bg-[var(--peach)] font-semibold text-[var(--coral)]"
                  : "bg-[var(--cream-soft)] text-muted-foreground"
              }`}
            >
              {soma > 90
                ? `Somados dão ${soma.toFixed(1).replace(".", ",")}% — acima de 90% não sobra preço para calcular.`
                : `Somados, ${soma.toFixed(1).replace(".", ",")}% do preço saem antes de virar lucro. Os três incidem sobre a venda, não sobre o custo.`}
            </p>
          </div>

          <DialogFooter className="shrink-0 border-t border-[var(--admin-border)] pt-3">
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || soma > 90}>
              Salvar ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

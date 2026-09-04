"use client";

import { Calculator, Lightbulb, SlidersHorizontal } from "lucide-react";
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

/** Campo de numero que guarda o texto cru: sem isto a virgula some ao digitar. */
function CampoNum({
  rotulo,
  valor,
  onMudar,
  sufixo,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  onMudar: (v: string) => void;
  sufixo?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm font-medium">
      {rotulo}
      <div className="flex items-center gap-1.5">
        <Input
          value={valor}
          onChange={(e) => onMudar(e.target.value)}
          inputMode="decimal"
          placeholder={placeholder}
          className="h-10"
        />
        {sufixo && <span className="shrink-0 text-sm text-muted-foreground">{sufixo}</span>}
      </div>
    </label>
  );
}

/* 52 semanas / 12 meses. Usar 4 encurtaria o mes em 7%, o custo por hora sairia
   alto demais e o preco fecharia acima do necessario. */
const SEMANAS_NO_MES = 52 / 12;

function CalculadoraHora({ onUsar }: { onUsar: (valor: string) => void }) {
  const [salario, setSalario] = useState("");
  const [dias, setDias] = useState("5");
  const [horas, setHoras] = useState("6");

  const s = paraNumero(salario);
  const d = paraNumero(dias);
  const h = paraNumero(horas);
  const horasMes = Number.isFinite(d) && Number.isFinite(h) ? d * h * SEMANAS_NO_MES : Number.NaN;
  const porHora = Number.isFinite(s) && horasMes > 0 ? s / horasMes : null;

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-3.5">
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoNum rotulo="Salário / mão de obra" valor={salario} onMudar={setSalario} sufixo="R$" placeholder="2.500" />
        <CampoNum rotulo="Dias trabalhados na semana" valor={dias} onMudar={setDias} sufixo="dias" />
        <CampoNum rotulo="Horas trabalhadas por dia" valor={horas} onMudar={setHoras} sufixo="h" />
      </div>

      {porHora != null ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="t-support min-w-0 flex-1 text-[var(--admin-ink-soft)]">
            São <strong>{horasMes.toFixed(0)} horas por mês</strong> — dá{" "}
            <strong>{moeda(porHora)} por hora</strong>. Conte só as horas que você realmente
            produz; incluir o dia inteiro derruba o número e o preço fecha baixo.
          </p>
          <Button variant="outline" size="sm" onClick={() => onUsar(porHora.toFixed(2).replace(".", ","))} className="h-8 shrink-0">
            Usar
          </Button>
        </div>
      ) : (
        <p className="t-support text-muted-foreground">
          Preencha os três para ver o valor por hora.
        </p>
      )}
    </div>
  );
}

const CONTAS_FIXAS = ["Aluguel", "Luz e água", "Internet e telefone", "Contador", "Outras"];

function CalculadoraFixo({ onUsar }: { onUsar: (valor: string) => void }) {
  const [contas, setContas] = useState<string[]>(() => CONTAS_FIXAS.map(() => ""));
  const [faturamento, setFaturamento] = useState("");

  const soma = contas.reduce((t, c) => {
    const n = paraNumero(c);
    return t + (Number.isFinite(n) ? n : 0);
  }, 0);
  const fat = paraNumero(faturamento);
  const pct = Number.isFinite(fat) && fat > 0 ? (soma / fat) * 100 : null;

  return (
    <div className="mt-2 space-y-3 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-3.5">
      <div className="grid gap-3 sm:grid-cols-3">
        {CONTAS_FIXAS.map((nome, i) => (
          <CampoNum
            key={nome}
            rotulo={nome}
            valor={contas[i]}
            onMudar={(v) => setContas((atual) => atual.map((c, j) => (j === i ? v : c)))}
            sufixo="R$"
          />
        ))}
        <CampoNum
          rotulo="Faturamento por mês"
          valor={faturamento}
          onMudar={setFaturamento}
          sufixo="R$"
          placeholder="8.000"
        />
      </div>

      {pct != null ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="t-support min-w-0 flex-1 text-[var(--admin-ink-soft)]">
            <strong>{moeda(soma)}</strong> de contas sobre <strong>{moeda(fat)}</strong> de
            faturamento — <strong>{pct.toFixed(1).replace(".", ",")}%</strong>.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUsar(String(Math.round(pct * 10) / 10).replace(".", ","))}
            className="h-8 shrink-0"
          >
            Usar
          </Button>
        </div>
      ) : (
        <p className="t-support text-muted-foreground">
          Informe o faturamento do mês para ver a porcentagem.
        </p>
      )}
    </div>
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
  const [calc, setCalc] = useState<"hora" | "fixo" | null>(null);

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
      const r = await salvarCalculoConfig({
        data: {
          custo_hora: hora,
          percentual_fixo: (paraNumero(fixo) || 0) / 100,
          percentual_taxa: (paraNumero(taxa) || 0) / 100,
          percentual_perdas: (paraNumero(perdas) || 0) / 100,
          incluir_no_calculo: incluir,
        },
      });
      /* Recusa esperada vem no retorno, nao no catch: lancada, a frase virava
         digest em producao e o dialogo fechava como se tivesse salvado. O
         setSalvando(false) esta no finally, entao este return nao trava o
         botao. */
      if (r?.erro) {
        toast.error(r.erro);
        return;
      }
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
              O que entra na conta além dos insumos. Vale para Custo e preços e para o Simulador.
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

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label className="flex-1 space-y-1.5 text-sm font-medium">
                  Custo por hora de produção (R$)
                  <Input
                    value={custoHora}
                    onChange={(e) => setCustoHora(e.target.value)}
                    inputMode="decimal"
                    placeholder="25,00"
                    className="h-11"
                  />
                </label>
                <Button
                  variant="outline"
                  onClick={() => setCalc(calc === "hora" ? null : "hora")}
                  className="h-11 shrink-0"
                >
                  <Calculator className="mr-1.5 h-4 w-4" />
                  {calc === "hora" ? "Fechar calculadora" : "Calcular"}
                </Button>
              </div>

              <span className="t-support block font-normal text-muted-foreground">
                Multiplica o tempo de montagem de cada produto. É quanto o seu tempo precisa valer
                para o preço fechar — mesmo que hoje você não retire esse valor todo mês.
              </span>

              {calc === "hora" && (
                <CalculadoraHora
                  onUsar={(v) => {
                    setCustoHora(v);
                    setCalc(null);
                  }}
                />
              )}
            </div>

            {/* Dois caminhos de propósito: quem lança as contas no Financeiro
                puxa pronto; quem não lança calcula na mão sem precisar
                cadastrar nada antes. */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Custo fixo</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalc(calc === "fixo" ? null : "fixo")}
                className="h-8"
              >
                <Calculator className="mr-1.5 h-4 w-4" />
                {calc === "fixo" ? "Fechar calculadora" : "Calcular na mão"}
              </Button>
            </div>

            {calc === "fixo" && (
              <CalculadoraFixo
                onUsar={(v) => {
                  setFixo(v);
                  setCalc(null);
                }}
              />
            )}

            {sugestao.percentual != null && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3.5 py-3">
                <Lightbulb className="h-4 w-4 shrink-0 text-[var(--bronze)]" />
                <p className="t-support min-w-0 flex-1 text-[var(--admin-ink-soft)]">
                  <strong>
                    {(sugestao.percentual * 100).toFixed(1).replace(".", ",")}%
                  </strong>{" "}
                  é o que o sistema apurou do que você mesma lançou: as contas mensais de{" "}
                  <strong>{moeda(sugestao.fixos)}</strong> em A pagar, sobre{" "}
                  <strong>{moeda(sugestao.faturamento)}</strong> recebidos no mês passado.
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
                ajuda="Cartão, maquininha. Se você cobra a taxa do cliente, deixe zerado."
              />
              <CampoPct
                rotulo="Outros"
                valor={perdas}
                onMudar={setPerdas}
                ajuda="Perda, estrago, quebra"
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

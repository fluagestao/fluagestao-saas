"use client";

import { CalendarClock, Check, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  carregarContasAPagar,
  criarContaAPagar,
  editarContaAPagar,
  excluirContaAPagar,
  pagarContaAPagar,
  type ContaAPagar,
} from "@/lib/contas";
import { mensagemDeErro } from "@/lib/erros";
import { diaMes, hojeISO, somarDias } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader, useConfirmar } from "./shell";

type TipoDespesa = { id: string; nome: string };
type Estado = "paga" | "a_vencer" | "hoje" | "vencida";

/** "12,50" e "12.50" chegam do teclado do jeito que der. */
function paraNumero(texto: string): number {
  const limpo = texto.replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? n : 0;
}

function estadoDaConta(conta: ContaAPagar, hoje: string): Estado {
  if (conta.pago_em) return "paga";
  if (conta.vencimento < hoje) return "vencida";
  if (conta.vencimento === hoje) return "hoje";
  return "a_vencer";
}

const ESTILO: Record<Estado, string> = {
  paga: "border-[var(--admin-border)] opacity-70",
  a_vencer: "border-[var(--admin-border)]",
  hoje: "border-[var(--terracotta)] bg-[var(--peach)]",
  vencida: "border-destructive bg-destructive/5",
};

const ETIQUETA: Record<Estado, { texto: string; classe: string } | null> = {
  paga: { texto: "paga", classe: "bg-[var(--green-soft)] text-[var(--green-ink)]" },
  a_vencer: null,
  hoje: { texto: "vence hoje", classe: "bg-[var(--terracotta)] text-white" },
  vencida: { texto: "vencida", classe: "bg-destructive text-white" },
};

/**
 * Contas a pagar: o que ainda vai sair do caixa.
 *
 * Fica fora de Pagamentos de propósito. Compromisso não é caixa — só vira
 * quando é pago, e nesse momento nasce o movimento.
 */
export function ContasAPagarPanel() {
  const hoje = hojeISO();
  const [de, setDe] = useState(() => `${hoje.slice(0, 8)}01`);
  const [ate, setAte] = useState(() => somarDias(hoje, 90));
  const [contas, setContas] = useState<ContaAPagar[]>([]);
  const [tiposDespesa, setTiposDespesa] = useState<TipoDespesa[]>([]);
  const [emAberto, setEmAberto] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<ContaAPagar | null>(null);
  const [pagando, setPagando] = useState<ContaAPagar | null>(null);
  const confirmar = useConfirmar();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarContasAPagar({ data: { de, ate } });
      setContas(d.contas);
      setTiposDespesa(d.tiposDespesa as TipoDespesa[]);
      setEmAberto(d.totalEmAberto);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar as contas a pagar"));
    }
    setCarregando(false);
  }, [de, ate]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const indicadores = useMemo(() => {
    const abertas = contas.filter((c) => !c.pago_em);
    const limiteSemana = somarDias(hoje, 7);
    return {
      vencido: abertas
        .filter((c) => c.vencimento < hoje)
        .reduce((t, c) => t + c.valor, 0),
      semana: abertas
        .filter((c) => c.vencimento >= hoje && c.vencimento <= limiteSemana)
        .reduce((t, c) => t + c.valor, 0),
      periodo: abertas.reduce((t, c) => t + c.valor, 0),
    };
  }, [contas, hoje]);

  async function excluir(conta: ContaAPagar) {
    const recorrente = conta.recorrencia === "mensal";
    const ok = await confirmar({
      titulo: recorrente ? "Encerrar esta conta mensal?" : `Excluir "${conta.descricao}"?`,
      descricao: recorrente
        ? "As parcelas futuras que ainda não foram pagas somem. O que já foi pago continua no caixa."
        : conta.parcelas > 1
          ? "Só esta parcela é excluída. As outras continuam."
          : "A conta é removida da lista.",
      confirmar: recorrente ? "Encerrar" : "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    try {
      await excluirContaAPagar({ data: { id: conta.id, grupo: recorrente } });
      toast.success(recorrente ? "Recorrência encerrada." : "Conta excluída.");
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir a conta"));
    }
  }

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="A pagar"
        descricao="Boletos, parcelas e contas mensais. Só entra no caixa quando você marca como paga — o dinheiro sai no dia do pagamento, não no vencimento."
        acoes={
          <Button
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
            className="h-10 rounded-full"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova conta
          </Button>
        }
      />

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao rotulo="Vencido" valor={indicadores.vencido} cor="var(--destructive)" />
        <Cartao rotulo="Vence em 7 dias" valor={indicadores.semana} cor="var(--terracotta)" />
        <Cartao rotulo="Em aberto no período" valor={indicadores.periodo} />
        <Cartao
          rotulo="Em aberto no total"
          valor={emAberto}
          nota="de qualquer período"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Vencimento de</span>
        <DatePickerField value={de} onChange={setDe} ariaLabel="Data inicial" className="h-9 w-[10.5rem]" />
        <span className="text-sm text-muted-foreground">até</span>
        <DatePickerField value={ate} onChange={setAte} ariaLabel="Data final" className="h-9 w-[10.5rem]" />
      </div>

      {carregando ? (
        <Carregando texto="carregando as contas…" />
      ) : contas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma conta no período"
          descricao="Use Nova conta para registrar um boleto, um parcelamento ou uma conta que se repete todo mês."
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {contas.map((conta) => {
            const estado = estadoDaConta(conta, hoje);
            const etiqueta = ETIQUETA[estado];

            return (
              <li
                key={conta.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-soft)]",
                  ESTILO[estado],
                )}
              >
                <div className="min-w-[3.5rem] shrink-0">
                  <p className="t-support font-bold uppercase tracking-[0.08em] text-[var(--coral)]">
                    {conta.pago_em ? "pago" : "vence"}
                  </p>
                  <p className="t-item tabular-nums text-foreground">
                    {diaMes(conta.pago_em ?? conta.vencimento)}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 t-item text-foreground">
                    <span className="truncate">{conta.descricao}</span>
                    {conta.recorrencia === "mensal" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cream-deep)] px-2 py-0.5 t-support text-[var(--bronze)]">
                        <Repeat className="h-3 w-3" />
                        mensal
                      </span>
                    )}
                    {conta.parcelas > 1 && (
                      <span className="rounded-full bg-[var(--cream-deep)] px-2 py-0.5 t-support text-[var(--bronze)]">
                        {conta.parcela} de {conta.parcelas}
                      </span>
                    )}
                    {etiqueta && (
                      <span className={cn("rounded-full px-2 py-0.5 t-support font-semibold", etiqueta.classe)}>
                        {etiqueta.texto}
                      </span>
                    )}
                  </p>
                  {(conta.tipo_despesa || conta.fornecedor || conta.observacao) && (
                    <p className="t-support truncate text-muted-foreground">
                      {[conta.tipo_despesa, conta.fornecedor, conta.observacao]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <Num className="t-item shrink-0 tabular-nums text-foreground">
                  {formatBRL(conta.valor)}
                </Num>

                <div className="flex shrink-0 gap-1">
                  {!conta.pago_em && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPagando(conta)}
                        title="Marcar como paga e lançar em Pagamentos"
                        className="t-support inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--whatsapp)] px-2.5 font-semibold text-white transition-opacity hover:opacity-90"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Paguei
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(conta);
                          setFormAberto(true);
                        }}
                        aria-label="Editar conta"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--admin-border)] text-foreground/60 transition-colors hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => excluir(conta)}
                    aria-label={conta.recorrencia === "mensal" ? "Encerrar recorrência" : "Excluir conta"}
                    disabled={Boolean(conta.pago_em)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-foreground/30 transition-colors hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DialogoConta
        aberto={formAberto}
        editando={editando}
        tiposDespesa={tiposDespesa}
        onFechar={() => {
          setFormAberto(false);
          setEditando(null);
        }}
        onSalvo={recarregar}
      />

      <DialogoPagamento
        conta={pagando}
        onFechar={() => setPagando(null)}
        onSalvo={recarregar}
      />
    </section>
  );
}

function Cartao({
  rotulo,
  valor,
  cor,
  nota,
}: {
  rotulo: string;
  valor: number;
  cor?: string;
  nota?: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="t-support uppercase tracking-[0.14em] text-[var(--bronze)]">{rotulo}</p>
      <p className="mt-1 t-hero tabular-nums" style={{ color: cor ?? "var(--admin-ink)" }}>
        <Num>{formatBRL(valor)}</Num>
      </p>
      {nota && <p className="t-support mt-0.5 text-muted-foreground">{nota}</p>}
    </div>
  );
}

function DialogoConta({
  aberto,
  editando,
  tiposDespesa,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  editando: ContaAPagar | null;
  tiposDespesa: TipoDespesa[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(() => hojeISO());
  const [fornecedor, setFornecedor] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [modo, setModo] = useState<"unica" | "parcelada" | "mensal">("unica");
  const [parcelas, setParcelas] = useState("2");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setDescricao(editando?.descricao ?? "");
    setValor(editando ? String(editando.valor).replace(".", ",") : "");
    setVencimento(editando?.vencimento ?? hojeISO());
    setFornecedor(editando?.fornecedor ?? "");
    setTipoId(editando?.tipo_despesa_id ?? "");
    setObservacao(editando?.observacao ?? "");
    setModo("unica");
    setParcelas("2");
  }, [aberto, editando]);

  const podeSalvar = paraNumero(valor) > 0 && descricao.trim().length > 0;

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setSalvando(true);
    try {
      const base = {
        descricao: descricao.trim(),
        fornecedor: fornecedor.trim() || null,
        tipo_despesa_id: tipoId || null,
        valor: paraNumero(valor),
        vencimento,
        observacao: observacao.trim() || null,
      };

      if (editando) {
        await editarContaAPagar({ data: { id: editando.id, ...base } });
        toast.success("Conta atualizada.");
      } else {
        const r = await criarContaAPagar({
          data: {
            ...base,
            recorrencia: modo === "mensal" ? "mensal" : "unica",
            parcelas: modo === "parcelada" ? Math.max(2, Number(parcelas) || 2) : 1,
          },
        });
        toast.success(
          r.parcelas > 1 ? `${r.parcelas} parcelas criadas.` : "Conta criada.",
        );
      }
      onSalvo();
      onFechar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar a conta"));
    }
    setSalvando(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>{editando ? "Editar conta" : "Nova conta a pagar"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "A alteração vale só para esta parcela."
              : "Um boleto, um parcelamento ou uma conta que se repete todo mês."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Descrição</span>
            <Input
              autoFocus
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: boleto do fornecedor de frios"
              maxLength={200}
              className="h-10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {editando ? "Valor" : "Valor de cada parcela"}
            </span>
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="h-10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {editando ? "Vencimento" : "Primeiro vencimento"}
            </span>
            <DatePickerField
              value={vencimento}
              onChange={setVencimento}
              ariaLabel="Vencimento"
              className="h-10 w-full"
            />
          </label>

          {!editando && (
            <div className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Repetição</span>
              <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--cream-soft)] p-1">
                {(
                  [
                    ["unica", "Uma vez"],
                    ["parcelada", "Parcelada"],
                    ["mensal", "Todo mês"],
                  ] as const
                ).map(([id, rotulo]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setModo(id)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm transition-colors",
                      modo === id
                        ? "bg-white font-medium text-foreground shadow-[var(--shadow-soft)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>

              {modo === "parcelada" && (
                <label className="mt-2 flex items-center gap-2">
                  <Input
                    inputMode="numeric"
                    value={parcelas}
                    onChange={(e) => setParcelas(e.target.value)}
                    className="h-10 w-20"
                    aria-label="Número de parcelas"
                  />
                  <span className="text-sm text-muted-foreground">
                    parcelas mensais de {formatBRL(paraNumero(valor))}
                  </span>
                </label>
              )}

              {modo === "mensal" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sem fim. O sistema mantém sempre os próximos meses criados, e você encerra
                  quando quiser pela lixeira.
                </p>
              )}
            </div>
          )}

          <div className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Tipo de despesa
            </span>
            <select
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
              aria-label="Tipo de despesa"
            >
              <option value="">Sem categoria</option>
              {tiposDespesa.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Fornecedor</span>
            <Input
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              maxLength={120}
              className="h-10"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Observação
            </span>
            <Input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Número do boleto, código, o que ajudar a achar depois"
              maxLength={500}
              className="h-10"
            />
          </label>
        </div>

        <DialogFooter className="pt-1">
          <Button variant="outline" onClick={onFechar} className="rounded-full">
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!podeSalvar || salvando} className="rounded-full">
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogoPagamento({
  conta,
  onFechar,
  onSalvo,
}: {
  conta: ContaAPagar | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [data, setData] = useState(() => hojeISO());
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!conta) return;
    setData(hojeISO());
    setValor(String(conta.valor).replace(".", ","));
  }, [conta]);

  async function pagar() {
    if (!conta || salvando || paraNumero(valor) <= 0) return;
    setSalvando(true);
    try {
      await pagarContaAPagar({ data: { id: conta.id, data, valor: paraNumero(valor) } });
      toast.success("Pagamento lançado no caixa.");
      onSalvo();
      onFechar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "registrar o pagamento"));
    }
    setSalvando(false);
  }

  const diferenca = conta ? paraNumero(valor) - conta.valor : 0;

  return (
    <Dialog open={Boolean(conta)} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Marcar como paga</DialogTitle>
          <DialogDescription>
            Isso cria o lançamento em Pagamentos. A data é a do pagamento, não a do vencimento —
            é ela que decide em que mês o dinheiro saiu.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Paguei em</span>
            <DatePickerField
              value={data}
              onChange={setData}
              ariaLabel="Data do pagamento"
              className="h-10 w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Valor pago
            </span>
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="h-10"
            />
          </label>
        </div>

        {conta && Math.abs(diferenca) > 0.004 && (
          <p className="text-xs text-muted-foreground">
            {diferenca > 0 ? "Acréscimo" : "Desconto"} de{" "}
            <span className="font-semibold text-foreground">
              {formatBRL(Math.abs(diferenca))}
            </span>{" "}
            sobre o previsto de {formatBRL(conta.valor)}. O caixa registra o valor pago.
          </p>
        )}

        <DialogFooter className="pt-1">
          <Button variant="outline" onClick={onFechar} className="rounded-full">
            Cancelar
          </Button>
          <Button onClick={pagar} disabled={salvando || paraNumero(valor) <= 0} className="rounded-full">
            <CalendarClock className="mr-1.5 h-4 w-4" />
            {salvando ? "Lançando…" : "Lançar pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataLonga, hojeISO, somarDias } from "@/lib/prazo";
import { carregarMovimentos, removerMovimento, salvarMovimento } from "@/lib/financeiro";
import { porDia, resumoDoCaixa, type Movimento } from "@/lib/caixa";
import { formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader, useConfirmar } from "./shell";

function paraNumero(v: string): number {
  const n = Number(v.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const inicioDoMes = () => `${hojeISO().slice(0, 8)}01`;

export function FinanceiroPanel({ vista }: { vista?: "entradas" | "saidas" }) {
  const tipo: "entrada" | "saida" = vista === "saidas" ? "saida" : "entrada";

  const [de, setDe] = useState(inicioDoMes);
  const [ate, setAte] = useState(() => hojeISO());
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const confirmar = useConfirmar();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarMovimentos({ data: { de, ate } });
      setMovimentos(d.movimentos as Movimento[]);
      setFornecedores(d.fornecedores);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar o financeiro"));
    }
    setCarregando(false);
  }, [de, ate]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const resumo = useMemo(() => resumoDoCaixa(movimentos), [movimentos]);
  const daAba = useMemo(() => movimentos.filter((m) => m.tipo === tipo), [movimentos, tipo]);
  const dias = useMemo(() => porDia(daAba), [daAba]);

  async function excluir(m: Movimento) {
    if (m.id.startsWith("pedido:")) {
      toast.message("Essa entrada é um pedido pago. Para mudar, desfaça o pagamento em Vendas.");
      return;
    }
    const ok = await confirmar({
      titulo: `Excluir "${m.descricao}"?`,
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    await removerMovimento({ data: { id: m.id } });
    toast.success("Lançamento excluído.");
    recarregar();
  }

  const atalhos = [
    { label: "Este mês", de: inicioDoMes(), ate: hojeISO() },
    { label: "7 dias", de: somarDias(hojeISO(), -6), ate: hojeISO() },
    { label: "Mês passado", de: mesPassado().de, ate: mesPassado().ate },
  ];

  return (
    <section>
      <PageHeader
        titulo={tipo === "entrada" ? "Entradas" : "Saídas"}
        descricao={
          tipo === "entrada"
            ? "Todo pedido marcado como pago entra aqui sozinho. Use o campo abaixo só para dinheiro que não veio de um pedido."
            : "Compra, conta, retirada. Quatro campos e pronto."
        }
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Cartao rotulo="Entrou" valor={resumo.entradas} cor="var(--whatsapp)" />
        <Cartao rotulo="Saiu" valor={resumo.saidas} cor="var(--terracotta)" />
        <Cartao
          rotulo="Sobrou"
          valor={resumo.saldo}
          cor={resumo.saldo < 0 ? "var(--terracotta)" : "var(--bronze)"}
          destaque
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {atalhos.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => {
              setDe(a.de);
              setAte(a.ate);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              de === a.de && ate === a.ate
                ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                : "border border-[var(--cream-deep)] bg-card text-foreground",
            )}
          >
            {a.label}
          </button>
        ))}

        <DatePickerField
          value={de}
          onChange={setDe}
          ariaLabel="Data inicial"
          className="h-9 w-[10.5rem]"
        />
        <span className="text-sm text-muted-foreground">até</span>
        <DatePickerField
          value={ate}
          onChange={setAte}
          ariaLabel="Data final"
          className="h-9 w-[10.5rem]"
        />
      </div>

      <NovoLancamento tipo={tipo} fornecedores={fornecedores} onSalvo={recarregar} />

      {carregando && <Carregando />}
      {erro && (
        <p className="mt-3 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      {!carregando && !erro && daAba.length === 0 && (
        <EstadoVazio
          titulo={tipo === "entrada" ? "Nada entrou no período" : "Nada saiu no período"}
          descricao={
            tipo === "entrada"
              ? "Pedidos marcados como pagos aparecem aqui automaticamente."
              : "Lance a primeira compra no campo acima."
          }
        />
      )}

      {dias.map((d) => (
        <div key={d.dia} className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--bronze)]">
              {formatarDataLonga(d.dia)}
            </h3>
            <Num className="text-sm text-muted-foreground">{formatBRL(Math.abs(d.total))}</Num>
          </div>
          <ul className="space-y-1.5">
            {d.itens.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--cream-deep)] bg-card px-3 py-2.5"
              >
                {m.tipo === "entrada" ? (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-[var(--whatsapp)]" />
                ) : (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{m.descricao}</p>
                  {m.fornecedor && (
                    <p className="truncate text-xs text-muted-foreground">{m.fornecedor}</p>
                  )}
                </div>
                <Num className="shrink-0 font-medium text-foreground">{formatBRL(m.valor)}</Num>
                <button
                  type="button"
                  aria-label="Excluir"
                  onClick={() => excluir(m)}
                  className="shrink-0 rounded-full p-1.5 text-foreground/30 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Cartao({
  rotulo,
  valor,
  cor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]",
        destaque && "ring-1 ring-[var(--cream-deep)]",
      )}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--bronze)]">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: cor }}>
        {formatBRL(valor)}
      </p>
    </div>
  );
}

function NovoLancamento({
  tipo,
  fornecedores,
  onSalvo,
}: {
  tipo: "entrada" | "saida";
  fornecedores: string[];
  onSalvo: () => void;
}) {
  const [data, setData] = useState(() => hojeISO());
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [salvando, setSalvando] = useState(false);

  const podeSalvar = paraNumero(valor) > 0 && descricao.trim().length > 0;

  async function salvar() {
    if (!podeSalvar || salvando) return;
    setSalvando(true);
    try {
      await salvarMovimento({
        data: {
          tipo,
          data,
          valor: paraNumero(valor),
          descricao: descricao.trim(),
          fornecedor: fornecedor.trim() || null,
        },
      });
      toast.success(tipo === "entrada" ? "Entrada lançada." : "Saída lançada.");
      setValor("");
      setDescricao("");
      document.getElementById("campo-valor")?.focus();
      onSalvo();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o lançamento"));
    }
    setSalvando(false);
  }

  return (
    <div className="mt-4 rounded-2xl border border-dashed border-[var(--cream-deep)] p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Dia</span>
          <DatePickerField
            value={data}
            onChange={setData}
            ariaLabel="Dia do lançamento"
            className="h-10 w-[10.5rem]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Valor</span>
          <Input
            id="campo-valor"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            placeholder="0,00"
            className="h-10 w-28"
          />
        </label>
        <label className="block min-w-[12rem] flex-1">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            {tipo === "entrada" ? "De onde veio" : "Despesa"}
          </span>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            placeholder={tipo === "entrada" ? "Ex.: venda na feira" : "Ex.: frios e pães"}
            className="h-10"
          />
        </label>
        {tipo === "saida" && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Fornecedor</span>
            <Input
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              placeholder="Angeloni"
              list="fornecedores-usados"
              className="h-10 w-40"
            />
            <datalist id="fornecedores-usados">
              {fornecedores.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
        )}
        <Button onClick={salvar} disabled={!podeSalvar || salvando} className="h-10">
          <Plus className="mr-1 h-4 w-4" />
          Lançar
        </Button>
      </div>
    </div>
  );
}

function mesPassado(): { de: string; ate: string } {
  const hoje = hojeISO();
  const [ano, mes] = hoje.split("-").map(Number);
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const mm = String(mesAnterior).padStart(2, "0");
  const ultimo = new Date(Date.UTC(anoAnterior, mesAnterior, 0)).getUTCDate();
  return { de: `${anoAnterior}-${mm}-01`, ate: `${anoAnterior}-${mm}-${ultimo}` };
}

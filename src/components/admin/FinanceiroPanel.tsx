import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Download, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataLonga, hojeISO, somarDias } from "@/lib/prazo";
import {
  carregarMovimentos,
  criarTipoDespesa,
  criarTipoReceita,
  removerMovimento,
  salvarMovimento,
} from "@/lib/financeiro";
import { porDia, resumoDoCaixa, type Movimento } from "@/lib/caixa";
import { formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader, useConfirmar } from "./shell";

type TipoDespesa = { id: string; nome: string };

function paraNumero(v: string): number {
  const n = Number(v.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const inicioDoMes = () => `${hojeISO().slice(0, 8)}01`;

export function FinanceiroPanel({ vista }: { vista?: "entradas" | "saidas" }) {
  const tipo: "entrada" | "saida" = vista === "saidas" ? "saida" : "entrada";

  const [de, setDe] = useState(inicioDoMes);
  const [ate, setAte] = useState(() => hojeISO());
  // Abre em "escolher": os campos de data ja aceitam digitacao, sem precisar
  // passar por um atalho antes.
  const [periodo, setPeriodo] = useState<"escolher" | "mes" | "7dias" | "mes_passado">(
    "escolher",
  );
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [tiposDespesa, setTiposDespesa] = useState<TipoDespesa[]>([]);
  const [tiposReceita, setTiposReceita] = useState<TipoDespesa[]>([]);
  const [aReceber, setAReceber] = useState(0);
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
      setTiposDespesa(d.tiposDespesa as TipoDespesa[]);
      setTiposReceita(d.tiposReceita as TipoDespesa[]);
      setAReceber(d.aReceber);
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

  /** Quanto entrou por forma de pagamento. E o numero que se concilia com
      banco e maquininha; lancamento manual nao tem forma e vira um grupo. */
  const porForma = useMemo(() => {
    if (tipo !== "entrada") return [];
    const mapa = new Map<string, number>();
    for (const m of daAba) {
      const chave = m.forma_pagamento?.trim() || "Lançamento manual";
      mapa.set(chave, (mapa.get(chave) ?? 0) + m.valor);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [daAba, tipo]);

  function baixarCsv() {
    const campo = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const linhas = [
      ["Data", "Cliente", "Descrição", "Origem", "Forma", "Categoria", "Fornecedor", "Valor"],
      ...daAba.map((m) => [
        m.data,
        m.cliente_nome ?? "",
        m.descricao ?? "",
        m.pedido_numero ? `Pedido #${m.pedido_numero}` : "Manual",
        m.forma_pagamento ?? "",
        m.tipo_receita ?? m.tipo_despesa ?? "",
        m.fornecedor ?? "",
        m.valor.toFixed(2).replace(".", ","),
      ]),
    ];
    const csv = linhas.map((l) => l.map(campo).join(";")).join("\r\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo === "entrada" ? "recebimentos" : "saidas"}-${de}-a-${ate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const atalhos = [
    { id: "mes" as const, label: "Este mês", de: inicioDoMes(), ate: hojeISO() },
    { id: "7dias" as const, label: "7 dias", de: somarDias(hojeISO(), -6), ate: hojeISO() },
    {
      id: "mes_passado" as const,
      label: "Mês passado",
      de: mesPassado().de,
      ate: mesPassado().ate,
    },
  ];

  return (
    <section>
      <PageHeader
        titulo={tipo === "entrada" ? "Recebimentos" : "Saídas"}
        descricao={
          tipo === "entrada"
            ? "Todo pedido marcado como pago entra aqui sozinho, com a forma de pagamento. Use o campo abaixo só para dinheiro que não veio de um pedido."
            : "Compra, conta, retirada. Informe a descrição, o tipo de despesa e o fornecedor."
        }
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao rotulo="Entrou" valor={resumo.entradas} cor="var(--whatsapp)" />
        <Cartao rotulo="Saiu" valor={resumo.saidas} cor="var(--terracotta)" />
        <Cartao
          rotulo="Sobrou"
          valor={resumo.saldo}
          cor={resumo.saldo < 0 ? "var(--terracotta)" : "var(--bronze)"}
          destaque
        />
        {/* Fora do periodo de proposito: e o que esta em aberto hoje, nao o que
            ficou em aberto naquele mes. */}
        <Cartao rotulo="A receber" valor={aReceber} cor="var(--admin-muted)" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={periodo}
          onChange={(e) => {
            const escolhido = e.target.value as typeof periodo;
            setPeriodo(escolhido);
            // "escolher" preserva as datas: da para partir de um atalho e
            // ajustar so a ponta.
            const atalho = atalhos.find((a) => a.id === escolhido);
            if (!atalho) return;
            setDe(atalho.de);
            setAte(atalho.ate);
          }}
          aria-label="Período"
          className="h-9 min-w-44 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
        >
          <option value="escolher">Escolher datas</option>
          {atalhos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>

        <DatePickerField
          value={de}
          onChange={(valor) => {
            setPeriodo("escolher");
            setDe(valor);
          }}
          ariaLabel="Data inicial"
          className="h-9 w-[10.5rem]"
        />
        <span className="text-sm text-muted-foreground">até</span>
        <DatePickerField
          value={ate}
          onChange={(valor) => {
            setPeriodo("escolher");
            setAte(valor);
          }}
          ariaLabel="Data final"
          className="h-9 w-[10.5rem]"
        />
      </div>

      {porForma.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {porForma.map(([forma, valor]) => (
            <span
              key={forma}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cream-deep)] bg-card px-3 py-1.5 text-xs text-muted-foreground"
            >
              {forma}
              <Num className="font-semibold text-foreground">{formatBRL(valor)}</Num>
            </span>
          ))}
          <button
            type="button"
            onClick={baixarCsv}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--cream-deep)] bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-[var(--cream-soft)]"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar CSV
          </button>
        </div>
      )}

      <NovoLancamento
        tipo={tipo}
        fornecedores={fornecedores}
        tiposDespesa={tiposDespesa}
        tiposReceita={tiposReceita}
        onSalvo={recarregar}
      />

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
                  <p className="flex items-center gap-2 truncate text-sm text-foreground">
                    <span className="truncate">{m.cliente_nome?.trim() || m.descricao}</span>
                    {/* Diz de onde veio o lancamento: e a etiqueta que explica
                        por que a lixeira funciona num e avisa no outro. */}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        m.pedido_numero
                          ? "bg-[var(--peach)] text-[var(--coral)]"
                          : "bg-[var(--cream-deep)] text-[var(--bronze)]",
                      )}
                    >
                      {m.pedido_numero ? `pedido #${m.pedido_numero}` : "manual"}
                    </span>
                  </p>
                  {(m.tipo_despesa || m.tipo_receita || m.fornecedor || m.forma_pagamento) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        m.forma_pagamento,
                        // Sem cliente, a descricao ja e o titulo — repetir aqui
                        // era o "Pix / Pix" das linhas vindas de pedido.
                        m.cliente_nome?.trim() ? m.descricao : null,
                        m.tipo_receita,
                        m.tipo_despesa,
                        m.fornecedor,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
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
  tiposDespesa,
  tiposReceita,
  onSalvo,
}: {
  tipo: "entrada" | "saida";
  fornecedores: string[];
  tiposDespesa: TipoDespesa[];
  tiposReceita: TipoDespesa[];
  onSalvo: () => void;
}) {
  // O bloco de categoria e um so: muda a lista, o rotulo e quem cria. Duplicar
  // o formulario por lado sairia caro para manter.
  const ehEntrada = tipo === "entrada";
  const [data, setData] = useState(() => hojeISO());
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [tipoDespesaId, setTipoDespesaId] = useState("");
  const [opcoesDespesa, setOpcoesDespesa] = useState<TipoDespesa[]>(
    ehEntrada ? tiposReceita : tiposDespesa,
  );
  const [cadastrandoTipo, setCadastrandoTipo] = useState(false);
  const [novoTipo, setNovoTipo] = useState("");
  const [salvandoTipo, setSalvandoTipo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setOpcoesDespesa(ehEntrada ? tiposReceita : tiposDespesa);
  }, [ehEntrada, tiposDespesa, tiposReceita]);

  const podeSalvar = paraNumero(valor) > 0 && descricao.trim().length > 0;

  async function cadastrarTipoDespesa() {
    const nome = novoTipo.trim();
    if (!nome || salvandoTipo) return;

    setSalvandoTipo(true);
    try {
      const criado = ehEntrada
        ? await criarTipoReceita({ data: { nome } })
        : await criarTipoDespesa({ data: { nome } });
      setOpcoesDespesa((atuais) =>
        [...atuais, criado].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      );
      setTipoDespesaId(criado.id);
      setNovoTipo("");
      setCadastrandoTipo(false);
      toast.success(ehEntrada ? "Tipo de receita cadastrado." : "Tipo de despesa cadastrado.");
    } catch (e) {
      toast.error(
        mensagemDeErro(e, ehEntrada ? "cadastrar o tipo de receita" : "cadastrar o tipo de despesa"),
      );
    } finally {
      setSalvandoTipo(false);
    }
  }

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
          tipo_despesa_id: ehEntrada ? null : tipoDespesaId || null,
          tipo_receita_id: ehEntrada ? tipoDespesaId || null : null,
        },
      });
      toast.success(tipo === "entrada" ? "Entrada lançada." : "Saída lançada.");
      setValor("");
      setDescricao("");
      setFornecedor("");
      setTipoDespesaId("");
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
            Descrição
          </span>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && salvar()}
            placeholder={tipo === "entrada" ? "Ex.: venda na feira" : "Ex.: frios e pães"}
            className="h-10"
          />
        </label>

        <div className="block min-w-[12rem]">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {ehEntrada ? "Receita" : "Despesa"}
            </span>
            <div className="flex h-10 overflow-hidden rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <select
                value={tipoDespesaId}
                onChange={(e) => setTipoDespesaId(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                aria-label={ehEntrada ? "Tipo de receita" : "Tipo de despesa"}
              >
                <option value="">Selecione</option>
                {opcoesDespesa.map((opcao) => (
                  <option key={opcao.id} value={opcao.id}>
                    {opcao.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCadastrandoTipo((valorAtual) => !valorAtual)}
                className="grid w-10 shrink-0 place-items-center border-l border-input text-[var(--terracotta)] transition hover:bg-[var(--cream)]"
                aria-label={ehEntrada ? "Cadastrar tipo de receita" : "Cadastrar tipo de despesa"}
                title={ehEntrada ? "Cadastrar tipo de receita" : "Cadastrar tipo de despesa"}
              >
                {cadastrandoTipo ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </div>

        {tipo === "saida" && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Fornecedor</span>
            <Input
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              placeholder=""
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

      {tipo === "saida" && cadastrandoTipo && (
        <div className="mt-2 ml-auto flex max-w-md items-center gap-2 rounded-xl bg-[var(--cream-soft)] p-2">
          <Input
            value={novoTipo}
            onChange={(e) => setNovoTipo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void cadastrarTipoDespesa();
              }
            }}
            placeholder="Ex.: Insumos, salários, gasolina"
            autoFocus
            className="h-9"
          />
          <Button
            type="button"
            onClick={cadastrarTipoDespesa}
            disabled={!novoTipo.trim() || salvandoTipo}
            className="h-9 shrink-0"
          >
            Salvar
          </Button>
        </div>
      )}
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

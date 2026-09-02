import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, Download, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataLonga, hojeISO, somarDias } from "@/lib/prazo";
import {
  carregarMovimentos,
  carregarSaldoAcumulado,
  carregarConfigFinanceiro,
  conferirMovimento,
  salvarConfigFinanceiro,
  criarTipoDespesa,
  criarTipoReceita,
  removerMovimento,
  salvarMovimento,
} from "@/lib/financeiro";
import { porDia, resumoDoCaixa, type Movimento } from "@/lib/caixa";
import { formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader, useConfirmar, ValorCarregando } from "./shell";

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
  const [lancamentoAberto, setLancamentoAberto] = useState(false);
  // O mesmo dialogo serve para criar e para editar: salvarMovimento ja aceita
  // um id, so nao havia tela que usasse isso.
  const [editando, setEditando] = useState<Movimento | null>(null);
  const [saldo, setSaldo] = useState(0);
  const [saldoAberto, setSaldoAberto] = useState(false);
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
      // Saldo acumulado: e o unico numero que bate com o extrato, porque o
      // "sobrou" do periodo ignora tudo que veio antes dele.
      setSaldo((await carregarSaldoAcumulado({ data: { ate } })).saldo);
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

  async function conferir(m: Movimento) {
    const marcado = Boolean(m.conferido_em);
    // Otimista: o circulo pinta na hora e volta sozinho se o banco recusar.
    setMovimentos((atuais) =>
      atuais.map((x) =>
        x.id === m.id ? { ...x, conferido_em: marcado ? null : hojeISO() } : x,
      ),
    );
    try {
      await conferirMovimento({ data: { id: m.id, conferido: !marcado } });
    } catch (e) {
      toast.error(mensagemDeErro(e, "marcar o lançamento"));
      recarregar();
    }
  }

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
    a.download = `${tipo === "entrada" ? "recebimentos" : "pagamentos"}-${de}-a-${ate}.csv`;
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
        titulo={tipo === "entrada" ? "Recebimentos" : "Pagamentos"}
        descricao={
          tipo === "entrada"
            ? "Todo pedido marcado como pago entra aqui sozinho, com a forma de pagamento. Use o campo abaixo só para dinheiro que não veio de um pedido."
            : "Compra, conta, retirada. Informe a descrição, o tipo de despesa e o fornecedor."
        }
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Cartao rotulo="Entrou" valor={resumo.entradas} cor="var(--whatsapp)" carregando={carregando} />
        <Cartao rotulo="Saiu" valor={resumo.saidas} cor="var(--terracotta)" carregando={carregando} />
        <Cartao
          rotulo="Saldo"
          carregando={carregando}
          valor={saldo}
          cor={saldo < 0 ? "var(--terracotta)" : "var(--bronze)"}
          destaque
          nota={`no período: ${resumo.saldo >= 0 ? "+" : ""}${formatBRL(resumo.saldo)}`}
          onEditar={() => setSaldoAberto(true)}
        />
        {/* Fora do periodo de proposito: e o que esta em aberto hoje, nao o que
            ficou em aberto naquele mes. */}
        <Cartao rotulo="A receber" valor={aReceber} cor="var(--admin-muted)" carregando={carregando} />
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

      {/* Chips e acoes na mesma faixa. Os chips sao so de recebimento e so
          quando ha o que somar; os botoes valem sempre. */}
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
          onClick={() => {
            setEditando(null);
            setLancamentoAberto(true);
          }}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--coral)] px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo lançamento
        </button>
        <button
          type="button"
          onClick={baixarCsv}
          disabled={daAba.length === 0}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--cream-deep)] bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-[var(--cream-soft)] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar CSV
        </button>
      </div>

      {daAba.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {daAba.filter((m) => m.conferido_em).length} de {daAba.length} conferidos com o
          extrato
        </p>
      )}

      <DialogoSaldoInicial
        aberto={saldoAberto}
        onFechar={() => setSaldoAberto(false)}
        onSalvo={recarregar}
      />

      <DialogoLancamento
        tipo={tipo}
        fornecedores={fornecedores}
        tiposDespesa={tiposDespesa}
        tiposReceita={tiposReceita}
        editando={editando}
        aberto={lancamentoAberto}
        onFechar={() => {
          setLancamentoAberto(false);
          setEditando(null);
        }}
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
              : "Use o botão Novo lançamento para registrar a primeira compra."
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
                <button
                  type="button"
                  // So o manual abre: o que veio de pedido se edita em Vendas,
                  // e o mesmo motivo pelo qual a lixeira avisa em vez de apagar.
                  onClick={() => {
                    if (m.pedido_numero) return;
                    setEditando(m);
                    setLancamentoAberto(true);
                  }}
                  disabled={Boolean(m.pedido_numero)}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
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
                </button>
                <Num className="shrink-0 font-medium text-foreground">{formatBRL(m.valor)}</Num>
                <button
                  type="button"
                  onClick={() => conferir(m)}
                  title={
                    m.conferido_em
                      ? `Conferido em ${m.conferido_em}. Clique para desmarcar.`
                      : "Marcar como conferido com o extrato"
                  }
                  aria-pressed={Boolean(m.conferido_em)}
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors",
                    m.conferido_em
                      ? "border-[var(--whatsapp)] bg-[var(--whatsapp)] text-white"
                      : "border-[var(--cream-deep)] text-foreground/25 hover:text-foreground/60",
                  )}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
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
  nota,
  onEditar,
  carregando,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  destaque?: boolean;
  nota?: string;
  onEditar?: () => void;
  carregando?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]",
        destaque && "ring-1 ring-[var(--cream-deep)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--bronze)]">{rotulo}</p>
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            aria-label="Ajustar saldo inicial"
            title="Ajustar saldo inicial"
            className="rounded-full p-1 text-foreground/30 transition-colors hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {carregando ? (
        <ValorCarregando />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: cor }}>
          {formatBRL(valor)}
        </p>
      )}
      {nota && !carregando && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

/**
 * Lançamento manual em diálogo.
 *
 * Era uma faixa de campos apertados acima da lista, com rótulos minúsculos e
 * tudo numa linha só. Em diálogo cabem rótulo, ajuda e espaço — e o mesmo
 * formulário passa a servir para editar, coisa que salvarMovimento já aceitava
 * e nenhuma tela usava.
 */
function DialogoLancamento({
  tipo,
  fornecedores,
  tiposDespesa,
  tiposReceita,
  editando,
  aberto,
  onFechar,
  onSalvo,
}: {
  tipo: "entrada" | "saida";
  fornecedores: string[];
  tiposDespesa: TipoDespesa[];
  tiposReceita: TipoDespesa[];
  editando: Movimento | null;
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const ehEntrada = tipo === "entrada";
  const opcoes = ehEntrada ? tiposReceita : tiposDespesa;

  const [data, setData] = useState(() => hojeISO());
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [cadastrando, setCadastrando] = useState(false);
  const [novoTipo, setNovoTipo] = useState("");
  const [salvandoTipo, setSalvandoTipo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Semeia os campos toda vez que o dialogo abre: sem isso, editar um
  // lancamento mostraria o que sobrou do anterior.
  useEffect(() => {
    if (!aberto) return;
    setData(editando?.data ?? hojeISO());
    setValor(editando ? String(editando.valor).replace(".", ",") : "");
    setDescricao(editando?.descricao ?? "");
    setFornecedor(editando?.fornecedor ?? "");
    const nome = ehEntrada ? editando?.tipo_receita : editando?.tipo_despesa;
    setCategoriaId(opcoes.find((o) => o.nome === nome)?.id ?? "");
    setCadastrando(false);
    setNovoTipo("");
  }, [aberto, editando, ehEntrada, opcoes]);

  const podeSalvar = paraNumero(valor) > 0 && descricao.trim().length > 0;

  async function cadastrarCategoria() {
    const nome = novoTipo.trim();
    if (!nome || salvandoTipo) return;
    setSalvandoTipo(true);
    try {
      const criado = ehEntrada
        ? await criarTipoReceita({ data: { nome } })
        : await criarTipoDespesa({ data: { nome } });
      setCategoriaId(criado.id);
      setNovoTipo("");
      setCadastrando(false);
      toast.success("Categoria cadastrada.");
      onSalvo();
    } catch (e) {
      toast.error(mensagemDeErro(e, "cadastrar a categoria"));
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
          ...(editando ? { id: editando.id } : {}),
          tipo,
          data,
          valor: paraNumero(valor),
          descricao: descricao.trim(),
          fornecedor: fornecedor.trim() || null,
          tipo_despesa_id: ehEntrada ? null : categoriaId || null,
          tipo_receita_id: ehEntrada ? categoriaId || null : null,
        },
      });
      toast.success(
        editando
          ? "Lançamento atualizado."
          : ehEntrada
            ? "Recebimento lançado."
            : "Pagamento lançado.",
      );
      onSalvo();
      onFechar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o lançamento"));
    }
    setSalvando(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>
            {editando ? "Editar lançamento" : ehEntrada ? "Novo recebimento" : "Novo pagamento"}
          </DialogTitle>
          <DialogDescription>
            {ehEntrada
              ? "Dinheiro que entrou e não veio de um pedido — venda na feira, adiantamento, devolução."
              : "Compra, conta, retirada. A categoria e o fornecedor ajudam a achar depois."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Dia</span>
            <DatePickerField
              value={data}
              onChange={setData}
              ariaLabel="Dia do lançamento"
              className="h-10 w-full"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Valor</span>
            <Input
              autoFocus
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="h-10"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Descrição</span>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={ehEntrada ? "Ex.: venda na feira" : "Ex.: frios e pães"}
              maxLength={200}
              className="h-10"
            />
          </label>

          <div className={ehEntrada ? "block sm:col-span-2" : "block"}>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {ehEntrada ? "Tipo de receita" : "Tipo de despesa"}
            </span>
            <div className="flex h-10 overflow-hidden rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                aria-label={ehEntrada ? "Tipo de receita" : "Tipo de despesa"}
              >
                <option value="">Sem categoria</option>
                {opcoes.map((opcao) => (
                  <option key={opcao.id} value={opcao.id}>
                    {opcao.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCadastrando((atual) => !atual)}
                className="grid w-10 shrink-0 place-items-center border-l border-input text-[var(--terracotta)] transition hover:bg-[var(--cream)]"
                aria-label="Cadastrar categoria"
                title="Cadastrar categoria"
              >
                {cadastrando ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!ehEntrada && (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Fornecedor
              </span>
              <Input
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                list="fornecedores-usados"
                className="h-10"
              />
              <datalist id="fornecedores-usados">
                {fornecedores.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </label>
          )}

          {cadastrando && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--cream-soft)] p-2 sm:col-span-2">
              <Input
                value={novoTipo}
                onChange={(e) => setNovoTipo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void cadastrarCategoria();
                  }
                }}
                placeholder={ehEntrada ? "Ex.: taxa de entrega" : "Ex.: insumos, gasolina"}
                autoFocus
                className="h-9"
              />
              <Button
                type="button"
                onClick={cadastrarCategoria}
                disabled={!novoTipo.trim() || salvandoTipo}
                className="h-9 shrink-0"
              >
                Salvar
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="pt-1">
          <Button type="button" variant="outline" onClick={onFechar} className="rounded-full">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={salvar}
            disabled={!podeSalvar || salvando}
            className="rounded-full"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Lançar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

/**
 * Saldo inicial: de onde a conta comeca.
 *
 * Sem ele, "sobrou" e sempre entradas menos saidas do periodo, e o numero
 * nunca bate com o extrato porque ignora tudo que veio antes. Dois campos, uma
 * vez na vida.
 */
function DialogoSaldoInicial({
  aberto,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(() => hojeISO());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    carregarConfigFinanceiro()
      .then((c) => {
        setValor(c.saldo_inicial ? String(c.saldo_inicial).replace(".", ",") : "");
        setData(c.saldo_inicial_em ?? hojeISO());
      })
      .catch((e) => toast.error(mensagemDeErro(e, "carregar o saldo inicial")))
      .finally(() => setCarregando(false));
  }, [aberto]);

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    try {
      await salvarConfigFinanceiro({
        data: { saldo_inicial: paraNumero(valor), saldo_inicial_em: data },
      });
      toast.success("Saldo inicial salvo.");
      onSalvo();
      onFechar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o saldo inicial"));
    }
    setSalvando(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Saldo inicial</DialogTitle>
          <DialogDescription>
            Quanto havia em caixa antes de você começar a lançar aqui. É daqui que o saldo
            parte — sem isso, ele nunca bate com o extrato.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Havia em caixa
            </span>
            <Input
              autoFocus
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              disabled={carregando}
              className="h-10"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Em</span>
            <DatePickerField
              value={data}
              onChange={setData}
              ariaLabel="Data do saldo inicial"
              className="h-10 w-full"
            />
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Lançamentos anteriores a essa data não são somados de novo — presume-se que já
          estão dentro do valor informado.
        </p>

        <DialogFooter className="pt-1">
          <Button variant="outline" onClick={onFechar} className="rounded-full">
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || carregando} className="rounded-full">
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

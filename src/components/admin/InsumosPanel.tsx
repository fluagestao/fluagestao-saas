"use client";

import {
  History,
  PackagePlus,
  Pencil,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  carregarCadastroInsumos,
  historicoCustoInsumo,
  removerInsumo,
  salvarInsumo,
  type CadastroInsumos,
  type CustoHistorico,
  type FrequenciaCompra,
  type InsumoRow,
  type UnidadeInsumo,
} from "@/lib/insumos";
import { mensagemDeErro } from "@/lib/erros";
import { PageHeader, useConfirmar } from "./shell";

const UNIDADES: { value: UnidadeInsumo; label: string }[] = [
  { value: "UN", label: "Unidade" },
  { value: "KG", label: "Quilo" },
  { value: "G", label: "Grama" },
  { value: "L", label: "Litro" },
  { value: "ML", label: "Mililitro" },
  { value: "CX", label: "Caixa" },
  { value: "PCT", label: "Pacote" },
];

const FREQUENCIAS: { value: FrequenciaCompra; label: string }[] = [
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
  { value: "esporadica", label: "Esporádica" },
];

/* Sugestoes de partida: sem elas o campo abre vazio e cada um inventa um
   rotulo diferente para a mesma coisa. Elas somem de vista assim que a
   empresa tem os proprios valores cadastrados. */
const CATEGORIAS_SUGERIDAS = [
  "Bebidas",
  "Doces",
  "Embalagens",
  "Frios e queijos",
  "Mercearia",
  "Padaria",
  "Salgados",
];

const EMBALAGENS_SUGERIDAS = ["pacote", "caixa", "garrafa", "lata", "pote", "bandeja", "fardo"];

const SEM_VALOR = "__nenhum__";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

/* Insumo barato — grama de bolacha, ml de vinho — vale centesimos de centavo.
   Arredondar tudo em duas casas transformaria o custo do produto em zero. */
function moedaUnitaria(valor: number) {
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

/** Aceita "1.234,56" e "1234.56": vírgula manda quando existe. */
function paraNumero(texto: string): number {
  const bruto = texto.trim();
  if (!bruto) return Number.NaN;
  return Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
}

function paraCampo(valor: number) {
  return String(valor).replace(".", ",");
}

function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

type Formulario = {
  id?: string;
  nome: string;
  categoria: string;
  unidade: UnidadeInsumo;
  quantidade: string;
  tipoEmbalagem: string;
  precoEmbalagem: string;
  fornecedorId: string;
  frequencia: string;
  observacao: string;
  ativo: boolean;
};

const FORMULARIO_VAZIO: Formulario = {
  nome: "",
  categoria: "",
  unidade: "UN",
  quantidade: "1",
  tipoEmbalagem: "",
  precoEmbalagem: "",
  fornecedorId: SEM_VALOR,
  frequencia: SEM_VALOR,
  observacao: "",
  ativo: true,
};

export function InsumosPanel() {
  const [dados, setDados] = useState<CadastroInsumos>({
    insumos: [],
    fornecedores: [],
    categorias: [],
    embalagens: [],
  });
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState(SEM_VALOR);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Formulario>(FORMULARIO_VAZIO);
  const [historico, setHistorico] = useState<CustoHistorico[]>([]);
  const [verHistorico, setVerHistorico] = useState(false);
  const confirmar = useConfirmar();

  async function carregar() {
    setCarregando(true);
    try {
      setDados(await carregarCadastroInsumos());
    } catch (e) {
      toast.error(mensagemDeErro(e, "carregar insumos"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (window.location.pathname !== "/insumos") {
      window.history.replaceState(window.history.state, "", "/insumos");
    }
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return dados.insumos.filter((item) => {
      if (categoriaFiltro !== SEM_VALOR && (item.categoria ?? "") !== categoriaFiltro) return false;
      if (!termo) return true;
      return `${item.nome} ${item.categoria ?? ""} ${item.fornecedor_nome ?? ""} ${item.unidade}`
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });
  }, [busca, categoriaFiltro, dados.insumos]);

  const categorias = useMemo(
    () => Array.from(new Set([...dados.categorias, ...CATEGORIAS_SUGERIDAS])).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dados.categorias],
  );

  const embalagens = useMemo(
    () => Array.from(new Set([...dados.embalagens, ...EMBALAGENS_SUGERIDAS])).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [dados.embalagens],
  );

  // A conta que a tela existe para fazer: preço pago dividido pelo que vem
  // dentro. É o inverso do que o formulário antigo pedia.
  const quantidadeForm = paraNumero(form.quantidade);
  const precoForm = paraNumero(form.precoEmbalagem);
  const custoUnitario =
    Number.isFinite(quantidadeForm) && quantidadeForm > 0 && Number.isFinite(precoForm) && precoForm >= 0
      ? precoForm / quantidadeForm
      : null;

  function abrirNovo() {
    setForm(FORMULARIO_VAZIO);
    setHistorico([]);
    setVerHistorico(false);
    setAberto(true);
  }

  async function abrirEdicao(item: InsumoRow) {
    setForm({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria ?? "",
      unidade: item.unidade,
      quantidade: paraCampo(item.quantidade_referencia),
      tipoEmbalagem: item.tipo_embalagem ?? "",
      precoEmbalagem: item.preco_embalagem.toFixed(2).replace(".", ","),
      fornecedorId: item.fornecedor_id ?? SEM_VALOR,
      frequencia: item.frequencia_compra ?? SEM_VALOR,
      observacao: item.observacao ?? "",
      ativo: item.ativo,
    });
    setHistorico([]);
    setVerHistorico(false);
    setAberto(true);

    try {
      setHistorico(await historicoCustoInsumo({ data: { id: item.id } }));
    } catch {
      // Histórico é acessório: se falhar, o cadastro continua editável.
    }
  }

  async function salvar() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do insumo.");
      return;
    }
    if (!Number.isFinite(quantidadeForm) || quantidadeForm <= 0) {
      toast.error("Informe quanto vem na embalagem.");
      return;
    }
    if (!Number.isFinite(precoForm) || precoForm < 0) {
      toast.error("Informe quanto custa a embalagem.");
      return;
    }

    setSalvando(true);
    try {
      await salvarInsumo({
        data: {
          id: form.id,
          nome: form.nome.trim(),
          unidade: form.unidade,
          quantidade_referencia: quantidadeForm,
          preco_embalagem: precoForm,
          ativo: form.ativo,
          categoria: form.categoria.trim() || null,
          tipo_embalagem: form.tipoEmbalagem.trim() || null,
          fornecedor_id: form.fornecedorId === SEM_VALOR ? null : form.fornecedorId,
          frequencia_compra: form.frequencia === SEM_VALOR ? null : form.frequencia,
          observacao: form.observacao.trim() || null,
        },
      });
      toast.success(form.id ? "Insumo atualizado." : "Insumo cadastrado.");
      setAberto(false);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar insumo"));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(item: InsumoRow) {
    const ok = await confirmar({
      titulo: `Excluir "${item.nome}"?`,
      descricao:
        "Se ele estiver sendo usado na composição de um produto, a exclusão será bloqueada.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    try {
      const resultado = await removerInsumo({ data: { id: item.id } });
      if (!resultado.ok) {
        toast.warning(resultado.motivo, { duration: 7000 });
        return;
      }
      toast.success("Insumo excluído.");
      setAberto(false);
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir insumo"));
    }
  }

  const colunas =
    "grid-cols-[minmax(220px,1.7fr)_minmax(150px,1fr)_130px_minmax(140px,1fr)_100px_88px]";

  return (
    <section data-tela-cheia className="xl:h-[calc(100dvh-122px)] xl:overflow-hidden">
      <PageHeader
        titulo="Insumos"
        descricao="Cadastre o que você compra do jeito que compra: a embalagem inteira e o preço dela. O custo unitário sai da conta e alimenta o custo dos produtos."
        acoes={
          <Button onClick={abrirNovo} className="h-11">
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Cadastrar novo insumo
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, categoria ou fornecedor"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {dados.categorias.length > 0 && (
          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="h-11 w-[200px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM_VALOR}>Todas as categorias</SelectItem>
              {dados.categorias.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--cream-deep)] bg-card">
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[900px]">
            <div
              className={`sticky top-0 z-10 grid ${colunas} gap-3 border-b border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground`}
            >
              <span>Insumo</span>
              <span>Embalagem</span>
              <span>Custo unitário</span>
              <span>Fornecedor</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            {carregando ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Carregando insumos...
              </div>
            ) : filtrados.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--peach-soft)]">
                  <PackagePlus className="h-5 w-5 text-[var(--coral)]" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {dados.insumos.length === 0
                    ? "Nenhum insumo cadastrado ainda."
                    : "Nenhum insumo encontrado com esse filtro."}
                </p>
                {dados.insumos.length === 0 && (
                  <Button variant="outline" onClick={abrirNovo}>
                    <PackagePlus className="mr-1.5 h-4 w-4" />
                    Cadastrar o primeiro
                  </Button>
                )}
              </div>
            ) : (
              filtrados.map((item) => (
                <div
                  key={item.id}
                  className={`grid min-h-[58px] ${colunas} items-center gap-3 border-b border-[var(--cream-deep)] px-4 py-2.5 last:border-b-0`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.nome}</p>
                    {item.categoria && (
                      <p className="truncate text-xs text-muted-foreground">{item.categoria}</p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--admin-ink-soft)]">
                      {numeroBr(item.quantidade_referencia)} {item.unidade}
                      {item.tipo_embalagem ? ` · ${item.tipo_embalagem}` : ""}
                    </p>
                    <p className="truncate text-xs tabular-nums text-muted-foreground">
                      {moeda(item.preco_embalagem)}
                    </p>
                  </div>

                  <span className="text-sm font-bold tabular-nums text-[var(--wine)]">
                    {moedaUnitaria(item.custo_referencia)}
                  </span>

                  <span className="truncate text-sm text-[var(--admin-ink-soft)]">
                    {item.fornecedor_nome ?? "—"}
                  </span>

                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--cream-soft)] px-2.5 py-1 text-xs font-medium text-[var(--admin-ink-soft)]">
                    <span
                      className={`h-2 w-2 rounded-full ${item.ativo ? "bg-emerald-500" : "bg-zinc-400"}`}
                    />
                    {item.ativo ? "Ativo" : "Inativo"}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEdicao(item)}
                      aria-label={`Editar ${item.nome}`}
                    >
                      <Pencil className="h-4 w-4 text-[var(--terracotta)]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => excluir(item)}
                      aria-label={`Excluir ${item.nome}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 h-6 text-xs text-muted-foreground">
        {carregando
          ? ""
          : filtrados.length === dados.insumos.length
            ? `${dados.insumos.length} ${dados.insumos.length === 1 ? "insumo" : "insumos"}`
            : `${filtrados.length} de ${dados.insumos.length} insumos`}
      </p>

      <Dialog open={aberto} onOpenChange={(estado) => !estado && setAberto(false)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>{form.id ? "Editar insumo" : "Novo insumo"}</DialogTitle>
            <DialogDescription>
              Preencha como você compra. O custo por unidade é calculado sozinho e é ele que entra
              na composição dos produtos.
            </DialogDescription>
          </DialogHeader>

          <datalist id="lista-categorias-insumo">
            {categorias.map((categoria) => (
              <option key={categoria} value={categoria} />
            ))}
          </datalist>
          <datalist id="lista-embalagens-insumo">
            {embalagens.map((embalagem) => (
              <option key={embalagem} value={embalagem} />
            ))}
          </datalist>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              Nome
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Vinho Campo Largo 900 ml"
                className="h-11"
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Categoria
              <Input
                value={form.categoria}
                list="lista-categorias-insumo"
                onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                placeholder="Ex.: Frios e queijos"
                className="h-11"
              />
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Unidade de consumo
              <Select
                value={form.unidade}
                onValueChange={(value) => setForm((f) => ({ ...f, unidade: value as UnidadeInsumo }))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Fornecedor
              <Select
                value={form.fornecedorId}
                onValueChange={(value) => setForm((f) => ({ ...f, fornecedorId: value }))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_VALOR}>Sem fornecedor</SelectItem>
                  {dados.fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1.5 text-sm font-medium">
              Frequência de compra
              <Select
                value={form.frequencia}
                onValueChange={(value) => setForm((f) => ({ ...f, frequencia: value }))}
              >
                <SelectTrigger className="h-11 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_VALOR}>Não definida</SelectItem>
                  {FREQUENCIAS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-4 sm:col-span-3">
              <p className="text-sm font-semibold text-foreground">Como você compra</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Copie da nota: o que vem na embalagem e quanto ela custou.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="space-y-1.5 text-sm font-medium">
                  Quantidade por embalagem
                  <Input
                    value={form.quantidade}
                    onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))}
                    inputMode="decimal"
                    placeholder="6"
                    className="h-11 bg-white"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium">
                  Tipo de embalagem
                  <Input
                    value={form.tipoEmbalagem}
                    list="lista-embalagens-insumo"
                    onChange={(e) => setForm((f) => ({ ...f, tipoEmbalagem: e.target.value }))}
                    placeholder="pacote"
                    className="h-11 bg-white"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-medium">
                  Custo da embalagem (R$)
                  <Input
                    value={form.precoEmbalagem}
                    onChange={(e) => setForm((f) => ({ ...f, precoEmbalagem: e.target.value }))}
                    inputMode="decimal"
                    placeholder="39,90"
                    className="h-11 bg-white"
                  />
                </label>
              </div>

              <div className="mt-3 rounded-xl bg-white px-3.5 py-2.5 text-sm">
                {custoUnitario === null ? (
                  <span className="text-muted-foreground">
                    Preencha a quantidade e o custo para ver o valor por unidade.
                  </span>
                ) : (
                  <span className="text-[var(--admin-ink-soft)]">
                    {form.tipoEmbalagem.trim() ? `1 ${form.tipoEmbalagem.trim()} com ` : ""}
                    {numeroBr(quantidadeForm)} {form.unidade} por {moeda(precoForm)} ={" "}
                    <strong className="font-bold text-[var(--wine)]">
                      {moedaUnitaria(custoUnitario)}
                    </strong>{" "}
                    por {form.unidade}
                  </span>
                )}
              </div>
            </div>

            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              Observação
              <Textarea
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Marca preferida, onde comprar mais barato, cuidado no transporte..."
                rows={2}
              />
            </label>

            <label className="flex h-11 items-center gap-3 self-end rounded-xl border border-input px-3.5 text-sm font-medium">
              <Switch
                checked={form.ativo}
                onCheckedChange={(valor) => setForm((f) => ({ ...f, ativo: valor }))}
              />
              {form.ativo ? "Insumo ativo" : "Insumo inativo"}
            </label>

            {form.id && historico.length > 0 && (
              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={() => setVerHistorico((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--coral)]"
                >
                  <History className="h-4 w-4" />
                  {verHistorico ? "Ocultar histórico de custo" : `Histórico de custo (${historico.length})`}
                </button>

                {verHistorico && (
                  <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-[var(--cream-deep)]">
                    {historico.map((linha, indice) => {
                      const anterior = historico[indice + 1];
                      const variacao =
                        anterior && anterior.custo > 0
                          ? (linha.custo - anterior.custo) / anterior.custo
                          : null;
                      return (
                        <div
                          key={linha.id}
                          className="flex items-center justify-between gap-3 border-b border-[var(--cream-deep)] px-3.5 py-2 text-sm last:border-b-0"
                        >
                          <span className="text-muted-foreground">{dataCurta(linha.registrado_em)}</span>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums text-[var(--admin-ink-soft)]">
                              {moedaUnitaria(linha.custo)} / {form.unidade}
                            </span>
                            {variacao !== null && Math.abs(variacao) >= 0.005 && (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                  variacao > 0 ? "text-destructive" : "text-[var(--green-ink)]"
                                }`}
                              >
                                {variacao > 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5" />
                                ) : (
                                  <TrendingDown className="h-3.5 w-3.5" />
                                )}
                                {`${variacao > 0 ? "+" : ""}${(variacao * 100).toFixed(0)}%`}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-1 sm:justify-between">
            {form.id ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={salvando}
                onClick={() => {
                  const item = dados.insumos.find((i) => i.id === form.id);
                  if (item) excluir(item);
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Excluir
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
                Cancelar
              </Button>
              <Button onClick={salvar} disabled={salvando}>
                {form.id ? "Salvar alterações" : "Cadastrar insumo"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

"use client";

import {
  ChevronLeft,
  ChevronRight,
  PackagePlus,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  listarInsumos,
  removerInsumo,
  salvarInsumo,
  type InsumoRow,
  type UnidadeInsumo,
} from "@/lib/insumos";
import { mensagemDeErro } from "@/lib/erros";
import { PageHeader, useConfirmar } from "./shell";

const ITENS_POR_PAGINA = 7;

const UNIDADES: { value: UnidadeInsumo; label: string }[] = [
  { value: "UN", label: "Unidade" },
  { value: "KG", label: "Kg" },
  { value: "G", label: "Grama" },
  { value: "L", label: "Litro" },
  { value: "ML", label: "Ml" },
  { value: "CX", label: "Caixa" },
  { value: "PCT", label: "Pacote" },
];

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function InsumosPanel() {
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<UnidadeInsumo>("UN");
  const [quantidade, setQuantidade] = useState("1");
  const [custo, setCusto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<InsumoRow | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editUnidade, setEditUnidade] = useState<UnidadeInsumo>("UN");
  const [editQuantidade, setEditQuantidade] = useState("1");
  const [editCusto, setEditCusto] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const confirmar = useConfirmar();

  async function carregar() {
    setCarregando(true);
    try {
      setInsumos(await listarInsumos());
    } catch (e) {
      toast.error(mensagemDeErro(e, "carregar insumos"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // Insumos possui rota própria. Quando a aba for aberta a partir de outra
    // tela do painel, sincronizamos a URL sem recarregar a aplicação.
    if (window.location.pathname !== "/insumos") {
      window.history.replaceState(window.history.state, "", "/insumos");
    }
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return insumos;
    return insumos.filter((item) =>
      `${item.nome} ${item.unidade}`.toLocaleLowerCase("pt-BR").includes(termo),
    );
  }, [busca, insumos]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));

  const itensPagina = useMemo(() => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA;
    return filtrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [filtrados, pagina]);

  useEffect(() => {
    setPagina(1);
  }, [busca]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  async function adicionar() {
    const quantidadeNumero = Number(quantidade.replace(",", "."));
    const custoNumero = Number(custo.replace(",", "."));

    if (!nome.trim()) {
      toast.error("Informe o nome do insumo.");
      return;
    }
    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    if (!Number.isFinite(custoNumero) || custoNumero < 0) {
      toast.error("Informe um custo unitário válido.");
      return;
    }

    setSalvando(true);
    try {
      await salvarInsumo({
        data: {
          nome: nome.trim(),
          unidade,
          quantidade_referencia: quantidadeNumero,
          custo_referencia: custoNumero,
          ativo: true,
        },
      });
      setNome("");
      setUnidade("UN");
      setQuantidade("1");
      setCusto("");
      setPagina(1);
      toast.success("Insumo cadastrado.");
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "cadastrar insumo"));
    } finally {
      setSalvando(false);
    }
  }

  function abrirEdicao(item: InsumoRow) {
    setEditando(item);
    setEditNome(item.nome);
    setEditUnidade(item.unidade);
    setEditQuantidade(String(item.quantidade_referencia).replace(".", ","));
    setEditCusto(item.custo_referencia.toFixed(2).replace(".", ","));
    setEditAtivo(item.ativo);
  }

  async function salvarEdicao() {
    if (!editando) return;

    const quantidadeNumero = Number(editQuantidade.replace(",", "."));
    const custoNumero = Number(editCusto.replace(",", "."));

    if (!editNome.trim()) {
      toast.error("Informe o nome do insumo.");
      return;
    }
    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      toast.error("Informe uma quantidade válida.");
      return;
    }
    if (!Number.isFinite(custoNumero) || custoNumero < 0) {
      toast.error("Informe um custo unitário válido.");
      return;
    }

    setSalvando(true);
    try {
      await salvarInsumo({
        data: {
          id: editando.id,
          nome: editNome.trim(),
          unidade: editUnidade,
          quantidade_referencia: quantidadeNumero,
          custo_referencia: custoNumero,
          ativo: editAtivo,
        },
      });
      toast.success("Insumo atualizado.");
      setEditando(null);
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
      await removerInsumo({ data: { id: item.id } });
      toast.success("Insumo excluído.");
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir insumo"));
    }
  }

  const inicioExibido = filtrados.length === 0 ? 0 : (pagina - 1) * ITENS_POR_PAGINA + 1;
  const fimExibido = Math.min(pagina * ITENS_POR_PAGINA, filtrados.length);

  return (
    <section className="xl:h-[calc(100dvh-122px)] xl:overflow-hidden">
      <PageHeader
        titulo="Insumos"
        descricao="Cadastre tudo o que entra na montagem dos produtos. O custo de cada produto será calculado pela quantidade usada de cada insumo."
      />

      <div className="mt-4 rounded-2xl border border-[var(--cream-deep)] bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <PackagePlus className="h-4 w-4 text-[var(--terracotta)]" />
          Novo insumo
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(260px,1fr)_160px_160px_190px_auto]">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Vinho Campo Largo 900 ml"
            className="h-11"
          />
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value as UnidadeInsumo)}
            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
          >
            {UNIDADES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <Input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            inputMode="decimal"
            placeholder="Quantidade"
            className="h-11"
          />
          <Input
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            inputMode="decimal"
            placeholder="Custo unitário R$"
            className="h-11"
          />
          <Button onClick={adicionar} disabled={salvando} className="h-11">
            <PackagePlus className="mr-1.5 h-4 w-4" /> Adicionar
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          O campo custo é sempre unitário. Ex.: Queijo Colonial · KG · quantidade 1 · custo unitário R$ 109,90. Se usar 0,250 kg em um produto, o custo será R$ 27,48.
        </p>
      </div>

      <div className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar insumo"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--cream-deep)] bg-card">
        <div className="grid grid-cols-[minmax(240px,1.6fr)_110px_140px_170px_120px_90px] gap-3 border-b border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span>Insumo</span>
          <span>Tipo</span>
          <span>Qtd. base</span>
          <span>Custo unitário</span>
          <span>Status</span>
          <span>Ações</span>
        </div>

        {carregando ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Carregando insumos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum insumo cadastrado.
          </div>
        ) : (
          itensPagina.map((item) => (
            <div
              key={item.id}
              className="grid min-h-[54px] grid-cols-[minmax(240px,1.6fr)_110px_140px_170px_120px_90px] items-center gap-3 border-b border-[var(--cream-deep)] px-4 py-2.5 last:border-b-0"
            >
              <span className="truncate text-sm font-semibold text-foreground">
                {item.nome}
              </span>
              <span className="text-sm text-[var(--admin-ink-soft)]">
                {item.unidade}
              </span>
              <span className="text-sm tabular-nums text-[var(--admin-ink-soft)]">
                {String(item.quantidade_referencia).replace(".", ",")}
              </span>
              <span className="text-sm font-bold text-[var(--wine)]">
                {moeda(item.custo_referencia)} / {item.unidade}
              </span>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--cream-soft)] px-2.5 py-1 text-xs font-medium text-[var(--admin-ink-soft)]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    item.ativo ? "bg-emerald-500" : "bg-zinc-400"
                  }`}
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

      <div className="mt-3 flex h-10 items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {filtrados.length === 0
            ? "Nenhum insumo"
            : `Exibindo ${inicioExibido}–${fimExibido} de ${filtrados.length} insumos`}
        </p>

        {totalPaginas > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
              disabled={pagina === 1}
              className="h-8 px-2.5"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPaginas }, (_, index) => index + 1).map(
              (numero) => (
                <button
                  key={numero}
                  type="button"
                  onClick={() => setPagina(numero)}
                  className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                    pagina === numero
                      ? "bg-[var(--terracotta)] text-white"
                      : "border border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)] hover:bg-[var(--cream)]"
                  }`}
                  aria-label={`Ir para página ${numero}`}
                >
                  {numero}
                </button>
              ),
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPagina((atual) => Math.min(totalPaginas, atual + 1))
              }
              disabled={pagina === totalPaginas}
              className="h-8 px-2.5"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--admin-border)] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Editar insumo</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Altere os dados e salve. A listagem permanece bloqueada para edição direta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-[var(--cream-soft)]"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                Nome
                <Input
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  className="h-11"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Tipo
                <select
                  value={editUnidade}
                  onChange={(e) =>
                    setEditUnidade(e.target.value as UnidadeInsumo)
                  }
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {UNIDADES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Quantidade base
                <Input
                  value={editQuantidade}
                  onChange={(e) => setEditQuantidade(e.target.value)}
                  inputMode="decimal"
                  className="h-11"
                />
              </label>

              <label className="space-y-1.5 text-sm font-medium">
                Custo unitário (R$)
                <Input
                  value={editCusto}
                  onChange={(e) => setEditCusto(e.target.value)}
                  inputMode="decimal"
                  className="h-11"
                />
              </label>

              <div className="flex items-end">
                <label className="flex h-11 items-center gap-3 rounded-xl border border-input px-3.5 text-sm font-medium">
                  <Switch checked={editAtivo} onCheckedChange={setEditAtivo} />
                  {editAtivo ? "Insumo ativo" : "Insumo inativo"}
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditando(null)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button onClick={salvarEdicao} disabled={salvando}>
                Salvar alterações
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

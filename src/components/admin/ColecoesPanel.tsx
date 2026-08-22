import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removerCatalogo, salvarCatalogo } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CORES_DESTAQUE, type CatalogoRow, type CategoriaRow } from "./tipos";
import { EstadoVazio, PageHeader, useConfirmar } from "./shell";

const COR_PADRAO = "#B8893B";

export function ColecoesPanel({
  catalogos,
  categorias,
  onChange,
}: {
  catalogos: CatalogoRow[];
  categorias: CategoriaRow[];
  onChange: () => void;
}) {
  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [cor, setCor] = useState(COR_PADRAO);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  const colecoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return catalogos
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .filter((colecao) => {
        if (!termo) return true;
        return (
          colecao.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
          (colecao.subtitulo ?? "").toLocaleLowerCase("pt-BR").includes(termo)
        );
      });
  }, [busca, catalogos]);

  function baseCatalogo(colecao: CatalogoRow) {
    return {
      id: colecao.id,
      nome: colecao.nome,
      ordem: colecao.ordem ?? 0,
      ativo: colecao.ativo,
      cor: colecao.cor,
      subtitulo: colecao.subtitulo,
      msg_saudacao: colecao.msg_saudacao ?? null,
      msg_fecho: colecao.msg_fecho ?? null,
      msg_produto: colecao.msg_produto ?? null,
    };
  }

  async function criarColecao() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    setSalvando(true);
    try {
      await salvarCatalogo({
        data: {
          nome: nomeLimpo,
          ordem: catalogos.length,
          ativo: true,
          cor,
          subtitulo: subtitulo.trim() || null,
        },
      });
      toast.success(`Coleção "${nomeLimpo}" criada.`);
      setNome("");
      setSubtitulo("");
      setCor(COR_PADRAO);
      onChange();
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarColecao(
    colecao: CatalogoRow,
    patch: Partial<ReturnType<typeof baseCatalogo>>,
  ) {
    await salvarCatalogo({ data: { ...baseCatalogo(colecao), ...patch } });
    onChange();
  }

  async function excluirColecao(colecao: CatalogoRow) {
    const filhas = categorias.filter((categoria) => categoria.catalogo_id === colecao.id);
    const ok = await confirmar({
      titulo: `Excluir a coleção "${colecao.nome}"?`,
      descricao: filhas.length
        ? `As ${filhas.length} categoria(s) vinculadas ficarão sem coleção. Nenhum produto será apagado.`
        : "Nenhum produto será apagado.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    await removerCatalogo({ data: { id: colecao.id } });
    toast.success(`Coleção "${colecao.nome}" excluída.`);
    onChange();
  }

  return (
    <section>
      <PageHeader
        titulo={`Coleções (${catalogos.length})`}
        descricao="Crie e organize as coleções usadas para agrupar categorias e produtos."
      />

      <div className="mt-4 rounded-2xl border border-[var(--cream-deep)] bg-card p-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--terracotta)]">Novo cadastro</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Nova coleção</h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.3fr)_minmax(240px,1fr)_auto_auto] lg:items-center">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarColecao()}
            placeholder="Nome da nova coleção"
            className="h-11"
          />

          <Input
            value={subtitulo}
            onChange={(e) => setSubtitulo(e.target.value)}
            placeholder="Descrição curta (opcional)"
            className="h-11"
          />

          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3 py-2">
            {CORES_DESTAQUE.filter((item) => item.valor).map((item) => (
              <button
                key={item.nome}
                type="button"
                onClick={() => setCor(item.valor)}
                title={item.nome}
                aria-label={`Cor ${item.nome}`}
                className={cn(
                  "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                  cor === item.valor
                    ? "ring-2 ring-foreground ring-offset-1"
                    : "border-[var(--cream-deep)]",
                )}
                style={{ backgroundColor: item.valor }}
              />
            ))}
          </div>

          <Button onClick={criarColecao} disabled={salvando || !nome.trim()} className="h-11">
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar coleção
          </Button>
        </div>
      </div>

      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 focus-within:border-[var(--terracotta)]">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar coleção"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {catalogos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma coleção ainda"
          descricao="Crie a primeira coleção para começar a organizar suas categorias."
        />
      ) : colecoesFiltradas.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--cream-deep)] p-10 text-center text-sm text-muted-foreground">
          Nenhuma coleção encontrada.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {colecoesFiltradas.map((colecao) => {
            const totalCategorias = categorias.filter((categoria) => categoria.catalogo_id === colecao.id).length;
            return (
              <article
                key={colecao.id}
                className="grid gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3 lg:grid-cols-[minmax(220px,1.2fr)_minmax(220px,1fr)_auto_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <Input
                    defaultValue={colecao.nome}
                    onBlur={(e) => {
                      const valor = e.target.value.trim();
                      if (valor && valor !== colecao.nome) atualizarColecao(colecao, { nome: valor });
                    }}
                    className="h-10 font-medium"
                  />
                  <p className="mt-1 px-1 text-[11px] text-muted-foreground">
                    {totalCategorias} categoria(s) vinculada(s)
                  </p>
                </div>

                <Input
                  defaultValue={colecao.subtitulo ?? ""}
                  onBlur={(e) => {
                    const valor = e.target.value.trim() || null;
                    if (valor !== (colecao.subtitulo ?? null)) atualizarColecao(colecao, { subtitulo: valor });
                  }}
                  placeholder="Descrição curta (opcional)"
                  className="h-10 text-sm"
                />

                <div className="flex items-center gap-1.5">
                  {CORES_DESTAQUE.filter((item) => item.valor).map((item) => (
                    <button
                      key={item.nome}
                      type="button"
                      onClick={() => atualizarColecao(colecao, { cor: item.valor })}
                      title={item.nome}
                      aria-label={`Cor ${item.nome}`}
                      className={cn(
                        "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                        (colecao.cor || COR_PADRAO) === item.valor
                          ? "ring-2 ring-foreground ring-offset-1"
                          : "border-[var(--cream-deep)]",
                      )}
                      style={{ backgroundColor: item.valor }}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <label className="flex items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] px-3 py-2 text-xs text-muted-foreground">
                    <Switch
                      checked={colecao.ativo}
                      onCheckedChange={(ativo) => atualizarColecao(colecao, { ativo })}
                    />
                    {colecao.ativo ? "Visível" : "Oculta"}
                  </label>

                  <Button variant="ghost" size="icon" onClick={() => excluirColecao(colecao)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removerEtiqueta, salvarEtiqueta } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CORES_DESTAQUE, type EtiquetaRow } from "./tipos";
import { EstadoVazio, PageHeader, useConfirmar } from "./shell";

const COR_PADRAO = "#B8893B";

export function EtiquetasPanel({
  etiquetas,
  onChange,
}: {
  etiquetas: EtiquetaRow[];
  onChange: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(COR_PADRAO);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  const etiquetasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return etiquetas
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .filter((etiqueta) => !termo || etiqueta.nome.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca, etiquetas]);

  async function criar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return;

    setSalvando(true);
    try {
      await salvarEtiqueta({
        data: {
          nome: nomeLimpo,
          cor,
          ativo: true,
          ordem: etiquetas.length,
        },
      });
      toast.success(`Etiqueta "${nomeLimpo}" criada.`);
      setNome("");
      setCor(COR_PADRAO);
      onChange();
    } finally {
      setSalvando(false);
    }
  }

  async function atualizar(etiqueta: EtiquetaRow, patch: Partial<EtiquetaRow>) {
    await salvarEtiqueta({
      data: {
        id: etiqueta.id,
        nome: patch.nome ?? etiqueta.nome,
        cor: patch.cor ?? etiqueta.cor,
        ativo: patch.ativo ?? etiqueta.ativo,
        ordem: patch.ordem ?? etiqueta.ordem ?? 0,
      },
    });
    onChange();
  }

  async function excluir(etiqueta: EtiquetaRow) {
    const ok = await confirmar({
      titulo: `Excluir a etiqueta "${etiqueta.nome}"?`,
      descricao: "Ela também será removida dos produtos que estiverem usando essa etiqueta.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    await removerEtiqueta({ data: { id: etiqueta.id } });
    toast.success(`Etiqueta "${etiqueta.nome}" excluída.`);
    onChange();
  }

  return (
    <section>
      <PageHeader
        titulo={`Etiquetas (${etiquetas.length})`}
        descricao="Crie etiquetas para destacar produtos, como Mais vendido, Novidade ou Edição limitada."
      />

      <div className="mt-4 rounded-2xl border border-[var(--cream-deep)] bg-card p-4">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--terracotta)]">Novo cadastro</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">Nova etiqueta</h3>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-center">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            placeholder="Nome da nova etiqueta"
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

          <Button onClick={criar} disabled={salvando || !nome.trim()} className="h-11">
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar etiqueta
          </Button>
        </div>
      </div>

      <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 focus-within:border-[var(--terracotta)]">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar etiqueta"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {etiquetas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma etiqueta criada"
          descricao="Crie a primeira etiqueta para disponibilizá-la no cadastro dos produtos."
        />
      ) : etiquetasFiltradas.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--cream-deep)] p-10 text-center text-sm text-muted-foreground">
          Nenhuma etiqueta encontrada.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {etiquetasFiltradas.map((etiqueta) => (
            <article
              key={etiqueta.id}
              className="grid gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: etiqueta.cor || COR_PADRAO }}
                />
                <Input
                  defaultValue={etiqueta.nome}
                  onBlur={(e) => {
                    const valor = e.target.value.trim();
                    if (valor && valor !== etiqueta.nome) atualizar(etiqueta, { nome: valor });
                  }}
                  className="h-10 min-w-0 flex-1 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {CORES_DESTAQUE.filter((item) => item.valor).map((item) => (
                  <button
                    key={item.nome}
                    type="button"
                    onClick={() => atualizar(etiqueta, { cor: item.valor })}
                    title={item.nome}
                    aria-label={`Cor ${item.nome}`}
                    className={cn(
                      "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                      (etiqueta.cor || COR_PADRAO) === item.valor
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
                    checked={etiqueta.ativo}
                    onCheckedChange={(ativo) => atualizar(etiqueta, { ativo })}
                  />
                  {etiqueta.ativo ? "Visível" : "Oculta"}
                </label>

                <Button variant="ghost" size="icon" onClick={() => excluir(etiqueta)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

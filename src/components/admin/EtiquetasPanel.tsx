import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { removerEtiqueta, salvarEtiqueta } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CORES_DESTAQUE, type EtiquetaRow } from "./tipos";
import { EstadoVazio, PageHeader, useConfirmar } from "./shell";

export function EtiquetasPanel({
  etiquetas,
  onChange,
}: {
  etiquetas: EtiquetaRow[];
  onChange: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#B8893B");
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

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
      setCor("#B8893B");
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
        titulo="Etiquetas"
        descricao="Crie etiquetas para destacar produtos, como Mais vendido, Novidade ou Edição limitada."
      />

      <div className="mb-5 rounded-2xl border border-[var(--cream-deep)] bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            placeholder="Nome da nova etiqueta"
            className="h-11"
          />

          <div className="flex items-center gap-1.5">
            {CORES_DESTAQUE.filter((item) => item.valor).map((item) => (
              <button
                key={item.nome}
                type="button"
                onClick={() => setCor(item.valor)}
                title={item.nome}
                aria-label={`Cor ${item.nome}`}
                className={cn(
                  "h-7 w-7 rounded-full border transition-transform hover:scale-110",
                  cor === item.valor
                    ? "ring-2 ring-foreground ring-offset-2"
                    : "border-[var(--cream-deep)]",
                )}
                style={{ backgroundColor: item.valor }}
              />
            ))}
          </div>

          <Button onClick={criar} disabled={salvando || !nome.trim()} className="h-11">
            <Plus className="mr-1.5 h-4 w-4" /> Criar etiqueta
          </Button>
        </div>
      </div>

      {etiquetas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma etiqueta criada"
          descricao="Crie a primeira etiqueta acima. Depois ela ficará disponível no cadastro e na edição dos produtos."
        />
      ) : (
        <div className="space-y-2">
          {etiquetas.map((etiqueta) => (
            <div
              key={etiqueta.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card px-4 py-3"
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ backgroundColor: etiqueta.cor || "#B8893B" }}
              />

              <Input
                defaultValue={etiqueta.nome}
                onBlur={(e) => {
                  const valor = e.target.value.trim();
                  if (valor && valor !== etiqueta.nome) atualizar(etiqueta, { nome: valor });
                }}
                className="h-9 min-w-[180px] max-w-sm border-transparent bg-transparent px-2 font-medium focus:border-[var(--cream-deep)]"
              />

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
                      (etiqueta.cor || "#B8893B") === item.valor
                        ? "ring-2 ring-foreground ring-offset-1"
                        : "border-[var(--cream-deep)]",
                    )}
                    style={{ backgroundColor: item.valor }}
                  />
                ))}
              </div>

              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={etiqueta.ativo}
                  onCheckedChange={(ativo) => atualizar(etiqueta, { ativo })}
                />
                {etiqueta.ativo ? "Disponível" : "Oculta"}
              </label>

              <Button variant="ghost" size="icon" onClick={() => excluir(etiqueta)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

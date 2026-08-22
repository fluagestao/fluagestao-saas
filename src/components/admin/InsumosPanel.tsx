"use client";

import { PackagePlus, Search, Trash2 } from "lucide-react";
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
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<UnidadeInsumo>("UN");
  const [quantidade, setQuantidade] = useState("1");
  const [custo, setCusto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
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
    carregar();
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return insumos;
    return insumos.filter((item) =>
      `${item.nome} ${item.unidade}`.toLocaleLowerCase("pt-BR").includes(termo),
    );
  }, [busca, insumos]);

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
      toast.error("Informe um custo válido.");
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
      toast.success("Insumo cadastrado.");
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "cadastrar insumo"));
    } finally {
      setSalvando(false);
    }
  }

  async function editar(item: InsumoRow, patch: Partial<InsumoRow>) {
    try {
      await salvarInsumo({ data: { ...item, ...patch } });
      await carregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar insumo"));
    }
  }

  async function excluir(item: InsumoRow) {
    const ok = await confirmar({
      titulo: `Excluir "${item.nome}"?`,
      descricao: "Se ele estiver sendo usado na composição de um produto, a exclusão será bloqueada.",
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

  return (
    <section>
      <PageHeader
        titulo="Insumos"
        descricao="Cadastre tudo o que entra na montagem dos produtos. O custo de cada produto será calculado pela quantidade usada de cada insumo."
      />

      <div className="mt-4 rounded-2xl border border-[var(--cream-deep)] bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <PackagePlus className="h-4 w-4 text-[var(--terracotta)]" />
          Novo insumo
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(260px,1fr)_160px_160px_180px_auto]">
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
              <option key={item.value} value={item.value}>{item.label}</option>
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
            placeholder="Custo R$"
            className="h-11"
          />
          <Button onClick={adicionar} disabled={salvando} className="h-11">
            <PackagePlus className="mr-1.5 h-4 w-4" /> Adicionar
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ex.: Queijo Colonial · KG · quantidade 1 · custo R$ 109,90. Se usar 0,250 kg em um produto, o custo lançado será R$ 27,48.
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
        <div className="grid grid-cols-[minmax(240px,1.5fr)_110px_150px_150px_150px_110px_48px] gap-3 border-b border-[var(--cream-deep)] bg-[var(--cream-soft)] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span>Insumo</span><span>Tipo</span><span>Qtd. base</span><span>Custo compra</span><span>Custo unitário</span><span>Status</span><span />
        </div>

        {carregando ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando insumos...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum insumo cadastrado.</div>
        ) : (
          filtrados.map((item) => {
            const custoUnitario = item.quantidade_referencia > 0
              ? item.custo_referencia / item.quantidade_referencia
              : 0;
            return (
              <div key={item.id} className="grid grid-cols-[minmax(240px,1.5fr)_110px_150px_150px_150px_110px_48px] items-center gap-3 border-b border-[var(--cream-deep)] px-4 py-3 last:border-b-0">
                <Input
                  defaultValue={item.nome}
                  onBlur={(e) => {
                    const valor = e.target.value.trim();
                    if (valor && valor !== item.nome) editar(item, { nome: valor });
                  }}
                  className="h-9 border-transparent bg-transparent px-2 font-medium focus:border-input"
                />
                <select
                  value={item.unidade}
                  onChange={(e) => editar(item, { unidade: e.target.value as UnidadeInsumo })}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                >
                  {UNIDADES.map((unidadeItem) => (
                    <option key={unidadeItem.value} value={unidadeItem.value}>{unidadeItem.value}</option>
                  ))}
                </select>
                <Input
                  defaultValue={String(item.quantidade_referencia).replace(".", ",")}
                  onBlur={(e) => {
                    const valor = Number(e.target.value.replace(",", "."));
                    if (valor > 0 && valor !== item.quantidade_referencia) editar(item, { quantidade_referencia: valor });
                  }}
                  className="h-9"
                />
                <Input
                  defaultValue={item.custo_referencia.toFixed(2).replace(".", ",")}
                  onBlur={(e) => {
                    const valor = Number(e.target.value.replace(",", "."));
                    if (valor >= 0 && valor !== item.custo_referencia) editar(item, { custo_referencia: valor });
                  }}
                  className="h-9"
                />
                <span className="text-sm font-semibold text-[var(--wine)]">{moeda(custoUnitario)} / {item.unidade}</span>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={item.ativo} onCheckedChange={(ativo) => editar(item, { ativo })} />
                  {item.ativo ? "Ativo" : "Inativo"}
                </label>
                <Button variant="ghost" size="icon" onClick={() => excluir(item)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

"use client";

import { ArrowRight, Building2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mensagemDeErro } from "@/lib/erros";
import {
  carregarCategoriasFinanceiras,
  contarUsoCategorias,
  criarTipoDespesa,
  criarTipoReceita,
  excluirCategoriaFinanceira,
  marcarTipoComoCustoFixo,
  renomearCategoriaFinanceira,
} from "@/lib/financeiro";
import { Carregando, EstadoVazio, PageHeader, useConfirmar } from "./shell";

type Categoria = {
  id: string;
  nome: string;
  /** Só despesa tem. Marcado = soma no custo fixo do cálculo de preço. */
  conta_como_fixo?: boolean;
};
type Lado = "receita" | "despesa";

/**
 * Cadastro das categorias do caixa.
 *
 * As duas listas têm a mesma forma e as mesmas ações, então dividem um
 * componente só. O que muda é o lado — e é o lado que decide a tabela, o rótulo
 * e para qual tela do Financeiro o atalho leva.
 */
export function CategoriasFinanceirasPanel({
  lado,
  onIrPara,
}: {
  lado: Lado;
  onIrPara?: (aba: "entradas" | "saidas") => void;
}) {
  const [itens, setItens] = useState<Categoria[]>([]);
  const [uso, setUso] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [listas, usos] = await Promise.all([
        carregarCategoriasFinanceiras(),
        contarUsoCategorias(),
      ]);
      setItens((lado === "receita" ? listas.receitas : listas.despesas) as Categoria[]);
      setUso(usos);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar as categorias"));
    }
    setCarregando(false);
  }, [lado]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const ehReceita = lado === "receita";

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo={ehReceita ? "Tipos de receita" : "Tipos de despesa"}
        descricao={
          ehReceita
            ? "De onde o dinheiro entra: venda, taxa de entrega, outros. Você escolhe uma delas ao lançar em Recebimentos."
            : "Para onde o dinheiro sai: insumo, embalagem, combustível. Você escolhe uma delas ao lançar em Pagamentos."
        }
        acoes={
          <button
            type="button"
            onClick={() => onIrPara?.(ehReceita ? "entradas" : "saidas")}
            className="t-support inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[var(--coral)] transition-colors hover:bg-[var(--peach)]"
          >
            {ehReceita ? "Ir para Recebimentos" : "Ir para Pagamentos"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      />

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {carregando ? (
        <Carregando texto="carregando as categorias…" />
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <Coluna lado={lado} itens={itens} uso={uso} onMudou={recarregar} />
        </div>
      )}
    </section>
  );
}

function Coluna({
  lado,
  itens,
  uso,
  onMudou,
}: {
  lado: Lado;
  itens: Categoria[];
  uso: Record<string, number>;
  onMudou: () => void;
}) {
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  async function criar() {
    const limpo = nome.trim();
    if (!limpo || salvando) return;
    setSalvando(true);
    try {
      const r =
        lado === "receita"
          ? await criarTipoReceita({ data: { nome: limpo } })
          : await criarTipoDespesa({ data: { nome: limpo } });
      // O erro esperado (nome ja cadastrado) vem no retorno; o catch abaixo fica
      // para rede e sessao. Lancado, o React apagaria a frase em producao.
      if (r?.erro) {
        toast.error(r.erro);
        return;
      }
      setNome("");
      toast.success("Categoria criada.");
      onMudou();
    } catch (e) {
      toast.error(mensagemDeErro(e, "criar a categoria"));
    } finally {
      setSalvando(false);
    }
  }

  /* O selo decide o que entra no custo fixo do preço. Salva na hora, sem
     botão de confirmar: é uma chave de liga-desliga, e obrigar a confirmar
     cada uma faria a pessoa marcar oito tipos com dezesseis cliques. */
  async function alternarFixo(item: Categoria) {
    const novo = !item.conta_como_fixo;
    try {
      const r = await marcarTipoComoCustoFixo({ data: { id: item.id, marcado: novo } });
      if (r?.erro) {
        toast.error(r.erro);
        return;
      }
      toast.success(
        novo
          ? `"${item.nome}" agora entra no custo fixo.`
          : `"${item.nome}" saiu do custo fixo.`,
      );
      onMudou();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o selo"));
    }
  }

  async function renomear(item: Categoria, valor: string) {
    const limpo = valor.trim();
    if (!limpo || limpo === item.nome) return;
    try {
      const r = await renomearCategoriaFinanceira({ data: { id: item.id, nome: limpo, lado } });
      // Nome repetido volta no retorno, nao lancado. Recarrega dos dois jeitos:
      // no erro a lista traz o nome antigo de volta e a pessoa ve que nao valeu.
      if (r?.erro) toast.error(r.erro);
      onMudou();
    } catch (e) {
      toast.error(mensagemDeErro(e, "renomear a categoria"));
      onMudou();
    }
  }

  async function excluir(item: Categoria) {
    const usos = uso[item.id] ?? 0;
    const ok = await confirmar({
      titulo: `Excluir "${item.nome}"?`,
      // O lançamento não some: a coluna é "on delete set null". Dizer isso
      // evita o medo de apagar histórico junto com a categoria.
      descricao: usos
        ? `${usos} lançamento(s) usam esta categoria. Eles continuam no caixa, só ficam sem categoria.`
        : "Nenhum lançamento usa esta categoria.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;

    try {
      await excluirCategoriaFinanceira({ data: { id: item.id, lado } });
      toast.success("Categoria excluída.");
      onMudou();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir a categoria"));
    }
  }

  return (
    <article className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--admin-border)] bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-2">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && criar()}
          placeholder={lado === "receita" ? "Ex.: taxa de entrega" : "Ex.: embalagem"}
          maxLength={80}
          className="h-10"
        />
        <Button onClick={criar} disabled={!nome.trim() || salvando} className="h-10 shrink-0">
          <Plus className="mr-1.5 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {itens.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma categoria ainda"
          descricao="Crie a primeira para separar o que entra e o que sai."
        />
      ) : (
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {itens.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <Input
                defaultValue={item.nome}
                onBlur={(e) => renomear(item, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                maxLength={80}
                className="h-10"
                aria-label={`Nome da categoria ${item.nome}`}
              />
              {/* Só despesa: receita não forma custo. */}
              {lado === "despesa" && (
                <button
                  type="button"
                  onClick={() => alternarFixo(item)}
                  title={
                    item.conta_como_fixo
                      ? "Entra no custo fixo do cálculo de preço. Clique para tirar."
                      : "Não entra no custo fixo. Clique para incluir. Deixe fora o que já está no custo do produto, como insumo e embalagem."
                  }
                  aria-pressed={Boolean(item.conta_como_fixo)}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors",
                    item.conta_como_fixo
                      ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                      : "border-[var(--cream-deep)] bg-card text-muted-foreground hover:bg-[var(--cream-soft)]",
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">custo fixo</span>
                </button>
              )}

              <span className="t-support w-20 shrink-0 text-right text-muted-foreground">
                {uso[item.id] ?? 0} uso(s)
              </span>
              <Button variant="ghost" size="icon" onClick={() => excluir(item)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

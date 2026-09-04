"use client";

import { Boxes, Search, Sparkles, Tag, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  atualizarPrecoProduto,
  carregarMargemProdutos,
  type MargemProduto,
} from "@/lib/custo";
import {
  atualizarTempoMontagem,
  carregarCalculoConfig,
  type SugestaoFixo,
} from "@/lib/calculo";
import {
  CONFIG_VAZIA,
  calcular,
  precoParaMargem,
  type CalculoConfig,
} from "@/lib/calculo-tipos";
import { AjustesCalculo } from "./AjustesCalculo";
import { CascataCusto } from "./CascataCusto";
import { mensagemDeErro } from "@/lib/erros";
import { listarInsumos, type InsumoRow } from "@/lib/insumos";
import { hojeISO, intervaloAno } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/vendas";
import { ProdutoInsumosEditor, type ItemComposicaoProduto } from "./ProdutoInsumosEditor";
import { Carregando, EstadoVazio, PageHeader } from "./shell";

/* A tela faz dois trabalhos: montar o custo e decidir o preco. Antes os dois
   viviam empilhados na mesma janela — tabela de insumos, preco, margem, tempo,
   total e cascata, sete blocos sem divisoria — e quem abria nao sabia por onde
   comecar. O nome tambem mentia: chamava-se "Precificacao" e precisava avisar
   na descricao que era ali que os insumos eram lancados.

   Agora sao duas abas, cada uma com a sua lista e a sua janela. O que garante
   que separar nao virou esconder: a aba Precos mostra custo e tempo em campos
   travados ao lado do preco, e avisa em vermelho quando o custo nem existe. */
type Aba = "custo" | "precos";

/** "Pendente" quer dizer coisas diferentes em cada aba: sem custo ou sem preco. */
type Filtro = "todos" | "pendente";

function moeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function paraNumero(texto: string): number {
  const bruto = texto.trim();
  if (!bruto) return Number.NaN;
  return Number(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto);
}

/** Verde acima de 50, âmbar entre 25 e 50, vermelho abaixo. */
function corDaMargem(margem: number | null) {
  if (margem == null) return "text-muted-foreground";
  if (margem >= 0.5) return "text-[var(--green-ink)]";
  if (margem >= 0.25) return "text-[var(--bronze)]";
  return "text-destructive";
}

function faltaCustoEm(p: MargemProduto) {
  return p.custo == null;
}

function faltaPrecoEm(p: MargemProduto) {
  return p.preco == null || p.preco <= 0;
}

function pendenteNaAba(p: MargemProduto, aba: Aba) {
  return aba === "custo" ? faltaCustoEm(p) : faltaPrecoEm(p);
}

type Grupo = { rotulo: string; itens: MargemProduto[]; anonimo: boolean };

/**
 * Agrupa por coleção e categoria.
 *
 * A lista corrida obrigava a ler o subtítulo de cada linha para saber onde se
 * estava. Com o cabeçalho por grupo o subtítulo some das linhas e a mesma
 * informação passa a ser lida uma vez por bloco, não uma vez por produto.
 */
function agrupar(lista: MargemProduto[]): Grupo[] {
  const mapa = new Map<string, Grupo>();

  for (const p of lista) {
    const colecao = p.colecao?.trim() ?? "";
    const categoria = p.categoria?.trim() ?? "";
    const rotulo = [colecao, categoria].filter(Boolean).join(" · ") || "Sem coleção nem categoria";
    const grupo = mapa.get(rotulo) ?? { rotulo, itens: [], anonimo: !colecao && !categoria };
    grupo.itens.push(p);
    mapa.set(rotulo, grupo);
  }

  /* O grupo sem nome vai para o fim: ele é o resto, não um assunto. Na ordem
     alfabética pura ele cairia no meio, entre duas coleções de verdade. */
  return [...mapa.values()].sort((a, b) =>
    a.anonimo === b.anonimo ? a.rotulo.localeCompare(b.rotulo, "pt-BR") : a.anonimo ? 1 : -1,
  );
}

/** Uma coluna numérica da linha. Mesmo formato nas duas abas. */
function Coluna({
  rotulo,
  largura,
  className,
  title,
  children,
}: {
  rotulo: string;
  largura: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full text-right", largura)}>
      <p className="t-support whitespace-nowrap text-muted-foreground">{rotulo}</p>
      <p className={cn("t-body tabular-nums text-foreground", className)} title={title}>
        {children}
      </p>
    </div>
  );
}

function LinhaProduto({
  p,
  aba,
  config,
  onAbrir,
}: {
  p: MargemProduto;
  aba: Aba;
  config: CalculoConfig;
  onAbrir: (p: MargemProduto) => void;
}) {
  /* A lista mostrava um numero so, chamado "margem", que era a BRUTA — preco
     menos insumos. Dava 80% num produto cuja sobra real e bem menor, e era esse
     80% que decidia preco. As duas aparecem lado a lado, pela mesma conta da
     tela de Margem. */
  const temTudo = p.custo != null && p.preco != null && p.preco > 0;
  const cascata = calcular(p.preco, p.custo ?? 0, p.tempo_montagem_min, config);
  const bruta = temTudo ? cascata.margemContribuicao : null;
  /* Sem os Ajustes ligados nao da para saber a liquida: mao de obra e custo
     fixo entram como zero e ela sairia igual a bruta. Dois numeros identicos
     mentem mais que um traco. */
  const liquida = temTudo && cascata.completa ? cascata.margemReal : null;
  const pendente = pendenteNaAba(p, aba);

  return (
    <li
      onClick={() => onAbrir(p)}
      className={cn(
        "flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--terracotta)]",
        pendente
          ? "border-[var(--cream-deep)] bg-[var(--cream-soft)]"
          : "border-[var(--admin-border)]",
      )}
    >
      <div className="w-full min-w-0 sm:w-auto sm:flex-1 sm:min-w-[14rem]">
        <p className="t-item truncate text-foreground">{p.nome}</p>
      </div>

      {/* Os valores nao cabem em colunas num telefone: 2x2 no celular,
          fileira unica a partir do sm. */}
      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 sm:contents">
        {aba === "custo" ? (
          <>
            <Coluna rotulo="custo dos insumos" largura="sm:w-32">
              {p.custo == null ? "—" : formatBRL(p.custo)}
            </Coluna>
            <Coluna rotulo="tempo de montagem" largura="sm:w-32">
              {p.tempo_montagem_min == null ? "—" : `${p.tempo_montagem_min} min`}
            </Coluna>
          </>
        ) : (
          <>
            <Coluna rotulo="custo" largura="sm:w-28">
              {p.custo == null ? "—" : formatBRL(p.custo)}
            </Coluna>
            <Coluna rotulo="preço" largura="sm:w-28">
              {p.preco == null ? "—" : formatBRL(p.preco)}
            </Coluna>
            <Coluna rotulo="margem bruta" largura="sm:w-24">
              {bruta == null ? "—" : `${Math.round(bruta * 100)}%`}
            </Coluna>
            {/* So esta e colorida. Duas cores competindo tirariam o peso da que
                diz se o negocio se paga. */}
            <Coluna
              rotulo="margem líquida"
              largura="sm:w-24"
              className={cn("t-item", corDaMargem(liquida))}
              title={
                liquida == null && temTudo
                  ? "Ligue os Ajustes do cálculo para ver a margem líquida."
                  : undefined
              }
            >
              {liquida == null ? "—" : `${Math.round(liquida * 100)}%`}
            </Coluna>
          </>
        )}
      </div>

      <span
        className={cn(
          "t-support inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 font-semibold",
          pendente ? "bg-[var(--peach)] text-[var(--coral)]" : "text-muted-foreground",
        )}
      >
        {aba === "custo" ? <Boxes className="h-3.5 w-3.5" /> : <Tag className="h-3.5 w-3.5" />}
        {aba === "custo"
          ? pendente
            ? "Lançar custo"
            : "Editar custo"
          : pendente
            ? "Definir preço"
            : "Precificar"}
      </span>
    </li>
  );
}

/**
 * Custo e preços: onde o custo é montado e o preço é decidido.
 *
 * Separada da Margem de propósito. Aqui se trabalha — lança insumo, mexe no
 * preço, salva. Lá se lê o que aconteceu. Misturar as duas fazia a tela de
 * relatório carregar a responsabilidade de ser também formulário.
 */
export function CalculadoraPanel() {
  const [produtos, setProdutos] = useState<MargemProduto[]>([]);
  const [insumos, setInsumos] = useState<InsumoRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<Aba>("custo");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editando, setEditando] = useState<MargemProduto | null>(null);
  const [config, setConfig] = useState<CalculoConfig>(CONFIG_VAZIA);
  const [sugestao, setSugestao] = useState<SugestaoFixo | null>(null);
  const abaEscolhida = useRef(false);

  const recarregarConfig = useCallback(async () => {
    try {
      const r = await carregarCalculoConfig();
      setConfig(r.config);
      setSugestao(r.sugestao);
    } catch {
      // Sem config a tela funciona igual: cai no cálculo só de insumos.
    }
  }, []);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      // O ano inteiro: aqui a venda não importa, importa a lista de produtos e
      // o custo de cada um. O período existe só porque a consulta pede um.
      const ano = intervaloAno(hojeISO());
      const dados = await carregarMargemProdutos({ data: { de: ano.de, ate: ano.ate } });
      setProdutos(dados.produtos);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os produtos"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    listarInsumos()
      .then(setInsumos)
      .catch(() => setInsumos([]));
  }, []);

  useEffect(() => {
    recarregarConfig();
  }, [recarregarConfig]);

  /* Abre onde há trabalho. Quem já lançou o custo de tudo cairia numa lista
     dizendo "está tudo pronto" e teria que clicar para chegar onde queria.
     Só na primeira carga — depois disso a aba é escolha da pessoa, e o ref
     garante que um recarregar() não puxe a aba de volta no meio do uso. */
  useEffect(() => {
    if (abaEscolhida.current || carregando || !produtos.length) return;
    abaEscolhida.current = true;
    setAba(produtos.some(faltaCustoEm) ? "custo" : "precos");
  }, [carregando, produtos]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return produtos.filter((p) => {
      if (filtro === "pendente" && !pendenteNaAba(p, aba)) return false;
      if (!termo) return true;
      return `${p.nome} ${p.categoria ?? ""} ${p.colecao ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });
  }, [produtos, busca, filtro, aba]);

  const grupos = useMemo(() => agrupar(visiveis), [visiveis]);
  const pendentes = useMemo(
    () => produtos.filter((p) => pendenteNaAba(p, aba)).length,
    [produtos, aba],
  );

  /* Do aviso da aba Preços: leva o mesmo produto para a aba Custo sem fechar
     nada. A janela remonta pela key, então ela reabre já no modo certo. */
  const irParaCusto = useCallback((p: MargemProduto) => {
    setAba("custo");
    setEditando(p);
  }, []);

  return (
    <section data-tela-cheia className="min-w-0">
      <PageHeader
        titulo="Custo e preços"
        descricao={
          aba === "custo"
            ? "Lance os insumos de cada produto e o quanto ele leva para montar. O custo soma sozinho."
            : "Decida por quanto vender, com o custo já na mão. Preço e margem andam juntos."
        }
        acoes={
          sugestao && (
            <AjustesCalculo config={config} sugestao={sugestao} onSalvo={recarregarConfig} />
          )
        }
      />

      {erro && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {/* As duas abas. Trocar de aba troca a lista, as colunas e a janela — não
          é um filtro, é o outro trabalho. */}
      <div className="mt-1 inline-flex rounded-xl border border-[var(--cream-deep)] bg-card p-1">
        {(
          [
            ["custo", "Custo", Boxes],
            ["precos", "Preços", Tag],
          ] as [Aba, string, typeof Boxes][]
        ).map(([id, rotulo, Icone]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setAba(id);
              abaEscolhida.current = true;
            }}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors",
              aba === id
                ? "bg-[var(--terracotta)] text-white shadow-[var(--shadow-soft)]"
                : "text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
            )}
          >
            <Icone className="h-4 w-4" />
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--cream-deep)] bg-white px-3.5 sm:w-auto sm:min-w-[220px] sm:flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {/* O segundo chip muda de sentido com a aba: em Custo é o que falta
            custar, em Preços é o que falta precificar. É o "trabalho do dia"
            de cada aba. */}
        {(
          [
            ["todos", `Todos (${produtos.length})`],
            [
              "pendente",
              aba === "custo" ? `Sem custo (${pendentes})` : `Sem preço (${pendentes})`,
            ],
          ] as [Filtro, string][]
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={cn(
              "h-11 rounded-xl border px-4 text-sm font-medium transition-colors",
              filtro === id
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                : "border-[var(--cream-deep)] bg-card text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {carregando ? (
        <Carregando texto="carregando produtos…" />
      ) : !visiveis.length ? (
        <EstadoVazio
          titulo={
            filtro === "pendente"
              ? aba === "custo"
                ? "Todo produto já tem custo"
                : "Todo produto já tem preço"
              : "Nenhum produto encontrado"
          }
          descricao={
            filtro === "pendente"
              ? "Nada a lançar por aqui."
              : "Cadastre produtos em Cadastros → Produtos."
          }
        />
      ) : (
        <div className="mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {grupos.map((grupo) => (
            <section key={grupo.rotulo}>
              <header className="sticky top-0 z-10 flex items-baseline gap-2 bg-[var(--admin-bg)] pb-1.5">
                <h3 className="t-support truncate font-bold uppercase tracking-[0.08em] text-[var(--terracotta)]">
                  {grupo.rotulo}
                </h3>
                <span className="t-support shrink-0 text-muted-foreground">
                  {grupo.itens.length}
                </span>
              </header>

              <ul className="space-y-2">
                {grupo.itens.map((p) => (
                  <LinhaProduto key={p.slug} p={p} aba={aba} config={config} onAbrir={setEditando} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editando && (
        <DialogoCalculo
          /* A key NÃO inclui a aba de propósito. Com `${aba}:${id}` o botão
             "Lançar o custo" do aviso trocava a aba, a key mudava, o React
             remontava a janela e o preço digitado — que só existe no estado
             local até alguém salvar — sumia sem aviso nenhum. Trocar de modo
             não é trocar de produto. */
          key={editando.id}
          produto={editando}
          modo={aba}
          insumos={insumos}
          config={config}
          onIrParaCusto={irParaCusto}
          onFechar={() => {
            setEditando(null);
            recarregar();
          }}
        />
      )}
    </section>
  );
}

function DialogoCalculo({
  produto,
  modo,
  insumos,
  config,
  onFechar,
  onIrParaCusto,
}: {
  produto: MargemProduto;
  modo: Aba;
  insumos: InsumoRow[];
  config: CalculoConfig;
  onFechar: () => void;
  onIrParaCusto: (p: MargemProduto) => void;
}) {
  // O editor salva sozinho e devolve o custo a cada mudança: a conta abaixo
  // acompanha enquanto você digita, sem precisar salvar para ver.
  const [custo, setCusto] = useState(produto.custo ?? 0);
  const [preco, setPreco] = useState(
    produto.preco == null ? "" : produto.preco.toFixed(2).replace(".", ","),
  );
  /* A margem NAO e estado proprio: ela e o preco lido de outro angulo. Guardar
     as duas separadas era o que fazia a tela abrir dizendo "60%" com um preco
     que dava 77% — dois numeros na tela discordando um do outro.

     O unico estado aqui e o texto cru enquanto o campo esta em foco. Sem ele o
     input controlado reescreveria o valor formatado a cada tecla e comeria a
     virgula (foi o que fez 1,5 virar 15 no campo Minimo). Ao sair do campo
     volta a ser derivado, e a formatacao se acerta sozinha. */
  const [margemDigitada, setMargemDigitada] = useState<string | null>(null);
  const [tempo, setTempo] = useState(
    produto.tempo_montagem_min == null ? "" : String(produto.tempo_montagem_min),
  );
  const [salvando, setSalvando] = useState(false);

  const receberCusto = useCallback(
    ({ custoTotal }: { itens: ItemComposicaoProduto[]; custoTotal: number }) => {
      setCusto(custoTotal);
    },
    [],
  );

  const precoNumero = paraNumero(preco);
  const temPreco = Number.isFinite(precoNumero) && precoNumero > 0;

  /* Sempre o estado, nas duas abas. Lendo produto.tempo_montagem_min na aba
     Preços, quem acabasse de salvar o tempo na aba Custo veria a margem
     calculada com o valor VELHO — o prop só se atualiza quando a janela fecha
     e a lista recarrega. */
  const tempoMin = Number.isFinite(paraNumero(tempo)) ? paraNumero(tempo) : null;

  const cascata = calcular(temPreco ? precoNumero : null, custo, tempoMin, config);

  /* Enquanto digita, manda o texto cru. Fora do foco, mostra a margem que o
     preco atual realmente da — inclusive na abertura, sem precisar de effect. */
  const margemMostrada =
    margemDigitada ??
    (cascata.margemReal == null
      ? ""
      : (cascata.margemReal * 100).toFixed(1).replace(".", ",").replace(",0", ""));

  /* Escrever a margem escreve o preco. O contrario nao existe: a margem ja e
     derivada do preco, entao o campo se atualiza sozinho quando o preco muda. */
  function escreverMargem(texto: string) {
    setMargemDigitada(texto);
    const n = paraNumero(texto);
    if (n == null || n < 0 || n >= 100) return;
    const novo = precoParaMargem(custo, tempoMin, n / 100, config);
    if (novo == null) return;
    setPreco(novo.toFixed(2).replace(".", ","));
  }

  /* Um botão por aba, cada um gravando só o que a sua aba edita. Antes era uma
     ação só que salvava preço E tempo, e quando o segundo falhava sobrava um
     aviso torto ("preço salvo, mas o tempo não"). Com as abas separadas cada
     gravação tem um nome e um resultado. */
  async function salvarTempo() {
    const minutos = paraNumero(tempo);
    const tempoValor = tempo.trim() === "" ? null : Math.round(minutos);
    if (tempoValor != null && !Number.isFinite(tempoValor)) {
      toast.error("Informe o tempo em minutos.");
      return;
    }
    if (tempoValor != null && tempoValor < 0) {
      toast.error("O tempo não pode ser negativo.");
      return;
    }

    setSalvando(true);
    try {
      // Recusa esperada vem no retorno, não no catch.
      const r = await atualizarTempoMontagem({ data: { id: produto.id, minutos: tempoValor } });
      if (r?.erro) {
        toast.error(r.erro);
        return;
      }
      toast.success("Tempo de montagem salvo.");
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o tempo"));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarPreco() {
    if (!temPreco) return;
    setSalvando(true);
    try {
      await atualizarPrecoProduto({
        data: { id: produto.id, preco: Number(precoNumero.toFixed(2)) },
      });
      toast.success("Preço salvo.");
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o preço"));
    } finally {
      setSalvando(false);
    }
  }

  const semCusto = produto.custo == null;

  return (
    <Dialog open onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="flex max-h-[calc(100dvh-8rem)] flex-col gap-0 overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-[var(--admin-border)] pb-3 pr-6 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {modo === "custo" ? (
              <Boxes className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
            ) : (
              <Tag className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
            )}
            {produto.nome}
          </DialogTitle>
          <DialogDescription>
            {modo === "custo"
              ? "Lance os insumos e as quantidades. O custo soma sozinho enquanto você digita."
              : "Decida o preço. Custo e tempo vêm da aba Custo e aparecem travados aqui do lado."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
          {modo === "custo" ? (
            <>
              <ProdutoInsumosEditor
                produtoId={produto.id}
                insumos={insumos}
                autoSave
                onChange={receberCusto}
              />

              <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-[var(--admin-border)] bg-card p-4 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium sm:max-w-[12rem]">
                  <span className="block">Tempo de montagem</span>
                  <div className="relative">
                    <Input
                      value={tempo}
                      onChange={(e) => setTempo(e.target.value)}
                      inputMode="numeric"
                      placeholder="40"
                      className="h-11 pr-12"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      min
                    </span>
                  </div>
                </label>

                <div className="min-w-0 flex-1 space-y-1.5 text-sm font-medium sm:max-w-[12rem]">
                  <span className="block">Custo dos insumos</span>
                  <p className="flex h-11 items-center rounded-xl bg-[var(--cream-soft)] px-3.5 t-item tabular-nums text-[var(--terracotta)]">
                    {moeda(custo)}
                  </p>
                </div>

                <Button disabled={salvando} onClick={salvarTempo} className="h-11 shrink-0">
                  Salvar tempo
                </Button>
              </div>

              <p className="t-support px-1 text-muted-foreground">
                Os insumos salvam sozinhos. O tempo precisa do botão — ele entra na conta como mão
                de obra e muda a margem líquida.
              </p>
            </>
          ) : (
            <>
              {/* Sem isto, separar viraria esconder: a cascata calcularia com
                  custo zero e mostraria uma margem perto de 100% em qualquer
                  preço, que é exatamente o número que faz alguém vender no
                  prejuízo achando que está ganhando. */}
              {semCusto && (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center">
                  <TriangleAlert className="h-5 w-5 shrink-0 text-red-600" />
                  <p className="t-support min-w-0 flex-1 text-red-700">
                    Este produto ainda não tem custo lançado. A margem abaixo está contando como se
                    ele custasse zero, e por isso vai dar quase 100% em qualquer preço. Lance os
                    insumos antes de decidir.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => onIrParaCusto(produto)}
                    className="h-10 w-full shrink-0 sm:w-auto"
                  >
                    Lançar o custo
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="space-y-1.5 text-sm font-medium">
                  <span className="block">Preço de venda</span>
                  <div className="relative">
                    <Input
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-11 pl-9"
                    />
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                  </div>
                </label>

                <label className="space-y-1.5 text-sm font-medium">
                  <span className="block">Margem líquida</span>
                  <div className="relative">
                    <Input
                      value={margemMostrada}
                      onChange={(e) => escreverMargem(e.target.value)}
                      onBlur={() => setMargemDigitada(null)}
                      inputMode="decimal"
                      placeholder="60"
                      className="h-11 pr-9"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  </div>
                </label>

                {/* Travados, e presentes. Precificar sem ver o custo ao lado é
                    chutar. */}
                <div className="space-y-1.5 text-sm font-medium">
                  <span className="block">Custo dos insumos</span>
                  <p
                    className={cn(
                      "flex h-11 items-center rounded-xl bg-[var(--cream-soft)] px-3.5 t-item tabular-nums",
                      semCusto ? "text-destructive" : "text-[var(--terracotta)]",
                    )}
                  >
                    {semCusto ? "não lançado" : moeda(custo)}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm font-medium">
                  <span className="block">Tempo de montagem</span>
                  <p className="flex h-11 items-center rounded-xl bg-[var(--cream-soft)] px-3.5 t-item tabular-nums text-muted-foreground">
                    {tempoMin == null ? "—" : `${tempoMin} min`}
                  </p>
                </div>
              </div>

              <CascataCusto cascata={cascata} />

              <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-[var(--admin-border)] bg-card p-4 sm:flex-row sm:items-center">
                <Sparkles className="hidden h-4 w-4 shrink-0 text-[var(--bronze)] sm:block" />
                <p className="t-support min-w-0 flex-1 text-muted-foreground">
                  Preço e margem andam juntos: mude um e o outro acompanha
                  {config.incluir_no_calculo ? " — já com montagem e fixos" : ""}. Nada é salvo até
                  você mandar.
                </p>
                <Button
                  disabled={!temPreco || salvando}
                  onClick={salvarPreco}
                  className="h-11 shrink-0"
                >
                  Salvar preço
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-[var(--admin-border)] pt-3">
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

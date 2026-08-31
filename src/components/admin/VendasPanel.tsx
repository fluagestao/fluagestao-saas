import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import {
  formatarDataLonga,
  hojeISO,
  intervaloAno,
  intervaloMes,
  intervaloSemana,
  somarDias,
} from "@/lib/prazo";
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
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import {
  carregarAReceber,
  carregarClientes,
  carregarPedidos,
  carregarRealizadas,
  carregarResumoPedidos,
  marcarRecebimento,
  mudarStatusPedido,
  receberEmLote,
  removerPedido,
} from "@/lib/pedidos";
import {
  ORDEM_URGENCIA,
  aReceber,
  STATUS_PEDIDO,
  URGENCIA_LABEL,
  formatBRL,
  ordenarPorEntrega,
  proximoStatus,
  resumoVendas,
  statusCor,
  statusLabel,
  urgenciaDoPedido,
  type Pedido,
  type StatusPedido,
  type Urgencia,
} from "@/lib/vendas";
import { TabelaRealizadas } from "@/components/admin/TabelaRealizadas";
import { PedidoCard, type AcoesPedido } from "./PedidoCard";
import { VendasKanban } from "./VendasKanban";
import { PedidoDialog, type ProdutoOpcao } from "./PedidoDialog";
import { usePrimeiroPedidoGuia } from "./PrimeiroPedidoGuia";
import type { CategoriaRapida } from "./QuickProductDialog";
import { PagamentoDialog } from "./PagamentoDialog";
import type { ClienteComHistorico } from "@/lib/pedidos-ops.server";
import {
  Carregando,
  EstadoVazio,
  Num,
  PageHeader,
  useConfirmar,
  ValorCarregando,
} from "./shell";

const PAGINA = 25;
const CHAVE_VISAO = "flua-admin-vendas-visao";

type FiltroStatus = "nao_entregue" | "todos" | StatusPedido;

/* O que ainda está nas mãos da cesteira: novo, em produção e pronto esperando
   retirada. É o filtro padrão porque é o trabalho do dia — o que já saiu ou
   foi cancelado só interessa quando se procura. */
const STATUS_NAO_ENTREGUE: StatusPedido[] = ["novo", "producao", "pronto"];

// "Não entregue" abre a lista; os status seguem na ordem em que o pedido anda;
// "Todos" fecha a fila.
const FILTROS: { v: FiltroStatus; label: string }[] = [
  { v: "nao_entregue", label: "Não entregue" },
  ...STATUS_PEDIDO.map((s) => ({ v: s.v as FiltroStatus, label: s.label })),
  { v: "todos", label: "Todos" },
];

/* "Não entregue" e "Todos" não dizem o que agrupam — o primeiro junta três
   status, o segundo inclui cancelado. Os status avulsos são o próprio nome. */
const EXPLICA_FILTRO: Partial<Record<FiltroStatus, string>> = {
  nao_entregue: "novos, em produção e prontos aguardando retirada",
  todos: "inclui entregues e cancelados",
};

/** Período com atalhos: o uso normal é "hoje" ou "este mês", não digitar datas. */
function SeletorPeriodo({
  de,
  ate,
  onMudar,
  permiteVazio,
}: {
  de: string;
  ate: string;
  onMudar: (de: string, ate: string) => void;
  /** "A receber" começa sem filtro: a cobrança quer ver tudo. */
  permiteVazio?: boolean;
}) {
  const hoje = hojeISO();
  const inicioDoMes = `${hoje.slice(0, 8)}01`;
  const atalhos: { label: string; de: string; ate: string }[] = [
    { label: "Hoje", de: hoje, ate: hoje },
    { label: "7 dias", de: somarDias(hoje, -6), ate: hoje },
    { label: "Este mês", de: inicioDoMes, ate: hoje },
    { label: "Próximos 7", de: hoje, ate: somarDias(hoje, 7) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        De
      <Input
          type="date"
          value={de}
          onChange={(e) => onMudar(e.target.value, ate)}
          className="h-9 w-[9.5rem]"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        até
        <Input
          type="date"
          value={ate}
          onChange={(e) => onMudar(de, e.target.value)}
          className="h-9 w-[9.5rem]"
        />
      </label>

      <div className="flex flex-wrap gap-1">
        {atalhos.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onMudar(a.de, a.ate)}
            className={cn(
              "min-h-11 rounded-full px-3 py-2 text-xs font-medium transition-colors md:min-h-0 md:px-2.5 md:py-1",
              de === a.de && ate === a.ate
                ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                : "border border-[var(--cream-deep)] text-muted-foreground hover:text-foreground",
            )}
          >
            {a.label}
          </button>
        ))}
        {permiteVazio && (de || ate) && (
          <button
            type="button"
            onClick={() => onMudar("", "")}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-[var(--terracotta)]"
          >
            ver tudo
          </button>
        )}
      </div>
    </div>
  );
}

/* Atalhos de calendario, nao janelas moveis. "Ultimo mes" antes era hoje-29
   dias: em 02/09 vinha 04/08 a 02/09, que nao fecha com mes nenhum e nao bate
   com nada que a pessoa confira no extrato ou no fechamento. */
type PeriodoRealizadas =
  | "escolher"
  | "tudo"
  | "hoje"
  | "esta_semana"
  | "semana_passada"
  | "este_mes"
  | "mes_passado"
  | "este_ano";

/** Cartao de indicador do topo de Vendas realizadas. */
function IndicadorVenda({
  rotulo,
  valor,
  nota,
  cor,
  carregando,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  cor?: string;
  carregando?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="t-support uppercase tracking-[0.14em] text-[var(--bronze)]">{rotulo}</p>
      {carregando ? (
        <ValorCarregando />
      ) : (
        <p className="mt-1 t-hero tabular-nums" style={{ color: cor ?? "var(--admin-ink)" }}>
          <Num>{valor}</Num>
        </p>
      )}
      {!carregando && <p className="t-support mt-0.5 text-muted-foreground">{nota}</p>}
    </div>
  );
}

function SeletorPeriodoRealizadas({
  periodo,
  de,
  ate,
  onSelecionar,
  onDe,
  onAte,
  forma,
  formas,
  onForma,
}: {
  periodo: PeriodoRealizadas;
  de: string;
  ate: string;
  onSelecionar: (periodo: PeriodoRealizadas) => void;
  onDe: (valor: string) => void;
  onAte: (valor: string) => void;
  forma: string;
  formas: string[];
  onForma: (valor: string) => void;
}) {
  const livre = periodo === "escolher";
  return (
    <div className="grid gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)] md:flex md:flex-wrap md:items-end">
      <label className="grid gap-1 text-sm text-muted-foreground">
        Período
        <select
          value={periodo}
          onChange={(e) => onSelecionar(e.target.value as PeriodoRealizadas)}
          className="h-9 min-w-52 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
        >
          <option value="hoje">Hoje</option>
          <option value="esta_semana">Esta semana</option>
          <option value="semana_passada">Semana passada</option>
          <option value="este_mes">Este mês</option>
          <option value="mes_passado">Mês passado</option>
          <option value="este_ano">Este ano</option>
          <option value="tudo">Tudo</option>
          <option value="escolher">Escolher datas</option>
        </select>
      </label>

      <label className="grid gap-1 text-sm text-muted-foreground">
        De
        {livre ? (
          <Input
            type="date"
            value={de}
            max={ate || undefined}
            onChange={(e) => onDe(e.target.value)}
            className="h-9 w-[9.5rem]"
          />
        ) : de ? (
          <Input type="date" value={de} readOnly className="h-9 w-[9.5rem]" />
        ) : (
          <Input value="Desde o início" readOnly className="h-9 w-[9.5rem]" />
        )}
      </label>
      <label className="grid gap-1 text-sm text-muted-foreground">
        Até
        {livre ? (
          <Input
            type="date"
            value={ate}
            min={de || undefined}
            onChange={(e) => onAte(e.target.value)}
            className="h-9 w-[9.5rem]"
          />
        ) : ate ? (
          <Input type="date" value={ate} readOnly className="h-9 w-[9.5rem]" />
        ) : (
          <Input value="Hoje" readOnly className="h-9 w-[9.5rem]" />
        )}
      </label>

      <label className="grid gap-1 text-sm text-muted-foreground">
        Pagamento
        <select
          value={forma}
          onChange={(e) => onForma(e.target.value)}
          className="h-9 min-w-44 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
        >
          <option value="todas">Todas as formas</option>
          <option value="aberto">Só as a receber</option>
          {formas.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Card({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--bronze)]">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

/** Sub-abas de Vendas — espelha SUB_VENDAS em routes/admin.tsx. */
type SubVenda = "pedidos" | "areceber" | "realizadas";

export function VendasPanel({
  produtos,
  vista: subExterna,
  onVista,
  empresaNome,
  abrirNovoAoMontar = false,
  categorias = [],
  onCatalogoChange,
}: {
  produtos: ProdutoOpcao[];
  categorias?: CategoriaRapida[];
  empresaNome: string;
  abrirNovoAoMontar?: boolean;
  onCatalogoChange?: () => void;
  /** Sub-aba escolhida na lateral. Sem ela, o painel controla sozinho. */
  vista?: SubVenda;
  onVista?: (v: SubVenda) => void;
}) {
  // Abre em "Novo": ao entrar em Vendas, o que se procura é o pedido que
  // acabou de cair, não o histórico do mês.
  const [status, setStatus] = useState<FiltroStatus>("nao_entregue");
  const [busca, setBusca] = useState("");
  const [buscaAtiva, setBuscaAtiva] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [base, setBase] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<Pedido | "novo" | null>(
    abrirNovoAoMontar ? "novo" : null,
  );

  // /vendas/pedidos/novo-pedido e so o gatilho que abre o editor. Se ela ficar
  // na barra depois que o editor fecha, todo refresh reabre o "Novo pedido" —
  // era exatamente o que acontecia. Ao fechar, a URL volta para a lista, sem
  // criar entrada no historico (replaceState, para o Voltar seguir util).
  useEffect(() => {
    if (editando) return;
    if (!window.location.pathname.startsWith("/vendas/pedidos/novo-pedido")) return;
    window.history.replaceState({}, "", "/vendas/pedidos");
  }, [editando]);
  const confirmar = useConfirmar();
  const guia = usePrimeiroPedidoGuia();
  const guiaAtivo = guia?.ativo ?? false;
  useEffect(() => {
    if (guiaAtivo) setEditando((atual) => atual ?? "novo");
  }, [guiaAtivo]);
  const [aReceberLista, setAReceberLista] = useState<Pedido[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [dataRecebimento, setDataRecebimento] = useState(() => hojeISO());
  const [subInterna, setSubInterna] = useState<SubVenda>("pedidos");
  const sub = subExterna ?? subInterna;
  const irPara = onVista ?? setSubInterna;
  const [pagando, setPagando] = useState<Pedido | null>(null);
  const [clientes, setClientes] = useState<ClienteComHistorico[]>([]);
  // Abre em "escolher" com as datas vazias: mostra tudo e os campos ja aceitam
  // digitacao, sem precisar trocar o seletor antes.
  const [periodoRealizadas, setPeriodoRealizadas] = useState<PeriodoRealizadas>("escolher");
  // "todas" | "aberto" | a forma exata. Fica ao lado do periodo porque e
  // filtro, e o total do topo tem que concordar com a tabela.
  const [formaRealizadas, setFormaRealizadas] = useState("todas");
  const [realDe, setRealDe] = useState("");
  const [realAte, setRealAte] = useState("");
  // A cobrança abre sem filtro: quer ver tudo que está em aberto.
  const [recDe, setRecDe] = useState("");
  const [recAte, setRecAte] = useState("");
  const [realizadas, setRealizadas] = useState<Pedido[]>([]);
  const [carregandoRealizadas, setCarregandoRealizadas] = useState(false);
  // Lembra a escolha: voltar pra lista a cada refresh irrita.
  const [visao, setVisao] = useState<"lista" | "kanban">("lista");
  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_VISAO);
    if (salvo === "kanban" || salvo === "lista") setVisao(salvo);
  }, []);
  function trocarVisao(v: "lista" | "kanban") {
    setVisao(v);
    try {
      localStorage.setItem(CHAVE_VISAO, v);
    } catch {
      // modo privado: só não lembra
    }
  }

  // O resumo roda no cliente porque o navegador está no fuso de Tubarão —
  // calcular no servidor (UTC) traria de volta o bug de data que corrigimos.
  const resumo = useMemo(() => resumoVendas(base), [base]);

  /**
   * O quadro tem fonte própria, e não a página da lista.
   *
   * A lista é paginada de 25 em 25 e ordenada pela data de entrega — as 25
   * primeiras são as entregas mais antigas, quase todas já concluídas, que o
   * quadro esconde. O resultado era um quadro vazio com dezenas de pedidos no
   * mês. `base` traz todo pedido pendente de qualquer data (é o mesmo conjunto
   * do resumo), que é exatamente o que o quadro precisa mostrar.
   */
  const paraOQuadro = useMemo(() => {
    const alvo = buscaAtiva
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    return base.filter((p) => {
      // Sem filtro de status aqui: cada coluna do quadro já é um status.
      if (visao === "lista" && status !== "todos") {
        if (status === "nao_entregue") {
          if (!STATUS_NAO_ENTREGUE.includes(p.status)) return false;
        } else if (p.status !== status) {
          return false;
        }
      }
      if (!alvo) return true;
      const texto = `${p.cliente_nome ?? ""} ${p.cliente_whatsapp ?? ""}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      return texto.includes(alvo);
    });
  }, [base, status, buscaAtiva, visao]);

  // Debounce da busca: evita uma ida ao banco por tecla digitada.
  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const buscar = useCallback(
    async (novoOffset: number, acumular: boolean) => {
      setCarregando(true);
      setErro(null);
      try {
        const res = await carregarPedidos({
          data: { status, busca: buscaAtiva || undefined, limite: PAGINA, offset: novoOffset },
        });
        setPedidos((prev) => (acumular ? [...prev, ...res.pedidos] : res.pedidos));
        setTotal(res.total);
        setOffset(novoOffset);
      } catch (e) {
        setErro(mensagemDeErro(e, "carregar os pedidos"));
      }
      setCarregando(false);
    },
    [status, buscaAtiva],
  );

  const recarregarClientes = useCallback(async () => {
    try {
      setClientes((await carregarClientes()) as ClienteComHistorico[]);
    } catch (e) {
      // Engolir isso fazia a busca dizer "nenhum cliente com esse nome" para
      // clientes que existiam — o problema era a lista nunca ter carregado.
      toast.error(mensagemDeErro(e, "carregar os clientes cadastrados"), { duration: 8000 });
    }
  }, []);

  const recarregarAReceber = useCallback(async () => {
    try {
      setAReceberLista(
        (await carregarAReceber({ data: { de: recDe || null, ate: recAte || null } })) as Pedido[],
      );
      setMarcados(new Set());
    } catch {
      // secundário: a lista principal continua funcionando
    }
  }, [recDe, recAte]);

  const recarregarResumo = useCallback(async () => {
    try {
      setBase(await carregarResumoPedidos());
    } catch {
      // O resumo é secundário: se falhar, a lista ainda funciona.
    }
  }, []);

  useEffect(() => {
    buscar(0, false);
  }, [buscar]);

  useEffect(() => {
    recarregarResumo();
  }, [recarregarResumo]);

  useEffect(() => {
    recarregarAReceber();
  }, [recarregarAReceber]);

  useEffect(() => {
    recarregarClientes();
  }, [recarregarClientes]);

  const recarregarTudo = useCallback(() => {
    buscar(0, false);
    recarregarResumo();
    recarregarAReceber();
  }, [buscar, recarregarResumo, recarregarAReceber]);

  const buscarRealizadas = useCallback(async () => {
    setCarregandoRealizadas(true);
    try {
      setRealizadas((await carregarRealizadas({ data: { de: realDe, ate: realAte } })) as Pedido[]);
    } catch {
      setRealizadas([]);
    }
    setCarregandoRealizadas(false);
  }, [realDe, realAte]);

  useEffect(() => {
    if (sub === "realizadas") buscarRealizadas();
  }, [sub, buscarRealizadas]);

  // As opcoes saem do que existe no periodo: nao adianta oferecer "Cortesia"
  // se nenhuma venda do recorte foi cortesia.
  const formasRealizadas = useMemo(
    () =>
      Array.from(
        new Set(
          realizadas
            .filter((p) => p.recebido_em && p.forma_pagamento)
            .map((p) => p.forma_pagamento as string),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [realizadas],
  );

  const realizadasFiltradas = useMemo(() => {
    if (formaRealizadas === "todas") return realizadas;
    if (formaRealizadas === "aberto") return realizadas.filter((p) => !p.recebido_em);
    return realizadas.filter((p) => p.recebido_em && p.forma_pagamento === formaRealizadas);
  }, [realizadas, formaRealizadas]);

  /**
   * Indicadores do periodo. Saem todos da mesma lista que a tabela mostra,
   * entao respeitam o filtro de forma de pagamento e nao brigam com o rodape.
   */
  const indicadores = useMemo(() => {
    const total = realizadasFiltradas.reduce((t, p) => t + p.total, 0);
    const pagos = realizadasFiltradas.filter((p) => p.recebido_em);
    const recebido = pagos.reduce((t, p) => t + p.total, 0);

    // Quanto tempo o dinheiro leva para entrar depois da entrega. E o numero
    // que diz se vale apertar a cobranca — media so dos que ja pagaram.
    const prazos = pagos
      .map((p) => {
        if (!p.entregue_em || !p.recebido_em) return null;
        const entrega = new Date(p.entregue_em).getTime();
        const [a, m, d] = p.recebido_em.split("-").map(Number);
        return Math.round((Date.UTC(a, m - 1, d) - entrega) / 86_400_000);
      })
      .filter((dias): dias is number => dias != null && dias >= 0);

    return {
      total,
      recebido,
      aReceber: total - recebido,
      emAberto: realizadasFiltradas.length - pagos.length,
      ticket: realizadasFiltradas.length ? total / realizadasFiltradas.length : 0,
      prazoMedio: prazos.length
        ? Math.round(prazos.reduce((t, d) => t + d, 0) / prazos.length)
        : null,
    };
  }, [realizadasFiltradas]);


  function selecionarPeriodoRealizadas(periodo: PeriodoRealizadas) {
    const hoje = hojeISO();
    setPeriodoRealizadas(periodo);

    // "escolher" so libera os campos; preserva as datas para dar pra partir de
    // um atalho e ajustar a ponta.
    if (periodo === "escolher") return;

    if (periodo === "tudo") {
      setRealDe("");
      setRealAte("");
      return;
    }

    if (periodo === "hoje") {
      setRealDe(hoje);
      setRealAte(hoje);
      return;
    }

    const intervalo =
      periodo === "esta_semana"
        ? intervaloSemana(hoje, 0)
        : periodo === "semana_passada"
          ? intervaloSemana(hoje, -1)
          : periodo === "este_mes"
            ? intervaloMes(hoje, 0)
            : periodo === "mes_passado"
              ? intervaloMes(hoje, -1)
              : intervaloAno(hoje, 0);

    setRealDe(intervalo.de);
    setRealAte(intervalo.ate);
  }

  /** Registrar pagamento abre o diálogo; desfazer é direto. */
  async function receber(p: Pedido) {
    if (!p.recebido_em) {
      setPagando(p);
      return;
    }
    const ok = await confirmar({
      titulo: `Desfazer o pagamento do #${p.numero}?`,
      descricao: "O pedido volta para a lista de a receber.",
      confirmar: "Desfazer",
      destrutivo: true,
    });
    if (!ok) return;
    setPedidos((prev) => prev.map((x) => (x.id === p.id ? { ...x, recebido_em: null } : x)));
    try {
      await marcarRecebimento({ data: { id: p.id, recebido_em: null } });
      toast.success("Pagamento desfeito.");
      recarregarTudo();
    } catch {
      recarregarTudo();
    }
  }

  async function receberMarcados() {
    const ids = [...marcados];
    if (!ids.length) return;
    const total = aReceberLista.filter((p) => marcados.has(p.id)).reduce((t, p) => t + p.total, 0);
    const ok = await confirmar({
      titulo: `Registrar recebimento de ${ids.length} pedido(s)?`,
      descricao: `Total de ${formatBRL(total)}, recebido em ${dataRecebimento}.`,
      confirmar: "Registrar",
    });
    if (!ok) return;
    await receberEmLote({ data: { ids, recebido_em: dataRecebimento } });
    toast.success(`${ids.length} recebimento(s) registrado(s).`);
    recarregarTudo();
  }

  async function avancar(p: Pedido) {
    const prox = proximoStatus(p.status);
    if (!prox) return;
    // Atualização otimista: o clique responde na hora, o servidor confirma depois.
    setPedidos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: prox } : x)));
    try {
      await mudarStatusPedido({ data: { id: p.id, status: prox } });
      toast.success(`Pedido #${p.numero}: ${statusLabel(prox)}.`);
      recarregarResumo();
    } catch {
      recarregarTudo();
    }
  }

  /** Arrastar no kanban pode mover pra qualquer coluna, inclusive pra trás. */
  async function mover(p: Pedido, status: StatusPedido) {
    setPedidos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    try {
      await mudarStatusPedido({ data: { id: p.id, status } });
      toast.success(`Pedido #${p.numero}: ${statusLabel(status)}.`);
      recarregarResumo();
    } catch {
      recarregarTudo();
    }
  }

  const acoes: AcoesPedido = {
    avancar,
    receber,
    cancelar: (p) => cancelar(p),
    excluir: (p) => excluir(p),
    editar: (p) => setEditando(p),
  };

  /** Lista agrupada por quando o pedido precisa sair. */
  const grupos = useMemo(() => {
    const mapa = new Map<Urgencia, Pedido[]>();
    for (const p of ordenarPorEntrega(pedidos)) {
      const u = urgenciaDoPedido(p);
      mapa.set(u, [...(mapa.get(u) ?? []), p]);
    }
    return ORDEM_URGENCIA.filter((u) => mapa.has(u)).map((u) => ({
      urgencia: u,
      // No histórico, o que saiu por último vem primeiro; no que está por vir,
      // o mais próximo primeiro.
      pedidos: u === "concluido" ? [...mapa.get(u)!].reverse() : mapa.get(u)!,
    }));
  }, [pedidos]);

  /* Cancelar um pedido JA PAGO e a unica acao aqui que o sistema nao consegue
     decidir sozinho: so a cesteira sabe se devolveu o dinheiro. Enquanto
     ninguem perguntava, o recebimento ficava no caixa e a venda sumia do
     Dashboard — o faturamento ficava maior que as vendas, e as duas telas
     discordavam sobre o mesmo pedido. */
  const [cancelandoPago, setCancelandoPago] = useState<Pedido | null>(null);

  async function aplicarCancelamento(p: Pedido, devolveu: boolean) {
    try {
      if (devolveu) {
        // Some do caixa junto com a venda. Deixar so a entrada seria a
        // contradicao que estamos consertando.
        await marcarRecebimento({ data: { id: p.id, recebido_em: null } });
      }
      await mudarStatusPedido({ data: { id: p.id, status: "cancelado" } });
      toast.success(
        devolveu
          ? `Pedido #${p.numero} cancelado e o recebimento saiu do caixa.`
          : `Pedido #${p.numero} cancelado. O valor recebido continua no caixa.`,
      );
    } catch (e) {
      toast.error(mensagemDeErro(e, "cancelar o pedido"));
    } finally {
      recarregarTudo();
    }
  }

  async function cancelar(p: Pedido) {
    if (p.recebido_em) {
      setCancelandoPago(p);
      return;
    }

    const ok = await confirmar({
      titulo: `Cancelar o pedido #${p.numero}?`,
      descricao: "Ele sai do faturamento e das estatísticas, mas continua na lista.",
      confirmar: "Cancelar pedido",
      destrutivo: true,
    });
    if (!ok) return;
    await aplicarCancelamento(p, false);
  }

  async function excluir(p: Pedido) {
    const ok = await confirmar({
      titulo: `Excluir de vez o pedido #${p.numero}?`,
      descricao: "O registro some do histórico. Isso não tem volta.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    await removerPedido({ data: { id: p.id } });
    toast.success(`Pedido #${p.numero} excluído.`);
    recarregarTudo();
  }

  return (
    // A receber cabe num viewport: cabecalho e filtro parados, lista rolando
    // por dentro e a barra de selecao presa no rodape. As outras sub-abas
    // seguem como estao — mudar as tres de uma vez sem ver o resultado seria
    // apostar em tres layouts ao mesmo tempo.
    // Pedidos é a única tela do painel que rola a página inteira: é a lista
    // de trabalho do dia, e o pedido de baixo importa tanto quanto o de cima.
    // A receber e Realizadas seguem presas no viewport.
    <section data-tela-cheia={sub === "pedidos" ? undefined : ""}>
      <PageHeader
        titulo={
          sub === "areceber" ? "A receber" : sub === "realizadas" ? "Vendas realizadas" : "Pedidos"
        }
        descricao={
          sub === "areceber"
            ? "Quem ainda não pagou, de qualquer mês. Os já entregues vêm primeiro."
            : sub === "realizadas"
              ? "Histórico do que já foi entregue. A coluna Pago em mostra o que entrou no caixa."
              : "O pedido feito no seu catálogo chega pelo WhatsApp. Lance aqui — esses, os do telefone e os do Instagram."
        }
      />
      {/* Em realizadas o desktop mostra tabela, sem card para clicar. */}
      <p
        className={`mt-2 text-xs text-muted-foreground ${
          sub === "realizadas" ? "md:hidden" : ""
        }`}
      >
        Clique em um card de pedido para abrir as ações e ver mais opções.
      </p>

      {/* Só o operacional: a análise (mais vendidos, formas, coleções) é do Dashboard. */}
      <div
        className={cn("mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3", sub !== "pedidos" && "hidden")}
      >
        <Card titulo="Faturamento do mês" valor={formatBRL(resumo.faturamentoMes)} />
        <Card titulo="Pedidos no mês" valor={String(resumo.numMes)} />
        <Card
          titulo="Em aberto"
          valor={String(resumo.pendentes)}
          nota={resumo.entregasHoje ? `${resumo.entregasHoje} entrega(s) hoje` : undefined}
        />
      </div>

      {/* Visão e "novo pedido" vêm depois dos números do mês: primeiro se olha
          como o mês está, depois se escolhe como trabalhar. */}
      <div className={cn("mt-4 flex flex-wrap items-center gap-2", sub !== "pedidos" && "hidden")}>
        {/* Kanban só no desktop: arrastar card em tela de celular é pior
            que os botões da lista. */}
        <div className="hidden rounded-full border border-[var(--cream-deep)] p-0.5 md:flex">
          {(
            [
              { v: "lista", Icone: List, label: "Lista" },
              { v: "kanban", Icone: LayoutGrid, label: "Quadro" },
            ] as const
          ).map(({ v, Icone, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => trocarVisao(v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                visao === v
                  ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              <Icone className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <Button className="ml-auto md:ml-0" onClick={() => setEditando("novo")}>
          <Plus className="mr-2 h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      {/* Filtros: só na lista. No quadro as colunas JÁ são os status, e filtrar
          por status esvaziaria as outras colunas — a busca continua valendo. */}
      <div
        className={cn(
          "mt-6 flex flex-wrap items-center gap-2",
          (sub !== "pedidos" || visao === "kanban") && "hidden",
        )}
      >
        <span className="t-support shrink-0 text-[var(--admin-muted)]">Mostrando</span>
        <Select value={status} onValueChange={(v) => setStatus(v as FiltroStatus)}>
          <SelectTrigger className="h-11 w-full rounded-xl md:h-9 md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => (
              <SelectItem key={f.v} value={f.v}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        f.v === "todos" || f.v === "nao_entregue"
                          ? "var(--terracotta)"
                          : statusCor(f.v as StatusPedido),
                    }}
                  />
                  {f.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* O seletor sozinho nao explicava nada. O numero e a legenda dizem o
            que aquela escolha esta mostrando agora. */}
        {!carregando && (
          <span className="t-support min-w-0 text-[var(--admin-muted)]">
            <strong className="font-semibold text-[var(--admin-ink-soft)]">
              {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
            </strong>
            {EXPLICA_FILTRO[status] ? ` · ${EXPLICA_FILTRO[status]}` : ""}
          </span>
        )}

        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou WhatsApp"
          className="ml-auto h-9 w-full max-w-[15rem]"
        />
      </div>

      {erro && (
        <p className="mt-4 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* a receber: entregues sem pagamento primeiro, que é o que se cobra */}
      {sub === "areceber" && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <SeletorPeriodo
            de={recDe}
            ate={recAte}
            permiteVazio
            onMudar={(d, a) => {
              setRecDe(d);
              setRecAte(a);
            }}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
            <div>
              <p className="text-xs text-muted-foreground">
                {aReceberLista.length} pedido(s) ·{" "}
                <Num>{formatBRL(aReceberLista.reduce((t, p) => t + p.total, 0))}</Num>
                {(() => {
                  const entregues = aReceberLista.filter((p) => p.status === "entregue");
                  return entregues.length ? (
                    <span className="text-destructive">
                      {" "}
                      · {entregues.length} já entregue(s) sem pagamento
                    </span>
                  ) : null;
                })()}
              </p>
            </div>
          </div>

          {aReceberLista.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Tudo recebido por aqui 🤍</p>
          ) : (
            <>
              <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {[...aReceberLista]
                  // Entregue sem pagar sobe: é a cobrança de verdade.
                  .sort((a, b) => Number(b.status === "entregue") - Number(a.status === "entregue"))
                  .map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        "flex min-h-11 flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-3 text-sm md:min-h-0 md:py-2",
                        p.status === "entregue"
                          ? "border-destructive/40"
                          : "border-[var(--cream-deep)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 md:h-auto md:w-auto"
                        aria-label={`Selecionar pedido ${p.numero}`}
                        checked={marcados.has(p.id)}
                        onChange={(e) =>
                          setMarcados((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(p.id);
                            else n.delete(p.id);
                            return n;
                          })
                        }
                      />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        #{p.numero} {p.cliente_nome ?? "Sem nome"}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] text-white"
                        style={{ backgroundColor: statusCor(p.status) }}
                      >
                        {statusLabel(p.status)}
                      </span>
                      {p.data_entrega && (
                        <span className="text-xs text-muted-foreground">
                          {formatarDataLonga(p.data_entrega)}
                        </span>
                      )}
                      <Num className="w-24 text-right font-medium text-foreground">
                        {formatBRL(p.total)}
                      </Num>
                    </li>
                  ))}
              </ul>

              {marcados.size > 0 && (
                <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3 rounded-xl border border-[var(--terracotta)] bg-card p-3">
                  <span className="text-sm font-medium text-foreground">
                    {marcados.size} selecionado(s) ·{" "}
                    <Num>
                      {formatBRL(
                        aReceberLista
                          .filter((p) => marcados.has(p.id))
                          .reduce((t, p) => t + p.total, 0),
                      )}
                    </Num>
                  </span>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    recebido em
                    <Input
                      type="date"
                      value={dataRecebimento}
                      onChange={(e) => setDataRecebimento(e.target.value)}
                      className="h-8 w-[9.5rem]"
                    />
                  </label>
                  <Button
                    size="sm"
                    className="h-11 w-full md:h-8 md:w-auto"
                    onClick={receberMarcados}
                  >
                    Registrar recebimento
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 w-full md:h-8 md:w-auto"
                    onClick={() => setMarcados(new Set())}
                  >
                    Limpar
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* vendas realizadas do dia */}
      {sub === "realizadas" && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <SeletorPeriodoRealizadas
            periodo={periodoRealizadas}
            de={realDe}
            ate={realAte}
            onSelecionar={selecionarPeriodoRealizadas}
            onDe={setRealDe}
            onAte={setRealAte}
            forma={formaRealizadas}
            formas={formasRealizadas}
            onForma={setFormaRealizadas}
          />

          {/* A faixa era um valor sozinho encostado na direita, com o resto
              vazio. Os quatro indicadores saem da mesma lista da tabela. */}
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <IndicadorVenda
              carregando={carregandoRealizadas}
              rotulo="Vendido no período"
              valor={formatBRL(indicadores.total)}
              nota={`${realizadasFiltradas.length} venda(s)`}
            />
            <IndicadorVenda
              carregando={carregandoRealizadas}
              rotulo="Recebido"
              valor={formatBRL(indicadores.recebido)}
              nota={
                indicadores.prazoMedio == null
                  ? "nada recebido ainda"
                  : indicadores.prazoMedio === 0
                    ? "entra no dia da entrega"
                    : `entra ${indicadores.prazoMedio} dia(s) após a entrega, em média`
              }
              cor="var(--whatsapp)"
            />
            <IndicadorVenda
              carregando={carregandoRealizadas}
              rotulo="A receber"
              valor={formatBRL(indicadores.aReceber)}
              nota={`${indicadores.emAberto} entrega(s) sem pagamento`}
              cor={indicadores.aReceber > 0 ? "var(--destructive)" : undefined}
            />
            <IndicadorVenda
              carregando={carregandoRealizadas}
              rotulo="Ticket médio"
              valor={formatBRL(indicadores.ticket)}
              nota="por venda no período"
            />
          </div>

          {carregandoRealizadas && <Carregando />}

          {!carregandoRealizadas && realizadasFiltradas.length === 0 && (
            <EstadoVazio
              titulo="Nenhuma venda concluída no período"
              descricao="Entra aqui o pedido que foi entregue e pago. Se faltar um, confira se o recebimento foi registrado."
            />
          )}

          {realizadasFiltradas.length > 0 && (
            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
              <TabelaRealizadas pedidos={realizadasFiltradas} acoes={acoes} />
            </div>
          )}

          {/* Celular: seis colunas nao cabem, entao a lista segue em cards. */}
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 md:hidden">
            {realizadasFiltradas.map((p) => (
              <PedidoCard key={p.id} pedido={p} acoes={acoes} empresaNome={empresaNome} />
            ))}
          </div>
        </div>
      )}

      {/* corpo: quadro no desktop (se escolhido) ou lista agrupada por urgência */}
      {sub !== "pedidos" ? null : visao === "kanban" ? (
        <div className="mt-4 hidden min-h-0 flex-1 overflow-y-auto pr-1 md:block">
          <VendasKanban pedidos={paraOQuadro} acoes={acoes} onMover={mover} />
        </div>
      ) : null}

      <div
        className={cn(
          sub !== "pedidos" && "hidden",
          "min-h-0 flex-1 overflow-y-auto pr-1",
          visao === "kanban" ? "mt-4 md:hidden" : "mt-4",
        )}
      >
        {pedidos.length === 0 && !carregando && !erro && (
          <EstadoVazio
            titulo={buscaAtiva ? "Nada encontrado" : "Nenhum pedido ainda"}
            descricao={
              buscaAtiva
                ? "Tente outro nome ou número de WhatsApp."
                : "Assim que alguém fechar um pedido pelo site, ele aparece aqui."
            }
            acao={
              !buscaAtiva && (
                <Button variant="outline" onClick={() => setEditando("novo")}>
                  Lançar pedido à mão
                </Button>
              )
            }
          />
        )}

        {grupos.map((g) => (
          <section key={g.urgencia} className="mb-5">
            <h3
              className={`mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] ${
                g.urgencia === "atrasado" ? "text-destructive" : "text-[var(--bronze)]"
              }`}
            >
              {URGENCIA_LABEL[g.urgencia]}
              <span className="rounded-full bg-[var(--cream-deep)] px-1.5 py-0.5 text-[10px] tracking-normal text-muted-foreground">
                {g.pedidos.length}
              </span>
            </h3>
            <div className="space-y-3">
              {g.pedidos.map((p) => (
                <PedidoCard key={p.id} pedido={p} acoes={acoes} empresaNome={empresaNome} />
              ))}
            </div>
          </section>
        ))}

        {carregando && <Carregando />}

        {pedidos.length < total && !carregando && (
          <Button variant="outline" onClick={() => buscar(offset + PAGINA, true)}>
            Carregar mais ({pedidos.length} de {total})
          </Button>
        )}
      </div>

      {pagando && (
        <PagamentoDialog
          pedido={pagando}
          onClose={() => setPagando(null)}
          onSaved={recarregarTudo}
        />
      )}

      {editando && (
        <PedidoDialog
          pedido={editando === "novo" ? null : editando}
          produtos={produtos}
          categorias={categorias}
          clientes={clientes}
          onClienteCriado={recarregarClientes}
          onProdutoCriado={onCatalogoChange}
          onClose={() => { setEditando(null); }}
          onSaved={recarregarTudo}
        />
      )}

      {cancelandoPago && (
        <Dialog open onOpenChange={(aberto) => !aberto && setCancelandoPago(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="text-left">
              <DialogTitle>Cancelar o pedido #{cancelandoPago.numero}?</DialogTitle>
              <DialogDescription>
                Este pedido está pago:{" "}
                <strong>{formatBRL(cancelandoPago.total)}</strong> entraram no caixa. O que
                aconteceu com esse dinheiro?
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Button
                variant="outline"
                className="h-auto justify-start whitespace-normal py-3 text-left"
                onClick={() => {
                  const alvo = cancelandoPago;
                  setCancelandoPago(null);
                  void aplicarCancelamento(alvo, true);
                }}
              >
                <span>
                  <span className="block font-semibold">Devolvi ao cliente</span>
                  <span className="t-support block font-normal text-muted-foreground">
                    O recebimento sai do caixa junto com a venda.
                  </span>
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto justify-start whitespace-normal py-3 text-left"
                onClick={() => {
                  const alvo = cancelandoPago;
                  setCancelandoPago(null);
                  void aplicarCancelamento(alvo, false);
                }}
              >
                <span>
                  <span className="block font-semibold">Fiquei com o valor</span>
                  <span className="t-support block font-normal text-muted-foreground">
                    O pedido sai das vendas, mas o dinheiro continua no caixa.
                  </span>
                </span>
              </Button>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setCancelandoPago(null)}>
                Não cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

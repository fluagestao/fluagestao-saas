import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { formatarDataLonga, hojeISO, somarDias } from "@/lib/prazo";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { CategoriaRapida } from "./QuickProductDialog";
import { PagamentoDialog } from "./PagamentoDialog";
import type { ClienteComHistorico } from "@/lib/pedidos-ops.server";
import { Carregando, EstadoVazio, Num, PageHeader, useConfirmar } from "./shell";

const PAGINA = 25;
const CHAVE_VISAO = "flua-admin-vendas-visao";

type FiltroStatus = "todos" | StatusPedido;

// Os status vêm primeiro, na ordem em que o pedido anda; "Todos" fecha a fila.
// A tela é usada pra tocar o trabalho do dia, e o que se busca ao abrir é o que
// acabou de entrar — não a lista inteira.
const FILTROS: { v: FiltroStatus; label: string }[] = [
  ...STATUS_PEDIDO.map((s) => ({ v: s.v as FiltroStatus, label: s.label })),
  { v: "todos", label: "Todos" },
];

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
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
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

type PeriodoRealizadas = "escolher" | "tudo" | "ultimo_mes" | "ultima_semana" | "hoje";

function SeletorPeriodoRealizadas({
  periodo,
  de,
  ate,
  onSelecionar,
  onDe,
  onAte,
}: {
  periodo: PeriodoRealizadas;
  de: string;
  ate: string;
  onSelecionar: (periodo: PeriodoRealizadas) => void;
  onDe: (valor: string) => void;
  onAte: (valor: string) => void;
}) {
  const livre = periodo === "escolher";
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-card)]">
      <label className="grid gap-1 text-sm text-muted-foreground">
        Período
        <select
          value={periodo}
          onChange={(e) => onSelecionar(e.target.value as PeriodoRealizadas)}
          className="h-9 min-w-52 rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--terracotta)]"
        >
          <option value="tudo">Tudo</option>
          <option value="ultimo_mes">Último mês</option>
          <option value="ultima_semana">Última semana</option>
          <option value="hoje">Hoje</option>
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
  const [status, setStatus] = useState<FiltroStatus>("novo");
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
      if (visao === "lista" && status !== "todos" && p.status !== status) return false;
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

    setRealAte(hoje);
    setRealDe(
      periodo === "hoje"
        ? hoje
        : periodo === "ultima_semana"
          ? somarDias(hoje, -6)
          : somarDias(hoje, -29),
    );
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

  async function cancelar(p: Pedido) {
    const ok = await confirmar({
      titulo: `Cancelar o pedido #${p.numero}?`,
      descricao: "Ele sai do faturamento e das estatísticas, mas continua na lista.",
      confirmar: "Cancelar pedido",
      destrutivo: true,
    });
    if (!ok) return;
    await mudarStatusPedido({ data: { id: p.id, status: "cancelado" } });
    toast.success(`Pedido #${p.numero} cancelado.`);
    recarregarTudo();
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
    <section>
      <PageHeader
        titulo={
          sub === "areceber" ? "A receber" : sub === "realizadas" ? "Vendas realizadas" : "Pedidos"
        }
        descricao={
          sub === "areceber"
            ? "Quem ainda não pagou, de qualquer mês. Os já entregues vêm primeiro."
            : sub === "realizadas"
              ? "Histórico do que já foi entregue. A coluna Pago em mostra o que entrou no caixa."
              : "Pedidos do site entram sozinhos. Os que chegam por telefone ou Instagram, lance aqui."
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
        {FILTROS.map((f) => {
          const ativo = status === f.v;
          return (
            <button
              key={f.v}
              type="button"
              onClick={() => setStatus(f.v)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                ativo
                  ? "text-[var(--cream-soft)]"
                  : "border border-[var(--cream-deep)] bg-card text-foreground"
              }`}
              style={
                ativo
                  ? {
                      backgroundColor:
                        f.v === "todos" ? "var(--terracotta)" : statusCor(f.v as StatusPedido),
                    }
                  : undefined
              }
            >
              {f.label}
            </button>
          );
        })}
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou WhatsApp"
          className="ml-auto h-9 max-w-[15rem]"
        />
      </div>

      {erro && (
        <p className="mt-4 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      {erro && (
        <p className="mt-4 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* a receber: entregues sem pagamento primeiro, que é o que se cobra */}
      {sub === "areceber" && (
        <div className="mt-4">
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
              <ul className="mt-3 space-y-1.5">
                {[...aReceberLista]
                  // Entregue sem pagar sobe: é a cobrança de verdade.
                  .sort((a, b) => Number(b.status === "entregue") - Number(a.status === "entregue"))
                  .map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm",
                        p.status === "entregue"
                          ? "border-destructive/40"
                          : "border-[var(--cream-deep)]",
                      )}
                    >
                      <input
                        type="checkbox"
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
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--terracotta)] bg-card p-3">
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
                  <Button size="sm" onClick={receberMarcados}>
                    Registrar recebimento
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setMarcados(new Set())}>
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
        <div className="mt-4">
          <SeletorPeriodoRealizadas
            periodo={periodoRealizadas}
            de={realDe}
            ate={realAte}
            onSelecionar={selecionarPeriodoRealizadas}
            onDe={setRealDe}
            onAte={setRealAte}
          />

          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="ml-auto text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--bronze)]">
                Vendido no período
              </p>
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                <Num>{formatBRL(realizadas.reduce((t, p) => t + p.total, 0))}</Num>
              </p>
              <p className="text-xs text-muted-foreground">{realizadas.length} venda(s)</p>
            </div>
          </div>

          {carregandoRealizadas && <Carregando />}

          {!carregandoRealizadas && realizadas.length === 0 && (
            <EstadoVazio
              titulo="Nenhuma venda concluída no período"
              descricao="Entra aqui o pedido que foi entregue e pago. Se faltar um, confira se o recebimento foi registrado."
            />
          )}

          {realizadas.length > 0 && (
            <div className="mt-3">
              <TabelaRealizadas pedidos={realizadas} acoes={acoes} />
            </div>
          )}

          {/* Celular: seis colunas nao cabem, entao a lista segue em cards. */}
          <div className="mt-3 space-y-3 md:hidden">
            {realizadas.map((p) => (
              <PedidoCard key={p.id} pedido={p} acoes={acoes} empresaNome={empresaNome} />
            ))}
          </div>
        </div>
      )}

      {/* corpo: quadro no desktop (se escolhido) ou lista agrupada por urgência */}
      {sub !== "pedidos" ? null : visao === "kanban" ? (
        <div className="mt-4 hidden md:block">
          <VendasKanban pedidos={paraOQuadro} acoes={acoes} onMover={mover} />
        </div>
      ) : null}

      <div
        className={cn(
          sub !== "pedidos" && "hidden",
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
          onClose={() => setEditando(null)}
          onSaved={recarregarTudo}
        />
      )}
    </section>
  );
}

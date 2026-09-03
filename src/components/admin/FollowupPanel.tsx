import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Gift,
  MessageCircle,
  Save,
  Send,
  Settings2,
  ShoppingBag,
  ThumbsUp,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { mensagemDeErro } from "@/lib/erros";
import {
  carregarAjustesFollowup,
  carregarFollowup,
  marcarAvaliacaoPedida,
  salvarAjustesFollowup,
} from "@/lib/followup";
import {
  AJUSTES_FOLLOWUP_PADRAO,
  aplicarModeloAvaliacao,
  estadoFollowup,
  type AjustesFollowup,
  type EstadoFollowup,
  type TipoMensagemAvaliacao,
} from "@/lib/followup-mensagens";
import type { PedidoFollowup } from "@/lib/followup-ops.server";
import { hojeISO, somarDias } from "@/lib/prazo";
import { cn } from "@/lib/utils";
import { abrirWhatsappCom, formatBRL } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader } from "./shell";

/** A data que vale para o follow-up: quando o pedido chegou na mão do cliente. */
function dataDaEntrega(pedido: PedidoFollowup): string | null {
  return pedido.data_entrega ?? (pedido.created_at ? pedido.created_at.slice(0, 10) : null);
}

/** A cor conta o estado antes de a pessoa ler o texto. */
/* O que cada marcacao vira na mensagem que chega no cliente. Sem a legenda,
   {{produto}} e {{pedido}} sao adivinhacao — e quem adivinha errado descobre
   depois de mandar. Os valores aqui espelham aplicarModeloAvaliacao(). */
const VARIAVEIS_MENSAGEM = [
  { token: "{{nome}}", descricao: "Primeiro nome do cliente" },
  { token: "{{empresa}}", descricao: "Nome da sua empresa" },
  { token: "{{produto}}", descricao: "Tudo o que ele comprou" },
  { token: "{{pedido}}", descricao: "Número do pedido" },
];

const ESTILO_ESTADO: Record<EstadoFollowup, string> = {
  no_prazo: "border-[var(--admin-border)]",
  hoje: "border-[var(--terracotta)] bg-[var(--peach)]",
  atrasado: "border-destructive bg-destructive/5",
};

const ETIQUETA_ESTADO: Record<Exclude<EstadoFollowup, "no_prazo">, string> = {
  hoje: "bg-[var(--terracotta)] text-white",
  atrasado: "bg-destructive text-white",
};

/** Dias corridos entre a data e hoje. Negativo se a data for no futuro. */
function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const [a1, m1, d1] = hojeISO().split("-").map(Number);
  const [a2, m2, d2] = iso.split("-").map(Number);
  return Math.round((Date.UTC(a1, m1 - 1, d1) - Date.UTC(a2, m2 - 1, d2)) / 86_400_000);
}

/** "hoje" / "ontem" / "há 3 dias" — mais legível que a data crua numa lista. */
function rotuloDeQuando(iso: string | null): string {
  if (!iso) return "sem data";
  const hoje = hojeISO();
  if (iso === hoje) return "hoje";
  if (iso === somarDias(hoje, -1)) return "ontem";

  const [a1, m1, d1] = hoje.split("-").map(Number);
  const [a2, m2, d2] = iso.split("-").map(Number);
  const dias = Math.round((Date.UTC(a1, m1 - 1, d1) - Date.UTC(a2, m2 - 1, d2)) / 86_400_000);

  if (dias < 0) return "hoje";
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 14) return "há 1 semana";
  if (dias < 30) return `há ${Math.floor(dias / 7)} semanas`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

function itensResumo(pedido: PedidoFollowup): string {
  if (!pedido.itens?.length) return "Sem itens informados";
  return pedido.itens
    .slice(0, 2)
    .map((item) => `${item.qtd}x ${item.nome}`)
    .join(" · ");
}

function Kpi({
  titulo,
  valor,
  nota,
  icon: Icon,
}: {
  titulo: string;
  valor: string;
  nota: string;
  icon: typeof MessageCircle;
}) {
  return (
    <article className="flex min-h-[92px] min-w-0 items-start gap-3 rounded-2xl border border-[var(--admin-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--peach)] text-[var(--terracotta)]">
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-[var(--admin-muted)]">{titulo}</p>
        <p className="mt-0.5 truncate text-2xl font-semibold tracking-[-0.03em] text-[var(--admin-ink)]">
          <Num>{valor}</Num>
        </p>
        {nota && <p className="mt-0.5 truncate text-[11px] text-[var(--admin-muted)]">{nota}</p>}
      </div>
    </article>
  );
}

export function FollowupPanel({ empresaNome }: { empresaNome: string }) {
  const [pedidos, setPedidos] = useState<PedidoFollowup[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [vista, setVista] = useState<"achamar" | "chamados">("achamar");
  const [busca, setBusca] = useState("");
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoFollowup | null>(null);
  const [tipoMensagem, setTipoMensagem] = useState<TipoMensagemAvaliacao>("presente");
  const [ajustes, setAjustes] = useState<AjustesFollowup>(AJUSTES_FOLLOWUP_PADRAO);
  const [salvandoModelos, setSalvandoModelos] = useState(false);
  const [ajustesAberto, setAjustesAberto] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const { pedidos: lista } = await carregarFollowup();
      setPedidos(lista);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar o follow-up"));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    carregarAjustesFollowup()
      .then(setAjustes)
      .catch((e) => toast.error(mensagemDeErro(e, "carregar os ajustes do follow-up")));
  }, []);

  const aChamar = useMemo(() => pedidos.filter((p) => !p.avaliacao_pedida_em), [pedidos]);
  const chamados = useMemo(() => pedidos.filter((p) => p.avaliacao_pedida_em), [pedidos]);

  const naSemana = useMemo(() => {
    const limite = somarDias(hojeISO(), -7);
    return pedidos.filter((p) => (dataDaEntrega(p) ?? "") >= limite).length;
  }, [pedidos]);

  const lista = useMemo(() => {
    const base = vista === "achamar" ? aChamar : chamados;
    const termo = busca.trim().toLowerCase();
    const filtrada = termo
      ? base.filter((p) => (p.cliente_nome ?? "").toLowerCase().includes(termo))
      : base;

    // Quem esta a chamar vem do mais atrasado para o mais recente: com prazo
    // configuravel, ordenar so por data de entrega deixa de casar com a
    // urgencia. Ja chamados seguem na ordem que vieram.
    if (vista !== "achamar") return filtrada;
    return [...filtrada].sort(
      (a, b) => (diasDesde(dataDaEntrega(b)) ?? -1) - (diasDesde(dataDaEntrega(a)) ?? -1),
    );
  }, [vista, aChamar, chamados, busca]);

  /** Quantos ja passaram do prazo ou vencem hoje. Alimenta o aviso do topo. */
  const vencendo = useMemo(
    () =>
      aChamar.filter(
        (p) =>
          estadoFollowup(diasDesde(dataDaEntrega(p)), ajustes.dias_para_avaliacao) !== "no_prazo",
      ).length,
    [aChamar, ajustes.dias_para_avaliacao],
  );

  /** Otimista: a linha muda na hora e volta sozinha se o banco recusar. */
  const alternarConvite = useCallback(
    async (pedido: PedidoFollowup, pedida: boolean) => {
      const antes = pedidos;
      setPedidos((atual) =>
        atual.map((p) =>
          p.id === pedido.id
            ? { ...p, avaliacao_pedida_em: pedida ? new Date().toISOString() : null }
            : p,
        ),
      );

      try {
        await marcarAvaliacaoPedida({ data: { id: pedido.id, pedida } });
      } catch (e) {
        setPedidos(antes);
        toast.error(mensagemDeErro(e, "marcar o convite"));
      }
    },
    [pedidos],
  );

  async function salvarModelos(mostrarConfirmacao = true) {
    setSalvandoModelos(true);
    try {
      await salvarAjustesFollowup({ data: ajustes });
      if (mostrarConfirmacao) toast.success("Ajustes do follow-up salvos.");
      return true;
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar os ajustes do follow-up"));
      return false;
    } finally {
      setSalvandoModelos(false);
    }
  }

  function pedirAvaliacao(pedido: PedidoFollowup) {
    setPedidoSelecionado(pedido);
    setTipoMensagem("presente");
  }

  function enviarAvaliacao() {
    if (!pedidoSelecionado) return;
    const mensagem = aplicarModeloAvaliacao(
      ajustes[tipoMensagem],
      pedidoSelecionado,
      empresaNome,
    );
    const abriu = abrirWhatsappCom(pedidoSelecionado.cliente_whatsapp, mensagem);
    if (!abriu) {
      toast.error("Esse pedido não tem WhatsApp cadastrado.");
      return;
    }
    setPedidoSelecionado(null);
    void alternarConvite(pedidoSelecionado, true);
  }

  function atualizarModelo(valor: string) {
    setAjustes((atuais) => ({ ...atuais, [tipoMensagem]: valor }));
  }

  function inserirVariavel(variavel: string) {
    const atual = ajustes[tipoMensagem];
    atualizarModelo(`${atual}${atual.endsWith(" ") || atual.endsWith("\n") ? "" : " "}${variavel}`);
  }

  return (
    <section className="min-w-0">
      <PageHeader
        titulo="Follow-up"
        descricao="Clientes que já receberam o pedido e ainda não foram convidados a avaliar. A mensagem vai pronta para conferir e enviar."
        acoes={
          <Button
            type="button"
            variant="outline"
            onClick={() => setAjustesAberto(true)}
            className="hidden h-10 rounded-full lg:inline-flex"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Ajustes
          </Button>
        }
      />

      {erro && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          titulo="Esperando contato"
          valor={String(aChamar.length)}
          nota={
            vencendo
              ? `${vencendo} no dia de chamar ou em atraso`
              : "entregas sem pedido de avaliação"
          }
          icon={MessageCircle}
        />
        <Kpi
          titulo="Entregues na semana"
          valor={String(naSemana)}
          nota="é quando a lembrança está fresca"
          icon={Check}
        />
        <Kpi
          titulo="Já convidados"
          valor={String(chamados.length)}
          nota="pedidos com convite enviado"
          icon={ThumbsUp}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {[
          { id: "achamar" as const, label: `A chamar (${aChamar.length})` },
          { id: "chamados" as const, label: `Já chamados (${chamados.length})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setVista(item.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              vista === item.id
                ? "border-[var(--wine)] bg-[var(--wine)] text-white"
                : "border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]",
            )}
          >
            {item.label}
          </button>
        ))}

        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          className="h-10 w-full max-w-[260px] rounded-full"
        />
      </div>

      <div className="mt-4 space-y-2">
        {carregando ? (
          <Carregando texto="carregando as entregas…" />
        ) : lista.length === 0 ? (
          <EstadoVazio
            titulo={
              vista === "achamar" ? "Ninguém esperando contato" : "Nenhum convite enviado ainda"
            }
            descricao={
              vista === "achamar"
                ? "Assim que um pedido for marcado como entregue, ele aparece aqui."
                : "Os pedidos que você já convidou a avaliar ficam nesta lista."
            }
          />
        ) : (
          lista.map((pedido) => (
            <article
              key={pedido.id}
              className={cn(
                "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl border bg-white px-4 py-3 shadow-[var(--shadow-soft)] sm:flex sm:flex-wrap sm:gap-3",
                // A cor so vale para quem ainda nao foi chamado: depois de
                // enviado, atraso nao quer dizer mais nada.
                vista === "achamar" &&
                  ESTILO_ESTADO[
                    estadoFollowup(diasDesde(dataDaEntrega(pedido)), ajustes.dias_para_avaliacao)
                  ],
                vista !== "achamar" && "border-[var(--admin-border)]",
              )}
            >
              <div className="col-span-2 min-w-0 sm:col-auto sm:min-w-[180px] sm:flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--admin-ink)]">
                  {pedido.cliente_nome?.trim() || "Cliente sem nome"}
                  {pedido.compras > 1 && (
                    <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-[11px] font-medium text-[var(--terracotta)]">
                      {pedido.compras}ª compra
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--admin-muted)]">
                  #{pedido.numero} · {itensResumo(pedido)} · <Num>{formatBRL(pedido.total)}</Num>
                </p>
              </div>

              <span className="col-start-1 row-start-2 flex items-center gap-2 whitespace-nowrap text-xs text-[var(--admin-muted)] sm:col-auto sm:row-auto">
                {rotuloDeQuando(dataDaEntrega(pedido))}
                {vista === "achamar" &&
                  (() => {
                    const estado = estadoFollowup(
                      diasDesde(dataDaEntrega(pedido)),
                      ajustes.dias_para_avaliacao,
                    );
                    if (estado === "no_prazo") return null;
                    return (
                      <span className={cn("rounded-full px-2 py-0.5 font-semibold", ETIQUETA_ESTADO[estado])}>
                        {estado === "hoje" ? "chamar hoje" : "atrasado"}
                      </span>
                    );
                  })()}
              </span>

              <button
                type="button"
                onClick={() => pedirAvaliacao(pedido)}
                className="col-start-1 row-start-3 inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-[var(--wine)] px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:col-auto sm:row-auto sm:w-auto sm:px-4"
              >
                <MessageCircle className="h-4 w-4" />
                {pedido.avaliacao_pedida_em ? "Chamar de novo" : "Pedir avaliação"}
              </button>

              <button
                type="button"
                onClick={() => alternarConvite(pedido, !pedido.avaliacao_pedida_em)}
                aria-label={
                  pedido.avaliacao_pedida_em
                    ? "Voltar para a lista de a chamar"
                    : "Marcar como já chamado, sem enviar"
                }
                className={cn(
                  "col-start-2 row-start-3 grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors sm:col-auto sm:row-auto",
                  pedido.avaliacao_pedida_em
                    ? "border-[var(--whatsapp)] bg-[var(--whatsapp)] text-white"
                    : "border-[var(--admin-border)] text-[var(--admin-ink-soft)] hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]",
                )}
              >
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </article>
          ))
        )}
      </div>

      <Dialog
        open={Boolean(pedidoSelecionado)}
        onOpenChange={(aberto) => !aberto && setPedidoSelecionado(null)}
      >
        <DialogContent className="bottom-4 left-4 right-4 top-4 max-h-none w-auto max-w-none translate-x-0 translate-y-0 gap-3 overflow-x-hidden overflow-y-auto rounded-2xl border-[var(--admin-border)] p-4 sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-5">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Mensagem de pedido de avaliação</DialogTitle>
            <DialogDescription>
              Escolha o contexto, confira a mensagem e abra o WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={tipoMensagem}
            onValueChange={(valor) => setTipoMensagem(valor as TipoMensagemAvaliacao)}
          >
            <TabsList className="grid h-auto w-full min-w-0 grid-cols-2 gap-1 rounded-xl bg-transparent p-0">
              <TabsTrigger value="presente" className="min-w-0 gap-1.5 whitespace-normal rounded-xl border border-transparent bg-[#f7e5e1] px-2 py-2.5 text-center text-xs leading-tight text-[var(--wine)] opacity-45 shadow-none transition-all hover:opacity-70 data-[state=active]:border-[var(--wine)] data-[state=active]:bg-[var(--wine)] data-[state=active]:text-white data-[state=active]:opacity-100 data-[state=active]:shadow-sm sm:gap-2 sm:text-sm">
                <Gift className="h-4 w-4" />
                Presente ou surpresa
              </TabsTrigger>
              <TabsTrigger value="consumo_proprio" className="min-w-0 gap-1.5 whitespace-normal rounded-xl border border-transparent bg-[#f7e5e1] px-2 py-2.5 text-center text-xs leading-tight text-[var(--wine)] opacity-45 shadow-none transition-all hover:opacity-70 data-[state=active]:border-[var(--wine)] data-[state=active]:bg-[var(--wine)] data-[state=active]:text-white data-[state=active]:opacity-100 data-[state=active]:shadow-sm sm:gap-2 sm:text-sm">
                <ShoppingBag className="h-4 w-4" />
                Consumo próprio
              </TabsTrigger>
            </TabsList>

            {(["presente", "consumo_proprio"] as const).map((tipo) => (
              <TabsContent key={tipo} value={tipo} className="mt-3">
                {pedidoSelecionado && (
                  <div className="max-h-[45dvh] overflow-y-auto rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--terracotta)]">
                      Prévia para {pedidoSelecionado.cliente_nome || "o cliente"}
                    </p>
                    <p className="whitespace-pre-wrap text-xs leading-snug text-[var(--admin-ink-soft)]">
                      {aplicarModeloAvaliacao(ajustes[tipo], pedidoSelecionado, empresaNome)}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPedidoSelecionado(null);
                setAjustesAberto(true);
              }}
              className="hidden w-full rounded-full sm:inline-flex sm:w-auto"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Editar mensagem
            </Button>
            <Button
              type="button"
              onClick={enviarAvaliacao}
              disabled={!ajustes[tipoMensagem].trim()}
              className="w-full rounded-full bg-[var(--whatsapp)] text-white hover:opacity-90 sm:w-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              Abrir no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajustes: o que antes vivia dentro do dialogo de envio, mais o prazo.
          Editar modelo e mandar mensagem sao tarefas diferentes e nao precisam
          dividir a mesma tela. */}
      <Dialog open={ajustesAberto} onOpenChange={setAjustesAberto}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Ajustes do follow-up</DialogTitle>
            <DialogDescription>
              As mensagens que vão para o cliente e quando o pedido entra na sua fila.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] p-3">
            <Label htmlFor="dias-avaliacao">Pedir avaliação depois da entrega</Label>
            <div className="mt-2 flex items-center gap-2">
              <Input
                id="dias-avaliacao"
                type="number"
                min={0}
                max={60}
                value={ajustes.dias_para_avaliacao}
                onChange={(e) =>
                  setAjustes((atuais) => ({
                    ...atuais,
                    dias_para_avaliacao: Math.min(60, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="h-10 w-24"
              />
              <span className="text-sm text-[var(--admin-ink-soft)]">dias</span>
            </div>
            <p className="mt-2 text-xs text-[var(--admin-muted)]">
              No dia, o card fica destacado e entra na contagem do sino. Passou, fica em
              vermelho e sobe para o topo da lista.
            </p>
          </div>

          <Tabs
            value={tipoMensagem}
            onValueChange={(valor) => setTipoMensagem(valor as TipoMensagemAvaliacao)}
          >
            <TabsList className="grid h-auto w-full min-w-0 grid-cols-2 gap-1 rounded-xl bg-transparent p-0">
              <TabsTrigger value="presente" className="min-w-0 gap-1.5 whitespace-normal rounded-xl border border-transparent bg-[#f7e5e1] px-2 py-2.5 text-center text-xs leading-tight text-[var(--wine)] opacity-45 shadow-none transition-all hover:opacity-70 data-[state=active]:border-[var(--wine)] data-[state=active]:bg-[var(--wine)] data-[state=active]:text-white data-[state=active]:opacity-100 data-[state=active]:shadow-sm sm:gap-2 sm:text-sm">
                <Gift className="h-4 w-4" />
                Presente ou surpresa
              </TabsTrigger>
              <TabsTrigger value="consumo_proprio" className="min-w-0 gap-1.5 whitespace-normal rounded-xl border border-transparent bg-[#f7e5e1] px-2 py-2.5 text-center text-xs leading-tight text-[var(--wine)] opacity-45 shadow-none transition-all hover:opacity-70 data-[state=active]:border-[var(--wine)] data-[state=active]:bg-[var(--wine)] data-[state=active]:text-white data-[state=active]:opacity-100 data-[state=active]:shadow-sm sm:gap-2 sm:text-sm">
                <ShoppingBag className="h-4 w-4" />
                Consumo próprio
              </TabsTrigger>
            </TabsList>

            {(["presente", "consumo_proprio"] as const).map((tipo) => (
              <TabsContent key={tipo} value={tipo} className="mt-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`ajuste-modelo-${tipo}`}>Modelo da mensagem</Label>
                    <span className="text-xs text-[var(--admin-muted)]">
                      {ajustes[tipo].length}/2000
                    </span>
                  </div>
                  <Textarea
                    id={`ajuste-modelo-${tipo}`}
                    value={ajustes[tipo]}
                    onChange={(e) => setAjustes((atuais) => ({ ...atuais, [tipo]: e.target.value }))}
                    maxLength={2000}
                    rows={8}
                    className="resize-none rounded-xl border-[var(--admin-border)] bg-white text-sm leading-relaxed"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--admin-ink-soft)]">
                    Inserir informação automática — clique para adicionar no texto
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {VARIAVEIS_MENSAGEM.map((variavel) => (
                      <button
                        key={variavel.token}
                        type="button"
                        title={`${variavel.token} vira ${variavel.descricao.toLocaleLowerCase("pt-BR")}`}
                        onClick={() => inserirVariavel(variavel.token)}
                        className="flex items-center gap-2.5 rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-left hover:bg-[var(--cream-soft)]"
                      >
                        <span className="shrink-0 rounded-full bg-[var(--cream)] px-2 py-0.5 font-mono text-[11px] text-[var(--wine)]">
                          {variavel.token}
                        </span>
                        <span className="min-w-0 text-[11px] leading-tight text-[var(--admin-muted)]">
                          {variavel.descricao}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              onClick={async () => {
                if (await salvarModelos()) setAjustesAberto(false);
              }}
              disabled={salvandoModelos || !ajustes.presente.trim() || !ajustes.consumo_proprio.trim()}
              className="w-full rounded-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {salvandoModelos ? "Salvando…" : "Salvar ajustes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

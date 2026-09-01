import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Gift, MessageCircle, Save, Send, ShoppingBag, ThumbsUp } from "lucide-react";
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
  carregarFollowup,
  carregarModelosAvaliacao,
  marcarAvaliacaoPedida,
  salvarModelosAvaliacao,
} from "@/lib/followup";
import {
  aplicarModeloAvaliacao,
  MODELOS_AVALIACAO_PADRAO,
  type ModelosAvaliacao,
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fbefec] text-[var(--terracotta)]">
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
  const [modelos, setModelos] = useState<ModelosAvaliacao>(MODELOS_AVALIACAO_PADRAO);
  const [salvandoModelos, setSalvandoModelos] = useState(false);

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
    carregarModelosAvaliacao()
      .then(setModelos)
      .catch((e) => toast.error(mensagemDeErro(e, "carregar os modelos de avaliação")));
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
    if (!termo) return base;
    return base.filter((p) => (p.cliente_nome ?? "").toLowerCase().includes(termo));
  }, [vista, aChamar, chamados, busca]);

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
      await salvarModelosAvaliacao({ data: modelos });
      if (mostrarConfirmacao) toast.success("Modelos de avaliação salvos.");
      return true;
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar os modelos de avaliação"));
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
      modelos[tipoMensagem],
      pedidoSelecionado,
      empresaNome,
    );
    const abriu = abrirWhatsappCom(pedidoSelecionado.cliente_whatsapp, mensagem);
    if (!abriu) {
      toast.error("Esse pedido não tem WhatsApp cadastrado.");
      return;
    }
    setPedidoSelecionado(null);
    void salvarModelos(false);
    void alternarConvite(pedidoSelecionado, true);
  }

  function atualizarModelo(valor: string) {
    setModelos((atuais) => ({ ...atuais, [tipoMensagem]: valor }));
  }

  function inserirVariavel(variavel: string) {
    const atual = modelos[tipoMensagem];
    atualizarModelo(`${atual}${atual.endsWith(" ") || atual.endsWith("\n") ? "" : " "}${variavel}`);
  }

  return (
    <section className="min-w-0">
      <PageHeader
        titulo="Follow-up"
        descricao="Clientes que já receberam o pedido e ainda não foram convidados a avaliar. A mensagem vai pronta para conferir e enviar."
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
          nota="entregas sem pedido de avaliação"
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
              className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border border-[var(--admin-border)] bg-white px-4 py-3 shadow-[var(--shadow-soft)]"
            >
              <div className="min-w-[180px] flex-1">
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

              <span className="text-xs text-[var(--admin-muted)]">
                {rotuloDeQuando(dataDaEntrega(pedido))}
              </span>

              <button
                type="button"
                onClick={() => pedirAvaliacao(pedido)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--wine)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors",
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
        <DialogContent className="max-w-2xl gap-5 rounded-2xl border-[var(--admin-border)]">
          <DialogHeader>
            <DialogTitle>Mensagem de pedido de avaliação</DialogTitle>
            <DialogDescription>
              Escolha o contexto, personalize o modelo e confira a mensagem antes de abrir o WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={tipoMensagem}
            onValueChange={(valor) => setTipoMensagem(valor as TipoMensagemAvaliacao)}
          >
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-[var(--cream-soft)] p-1">
              <TabsTrigger value="presente" className="gap-2 rounded-lg py-2.5">
                <Gift className="h-4 w-4" />
                Presente ou surpresa
              </TabsTrigger>
              <TabsTrigger value="consumo_proprio" className="gap-2 rounded-lg py-2.5">
                <ShoppingBag className="h-4 w-4" />
                Consumo próprio
              </TabsTrigger>
            </TabsList>

            {(["presente", "consumo_proprio"] as const).map((tipo) => (
              <TabsContent key={tipo} value={tipo} className="mt-5 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`modelo-${tipo}`}>Modelo da mensagem</Label>
                    <span className="text-xs text-[var(--admin-muted)]">
                      {modelos[tipo].length}/2000
                    </span>
                  </div>
                  <Textarea
                    id={`modelo-${tipo}`}
                    value={modelos[tipo]}
                    onChange={(e) => setModelos((atuais) => ({ ...atuais, [tipo]: e.target.value }))}
                    maxLength={2000}
                    rows={9}
                    className="resize-y rounded-xl border-[var(--admin-border)] bg-white leading-relaxed"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-[var(--admin-ink-soft)]">
                    Inserir informação automática
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["{{nome}}", "{{empresa}}", "{{produto}}", "{{pedido}}"].map((variavel) => (
                      <button
                        key={variavel}
                        type="button"
                        onClick={() => inserirVariavel(variavel)}
                        className="rounded-full border border-[var(--admin-border)] bg-white px-3 py-1.5 text-xs text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]"
                      >
                        {variavel}
                      </button>
                    ))}
                  </div>
                </div>

                {pedidoSelecionado && (
                  <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--cream-soft)] p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--terracotta)]">
                      Prévia para {pedidoSelecionado.cliente_nome || "o cliente"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--admin-ink-soft)]">
                      {aplicarModeloAvaliacao(modelos[tipo], pedidoSelecionado, empresaNome)}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => void salvarModelos()}
              disabled={salvandoModelos}
              className="rounded-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {salvandoModelos ? "Salvando…" : "Salvar modelos"}
            </Button>
            <Button
              type="button"
              onClick={enviarAvaliacao}
              disabled={!modelos[tipoMensagem].trim()}
              className="rounded-full bg-[var(--whatsapp)] text-white hover:opacity-90"
            >
              <Send className="mr-2 h-4 w-4" />
              Abrir no WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

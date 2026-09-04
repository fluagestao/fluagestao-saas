"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, HeartHandshake, MessageCircle, Settings2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { proximaDataComemorativa } from "@/lib/datas-comemorativas";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataCurta } from "@/lib/prazo";
import {
  carregarModeloRelacionamento,
  carregarRelacionamento,
  desfazerContato,
  marcarContatado,
  salvarModeloRelacionamento,
  type ClienteParado,
} from "@/lib/relacionamento";
import {
  MARCADORES,
  MODELOS_PADRAO,
  aplicarModelo,
  linkWhatsApp,
  tempoParado,
  type ModelosRelacionamento,
} from "@/lib/relacionamento-mensagem";
import { cn } from "@/lib/utils";

import { Carregando, EstadoVazio, PageHeader } from "./shell";

/**
 * Quem comprou e sumiu.
 *
 * Faixas em vez de um número único de propósito: cesta de café da manhã tem
 * ritmo de recompra diferente de tábua de festa, e qualquer corte fixo erraria
 * nos dois. A dona escolhe a faixa que faz sentido para o produto dela; depois
 * de alguns meses o próprio histórico diz qual é o intervalo real.
 */
const FAIXAS = [
  { id: "todos", label: "Todos", de: 0, ate: Infinity },
  { id: "30", label: "30 a 60 dias", de: 30, ate: 60 },
  { id: "60", label: "60 a 120 dias", de: 60, ate: 120 },
  { id: "120", label: "Mais de 120 dias", de: 120, ate: Infinity },
] as const;

type FaixaId = (typeof FAIXAS)[number]["id"];

/* Descanso depois de chamar. Sem ele a lista de acao se repete: quem esta
   parada ha 80 dias continua parada ha 81 amanha, entao reapareceria todo dia e
   receberia a mesma mensagem toda semana. Trinta dias e o intervalo em que uma
   segunda mensagem ainda soa como lembrete, e nao como insistencia.

   Vale so nas FAIXAS. Em "Todos" ninguem some — la o objetivo e acompanhar, e
   esconder quem foi chamada seria esconder justamente o que se quer ver. */
const DESCANSO_DIAS = 30;

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  return Math.max(0, Math.round((Date.now() - Date.UTC(a, m - 1, d)) / 86_400_000));
}

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RelacionamentoPanel() {
  const [clientes, setClientes] = useState<ClienteParado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [faixa, setFaixa] = useState<FaixaId>("todos");
  /* Quem foi chamada AGORA continua na tela, marcada, ate a proxima recarga.
     Sumir na hora esconderia o que ela acabou de fazer, e tiraria o caminho de
     volta se ela abriu o WhatsApp e desistiu de mandar. */
  const [chamadas, setChamadas] = useState<Set<string>>(new Set());
  const [modelos, setModelos] = useState<ModelosRelacionamento>(MODELOS_PADRAO);
  const [ajustesAberto, setAjustesAberto] = useState(false);
  const [rascunho, setRascunho] = useState<ModelosRelacionamento>(MODELOS_PADRAO);
  const [salvando, setSalvando] = useState(false);
  /* Confirmação DENTRO do card, e não um AlertDialog por cima.

     O confirmador do shell é um AlertDialog z-50, igual ao Dialog que já está
     aberto aqui — e não existe, em nenhum lugar do projeto, precedente de
     confirmação disparada de dentro de outro diálogo. Um modal preso atrás do
     outro é um botão que simplesmente não faz nada, e o aviso fica onde ela já
     está olhando. */
  const [confirmandoPadrao, setConfirmandoPadrao] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarRelacionamento();
      setClientes(d.clientes);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os clientes"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    carregarModeloRelacionamento()
      .then((r) => {
        setModelos(r);
        setRascunho(r);
      })
      // Sem modelo salvo a tela funciona igual: cai no padrão.
      .catch(() => undefined);
  }, []);

  // Calculada uma vez: é a mesma para todas as linhas da tela.
  const proxima = useMemo(() => proximaDataComemorativa(), []);
  /* Só há escolha a fazer quando existe data por perto. Fora disso o botão
     manda direto a mensagem sem ocasião. */
  const temDataPerto = proxima.diasRestantes >= 0 && proxima.diasRestantes <= 45;

  /* "Todos" mostra a base inteira, para acompanhar. As faixas sao a lista de
     ACAO, e por isso tiram quem nao deve ser chamada agora: quem tem pedido a
     caminho e quem ja foi chamada dentro do descanso. */
  const filtrar = useCallback((lista: ClienteParado[], id: FaixaId) => {
    const f = FAIXAS.find((x) => x.id === id)!;
    if (id === "todos") return lista;
    return lista.filter((c) => {
      if (c.diasParado < f.de || c.diasParado >= f.ate) return false;
      if (c.temPedidoAberto) return false;
      const desdeContato = diasDesde(c.contatadoEm);
      if (desdeContato !== null && desdeContato < DESCANSO_DIAS && !c.chamadaHoje) return false;
      return true;
    });
  }, []);

  const porFaixa = useMemo(() => filtrar(clientes, faixa), [clientes, faixa, filtrar]);

  const contagens = useMemo(
    () =>
      Object.fromEntries(FAIXAS.map((f) => [f.id, filtrar(clientes, f.id).length])) as Record<
        FaixaId,
        number
      >,
    [clientes, filtrar],
  );

  /* Prévia com quem está no topo da lista; sem lista, um exemplo plausível —
     ela precisa ver o resultado mesmo antes de ter cliente parada. */
  const previa = useMemo(() => {
    const c = porFaixa[0] ?? clientes[0];
    return {
      nome: c?.nome ?? "Ana Beatriz",
      dias: c?.diasParado ?? 62,
      produto: c?.produtoFrequente ?? "Tábua de frios pra 6",
      dataNome: proxima.nome,
      dataArtigo: proxima.artigo,
      dataDiasRestantes: proxima.diasRestantes,
    };
  }, [porFaixa, clientes, proxima]);

  async function salvarModelo() {
    setSalvando(true);
    try {
      await salvarModeloRelacionamento({ data: rascunho });
      setModelos(rascunho);
      setAjustesAberto(false);
      toast.success("Modelo salvo.");
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o modelo"));
    } finally {
      setSalvando(false);
    }
  }

  async function chamar(c: ClienteParado, tipo: "comData" | "semData") {
    const mensagem = aplicarModelo(modelos[tipo], {
      nome: c.nome,
      dias: c.diasParado,
      produto: c.produtoFrequente,
      dataNome: proxima.nome,
      dataArtigo: proxima.artigo,
      /* No modelo "sem ocasião" a data é forçada para longe: assim, se ela
         tiver deixado um {data} lá dentro, a linha cai fora em vez de citar o
         Natal numa mensagem que existe justamente para não citar. */
      dataDiasRestantes: tipo === "semData" ? Number.MAX_SAFE_INTEGER : proxima.diasRestantes,
    });

    const link = linkWhatsApp(c.whatsapp, mensagem);
    if (!link) {
      toast.error("Essa cliente não tem WhatsApp cadastrado.");
      return;
    }
    /* Abre ANTES de gravar: o navegador so trata a janela como pedida pela
       pessoa se ela nascer dentro do clique. Depois de um await, o bloqueador
       de pop-up engole a aba e a conversa nunca abre. */
    window.open(link, "_blank", "noopener,noreferrer");

    setChamadas((atual) => new Set(atual).add(c.id));
    try {
      await marcarContatado({ data: { id: c.id } });
    } catch (e) {
      setChamadas((atual) => {
        const novo = new Set(atual);
        novo.delete(c.id);
        return novo;
      });
      toast.error(mensagemDeErro(e, "marcar a cliente como chamada"));
    }
  }

  async function desfazer(c: ClienteParado) {
    setChamadas((atual) => {
      const novo = new Set(atual);
      novo.delete(c.id);
      return novo;
    });
    try {
      await desfazerContato({ data: { id: c.id } });
      toast.success(`${c.nome} volta para a lista.`);
    } catch (e) {
      setChamadas((atual) => new Set(atual).add(c.id));
      toast.error(mensagemDeErro(e, "desfazer"));
    }
  }

  return (
    <section className="min-w-0">
      <PageHeader
        titulo="Relacionamento"
        descricao="Quem comprou e parou de aparecer. A mensagem sai pronta — você lê, ajusta e manda."
        acoes={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              setRascunho(modelos);
              setConfirmandoPadrao(false);
              setAjustesAberto(true);
            }}
          >
            <Settings2 className="mr-1.5 h-4 w-4" />
            Modelo da mensagem
          </Button>
        }
      />

      {erro && (
        <p className="mt-3 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      {/* A data comemorativa entra na mensagem quando está perto. Mostrar aqui
          deixa claro de onde vem o "o Natal está chegando" do texto. */}
      {proxima.diasRestantes <= 45 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-[var(--cream)] px-3.5 py-2.5 text-sm text-[var(--admin-ink-soft)]">
          <HeartHandshake className="h-4 w-4 shrink-0 text-[var(--terracotta)]" />
          <span>
            <b className="text-[var(--wine)]">{proxima.nome}</b> em{" "}
            {proxima.diasRestantes === 0
              ? "hoje"
              : proxima.diasRestantes === 1
                ? "amanhã"
                : `${proxima.diasRestantes} dias`}{" "}
            — entra
            automaticamente na mensagem.
          </span>
        </p>
      )}

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FAIXAS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFaixa(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
              faixa === f.id
                ? "bg-[var(--terracotta)] text-white"
                : "bg-[var(--cream)] text-[var(--admin-ink-soft)] hover:bg-[var(--cream-deep)]",
            )}
          >
            {f.label}
            <span className="ml-1.5 tabular-nums opacity-70">{contagens[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {carregando ? (
        <Carregando texto="carregando os clientes…" />
      ) : porFaixa.length === 0 ? (
        <EstadoVazio
          titulo={faixa === "todos" ? "Nenhuma cliente com compra ainda" : "Ninguém nesta faixa"}
          descricao={
            faixa === "todos"
              ? "Assim que o primeiro pedido for entregue, a cliente aparece aqui e o histórico começa."
              : "Ninguém parada nesse intervalo. Quem tem pedido a caminho ou já foi chamada nos últimos 30 dias fica de fora — veja em Todos."
          }
        />
      ) : (
        <ul className="mt-3 space-y-2">
          {porFaixa.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[var(--admin-border)] bg-card px-4 py-3 shadow-[var(--shadow-soft)]"
            >
              <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                <p className="t-item truncate text-foreground">{c.nome}</p>
                <p className="t-support truncate text-muted-foreground">
                  {c.produtoFrequente
                    ? `Costuma levar ${c.produtoFrequente}`
                    : "Sem produto predominante"}
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-x-4 sm:contents">
                <div className="w-full text-right sm:w-28">
                  <p className="t-support text-muted-foreground">parada há</p>
                  <p className="t-body tabular-nums text-[var(--wine)]">
                    {tempoParado(c.diasParado)}
                  </p>
                </div>

                <div className="w-full text-right sm:w-24">
                  <p className="t-support text-muted-foreground">compras</p>
                  <p className="t-body tabular-nums text-foreground">{c.compras}</p>
                </div>

                <div className="w-full text-right sm:w-28">
                  <p className="t-support text-muted-foreground">já gastou</p>
                  <p className="t-body tabular-nums text-foreground">{moeda(c.totalGasto)}</p>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                <p className="t-support text-muted-foreground sm:hidden">
                  última em {formatarDataCurta(c.ultimaCompraEm)}
                </p>
                {c.temPedidoAberto ? (
                  <span className="t-support shrink-0 rounded-lg bg-[var(--cream)] px-2.5 py-1.5 text-[var(--bronze)]">
                    Pedido a caminho
                  </span>
                ) : chamadas.has(c.id) || c.chamadaHoje ? (
                  <span className="t-support flex shrink-0 items-center gap-2 text-[var(--green-ink)]">
                    <Check className="h-4 w-4" />
                    Chamada hoje
                    <button
                      type="button"
                      onClick={() => desfazer(c)}
                      className="font-semibold text-[var(--terracotta)] underline underline-offset-2"
                    >
                      desfazer
                    </button>
                  </span>
                ) : (
                  <div className="flex shrink-0 items-center gap-2">
                    {c.contatadoEm && (
                      <span className="t-support whitespace-nowrap text-muted-foreground">
                        chamada há {diasDesde(c.contatadoEm)}d
                      </span>
                    )}
                    {temDataPerto ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="h-10 shrink-0">
                            <MessageCircle className="mr-1.5 h-4 w-4" />
                            Chamar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuItem onClick={() => chamar(c, "comData")}>
                            Falando d{proxima.artigo === "a" ? "a" : "o"} {proxima.nome}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => chamar(c, "semData")}>
                            Sem ocasião, só reaproximar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button onClick={() => chamar(c, "semData")} className="h-10 shrink-0">
                        <MessageCircle className="mr-1.5 h-4 w-4" />
                        Chamar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={ajustesAberto} onOpenChange={setAjustesAberto}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="text-left">
            <DialogTitle>Modelo da mensagem</DialogTitle>
            <DialogDescription>
              Escreva do seu jeito. Os marcadores viram os dados de cada cliente na hora de
              chamar.
            </DialogDescription>
          </DialogHeader>

          <p className="t-support text-muted-foreground">
            Você escreve a frase inteira, então a concordância é sua: escolha “sua última” ou
            “seu último” conforme o que vende. Clique num marcador para inserir no fim do texto.
          </p>

          {(
            [
              {
                campo: "comData" as const,
                titulo: "Com ocasião",
                ajuda: "Usada quando você escolhe falar da data comemorativa. A linha com {data} some se não houver data por perto.",
              },
              {
                campo: "semData" as const,
                titulo: "Sem ocasião",
                ajuda: "Para reaproximar quem sumiu, sem gancho nenhum.",
              },
            ]
          ).map((m) => (
            <div key={m.campo} className="space-y-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{m.titulo}</p>
                <p className="t-support text-muted-foreground">{m.ajuda}</p>
              </div>

              <Textarea
                value={rascunho[m.campo]}
                onChange={(e) => setRascunho((v) => ({ ...v, [m.campo]: e.target.value }))}
                rows={4}
              />

              <div className="flex flex-wrap gap-1.5">
                {MARCADORES.filter((x) => m.campo === "comData" || x.chave !== "{data}").map(
                  (x) => (
                    <button
                      key={x.chave}
                      type="button"
                      onClick={() =>
                        setRascunho((v) => ({ ...v, [m.campo]: `${v[m.campo]}${x.chave}` }))
                      }
                      title={x.descricao}
                      className="rounded-lg bg-[var(--cream)] px-2.5 py-1.5 text-xs font-semibold text-[var(--wine)] transition-colors hover:bg-[var(--cream-deep)]"
                    >
                      {x.chave}
                    </button>
                  ),
                )}
              </div>

              {/* Prévia: editar marcador sem ver o resultado é escrever no escuro. */}
              <div className="rounded-xl bg-[var(--cream-soft)] p-3.5">
                <p className="t-support mb-1.5 text-muted-foreground">
                  Como sai para {previa.nome}:
                </p>
                <p className="whitespace-pre-line text-sm text-[var(--admin-ink)]">
                  {aplicarModelo(rascunho[m.campo], {
                    ...previa,
                    dataDiasRestantes:
                      m.campo === "semData" ? Number.MAX_SAFE_INTEGER : previa.dataDiasRestantes,
                  })}
                </p>
              </div>
            </div>
          ))}

          {confirmandoPadrao ? (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3.5 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-sm text-foreground">
                Os dois textos que você escreveu voltam ao original.{" "}
                <b>Não dá para recuperar depois.</b>
              </p>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" onClick={() => setConfirmandoPadrao(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setRascunho(MODELOS_PADRAO);
                    setConfirmandoPadrao(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Apagar e voltar
                </Button>
              </div>
            </div>
          ) : (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmandoPadrao(true)}
                disabled={salvando}
              >
                Voltar ao padrão
              </Button>
              <Button
                onClick={salvarModelo}
                disabled={salvando || !rascunho.comData.trim() || !rascunho.semData.trim()}
              >
                {salvando ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

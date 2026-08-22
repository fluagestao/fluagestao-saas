import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, User, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { carregarBia, enviarParaBia, limparConversaBia, salvarConfigBia } from "@/lib/bia";
import type { Conversa, MensagemSalva } from "@/lib/bia-ops.server";
import { PROMPT_PADRAO } from "@/lib/bia-prompt";
import { Carregando, EstadoVazio, PageHeader, useConfirmar } from "./shell";

type ConfigBia = { ativa: boolean; modelo: string; prompt: string; max_turnos: number };

const campoCls =
  "h-9 w-full rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground focus:border-[var(--terracotta)] focus:outline-none";

/**
 * Painel da BIA: um simulador pra conversar com ela como se fosse cliente, e os
 * ajustes de comportamento.
 *
 * O simulador escreve no mesmo banco que o WhatsApp vai usar — o que ela faz
 * aqui (montar pedido, chamar humano) acontece de verdade.
 */
export function BiaPanel({ vista }: { vista?: "simulador" | "ajustes" | "conversas" }) {
  const sub = vista ?? "simulador";
  const [configurada, setConfigurada] = useState<boolean | null>(null);
  const [config, setConfig] = useState<ConfigBia | null>(null);
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<MensagemSalva[]>([]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarBia();
      setConfigurada(d.configurada);
      setConfig(d.config as ConfigBia);
      setConversa(d.simulador.conversa as Conversa);
      setMensagens(d.simulador.mensagens as MensagemSalva[]);
      setConversas(d.conversas as Conversa[]);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar a BIA"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  if (erro) {
    return (
      <section>
        <PageHeader titulo="BIA" />
        <p className="rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">{erro}</p>
      </section>
    );
  }

  if (carregando || !config) {
    return (
      <section>
        <PageHeader titulo="BIA" />
        <Carregando />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        titulo={sub === "ajustes" ? "Ajustes da BIA" : sub === "conversas" ? "Conversas" : "BIA"}
        descricao={
          sub === "ajustes"
            ? "Como ela se comporta. O que você escrever aqui vale na próxima mensagem."
            : sub === "conversas"
              ? "Conversas reais do WhatsApp. Assumir uma silencia a BIA naquele contato."
              : "Converse como se fosse um cliente, do número de teste (48) 99999-0000. O que ela fizer aqui — montar pedido, chamar humano — acontece de verdade."
        }
        acoes={
          <Badge variant={configurada ? "secondary" : "outline"}>
            {configurada ? "chave configurada" : "sem ANTHROPIC_API_KEY"}
          </Badge>
        }
      />

      {!configurada && (
        <p className="mt-4 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-[var(--terracotta)]">
          Falta o secret <code>ANTHROPIC_API_KEY</code> no Lovable. Sem ele a BIA não responde.
        </p>
      )}

      {sub === "simulador" && conversa && (
        <Simulador
          conversa={conversa}
          mensagens={mensagens}
          onMensagens={setMensagens}
          onRecarregar={recarregar}
        />
      )}

      {sub === "ajustes" && <Ajustes config={config} onSalvo={recarregar} />}

      {sub === "conversas" && <ListaConversas conversas={conversas} />}
    </section>
  );
}

function Balao({ m }: { m: MensagemSalva }) {
  const daCasa = m.papel === "bia" || m.papel === "humano";
  if (m.papel === "sistema") {
    return <li className="my-2 text-center text-xs italic text-muted-foreground">{m.texto}</li>;
  }
  return (
    <li className={cn("flex gap-2", daCasa ? "flex-row" : "flex-row-reverse")}>
      <span
        className={cn(
          "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          daCasa ? "bg-[var(--terracotta)] text-[var(--cream-soft)]" : "bg-[var(--cream-deep)]",
        )}
      >
        {daCasa ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </span>
      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
          daCasa
            ? "rounded-tl-sm bg-card text-foreground shadow-[var(--shadow-soft)]"
            : "rounded-tr-sm bg-[var(--whatsapp)] text-white",
        )}
      >
        {m.texto}
      </div>
    </li>
  );
}

function Simulador({
  conversa,
  mensagens,
  onMensagens,
  onRecarregar,
}: {
  conversa: Conversa;
  mensagens: MensagemSalva[];
  onMensagens: (m: MensagemSalva[]) => void;
  onRecarregar: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [ultimasFerramentas, setUltimasFerramentas] = useState<
    { nome: string; args: string; resultado: string }[]
  >([]);
  const fim = useRef<HTMLDivElement>(null);
  const confirmar = useConfirmar();

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length, pensando]);

  async function enviar() {
    const t = texto.trim();
    if (!t || pensando) return;
    setTexto("");
    setPensando(true);
    // Otimista: o balão do cliente aparece antes da BIA pensar.
    const provisoria: MensagemSalva = {
      id: `tmp-${Date.now()}`,
      conversa_id: conversa.id,
      papel: "cliente",
      texto: t,
      created_at: new Date().toISOString(),
    };
    onMensagens([...mensagens, provisoria]);
    try {
      const r = await enviarParaBia({ data: { conversa_id: conversa.id, texto: t } });
      setUltimasFerramentas(r.ferramentas ?? []);
      // Mostra as mensagens pingando uma a uma, como o cliente vai receber —
      // ver tudo de uma vez esconderia justamente o que a quebra resolve.
      if (r.partes?.length) {
        const base = [...mensagens, provisoria];
        for (let i = 0; i < r.partes.length; i++) {
          if (i > 0) await new Promise((ok) => setTimeout(ok, 700));
          base.push({
            id: `tmp-bia-${Date.now()}-${i}`,
            conversa_id: conversa.id,
            papel: "bia",
            texto: r.partes[i],
            created_at: new Date().toISOString(),
          });
          onMensagens([...base]);
        }
      }
      if (r.silenciada) {
        toast.message("Conversa está em atendimento humano — a BIA ficou calada.");
      }
      if (r.chamouHumano) {
        toast.warning(`A BIA chamou a equipe: ${r.chamouHumano}`, { duration: 8000 });
      }
      onRecarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "falar com a BIA"), { duration: 10000 });
      onRecarregar();
    }
    setPensando(false);
  }

  async function limpar() {
    const ok = await confirmar({
      titulo: "Recomeçar a conversa de teste?",
      descricao: "Apaga as mensagens do simulador. Pedidos que a BIA já registrou continuam lá.",
      confirmar: "Recomeçar",
      destrutivo: true,
    });
    if (!ok) return;
    await limparConversaBia({ data: { id: conversa.id } });
    setUltimasFerramentas([]);
    onRecarregar();
  }

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="flex min-h-[26rem] flex-col rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-3">
        {mensagens.length === 0 ? (
          <EstadoVazio
            titulo="Comece a conversa"
            descricao='Escreva como um cliente escreveria: "oi, vocês fazem cesta de café da manhã?"'
          />
        ) : (
          <ul className="flex-1 space-y-3 overflow-y-auto pr-1">
            {mensagens.map((m) => (
              <Balao key={m.id} m={m} />
            ))}
          </ul>
        )}

        {pensando && (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />a BIA está escrevendo…
          </p>
        )}
        <div ref={fim} />

        <div className="mt-3 flex items-end gap-2 border-t border-[var(--cream-deep)] pt-3">
          <Textarea
            rows={2}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra linha, como no WhatsApp.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Escreva como cliente…"
            className="min-h-[2.75rem] flex-1 resize-none bg-background"
          />
          <Button onClick={enviar} disabled={pensando || !texto.trim()}>
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={limpar} title="Recomeçar">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* O que ela consultou — é aqui que se vê se ela inventou ou foi no banco. */}
      <aside className="rounded-2xl border border-[var(--cream-deep)] bg-card p-3">
        <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[var(--bronze)]">
          <Wrench className="h-3.5 w-3.5" />
          Última resposta
        </h3>
        {ultimasFerramentas.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Ela responde daqui do banco: catálogo, frete por bairro e registro de pedido. O que usar
            em cada resposta aparece nesta coluna.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {ultimasFerramentas.map((f, i) => (
              <li key={i} className="rounded-lg bg-[var(--cream-soft)] p-2">
                <p className="text-xs font-medium text-foreground">{f.nome}</p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-tight text-muted-foreground">
                  {f.args}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function Ajustes({ config, onSalvo }: { config: ConfigBia; onSalvo: () => void }) {
  const [ativa, setAtiva] = useState(config.ativa);
  const [modelo, setModelo] = useState(config.modelo);
  const [maxTurnos, setMaxTurnos] = useState(String(config.max_turnos));
  const [prompt, setPrompt] = useState(config.prompt);
  const [salvando, setSalvando] = useState(false);

  const usandoPadrao = prompt.trim() === PROMPT_PADRAO.trim();

  async function salvar() {
    setSalvando(true);
    try {
      await salvarConfigBia({
        data: {
          ativa,
          modelo: modelo.trim(),
          // Igual ao padrão volta a ser null: assim a BIA acompanha as melhorias
          // que vierem no código em vez de congelar uma cópia.
          prompt: usandoPadrao ? null : prompt,
          max_turnos: Number(maxTurnos) || 30,
        },
      });
      toast.success("Ajustes salvos.");
      onSalvo();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar os ajustes"));
    }
    setSalvando(false);
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
          Responder no WhatsApp
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Modelo</span>
          <select className={campoCls} value={modelo} onChange={(e) => setModelo(e.target.value)}>
            <option value="claude-sonnet-5">Sonnet 5 — equilíbrio</option>
            <option value="claude-opus-5">Opus 5 — mais caro, mais fino</option>
            <option value="claude-haiku-4-5-20251001">Haiku 4.5 — mais barato</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Máx. de mensagens por conversa
          </span>
          <Input
            className="h-9 w-24"
            inputMode="numeric"
            value={maxTurnos}
            onChange={(e) => setMaxTurnos(e.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Enquanto “Responder no WhatsApp” está desligado, ela só funciona aqui no simulador.
        </p>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Instruções da BIA {usandoPadrao && "(padrão do sistema)"}
          </span>
          {!usandoPadrao && (
            <button
              type="button"
              onClick={() => setPrompt(PROMPT_PADRAO)}
              className="text-xs font-medium text-[var(--terracotta)] underline underline-offset-2"
            >
              voltar ao padrão
            </button>
          )}
        </div>
        <Textarea
          rows={22}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="font-mono text-xs"
        />
      </div>

      <Button onClick={salvar} disabled={salvando}>
        {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar ajustes
      </Button>
    </div>
  );
}

function ListaConversas({ conversas }: { conversas: Conversa[] }) {
  if (conversas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhuma conversa ainda"
        descricao="Quando o WhatsApp estiver ligado, as conversas reais aparecem aqui."
      />
    );
  }
  return (
    <ul className="mt-4 space-y-2">
      {conversas.map((c) => (
        <li
          key={c.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--cream-deep)] bg-card px-3 py-2.5"
        >
          <span className="font-medium text-foreground">{c.nome ?? c.wa_id ?? "Sem nome"}</span>
          {c.atendimento_humano && <Badge variant="destructive">com a equipe</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(c.ultima_em).toLocaleString("pt-BR")}
          </span>
        </li>
      ))}
    </ul>
  );
}

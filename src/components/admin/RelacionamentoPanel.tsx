"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartHandshake, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { proximaDataComemorativa } from "@/lib/datas-comemorativas";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataCurta } from "@/lib/prazo";
import { carregarRelacionamento, type ClienteParado } from "@/lib/relacionamento";
import { linkWhatsApp, montarMensagem, tempoParado } from "@/lib/relacionamento-mensagem";
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
  { id: "30", label: "30 a 60 dias", de: 30, ate: 60 },
  { id: "60", label: "60 a 120 dias", de: 60, ate: 120 },
  { id: "120", label: "Mais de 120 dias", de: 120, ate: Infinity },
] as const;

type FaixaId = (typeof FAIXAS)[number]["id"];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RelacionamentoPanel() {
  const [clientes, setClientes] = useState<ClienteParado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [faixa, setFaixa] = useState<FaixaId>("30");

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

  // Calculada uma vez: é a mesma para todas as linhas da tela.
  const proxima = useMemo(() => proximaDataComemorativa(), []);

  const porFaixa = useMemo(() => {
    const f = FAIXAS.find((x) => x.id === faixa)!;
    return clientes.filter((c) => c.diasParado >= f.de && c.diasParado < f.ate);
  }, [clientes, faixa]);

  const contagens = useMemo(
    () =>
      Object.fromEntries(
        FAIXAS.map((f) => [
          f.id,
          clientes.filter((c) => c.diasParado >= f.de && c.diasParado < f.ate).length,
        ]),
      ) as Record<FaixaId, number>,
    [clientes],
  );

  function chamar(c: ClienteParado) {
    const mensagem = montarMensagem({
      nome: c.nome,
      dias: c.diasParado,
      produto: c.produtoFrequente,
      dataNome: proxima.nome,
      dataDiasRestantes: proxima.diasRestantes,
    });

    const link = linkWhatsApp(c.whatsapp, mensagem);
    if (!link) {
      toast.error("Essa cliente não tem WhatsApp cadastrado.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="min-w-0">
      <PageHeader
        titulo="Relacionamento"
        descricao="Quem comprou e parou de aparecer. A mensagem sai pronta — você lê, ajusta e manda."
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
            {proxima.diasRestantes === 0 ? "hoje" : `${proxima.diasRestantes} dias`} — entra
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
          titulo="Ninguém nesta faixa"
          descricao="Nenhuma cliente parada nesse intervalo. Quem tem pedido a caminho não entra aqui."
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
                <Button onClick={() => chamar(c)} className="h-10 shrink-0">
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Chamar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gift, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ocasiaoPorSlug, ocasioesDisponiveis } from "@/lib/datas-comemorativas";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataCurta } from "@/lib/prazo";
import { anosComOcasiao, carregarPorOcasiao, type CompraNaOcasiao } from "@/lib/relacionamento";
import { aplicarModelo, linkWhatsApp, type ModelosRelacionamento } from "@/lib/relacionamento-mensagem";
import { cn } from "@/lib/utils";

import { Carregando, EstadoVazio } from "./shell";

/**
 * Quem comprou numa ocasião, num ano.
 *
 * É a pergunta que a coluna `pedidos.ocasiao` existe para responder: quem
 * mandou cesta no Dia das Mães do ano passado, para oferecer a deste ano.
 *
 * Separado do painel principal porque é outra pergunta: lá a lista é de
 * PESSOAS paradas; aqui é de COMPRAS feitas. A mesma cliente aparece duas vezes
 * se mandou dois presentes, e isso é correto — são dois presentes a repetir.
 */

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RelacionamentoOcasiao({ modelos }: { modelos: ModelosRelacionamento }) {
  const [ocasiao, setOcasiao] = useState<string>("");
  const [ano, setAno] = useState<number | null>(null);
  const [anos, setAnos] = useState<number[]>([]);
  const [compras, setCompras] = useState<CompraNaOcasiao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const opcoes = useMemo(() => ocasioesDisponiveis(), []);
  const alvo = useMemo(() => ocasiaoPorSlug(ocasiao), [ocasiao]);

  useEffect(() => {
    anosComOcasiao()
      .then((r) => {
        setAnos(r.anos);
        // O ano mais recente com dado: quase sempre é o que ela quer ver.
        setAno((atual) => atual ?? r.anos[0] ?? null);
      })
      .catch(() => setAnos([]));
  }, []);

  const buscar = useCallback(async () => {
    if (!ocasiao || ano == null) {
      setCompras([]);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const r = await carregarPorOcasiao({ data: { ocasiao, ano } });
      setCompras(r.compras);
    } catch (e) {
      setErro(mensagemDeErro(e, "buscar as compras"));
    }
    setCarregando(false);
  }, [ocasiao, ano]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  function chamar(c: CompraNaOcasiao) {
    const mensagem = aplicarModelo(modelos.repetir, {
      nome: c.nome,
      dias: 0,
      // "compra" e o fallback geral de {produto}, mas aqui a frase e "você
      // mandou X para Y": "mandou compra" nao se diz.
      produto: c.produto ?? "um presente",
      dataNome: alvo?.label ?? "essa data",
      // O "n{data}" do modelo padrão vira "no Natal" e "na Páscoa".
      dataArtigo: alvo?.artigo ?? "o",
      // Sempre perto: aqui a data é o assunto, não uma coincidência de calendário.
      dataDiasRestantes: 0,
      destinatario: c.destinatario,
      ano: Number(c.data.slice(0, 4)) || null,
    });

    const link = linkWhatsApp(c.whatsapp, mensagem);
    if (!link) {
      toast.error("Essa cliente não tem WhatsApp cadastrado.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  const palpites = compras.filter((c) => !c.confirmada).length;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 space-y-1.5 text-sm font-medium sm:max-w-xs">
          <span className="block">Ocasião</span>
          <select
            value={ocasiao}
            onChange={(e) => setOcasiao(e.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm"
          >
            <option value="">Escolha uma ocasião…</option>
            {opcoes.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          <span className="block">Ano</span>
          <select
            value={ano ?? ""}
            onChange={(e) => setAno(Number(e.target.value) || null)}
            disabled={anos.length === 0}
            className="h-11 rounded-xl border border-[var(--admin-border)] bg-white px-3 text-sm disabled:opacity-50"
          >
            {anos.length === 0 && <option value="">—</option>}
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && (
        <p className="rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">{erro}</p>
      )}

      {/* Palpite marcado como palpite. Esconder seria pior: ela veria a lista
          curta sem saber que existe mais coisa não confirmada. */}
      {palpites > 0 && (
        <p className="t-support rounded-xl bg-[var(--cream)] px-3.5 py-2.5 text-[var(--admin-ink-soft)]">
          {palpites} {palpites === 1 ? "pedido foi marcado" : "pedidos foram marcados"} pelo
          sistema a partir da data de entrega, sem ninguém confirmar. Vale conferir antes de
          mandar.
        </p>
      )}

      {!ocasiao ? (
        <EstadoVazio
          titulo="Escolha uma ocasião"
          descricao="Veja quem comprou no Dia das Mães, no Natal ou em qualquer outra data — e ofereça de novo."
        />
      ) : carregando ? (
        <Carregando texto="buscando as compras…" />
      ) : compras.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma compra nessa ocasião"
          descricao="Ninguém comprou com essa ocasião marcada nesse ano. A ocasião é preenchida no pedido."
        />
      ) : (
        <ul className="space-y-2">
          {compras.map((c, i) => (
            <li
              key={`${c.clienteId}-${c.data}-${i}`}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border bg-card px-4 py-3 shadow-[var(--shadow-soft)]",
                c.confirmada ? "border-[var(--admin-border)]" : "border-[var(--cream-deep)]",
              )}
            >
              <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                <p className="t-item truncate text-foreground">{c.nome}</p>
                <p className="t-support truncate text-muted-foreground">
                  {c.produto ?? "pedido"}
                  {c.destinatario ? ` para ${c.destinatario}` : ""}
                  {!c.confirmada && " · marcado pelo sistema"}
                </p>
              </div>

              <div className="grid w-full grid-cols-2 gap-x-4 sm:contents">
                <div className="w-full text-right sm:w-28">
                  <p className="t-support text-muted-foreground">entregue</p>
                  <p className="t-body tabular-nums text-foreground">
                    {formatarDataCurta(c.data)}
                  </p>
                </div>
                <div className="w-full text-right sm:w-28">
                  <p className="t-support text-muted-foreground">valor</p>
                  <p className="t-body tabular-nums text-foreground">{moeda(c.total)}</p>
                </div>
              </div>

              <Button onClick={() => chamar(c)} className="h-10 shrink-0">
                <Gift className="mr-1.5 h-4 w-4" />
                Oferecer de novo
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="t-support text-muted-foreground">
        <MessageCircle className="mr-1 inline h-3.5 w-3.5" />
        O texto sai do modelo “Repetir o presente”, em Modelo da mensagem.
      </p>
    </div>
  );
}

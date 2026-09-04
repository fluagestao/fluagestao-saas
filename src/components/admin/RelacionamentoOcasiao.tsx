"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gift, MessageCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ocasiaoPorSlug, ocasioesDisponiveis } from "@/lib/datas-comemorativas";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataCurta } from "@/lib/prazo";
import {
  anosComOcasiao,
  aplicarRetroativo,
  carregarPorOcasiao,
  desfazerRetroativo,
  previaRetroativo,
  type CompraNaOcasiao,
  type PreviaRetroativo,
} from "@/lib/relacionamento";
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
  const [previa, setPrevia] = useState<PreviaRetroativo | null>(null);
  const [ocupado, setOcupado] = useState(false);

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

  async function verPrevia() {
    setOcupado(true);
    try {
      setPrevia(await previaRetroativo());
    } catch (e) {
      toast.error(mensagemDeErro(e, "conferir o histórico"));
    } finally {
      setOcupado(false);
    }
  }

  async function desfazer() {
    setOcupado(true);
    try {
      const r = await desfazerRetroativo();
      toast.success(
        r.limpos === 0
          ? "Não havia nada marcado pelo sistema."
          : `${r.limpos} marcação(ões) desfeita(s). O que você marcou à mão ficou.`,
      );
      await buscar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "desfazer as marcações"));
    } finally {
      setOcupado(false);
    }
  }

  async function aplicar() {
    setOcupado(true);
    try {
      const r = await aplicarRetroativo();
      toast.success(
        r.marcados === 1 ? "1 pedido marcado." : `${r.marcados} pedidos marcados.`,
      );
      setPrevia(null);
      // Anos e lista mudam junto: agora existe histórico com ocasião.
      const anosNovos = await anosComOcasiao();
      setAnos(anosNovos.anos);
      setAno((atual) => atual ?? anosNovos.anos[0] ?? null);
      await buscar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "marcar o histórico"));
    } finally {
      setOcupado(false);
    }
  }

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
          mandar — ou desfazer no botão abaixo, que só apaga os palpites.
        </p>
      )}

      {/* Preenchimento retroativo: sem ele a aba só serve daqui a um ano.
          Mostra o que vai fazer ANTES de gravar — palpite escrito em silêncio
          no histórico dela é o tipo de botão que ninguém aperta duas vezes. */}
      {previa ? (
        <div className="space-y-3 rounded-2xl border border-[var(--admin-border)] bg-card p-4">
          {previa.total === 0 ? (
            <p className="text-sm text-foreground">
              Nenhuma entrega do histórico cai perto de uma data comemorativa. Não há o que
              marcar.
            </p>
          ) : (
            <>
              <p className="text-sm text-foreground">
                Vou marcar <b>{previa.total}</b>{" "}
                {previa.total === 1 ? "pedido" : "pedidos"} pela data de entrega, como
                sugestão — nada do que você já marcou à mão é tocado.
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {previa.porOcasiao.map((o) => (
                  <li
                    key={o.slug}
                    className="rounded-lg bg-[var(--cream)] px-2.5 py-1.5 text-xs font-semibold text-[var(--wine)]"
                  >
                    {o.label} <span className="tabular-nums opacity-70">{o.quantidade}</span>
                  </li>
                ))}
              </ul>
              {previa.semPalpite > 0 && (
                <p className="t-support text-muted-foreground">
                  Outr{previa.semPalpite === 1 ? "o" : "os"} {previa.semPalpite}{" "}
                  {previa.semPalpite === 1 ? "pedido não cai" : "pedidos não caem"} perto de
                  nenhuma data e {previa.semPalpite === 1 ? "fica" : "ficam"} sem ocasião.
                </p>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPrevia(null)} disabled={ocupado}>
              Cancelar
            </Button>
            {previa.total > 0 && (
              <Button onClick={aplicar} disabled={ocupado}>
                {ocupado ? "Marcando…" : "Marcar histórico"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={verPrevia} disabled={ocupado} className="h-10">
          <Wand2 className="mr-1.5 h-4 w-4" />
          {ocupado ? "Conferindo…" : "Ver o que dá para marcar pela data de entrega"}
        </Button>
      )}

      {/* Desfazer sempre visível quando há palpite na tela: quem clicou sem
          querer precisa achar a volta sem procurar. */}
      {palpites > 0 && !previa && (
        <Button variant="outline" onClick={desfazer} disabled={ocupado} className="h-10">
          {ocupado ? "Desfazendo…" : "Desfazer as marcações do sistema"}
        </Button>
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

"use client";

import {
  BadgeDollarSign,
  ChevronDown,
  ChevronUp,
  Download,
  Pencil,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { AcoesPedido } from "@/components/admin/PedidoCard";
import { diaMes } from "@/lib/prazo";
import { formatBRL, type Pedido } from "@/lib/vendas";

function itensResumo(p: Pedido) {
  return p.itens.map((i) => `${i.qtd}x ${i.nome}`).join(" · ");
}

/** Campo de CSV: aspas dobradas e o campo inteiro entre aspas. */
function celula(valor: string) {
  return `"${valor.replace(/"/g, '""')}"`;
}

/**
 * Valor com vírgula decimal e sem símbolo: é assim que o Excel em português
 * reconhece o número. Com "R$" ele importa como texto e não soma.
 */
function valorCsv(n: number) {
  return n.toFixed(2).replace(".", ",");
}

/** Recebe a lista já filtrada e ordenada: o arquivo sai igual ao que está na tela. */
function baixarCsv(pedidos: Pedido[]) {
  const linhas = [
    [
      "Pedido",
      "Cliente",
      "Itens",
      "Entregue em",
      "Pago em",
      "Forma",
      "Valor",
      "WhatsApp",
      "Tipo",
      "CEP",
      "Endereço",
      "Bairro",
      "Ponto de referência",
      "Presenteado",
      "WhatsApp do presenteado",
    ],
    ...pedidos.map((p) => [
      String(p.numero),
      p.cliente_nome ?? "",
      itensResumo(p),
      diaMes(p.entregue_em),
      diaMes(p.recebido_em),
      p.recebido_em ? (p.forma_pagamento ?? "") : "a receber",
      valorCsv(p.total),
      p.cliente_whatsapp ?? "",
      p.tipo === "retirada" ? "Retirada" : "Entrega",
      p.cep ?? "",
      p.endereco ?? "",
      p.bairro ?? "",
      p.referencia ?? "",
      p.destinatario_nome ?? "",
      p.destinatario_whatsapp ?? "",
    ]),
  ];

  const csv = linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  // BOM na frente: sem ele o Excel abre "Joao" no lugar de "João".
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vendas-realizadas.csv";
  // O link precisa estar no documento e o revoke precisa esperar um tique:
  // âncora solta ou URL revogada na hora cancelam o download em alguns
  // navegadores, o Safari entre eles.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Coluna = "numero" | "cliente" | "entregue" | "pago" | "forma" | "valor";
type Ordem = { coluna: Coluna; desc: boolean } | null;

function tempo(iso: string | null | undefined) {
  return iso ? new Date(iso).getTime() : 0;
}

function ordenar(pedidos: Pedido[], ordem: Ordem): Pedido[] {
  // Sem ordem escolhida fica a do servidor (entrega mais recente primeiro),
  // que é o estado em que a tela sempre reabre.
  if (!ordem) return pedidos;

  const sinal = ordem.desc ? -1 : 1;
  const texto = (v: string | null | undefined) => (v ?? "").trim();

  return [...pedidos].sort((a, b) => {
    switch (ordem.coluna) {
      case "numero":
        return (a.numero - b.numero) * sinal;
      case "cliente":
        return texto(a.cliente_nome).localeCompare(texto(b.cliente_nome), "pt-BR") * sinal;
      case "valor":
        return (a.total - b.total) * sinal;
      case "entregue":
        return (tempo(a.entregue_em) - tempo(b.entregue_em)) * sinal;
      default: {
        // "Pago em" e "Forma" seguem a mesma regra: o que está em aberto não
        // tem valor, então vai para o fim nos dois sentidos. Tratar como o
        // menor faria a linha a receber subir ao topo ao inverter a ordem —
        // justamente onde ela atrapalha quem está conferindo o caixa.
        const va = ordem.coluna === "pago" ? texto(a.recebido_em) : texto(a.forma_pagamento);
        const vb = ordem.coluna === "pago" ? texto(b.recebido_em) : texto(b.forma_pagamento);
        if (!va && !vb) return 0;
        if (!va) return 1;
        if (!vb) return -1;
        return va.localeCompare(vb, "pt-BR") * sinal;
      }
    }
  });
}

function Cabecalho({
  coluna,
  rotulo,
  largura,
  direita = false,
  ordem,
  onOrdenar,
}: {
  coluna: Coluna;
  rotulo: string;
  largura?: string;
  direita?: boolean;
  ordem: Ordem;
  onOrdenar: (coluna: Coluna) => void;
}) {
  const ativa = ordem?.coluna === coluna;

  return (
    <th
      className={`t-support ${largura ?? ""} px-3 py-2.5 text-[var(--admin-muted)] ${
        direita ? "text-right" : "text-left"
      }`}
      aria-sort={ativa ? (ordem.desc ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        onClick={() => onOrdenar(coluna)}
        title={`Ordenar por ${rotulo.toLowerCase()}`}
        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
          ativa ? "text-foreground" : ""
        }`}
      >
        {rotulo}
        {ativa ? (
          ordem.desc ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronUp className="h-3 w-3 shrink-0" />
          )
        ) : null}
      </button>
    </th>
  );
}

/**
 * Vendas realizadas em formato de planilha.
 *
 * A tela existe para conferência de caixa: as duas datas ganham coluna própria
 * para dar pra descer o olho por uma coluna só e bater com o extrato, em vez de
 * abrir pedido por pedido. Some no celular — sete colunas não cabem — e lá a
 * lista continua em cards.
 *
 * A ordenação vive aqui, no componente: assim ela se desfaz sozinha quando se
 * sai e volta, e a tela sempre reabre na ordem do servidor.
 */
export function TabelaRealizadas({
  pedidos,
  acoes,
}: {
  pedidos: Pedido[];
  acoes: AcoesPedido;
}) {
  const [ordem, setOrdem] = useState<Ordem>(null);
  const visiveis = useMemo(() => ordenar(pedidos, ordem), [pedidos, ordem]);

  const total = visiveis.reduce((t, p) => t + p.total, 0);
  const recebido = visiveis.reduce((t, p) => t + (p.recebido_em ? p.total : 0), 0);

  function alternarOrdem(coluna: Coluna) {
    setOrdem((atual) =>
      atual?.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false },
    );
  }

  return (
    <div className="hidden md:block">
      <div className="mb-3 flex items-center justify-end gap-3">
        {ordem && (
          <button
            type="button"
            onClick={() => setOrdem(null)}
            className="t-support text-[var(--admin-muted)] transition-colors hover:text-foreground"
          >
            Voltar à ordem padrão
          </button>
        )}
        <button
          type="button"
          onClick={() => baixarCsv(visiveis)}
          disabled={visiveis.length === 0}
          className="t-support inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-card px-3 text-foreground transition-colors hover:bg-[var(--cream-soft)] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-card shadow-[var(--shadow-card)]">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="bg-[var(--cream-soft)]">
              <Cabecalho coluna="numero" rotulo="#" largura="w-14" ordem={ordem} onOrdenar={alternarOrdem} />
              <Cabecalho coluna="cliente" rotulo="Cliente" ordem={ordem} onOrdenar={alternarOrdem} />
              <Cabecalho coluna="entregue" rotulo="Entregue" largura="w-24" ordem={ordem} onOrdenar={alternarOrdem} />
              <Cabecalho coluna="pago" rotulo="Pago em" largura="w-28" ordem={ordem} onOrdenar={alternarOrdem} />
              <Cabecalho coluna="forma" rotulo="Forma" largura="w-24" ordem={ordem} onOrdenar={alternarOrdem} />
              <Cabecalho coluna="valor" rotulo="Valor" largura="w-32" direita ordem={ordem} onOrdenar={alternarOrdem} />
              <th className="t-support w-48 px-3 py-2.5 text-right text-[var(--admin-muted)]">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {visiveis.map((p) => (
              <tr key={p.id} className="border-t border-[var(--admin-border)]">
                <td className="t-body px-3 py-2.5 text-[var(--admin-muted)]">{p.numero}</td>
                <td className="px-3 py-2.5">
                  <p className="t-item truncate text-foreground">{p.cliente_nome || "Sem nome"}</p>
                  <p className="t-support truncate text-[var(--admin-muted)]">{itensResumo(p)}</p>
                </td>
                <td className="t-body px-3 py-2.5 tabular-nums">{diaMes(p.entregue_em) || "—"}</td>
                <td className="px-3 py-2.5">
                  {p.recebido_em ? (
                    <span className="t-body tabular-nums">{diaMes(p.recebido_em)}</span>
                  ) : (
                    // Entregue sem pagar: a tela filtra por entrega, não por
                    // pagamento, então esta linha existe — e é a que interessa
                    // achar na hora de conferir o caixa.
                    <span className="t-support inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                      a receber
                    </span>
                  )}
                </td>
                <td className="t-body truncate px-3 py-2.5 text-[var(--admin-muted)]">
                  {p.recebido_em ? p.forma_pagamento || "—" : "—"}
                </td>
                <td className="t-item whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-foreground">
                  {formatBRL(p.total)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Abrir o pedido completo"
                      onClick={() => acoes.editar(p)}
                      className="t-support inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--admin-border)] px-2 text-foreground transition-colors hover:bg-[var(--cream-soft)]"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                      Abrir
                    </button>
                    {acoes.receber && (
                      <button
                        type="button"
                        title={
                          p.recebido_em
                            ? "Desfazer o recebimento: o pedido volta para a receber"
                            : "Registrar o recebimento deste pedido"
                        }
                        onClick={() => acoes.receber!(p)}
                        className="t-support inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--admin-border)] px-2 text-foreground transition-colors hover:bg-[var(--cream-soft)]"
                      >
                        {p.recebido_em ? (
                          <>
                            <Undo2 className="h-3.5 w-3.5 shrink-0" />
                            Desfazer
                          </>
                        ) : (
                          <>
                            <BadgeDollarSign className="h-3.5 w-3.5 shrink-0" />
                            Recebi
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            <tr className="border-t border-[var(--cream-deep)] bg-[var(--cream-soft)]">
              <td colSpan={2} className="t-support px-3 py-3 text-[var(--admin-muted)]">
                {visiveis.length} venda(s)
              </td>
              <td colSpan={3} className="t-support px-3 py-3 text-[var(--admin-muted)]">
                recebido {formatBRL(recebido)}
                {recebido !== total && (
                  <span className="text-destructive"> · falta {formatBRL(total - recebido)}</span>
                )}
              </td>
              <td className="t-item whitespace-nowrap px-3 py-3 text-right tabular-nums text-foreground">
                {formatBRL(total)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

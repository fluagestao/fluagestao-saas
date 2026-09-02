"use client";

import { BadgeDollarSign, Download, Pencil, Undo2 } from "lucide-react";

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

/**
 * Vendas realizadas em formato de planilha.
 *
 * A tela existe para conferência de caixa: as duas datas ganham coluna própria
 * para dar pra descer o olho por uma coluna só e bater com o extrato, em vez de
 * abrir pedido por pedido. Some no celular — seis colunas não cabem — e lá a
 * lista continua em cards.
 */
export function TabelaRealizadas({
  pedidos,
  acoes,
}: {
  pedidos: Pedido[];
  acoes: AcoesPedido;
}) {
  const total = pedidos.reduce((t, p) => t + p.total, 0);
  const recebido = pedidos.reduce((t, p) => t + (p.recebido_em ? p.total : 0), 0);

  return (
    <div className="hidden md:block">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => baixarCsv(pedidos)}
          disabled={pedidos.length === 0}
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
              <th className="t-support w-14 px-3 py-2.5 text-left text-[var(--admin-muted)]">#</th>
              <th className="t-support px-3 py-2.5 text-left text-[var(--admin-muted)]">Cliente</th>
              <th className="t-support w-24 px-2 py-2.5 text-left text-[var(--admin-muted)]">
                Entregue
              </th>
              <th className="t-support w-28 px-2 py-2.5 text-left text-[var(--admin-muted)]">
                Pago em
              </th>
              <th className="t-support w-24 px-2 py-2.5 text-left text-[var(--admin-muted)]">
                Forma
              </th>
              <th className="t-support w-28 px-3 py-2.5 text-right text-[var(--admin-muted)]">
                Valor
              </th>
              <th className="t-support w-36 px-3 py-2.5 text-right text-[var(--admin-muted)]">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} className="border-t border-[var(--admin-border)]">
                <td className="t-body px-3 py-2.5 text-[var(--admin-muted)]">{p.numero}</td>
                <td className="px-3 py-2.5">
                  <p className="t-item truncate text-foreground">
                    {p.cliente_nome || "Sem nome"}
                  </p>
                  <p className="t-support truncate text-[var(--admin-muted)]">{itensResumo(p)}</p>
                </td>
                <td className="t-body px-2 py-2.5 tabular-nums">{diaMes(p.entregue_em) || "—"}</td>
                <td className="px-2 py-2.5">
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
                <td className="t-body truncate px-2 py-2.5 text-[var(--admin-muted)]">
                  {p.recebido_em ? p.forma_pagamento || "—" : "—"}
                </td>
                <td className="t-item px-3 py-2.5 text-right tabular-nums text-foreground">
                  {formatBRL(p.total)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      title="Abrir o pedido completo"
                      onClick={() => acoes.editar(p)}
                      className="t-support inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-2.5 text-foreground transition-colors hover:bg-[var(--cream-soft)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
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
                        className="t-support inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-2.5 text-foreground transition-colors hover:bg-[var(--cream-soft)]"
                      >
                        {p.recebido_em ? (
                          <>
                            <Undo2 className="h-3.5 w-3.5" />
                            Desfazer
                          </>
                        ) : (
                          <>
                            <BadgeDollarSign className="h-3.5 w-3.5" />
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
                {pedidos.length} venda(s)
              </td>
              <td colSpan={3} className="t-support px-2 py-3 text-[var(--admin-muted)]">
                recebido {formatBRL(recebido)}
                {recebido !== total && (
                  <span className="text-destructive"> · falta {formatBRL(total - recebido)}</span>
                )}
              </td>
              <td className="t-item px-3 py-3 text-right tabular-nums text-foreground">
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

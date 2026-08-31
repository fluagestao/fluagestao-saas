"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { carregarPedidos } from "@/lib/pedidos";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Estado = "novo" | "pausado" | "concluido";
type Guia = { ativo: boolean; iniciar: () => void; pausar: () => void; concluir: () => void; ajuda: () => void; estado: Estado };
const Contexto = createContext<Guia | null>(null);
export const usePrimeiroPedidoGuia = () => useContext(Contexto);

/** Guarda somente o estado do guia, nunca o conteúdo do pedido. */
export function PrimeiroPedidoProvider({ children, escopo, onIniciar, abrirAutomaticamente = true }: {
  children: ReactNode; escopo: string; onIniciar: () => void; abrirAutomaticamente?: boolean;
}) {
  const chave = `flua:primeiro-pedido:v1:${encodeURIComponent(escopo)}`;
  const [estado, setEstado] = useState<Estado>("novo");
  const [ativo, setAtivo] = useState(false);
  const [janela, setJanela] = useState<"boas-vindas" | "ajuda" | "sucesso" | null>(null);
  const interagiu = useRef(false);

  const guardar = useCallback((valor: Estado) => {
    setEstado(valor);
    try { localStorage.setItem(chave, valor); } catch { /* O guia funciona sem armazenamento. */ }
  }, [chave]);

  useEffect(() => {
    let cancelado = false;
    let salvo: string | null = null;
    try { salvo = localStorage.getItem(chave); } catch { /* Navegação privada. */ }
    if (salvo === "pausado" || salvo === "concluido") { setEstado(salvo); return; }
    if (!abrirAutomaticamente) return;
    // Consulta a empresa autenticada, sem depender dos filtros da tela de Vendas.
    carregarPedidos({ data: { status: "todos", limite: 1, offset: 0 } }).then((res) => {
      if (cancelado || interagiu.current) return;
      if (res.total === 0) setJanela("boas-vindas");
    }).catch(() => { /* Falha de consulta não bloqueia o painel nem dispara um guia indevido. */ });
    return () => { cancelado = true; };
  }, [chave, abrirAutomaticamente]);

  const pausar = useCallback(() => { interagiu.current = true; setAtivo(false); guardar("pausado"); }, [guardar]);
  const concluir = useCallback(() => {
    setAtivo(false); guardar("concluido"); setJanela("sucesso");
  }, [guardar]);
  const iniciar = () => {
    interagiu.current = true; guardar("pausado"); setJanela(null); setAtivo(true); onIniciar();
  };
  const ajuda = () => { interagiu.current = true; setJanela("ajuda"); };
  const fechar = () => {
    if (janela === "boas-vindas") guardar("pausado");
    interagiu.current = true; setJanela(null);
  };

  return <Contexto.Provider value={{ ativo, iniciar, pausar, concluir, ajuda, estado }}>
    {children}
    <Dialog open={janela !== null} onOpenChange={(aberta) => { if (!aberta) fechar(); }}>
      <DialogContent aria-describedby="guia-descricao">
        <DialogHeader>
          <DialogTitle>{janela === "sucesso" ? "Pedido registrado!" : janela === "ajuda" ? "Primeiros passos no Flua" : "Vamos registrar seu primeiro pedido?"}</DialogTitle>
          <DialogDescription id="guia-descricao">
            {janela === "sucesso" ? "Seu pedido foi salvo. Você pode acompanhar a produção e a entrega em Vendas." : "Aprenda usando: cliente, produto, entrega e conferência. Sem sair do pedido para fazer cadastros."}
          </DialogDescription>
        </DialogHeader>
        {janela !== "sucesso" && <>
          <ol className="space-y-2 text-sm"><li>1. Escolha ou cadastre o cliente.</li><li>2. Adicione um produto ou crie pelo cadastro rápido.</li><li>3. Confira entrega, pagamento e total.</li><li>4. Salve e acompanhe em Vendas.</li></ol>
          <p className="rounded-lg border p-3 text-sm">O pedido será real. Use uma venda do seu negócio. Você pode pausar as dicas a qualquer momento.</p>
        </>}
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>{janela === "sucesso" ? "Continuar" : "Agora não"}</Button>
          {janela !== "sucesso" && <Button onClick={iniciar}>{estado === "concluido" ? "Refazer guia" : estado === "pausado" ? "Continuar guia" : "Criar meu primeiro pedido"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </Contexto.Provider>;
}

export function BotaoAjudaPrimeiroPedido() {
  const guia = usePrimeiroPedidoGuia();
  return <button type="button" onClick={guia?.ajuda} title="Ajuda e guia do primeiro pedido" aria-label="Ajuda e guia do primeiro pedido" className="grid h-10 w-10 place-items-center rounded-xl text-[var(--admin-ink-soft)] hover:bg-[var(--cream)]"><CircleHelp className="h-[18px] w-[18px]" /></button>;
}

export function ContinuarPrimeiroPedido() {
  const guia = usePrimeiroPedidoGuia();
  if (!guia || guia.ativo || guia.estado !== "pausado") return null;
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--cream-deep)] bg-card p-3 text-sm"><span>Precisa de uma mão com seu pedido?</span><Button size="sm" variant="outline" onClick={guia.iniciar}>Continuar meu guia</Button></div>;
}

export function DicaPrimeiroPedido({ etapa, onRevisar }: { etapa: number; onRevisar: () => void }) {
  const guia = usePrimeiroPedidoGuia();
  if (!guia?.ativo) return null;
  const dicas = [
    ["Quem está comprando?", "Pesquise um cliente ou clique no + para cadastrá-lo aqui. Preencha o nome para continuar."],
    ["Adicione o que você vendeu", "Escolha no catálogo ou clique em Novo produto. Informe nome, categoria e preço; use o + da categoria se necessário. A ficha técnica pode ficar para depois."],
    ["Combine a entrega e o pagamento", "Preencha os dados que já foram combinados. Cartão e observação são opcionais. Não marque como pago se ainda não recebeu."],
    ["Confira antes de lançar", "Confira cliente, itens, quantidades e total. Clique em Lançar pedido para salvar de verdade. O guia só termina após o salvamento."],
  ];
  const dica = dicas[etapa - 1];
  return <aside aria-label="Guia do primeiro pedido" className="rounded-xl border border-[var(--terracotta)] bg-[var(--cream)] px-3 py-2 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><p aria-live="polite"><strong>{etapa}/4 · {dica[0]}</strong></p><button type="button" className="underline" onClick={guia.pausar}>Pausar dicas</button></div>
    <p className="mt-1 text-muted-foreground">{dica[1]}</p>
    {etapa === 3 && <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onRevisar}>Já conferi esses dados</Button>}
  </aside>;
}

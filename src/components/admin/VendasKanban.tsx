import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import {
  formatBRL,
  ordenarPorEntrega,
  saiuDoQuadro,
  statusCor,
  statusLabel,
  type Pedido,
  type StatusPedido,
} from "@/lib/vendas";
import { PedidoCard, type AcoesPedido } from "./PedidoCard";

/** Cancelado fica fora: é exceção, não etapa do fluxo. */
const COLUNAS: StatusPedido[] = ["novo", "producao", "pronto", "entregue"];

function CardArrastavel({
  pedido,
  acoes,
  onAbrir,
}: {
  pedido: Pedido;
  acoes: AcoesPedido;
  onAbrir: (p: Pedido) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: pedido.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onAbrir(pedido)}
    >
      <PedidoCard pedido={pedido} acoes={acoes} compacto className="cursor-grab" />
    </div>
  );
}

function Coluna({
  status,
  pedidos,
  acoes,
  onAbrir,
}: {
  status: StatusPedido;
  pedidos: Pedido[];
  acoes: AcoesPedido;
  onAbrir: (p: Pedido) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const total = pedidos.reduce((t, p) => t + p.total, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[12rem] flex-1 flex-col rounded-2xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-3 transition-colors",
        isOver && "border-[var(--terracotta)] bg-[var(--cream)]",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: statusCor(status) }}
          />
          {statusLabel(status)}
          <span className="text-muted-foreground">({pedidos.length})</span>
        </span>
        {total > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">{formatBRL(total)}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {pedidos.map((p) => (
          <CardArrastavel key={p.id} pedido={p} acoes={acoes} onAbrir={onAbrir} />
        ))}
        {pedidos.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--cream-deep)] px-3 py-6 text-center text-xs text-muted-foreground">
            {status === "entregue"
              ? "Entregue e pago sai daqui no dia seguinte"
              : "Arraste um pedido para cá"}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Quadro por etapa. Só aparece no desktop — em tela de celular arrastar card
 * entre colunas é pior que os botões da lista.
 *
 * Dentro de cada coluna a ordem é por data de entrega, não por criação: a
 * pergunta que o quadro responde é "o que sai primeiro", não "o que chegou".
 */
export function VendasKanban({
  pedidos,
  acoes,
  onMover,
}: {
  pedidos: Pedido[];
  acoes: AcoesPedido;
  onMover: (pedido: Pedido, status: StatusPedido) => void;
}) {
  const [arrastando, setArrastando] = useState<Pedido | null>(null);
  // Precisa mover 6px pra começar a arrastar — senão um clique vira arrasto.
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null);
    const destino = e.over?.id as StatusPedido | undefined;
    if (!destino) return;
    const pedido = pedidos.find((p) => p.id === e.active.id);
    if (!pedido || pedido.status === destino) return;
    onMover(pedido, destino);
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={pointerWithin}
      onDragStart={(e: DragStartEvent) =>
        setArrastando(pedidos.find((p) => p.id === e.active.id) ?? null)
      }
      onDragEnd={aoSoltar}
      onDragCancel={() => setArrastando(null)}
    >
      <div className="flex gap-3">
        {COLUNAS.map((status) => (
          <Coluna
            key={status}
            status={status}
            // Entregue e pago fica até o fim do dia; depois vira histórico.
            pedidos={ordenarPorEntrega(
              pedidos.filter((p) => p.status === status && !saiuDoQuadro(p)),
            )}
            acoes={acoes}
            onAbrir={acoes.editar}
          />
        ))}
      </div>

      {/* O card segue o cursor; sem isso ele some enquanto arrasta. */}
      <DragOverlay>
        {arrastando && (
          <PedidoCard pedido={arrastando} acoes={acoes} compacto className="w-64 rotate-2" />
        )}
      </DragOverlay>
    </DndContext>
  );
}

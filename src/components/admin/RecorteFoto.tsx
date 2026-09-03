"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Recorte quadrado antes de subir a foto.
 *
 * Antes a foto ia como veio da câmera. O card do catálogo é quadrado e usa
 * `object-cover`, então uma foto 4:3 aparecia com as laterais cortadas por
 * decisão do navegador — quase sempre no lugar errado, porque o assunto da
 * foto raramente está no centro geométrico. Quem cadastrava via a cesta
 * decapitada e não tinha o que fazer.
 *
 * Aqui o corte é escolha de quem cadastra: arrasta para escolher o pedaço,
 * aproxima para preencher.
 */

/** Lado do arquivo final. 1000 dá nitidez em tela retina sem inflar o upload. */
const SAIDA = 1000;

type Props = {
  arquivo: File;
  onConfirmar: (recortada: File) => void;
  onCancelar: () => void;
};

export function RecorteFoto({ arquivo, onConfirmar, onCancelar }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [processando, setProcessando] = useState(false);

  const molduraRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Carrega a imagem e libera a URL ao trocar de arquivo.
  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    const elemento = new Image();
    elemento.onload = () => setImg(elemento);
    elemento.src = url;
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const lado = molduraRef.current?.clientWidth ?? 0;

  /* Fator que faz a imagem COBRIR a moldura. É a base do zoom: em 1x a foto
     preenche o quadrado sem sobrar borda, e daí só cresce. */
  const base = img && lado ? Math.max(lado / img.width, lado / img.height) : 1;
  const escala = base * zoom;
  const largura = img ? img.width * escala : 0;
  const altura = img ? img.height * escala : 0;

  /* Prende a imagem à moldura: sem isto dá para arrastar até sobrar fundo
     branco, e o arquivo final sairia com uma faixa vazia. */
  const limitar = useCallback(
    (x: number, y: number) => ({
      x: Math.min(0, Math.max(lado - largura, x)),
      y: Math.min(0, Math.max(lado - altura, y)),
    }),
    [lado, largura, altura],
  );

  // Recentraliza quando a imagem carrega ou o zoom muda.
  useEffect(() => {
    if (!img || !lado) return;
    setPos((atual) => limitar(atual.x, atual.y));
  }, [img, lado, zoom, limitar]);

  useEffect(() => {
    if (!img || !lado) return;
    setPos({ x: (lado - img.width * base) / 2, y: (lado - img.height * base) / 2 });
  }, [img, lado, base]);

  function aoPegar(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }

  function aoMover(e: React.PointerEvent) {
    const a = arrasto.current;
    if (!a) return;
    setPos(limitar(a.px + (e.clientX - a.x), a.py + (e.clientY - a.y)));
  }

  function aoSoltar() {
    arrasto.current = null;
  }

  async function confirmar() {
    if (!img || !lado) return;
    setProcessando(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = SAIDA;
      canvas.height = SAIDA;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas indisponível");

      /* Da tela para a origem: o pedaço visível começa em -pos/escala e mede
         lado/escala. É a mesma conta do que está na moldura, então o que a
         pessoa vê é exatamente o que sai. */
      ctx.drawImage(
        img,
        -pos.x / escala,
        -pos.y / escala,
        lado / escala,
        lado / escala,
        0,
        0,
        SAIDA,
        SAIDA,
      );

      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/jpeg", 0.85),
      );
      if (!blob) throw new Error("não foi possível gerar a imagem");

      onConfirmar(
        new File([blob], arquivo.name.replace(/\.[^.]+$/, "") + ".jpg", {
          type: "image/jpeg",
        }),
      );
    } catch {
      // Não conseguiu recortar: manda o original em vez de descartar a foto.
      onConfirmar(arquivo);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onCancelar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Enquadrar a foto</DialogTitle>
          <DialogDescription>
            Arraste para escolher o pedaço e aproxime para preencher. O catálogo mostra sempre
            quadrado.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={molduraRef}
          onPointerDown={aoPegar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-2xl bg-[var(--cream-deep)]"
          style={{ cursor: arrasto.current ? "grabbing" : "grab" }}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="absolute max-w-none origin-top-left"
              style={{ width: largura, height: altura, left: pos.x, top: pos.y }}
            />
          )}
          {/* Guias de terço: ajudam a centrar o assunto sem tapar a foto. */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
        </div>

        <label className="mt-1 block text-sm font-medium">
          Aproximar
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--terracotta)]"
            aria-label="Aproximar a foto"
          />
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={onCancelar} disabled={processando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={!img || processando}>
            {processando ? "Preparando…" : "Usar esta foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

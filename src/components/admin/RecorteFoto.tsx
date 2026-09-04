"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  // 0 = a foto inteira cabendo, 50 = preenchendo, 100 = 3x. Ver `escala`.
  const [zoom, setZoom] = useState(50);
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

  /* O lado vem de estado, e nao de `ref.current.clientWidth` lido no render.
     Ler ref durante o render e proibido pelo React (o lint acusa) e, pior,
     nao avisa quando o tamanho muda: o dialogo abre com animacao e a moldura
     nasce com uma largura e termina com outra, entao a conta do zoom era
     feita sobre um numero velho. */
  const [lado, setLado] = useState(0);

  useEffect(() => {
    const alvo = molduraRef.current;
    if (!alvo) return;

    const medir = () => setLado(alvo.clientWidth);
    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  /* DOIS SENTIDOS, com o "preenche" no meio do curso.

     COBRIR e o ponto neutro: a foto ocupa o quadrado inteiro sem sobrar borda.
     Para cima, aproxima ate 3x. Para baixo, afasta ate CABER — a foto inteira
     visivel dentro do quadrado, com faixa nas laterais.

     Antes so dava para aproximar, e um banner deitado ja entrava no maximo de
     corte possivel: nao havia como enquadrar, so escolher que pedaco perder. */
  const cobrir = img && lado ? Math.max(lado / img.width, lado / img.height) : 1;
  const caber = img && lado ? Math.min(lado / img.width, lado / img.height) : 1;

  /* O controle guarda 0..100 e o meio, 50, e sempre COBRIR. Mapear escala
     direto no slider deixaria o ponto neutro em lugar diferente para cada foto
     — numa retrato quase no comeco, numa panoramica quase no fim. */
  const escala = useMemo(() => {
    if (zoom <= 50) {
      const t = zoom / 50;
      return caber + (cobrir - caber) * t;
    }
    const t = (zoom - 50) / 50;
    return cobrir * (1 + 2 * t);
  }, [zoom, caber, cobrir]);

  const largura = img ? img.width * escala : 0;
  const altura = img ? img.height * escala : 0;

  /* Prende a foto à moldura quando ela é MAIOR, e centraliza quando é menor.
     Sem o segundo caso, afastar deixaria a foto encostada num canto com a
     faixa toda do outro lado. */
  const limitar = useCallback(
    (x: number, y: number) => ({
      x: largura >= lado ? Math.min(0, Math.max(lado - largura, x)) : (lado - largura) / 2,
      y: altura >= lado ? Math.min(0, Math.max(lado - altura, y)) : (lado - altura) / 2,
    }),
    [lado, largura, altura],
  );

  // Reencaixa quando a imagem carrega, a moldura muda de tamanho ou o zoom anda.
  useEffect(() => {
    if (!img || !lado) return;
    setPos((atual) => limitar(atual.x, atual.y));
  }, [img, lado, limitar]);

  // Centraliza ao abrir: a moldura só existe depois que a imagem carrega.
  useEffect(() => {
    if (!img || !lado) return;
    setPos({ x: (lado - img.width * cobrir) / 2, y: (lado - img.height * cobrir) / 2 });
  }, [img, lado, cobrir]);

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

      /* Fundo branco antes de desenhar. Afastando além do "preenche" sobra
         área vazia, e JPEG não tem transparência: sem pintar, a faixa sairia
         PRETA no catálogo. */
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, SAIDA, SAIDA);

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
          style={{
            cursor: arrasto.current ? "grabbing" : "grab",
            /* A foto vai como FUNDO, e nao num <img>: nenhuma regra global de
               `img { ... }` alcanca um background, e `background-size` recebe
               as duas dimensoes explicitas — nada externo consegue esticar. */
            backgroundImage: img ? `url(${img.src})` : undefined,
            backgroundSize: img ? `${largura}px ${altura}px` : undefined,
            backgroundPosition: `${pos.x}px ${pos.y}px`,
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Guias de terço: ajudam a centrar o assunto sem tapar a foto. */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="border border-white/25" />
            ))}
          </div>
        </div>

        <label className="mt-1 block text-sm font-medium">
          Aproximar ou afastar
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--terracotta)]"
            aria-label="Aproximar ou afastar a foto"
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

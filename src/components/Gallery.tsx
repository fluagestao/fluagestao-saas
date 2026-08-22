import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  imagens: { url: string; ordem: number }[];
  alt: string;
}

export function Gallery({ imagens, alt }: Props) {
  const [ativa, setAtiva] = useState(0);

  if (imagens.length === 0) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-3 rounded-3xl bg-[var(--cream-deep)] text-[var(--bronze)]">
        <ImageIcon className="h-16 w-16 opacity-40" strokeWidth={1.1} />
        <span className="font-script text-2xl opacity-70">foto em breve</span>
      </div>
    );
  }

  const principal = imagens[ativa] ?? imagens[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-3xl bg-[var(--cream-deep)] shadow-[var(--shadow-card)]">
        <img
          src={principal.url}
          alt={alt}
          className="aspect-square w-full object-cover"
        />
      </div>
      {imagens.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {imagens.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setAtiva(i)}
              className={cn(
                "overflow-hidden rounded-xl bg-[var(--cream-deep)] transition-all",
                i === ativa
                  ? "ring-2 ring-[var(--terracotta)] ring-offset-2 ring-offset-[var(--background)]"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <img src={img.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

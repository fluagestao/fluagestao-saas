import { Check, MapPin, ArrowUpRight } from "lucide-react";
import { BAIRRO_RETIRADA, ENDERECO, MAPS_URL } from "@/lib/config";

const itens = [
  "Cartão com a sua mensagem, escrito à mão",
  `Retirada grátis no bairro ${BAIRRO_RETIRADA.split(" — ")[0]} ou entrega com nosso motorista`,
  "PIX ou cartão — a gente combina no fechamento, pelo WhatsApp",
  "Pedidos com ~48h de antecedência (datas comemorativas, quanto antes melhor)",
];

export function EntregaCuidadosa() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-4">
      <div className="rounded-[2rem] border border-[var(--cream-deep)]/70 bg-card p-7 shadow-[var(--shadow-soft)] sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="font-display text-3xl text-foreground sm:text-4xl">Entrega cuidadosa</h2>
            <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
              A gente cuida de cada detalhe pra sua surpresa chegar impecável — no capricho e na
              hora combinada.
            </p>

            <ul className="mt-6 flex flex-col">
              {itens.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 border-t border-[var(--cream-deep)]/70 py-3.5 first:border-t-0 first:pt-0"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--terracotta)]/10 text-[var(--terracotta)]">
                    <Check className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                  <span className="text-sm leading-relaxed text-foreground/85 sm:text-base">
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center rounded-[1.5rem] border border-[var(--cream-deep)]/70 bg-[var(--cream-soft)] p-7">
            <h3 className="font-display text-2xl text-foreground">Taxa de entrega por bairro</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              O frete não está incluso no valor das caixas — é confirmado no momento do pedido, pelo
              WhatsApp, conforme o seu endereço em Tubarão e região.
            </p>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--terracotta)] transition-colors hover:underline"
            >
              <MapPin className="h-4 w-4" />
              <span>Retirada: {ENDERECO}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

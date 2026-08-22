import { useState } from "react";
import {
  Package,
  ChevronDown,
  Clock,
  Truck,
  CreditCard,
  Gift,
  Camera,
  MapPin,
  ArrowUpRight,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BAIRRO_RETIRADA, ENDERECO, MAPS_URL } from "@/lib/config";

const [bairro, cidade] = BAIRRO_RETIRADA.split(" — ");

const regras = [
  {
    icon: Clock,
    titulo: "Antecedência",
    texto:
      "Pedidos com mínimo 24h de antecedência (ou consulte disponibilidade de encaixe).",
  },
  {
    icon: Truck,
    titulo: "Entrega ou retirada",
    texto: `Retire no bairro ${bairro} (${cidade}) sem custo, ou agende a entrega (taxa aplicada, feita de carro por entregador de nossa confiança).`,
  },
  {
    icon: CreditCard,
    titulo: "Pagamento",
    texto: "Via Pix ou cartão (cartão com taxa adicional).",
  },
  {
    icon: Gift,
    titulo: "Tábuas e acessórios",
    texto: "São parte do seu presente, não precisam ser devolvidos.",
  },
  {
    icon: Camera,
    titulo: "Sobre as fotos",
    texto:
      "São reais, mas os itens podem variar conforme disponibilidade. Frete não incluso nos valores.",
  },
];

function MapLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 transition-colors hover:text-[var(--terracotta)] ${className}`}
    >
      <MapPin className="h-3.5 w-3.5" />
      <span>{ENDERECO}</span>
      <ArrowUpRight className="h-3.5 w-3.5" />
    </a>
  );
}

export function HowItWorksCard() {
  const [aberto, setAberto] = useState(false);

  return (
    <Collapsible
      open={aberto}
      onOpenChange={setAberto}
      className="group mx-auto w-full max-w-xl"
    >
      <div className="rounded-2xl bg-gradient-to-br from-terracotta to-terracotta-dark p-5 text-cream-soft shadow-[var(--shadow-terracotta)] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-lift)]">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-4 text-left"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream-soft/15">
              <Package className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg italic leading-tight">
                Como funciona
              </p>
              <p className="mt-0.5 text-sm text-cream-soft/90">
                Pedido, entrega e prazos — leia antes de pedir
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-300",
                aberto && "rotate-180"
              )}
              strokeWidth={2}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent
          className="overflow-hidden opacity-0 transition-opacity duration-300 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down data-[state=open]:opacity-100"
        >
          <div className="mt-4 border-t border-cream-soft/20 pt-4">
            <div className="space-y-4">
              {regras.map(({ icon: Icon, titulo, texto }) => (
                <div key={titulo} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-soft/15">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-medium italic">
                      {titulo}
                    </h3>
                    <p className="text-sm leading-relaxed text-cream-soft/90">
                      {texto}
                    </p>
                    {titulo === "Entrega ou retirada" && (
                      <p className="mt-2">
                        <MapLink className="text-sm text-cream-soft underline-offset-2 hover:text-white hover:underline" />
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

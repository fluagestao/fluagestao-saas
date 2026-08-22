import type { Bairro } from "@/lib/frete";

export type { Bairro };

export type BairrosPayload = {
  bairros: Bairro[];
  adicional_domingo: number;
};

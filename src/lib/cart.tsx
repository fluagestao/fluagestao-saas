"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatPreco } from "./catalog";
import { WHATSAPP_NUMERO } from "./config";

export type CartItem = {
  slug: string;
  nome: string;
  preco: number | null; // null = sob consulta
  variacao?: string;
  qtd: number;
  catalogo?: string; // id do catálogo/coleção (define a mensagem do WhatsApp)
};

type CartContextValue = {
  itens: CartItem[];
  add: (item: Omit<CartItem, "qtd">, qtd?: number) => void;
  remove: (slug: string, variacao?: string) => void;
  setQtd: (slug: string, qtd: number, variacao?: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  totalItens: number;
  subtotal: number;
  hidratado: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "flua-carrinho";

/**
 * Carrinho parado além disso é de outra ocasião — quem montou uma cesta há
 * três semanas não quer aquilo ao voltar.
 */
const VALIDADE_DIAS = 7;

type CarrinhoSalvo = { itens: CartItem[]; em: number };

/** Aceita o formato antigo (só o array) pra ninguém perder o carrinho na virada. */
function lerSalvo(raw: string): CartItem[] {
  const dado = JSON.parse(raw) as CarrinhoSalvo | CartItem[];
  if (Array.isArray(dado)) return dado;
  if (!dado || !Array.isArray(dado.itens)) return [];
  const dias = (Date.now() - (dado.em ?? 0)) / 86_400_000;
  return dias > VALIDADE_DIAS ? [] : dado.itens;
}

function keyOf(slug: string, variacao?: string) {
  return `${slug}::${variacao ?? ""}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hidratado, setHidratado] = useState(false);

  // Hidratar do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const guardados = lerSalvo(raw);
        if (guardados.length) setItens(guardados);
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignora
    }
    setHidratado(true);
  }, []);

  // Persistir, com a data pra saber quando expira.
  useEffect(() => {
    if (!hidratado) return;
    try {
      if (itens.length === 0) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify({ itens, em: Date.now() }));
    } catch {
      // ignora
    }
  }, [itens, hidratado]);

  const add = useCallback<CartContextValue["add"]>((item, qtd = 1) => {
    setItens((prev) => {
      const k = keyOf(item.slug, item.variacao);
      const idx = prev.findIndex((i) => keyOf(i.slug, i.variacao) === k);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qtd: copy[idx].qtd + qtd };
        return copy;
      }
      return [...prev, { ...item, qtd }];
    });
  }, []);

  const remove = useCallback<CartContextValue["remove"]>((slug, variacao) => {
    setItens((prev) => prev.filter((i) => keyOf(i.slug, i.variacao) !== keyOf(slug, variacao)));
  }, []);

  const setQtd = useCallback<CartContextValue["setQtd"]>((slug, qtd, variacao) => {
    setItens((prev) => {
      if (qtd <= 0) {
        return prev.filter((i) => keyOf(i.slug, i.variacao) !== keyOf(slug, variacao));
      }
      return prev.map((i) =>
        keyOf(i.slug, i.variacao) === keyOf(slug, variacao) ? { ...i, qtd } : i,
      );
    });
  }, []);

  const clear = useCallback(() => setItens([]), []);

  const totalItens = useMemo(() => itens.reduce((s, i) => s + i.qtd, 0), [itens]);
  const subtotal = useMemo(
    () => itens.reduce((s, i) => (i.preco != null ? s + i.preco * i.qtd : s), 0),
    [itens],
  );

  const value: CartContextValue = {
    itens,
    add,
    remove,
    setQtd,
    clear,
    open,
    setOpen,
    totalItens,
    subtotal,
    hidratado,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}

export type ClienteInfo = {
  nome: string;
  celular: string;
  /** Prazo desejado, já formatado (ex.: "Hoje (11/08)"). Ver `lib/prazo.ts`. */
  quando?: string;
};

// Mensagens personalizadas da coleção (saudação/fecho). Vazias = usa o padrão.
export type MensagensColecao = { saudacao?: string | null; fecho?: string | null };

function interpolar(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

export function buildWhatsappMessage(
  itens: CartItem[],
  cliente?: ClienteInfo,
  msgs?: MensagensColecao,
): string {
  const subtotal = itens.reduce((s, i) => (i.preco != null ? s + i.preco * i.qtd : s), 0);
  const temPreco = itens.some((i) => i.preco != null);

  const linhas = itens.map((i) => {
    const var_ = i.variacao ? ` (${i.variacao})` : "";
    if (i.preco != null) {
      const sub = i.preco * i.qtd;
      return `- ${i.qtd}x ${i.nome}${var_} — ${formatPreco(sub)}`;
    }
    return `• ${i.qtd}x ${i.nome}${var_} — a combinar`;
  });

  const nomeCliente = cliente?.nome?.trim();
  const partes: string[] = [];
  let saudacao: string;
  if (msgs?.saudacao) {
    saudacao = interpolar(msgs.saudacao, { nome: nomeCliente ?? "" });
  } else {
    saudacao = nomeCliente
      ? `Olá! Aqui é a(o) *${nomeCliente}* e gostaria de fazer um pedido pelo site da *Flua Gestão* 🤍`
      : "Olá! Gostaria de fazer um pedido pelo site da *Flua Gestão* 🤍";
  }
  partes.push(saudacao);
  if (cliente?.celular) {
    partes.push(`_Meu WhatsApp para contato: ${cliente.celular}_`);
  }
  // Prazo em bloco próprio: é o que define a ordem de atendimento, então
  // precisa saltar aos olhos já na prévia da conversa.
  if (cliente?.quando) {
    partes.push("");
    partes.push(`📅 *Preciso para:* ${cliente.quando}`);
  }
  partes.push("");
  if (linhas.length > 0) {
    partes.push(...linhas);
  }
  partes.push("");
  if (temPreco) {
    partes.push(`*Subtotal:* ${formatPreco(subtotal)}`);
    partes.push("_Frete à parte em caso de entrega._");
  } else {
    partes.push("_Combinamos os valores e o frete por aqui._");
  }
  partes.push("");
  partes.push(
    msgs?.fecho
      ? interpolar(msgs.fecho, { nome: nomeCliente ?? "" })
      : "Aguardo a confirmação de disponibilidade. Obrigada!",
  );

  return partes.join("\n");
}

export function whatsappCartLink(itens: CartItem[], cliente?: ClienteInfo, msgs?: MensagensColecao) {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(buildWhatsappMessage(itens, cliente, msgs))}`;
}

"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Trash2, ShoppingBag, ArrowLeft, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCart, whatsappCartLink } from "@/lib/cart";
import { fetchProdutos, fetchCatalogos, formatPreco } from "@/lib/catalog";
import { hojeISO, rotuloPrazo, somarDias, type PrazoOpcao } from "@/lib/prazo";
import { formatCelular } from "@/lib/formato";
import { AddToCartButton } from "./AddToCartButton";
import { QtyStepper } from "./QtyStepper";

type PedidoParaRegistro = {
  nome: string;
  celular: string;
  prazo_opcao: PrazoOpcao;
  prazo_data: string | null;
  itens: { slug: string; variacao: string | null; qtd: number }[];
};

/**
 * Dispara a gravação do pedido sem bloquear nada. `keepalive` mantém a
 * requisição viva mesmo quando a página vai para segundo plano — que é o que
 * acontece no celular assim que o app do WhatsApp abre.
 */
function registrarPedido(payload: PedidoParaRegistro) {
  try {
    void fetch("/api/pedidos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Nunca atrapalha o envio do pedido.
  }
}

const PRAZO_CHIPS: { valor: PrazoOpcao; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "amanha", label: "Amanhã" },
  { valor: "data", label: "Escolher data" },
];

export function CartDrawer() {
  const router = useRouter();
  const { itens, open, setOpen, setQtd, remove, clear, subtotal, totalItens } = useCart();

  const [etapa, setEtapa] = useState<"carrinho" | "dados">("carrinho");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [prazo, setPrazo] = useState<PrazoOpcao | null>(null);
  const [dataEscolhida, setDataEscolhida] = useState("");

  // Ao reabrir o carrinho, sempre volta pra listagem.
  useEffect(() => {
    if (open) setEtapa("carrinho");
  }, [open]);

  // Só no cliente: no SSR a data sairia em UTC e o mínimo do calendário poderia
  // cair no dia errado.
  const [hoje, setHoje] = useState("");
  useEffect(() => setHoje(hojeISO()), []);

  const temPedido = itens.length > 0;
  const nomeOk = nome.trim().length >= 2;
  const celularOk = celular.replace(/\D/g, "").length >= 10;
  const prazoOk = prazo != null && (prazo !== "data" || dataEscolhida !== "");
  const podeEnviar = nomeOk && celularOk && prazoOk;

  // Sugestões de adicionais ("complete seu presente"): busca o catálogo só
  // quando o carrinho abre e filtra os adicionais que ainda não estão no pedido.
  const { data: catalogo = [] } = useQuery({
    queryKey: ["produtos"],
    queryFn: fetchProdutos,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  // Coleções (catálogos) — para pegar a mensagem de WhatsApp personalizada.
  const { data: colecoes = [] } = useQuery({
    queryKey: ["catalogos"],
    queryFn: fetchCatalogos,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const slugsNoCarrinho = new Set(itens.map((i) => i.slug));
  // Catálogo(s) dos itens no carrinho: os adicionais sugeridos saem do mesmo
  // catálogo (pedido Dia dos Pais sugere os adicionais da coleção Dia dos Pais,
  // pedido normal sugere os adicionais do catálogo normal).
  const catalogosNoCarrinho = new Set(
    itens
      .map((i) => catalogo.find((p) => p.slug === i.slug)?.categoria?.catalogo_id)
      .filter(Boolean),
  );
  const ehPolaroid = (slug: string) => /instax|polaroid/i.test(slug);
  const adicionais = catalogo
    .filter((p) => {
      const ehAdicional =
        p.categoria?.slug === "adicionais" || p.categoria?.slug === "dp-adicionais";
      if (!ehAdicional || slugsNoCarrinho.has(p.slug)) return false;
      return catalogosNoCarrinho.size === 0 || catalogosNoCarrinho.has(p.categoria?.catalogo_id);
    })
    .sort((a, b) => Number(ehPolaroid(b.slug)) - Number(ehPolaroid(a.slug)))
    .slice(0, 8);

  const continuarComprando = () => {
    setOpen(false);
    router.push("/#catalogo");
  };

  const enviarPedido = () => {
    if (!podeEnviar) return;
    // Mensagem da coleção do 1º item que tenha catálogo (pedido normal = padrão).
    const catId = itens.find((i) => i.catalogo)?.catalogo;
    const colecao = colecoes.find((c) => c.id === catId);
    const msgs = colecao
      ? { saudacao: colecao.msg_saudacao, fecho: colecao.msg_fecho }
      : undefined;
    const link = whatsappCartLink(
      itens,
      {
        nome: nome.trim(),
        celular,
        quando: prazo ? rotuloPrazo(prazo, dataEscolhida) : undefined,
      },
      msgs,
    );

    // Registra o pedido no sistema de vendas — sem await, de propósito. O
    // Safari só deixa abrir janela dentro do gesto do clique: qualquer await
    // antes do window.open faz o navegador bloquear o WhatsApp. E a venda
    // nunca pode depender do banco, então falha aqui é engolida.
    registrarPedido({
      nome: nome.trim(),
      celular,
      prazo_opcao: prazo!,
      prazo_data: prazo === "data" ? dataEscolhida : null,
      itens: itens.map((i) => ({
        slug: i.slug,
        variacao: i.variacao ?? null,
        qtd: i.qtd,
      })),
    });

    // Esvazia antes de abrir: o link já está montado, o pedido já foi
    // registrado, e no caminho do pop-up bloqueado a função sai antes do fim —
    // limpar aqui cobre os dois casos.
    clear();
    setEtapa("carrinho");

    // Sem "noopener" aqui: com ele o retorno é sempre null por especificação, e
    // o fallback abaixo abriria o WhatsApp duas vezes.
    const janela = window.open(link, "_blank");
    if (!janela) {
      // Pop-up bloqueado (comum no Safari/iOS): navega na própria aba.
      window.location.href = link;
      return;
    }
    try {
      janela.opener = null;
    } catch {
      // wa.me é destino confiável; se o setter falhar, segue.
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-[var(--cream-soft)] p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-[var(--cream-deep)] px-5 py-4 text-left">
          <SheetTitle className="font-display text-2xl text-foreground">
            {etapa === "dados" ? "Quase lá! 🤍" : "Seu carrinho"}
          </SheetTitle>
          <SheetDescription className="text-xs uppercase tracking-[0.18em] text-[var(--bronze)]">
            {etapa === "dados"
              ? "só faltam seus dados"
              : totalItens === 0
                ? "vazio por enquanto"
                : `${totalItens} ${totalItens === 1 ? "item" : "itens"}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {etapa === "dados" ? (
            <div className="flex flex-col gap-5">
              <button
                type="button"
                onClick={() => setEtapa("carrinho")}
                className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-[var(--bronze)] transition-colors hover:text-[var(--terracotta)]"
              >
                <ArrowLeft className="h-4 w-4" />
                voltar ao carrinho
              </button>

              <p className="text-sm leading-relaxed text-foreground/80">
                Como podemos te chamar? Deixe seu nome e WhatsApp — assim já conseguimos te atender
                melhor e confirmar o pedido com você.
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cart-nome" className="text-sm font-medium text-foreground">
                  Como podemos te chamar? <span className="text-[var(--terracotta)]">*</span>
                </label>
                <input
                  id="cart-nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  autoComplete="name"
                  className="h-12 w-full rounded-xl border border-[var(--cream-deep)] bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)]/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cart-celular" className="text-sm font-medium text-foreground">
                  Seu WhatsApp <span className="text-[var(--terracotta)]">*</span>
                </label>
                <input
                  id="cart-celular"
                  type="tel"
                  inputMode="numeric"
                  value={celular}
                  onChange={(e) => setCelular(formatCelular(e.target.value))}
                  placeholder="(48) 99999-9999"
                  autoComplete="tel"
                  className="h-12 w-full rounded-xl border border-[var(--cream-deep)] bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[var(--terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)]/20"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground">
                  Para quando você precisa? <span className="text-[var(--terracotta)]">*</span>
                </span>
                <p className="-mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Assim conseguimos atender primeiro quem tem a data mais próxima.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PRAZO_CHIPS.map((chip) => {
                    const ativo = prazo === chip.valor;
                    return (
                      <button
                        key={chip.valor}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => {
                          setPrazo(chip.valor);
                          if (chip.valor !== "data") setDataEscolhida("");
                        }}
                        className={`h-11 rounded-xl border px-3 text-sm font-medium transition-all active:scale-[0.98] ${
                          // "Escolher data" sozinho na 2ª linha: ocupa a largura toda
                          // em vez de deixar meia coluna vazia.
                          chip.valor === "data" ? "col-span-2" : ""
                        } ${
                          ativo
                            ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--cream-soft)]"
                            : "border-[var(--cream-deep)] bg-card text-foreground hover:border-[var(--terracotta)]"
                        }`}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
                {prazo === "data" && (
                  <input
                    type="date"
                    aria-label="Data desejada"
                    value={dataEscolhida}
                    min={hoje}
                    max={hoje ? somarDias(hoje, 365) : undefined}
                    onChange={(e) => setDataEscolhida(e.target.value)}
                    className="h-12 w-full rounded-xl border border-[var(--cream-deep)] bg-card px-4 text-sm text-foreground focus:border-[var(--terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--terracotta)]/20"
                  />
                )}
              </div>

              <p className="rounded-xl bg-[var(--cream)] px-3 py-2 text-[11px] leading-relaxed text-foreground/70">
                Seus dados já vão preenchidos na mensagem do WhatsApp. É só enviar. 💛
              </p>
            </div>
          ) : !temPedido ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cream-deep)] text-[var(--bronze)]">
                <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className="font-display text-xl text-foreground">Nada por aqui ainda</p>
              <p className="max-w-[16rem] text-sm text-muted-foreground">
                Adicione cestas e caixas do catálogo para enviar tudo num único pedido pelo
                WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <ul className="space-y-3">
                {itens.map((i) => {
                  const linhaSubtotal = i.preco != null ? i.preco * i.qtd : null;
                  return (
                    <li
                      key={`${i.slug}::${i.variacao ?? ""}`}
                      className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-display text-lg leading-tight text-foreground">
                            {i.nome}
                          </p>
                          {i.variacao && (
                            <p className="mt-0.5 text-xs uppercase tracking-[0.18em] text-[var(--bronze)]">
                              {i.variacao}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-muted-foreground">
                            {i.preco != null ? (
                              <>
                                {formatPreco(i.preco)}{" "}
                                <span className="text-xs text-[var(--bronze)]">/ un.</span>
                              </>
                            ) : (
                              <span className="italic text-[var(--terracotta)]">a combinar</span>
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remover item"
                          onClick={() => remove(i.slug, i.variacao)}
                          className="rounded-full p-1.5 text-foreground/40 transition-colors hover:bg-[var(--rose)]/30 hover:text-[var(--terracotta)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <QtyStepper
                          value={i.qtd}
                          min={1}
                          size="sm"
                          onChange={(n) => setQtd(i.slug, n, i.variacao)}
                        />
                        {linhaSubtotal != null && (
                          <span className="font-display text-base font-medium text-foreground">
                            {formatPreco(linhaSubtotal)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {adicionais.length > 0 && (
                <section className="rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]">
                  <h3 className="font-display text-base text-foreground">
                    Complete seu presente 🎁
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Um mimo a mais deixa a surpresa ainda mais especial.
                  </p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {adicionais.map((p) => {
                      const img = p.imagens[0];
                      return (
                        <div
                          key={p.id}
                          className="flex w-full flex-col rounded-xl border border-[var(--cream-deep)] bg-[var(--cream-soft)] p-1.5"
                        >
                          <div className="h-[70px] overflow-hidden rounded-lg bg-[var(--cream-deep)]">
                            {img ? (
                              <img
                                src={img.url}
                                alt={p.nome}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[var(--bronze)]">
                                <ImageIcon className="h-5 w-5 opacity-40" strokeWidth={1.2} />
                              </div>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs font-medium text-foreground">
                            {p.nome}
                          </p>
                          {p.preco != null && (
                            <p className="text-[11px] font-medium text-[var(--bronze)]">
                              {formatPreco(p.preco)}
                            </p>
                          )}
                          <AddToCartButton produto={p} size="sm" fullWidth className="mt-1" />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {temPedido && (
          <div className="border-t border-[var(--cream-deep)] bg-[var(--cream)] px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--bronze)]">
                Subtotal
              </span>
              <span className="font-display text-2xl font-medium text-foreground">
                {formatPreco(subtotal)}
              </span>
            </div>
            <p className="mt-2 rounded-xl bg-[var(--cream-soft)] px-3 py-2 text-[11px] leading-relaxed text-foreground/75">
              Em caso de entrega, será somado o valor do frete. Retirada no bairro Oficinas
              (Tubarão) sem custo.
            </p>

            {etapa === "dados" ? (
              <button
                type="button"
                onClick={enviarPedido}
                disabled={!podeEnviar}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--whatsapp)] text-sm font-medium text-[var(--whatsapp-foreground)] shadow-[var(--shadow-soft)] transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={2.2} />
                Enviar pedido no WhatsApp
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEtapa("dados")}
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--terracotta)] text-sm font-medium text-[var(--cream-soft)] shadow-[var(--shadow-soft)] transition-all hover:brightness-105 active:scale-[0.98]"
              >
                Fazer pedido
              </button>
            )}

            <button
              type="button"
              onClick={continuarComprando}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--terracotta)] text-sm font-medium text-[var(--terracotta)] transition-all hover:bg-[var(--terracotta)]/10 active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4" />
              Continuar comprando
            </button>

            <button
              type="button"
              onClick={clear}
              className="mt-2 w-full rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--bronze)] transition-colors hover:text-[var(--terracotta)]"
            >
              limpar carrinho
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

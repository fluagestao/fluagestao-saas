import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { salvarPedido } from "@/lib/pedidos";
import type { ClienteComHistorico } from "@/lib/pedidos-ops.server";
import { MAX_LINHAS_CARTAO } from "@/lib/pedidos-schema";
import { formatCelular, formatCep } from "@/lib/formato";
import { carregarBairros } from "@/lib/bairros";
import { acharBairro, calcularFrete, type Bairro } from "@/lib/frete";
import { ClienteDialog } from "./ClientesView";
import { BuscaAdicionar } from "./BuscaAdicionar";
import {
  QuickProductDialog,
  type CategoriaRapida,
} from "./QuickProductDialog";
import { mensagemDeErro } from "@/lib/erros";
import {
  STATUS_PEDIDO,
  formatBRL,
  subtotalItens,
  totalPedido,
  type ItemPedido,
  type Pedido,
  type StatusPedido,
} from "@/lib/vendas";

export type ProdutoOpcao = {
  slug: string;
  nome: string;
  preco: number | null;
  precos_extra: { label: string; valor: number }[];
  /** Rótulo do grupo no seletor, já pronto (ex.: "Tábuas de Frios · Geral"). */
  grupo: string;
  ordemGrupo: number;
};

/** Guardamos o rótulo mesmo (e não um código): é o que aparece no resumo de
 *  vendas por forma de pagamento, sem precisar de tradução. */
const FORMAS_PAGAMENTO = ["Pix", "Cartão", "Dinheiro", "Cortesia"] as const;

/** "Outro" cobre horário marcado ("08:00"), que é o caso mais comum de entrega. */
const JANELAS = ["Manhã", "Tarde", "Noite"] as const;

const campoCls =
  "h-10 w-full rounded-lg border border-[var(--cream-deep)] bg-background px-3 text-sm text-foreground focus:border-[var(--terracotta)] focus:outline-none";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Aceita "12,50" e "12.50" — o teclado do celular varia. */
function paraNumero(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function PedidoDialog({
  pedido,
  produtos,
  clientes = [],
  onClose,
  onSaved,
  onClienteCriado,
  categorias = [],
  onProdutoCriado,
  modoPagina = false,
}: {
  pedido: Pedido | null; // null = lançamento novo
  produtos: ProdutoOpcao[];
  clientes?: ClienteComHistorico[];
  onClose: () => void;
  onSaved: () => void;
  /** Recarrega a lista de clientes do painel depois de cadastrar um aqui. */
  onClienteCriado?: () => void;
  /** Categorias disponíveis para o cadastro rápido de produto. */
  categorias?: CategoriaRapida[];
  /** Recarrega o catálogo do painel depois do cadastro rápido. */
  onProdutoCriado?: () => void;
  /** Na rota de criação, mostra o formulário como página em vez de modal. */
  modoPagina?: boolean;
}) {
  const [nome, setNome] = useState(pedido?.cliente_nome ?? "");
  const [whatsapp, setWhatsapp] = useState(pedido?.cliente_whatsapp ?? "");
  const [itens, setItens] = useState<ItemPedido[]>(pedido?.itens ?? []);
  const [taxa, setTaxa] = useState(pedido?.taxa_entrega != null ? String(pedido.taxa_entrega) : "");
  const [tipo, setTipo] = useState(pedido?.tipo ?? "");
  const [endereco, setEndereco] = useState(pedido?.endereco ?? "");
  const [bairro, setBairro] = useState(pedido?.bairro ?? "");
  const [dataEntrega, setDataEntrega] = useState(pedido?.data_entrega ?? "");
  const janelaSalva = pedido?.janela_entrega ?? "";
  const janelaListada = (JANELAS as readonly string[]).includes(janelaSalva);
  const [janela, setJanela] = useState(janelaListada ? janelaSalva : janelaSalva ? "Outro" : "");
  const [janelaOutro, setJanelaOutro] = useState(janelaListada ? "" : janelaSalva);
  // Valor fora da lista (vindo de pedido antigo) cai em "Outro" com o texto.
  const formaSalva = pedido?.forma_pagamento ?? "";
  const ehListada = (FORMAS_PAGAMENTO as readonly string[]).includes(formaSalva);
  const [pagamento, setPagamento] = useState(ehListada ? formaSalva : formaSalva ? "Outro" : "");
  const [pagamentoOutro, setPagamentoOutro] = useState(ehListada ? "" : formaSalva);
  const [status, setStatus] = useState<StatusPedido>(pedido?.status ?? "novo");
  const [observacao, setObservacao] = useState(pedido?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [clienteId, setClienteId] = useState(pedido?.cliente_id ?? "");
  const [novoCliente, setNovoCliente] = useState(false);
  const [novoProduto, setNovoProduto] = useState(false);
  const [produtosLocais, setProdutosLocais] = useState(produtos);
  const [cep, setCep] = useState(pedido?.cep ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [cidadeCep, setCidadeCep] = useState<string | null>(null);
  // Evita rebuscar o mesmo CEP a cada tecla e ao reabrir o pedido.
  const cepBuscado = useRef(pedido?.cep?.replace(/\D/g, "") ?? "");
  const [referencia, setReferencia] = useState(pedido?.referencia ?? "");
  const [cartaoDe, setCartaoDe] = useState(pedido?.cartao_de ?? "");
  const [cartaoPara, setCartaoPara] = useState(pedido?.cartao_para ?? "");
  const [cartaoMsg, setCartaoMsg] = useState(pedido?.cartao_mensagem ?? "");
  const [cartaoHabilitado, setCartaoHabilitado] = useState(
    pedido
      ? pedido.cartao_habilitado ??
          Boolean(pedido.cartao_de || pedido.cartao_para || pedido.cartao_mensagem)
      : false,
  );
  // Item fora do catálogo: nome e valor, direto. O antigo montava por insumos e
  // saiu junto com a precificação — isto aqui não depende dela.
  const [avulso, setAvulso] = useState<{ nome: string; qtd: string; valor: string } | null>(null);
  const [destNome, setDestNome] = useState(pedido?.destinatario_nome ?? "");
  const [destZap, setDestZap] = useState(pedido?.destinatario_whatsapp ?? "");
  const [bairroId, setBairroId] = useState(pedido?.bairro_id ?? "");
  // Ligado só quando a pessoa assume a taxa: aí o cadastro do bairro para de
  // mandar, aqui e no servidor.
  const [taxaManual, setTaxaManual] = useState(pedido?.taxa_manual ?? false);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [adicionalDomingo, setAdicionalDomingo] = useState(0);

  useEffect(() => {
    carregarBairros()
      .then((d) => {
        setBairros(d.bairros as Bairro[]);
        setAdicionalDomingo(d.adicional_domingo);
      })
      // Sem cadastro de bairros o pedido continua funcionando: a taxa é
      // digitada, como antes.
      .catch(() => setTaxaManual(true));
  }, []);

  // O seletor vinha na ordem do banco, misturando categorias. Agrupa por
  // categoria (e coleção, porque há nomes repetidos entre elas).
  const gruposCatalogo = useMemo(() => {
    const mapa = new Map<string, { ordem: number; itens: ProdutoOpcao[] }>();
    for (const p of produtosLocais) {
      const g = mapa.get(p.grupo) ?? { ordem: p.ordemGrupo, itens: [] };
      g.itens.push(p);
      mapa.set(p.grupo, g);
    }
    return [...mapa.entries()]
      .sort((a, b) => a[1].ordem - b[1].ordem || a[0].localeCompare(b[0]))
      .map(([nome, g]) => ({
        nome,
        itens: g.itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
      }));
  }, [produtosLocais]);

  // Busca no servidor da Flua assim que o CEP fica completo. O servidor usa
  // ViaCEP com BrasilAPI como reserva, evitando falhas de CORS no navegador.
  useEffect(() => {
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8 || digitos === cepBuscado.current) return;
    cepBuscado.current = digitos;
    let cancelado = false;
    setBuscandoCep(true);
    fetch(`/api/cep/${digitos}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("CEP não encontrado");
        return (await r.json()) as {
          logradouro?: string;
          bairro?: string;
          cidade?: string;
          uf?: string;
        };
      })
      .then((d) => {
        if (cancelado) return;
        if (d.logradouro) setEndereco(d.logradouro);
        if (d.bairro) {
          setBairro(d.bairro);
          // Se o bairro do CEP estiver no cadastro, já traz a taxa junto.
          // Se não estiver, o valor digitado continua sendo aceito normalmente.
          const achado = acharBairro(bairros, d.bairro);
          if (achado) {
            setBairroId(achado.id);
            setTaxaManual(false);
          } else {
            setBairroId("");
            setTaxaManual(true);
          }
        }
        setCidadeCep([d.cidade, d.uf].filter(Boolean).join("/") || null);
      })
      .catch(() => {})
      .finally(() => !cancelado && setBuscandoCep(false));
    return () => {
      cancelado = true;
    };
  }, [cep, bairros]);

  // Retirada não tem endereço nem frete: os campos somem e a taxa não entra
  // no total, mesmo que tenha sido digitada antes de trocar o tipo.
  const ehRetirada = tipo === "retirada";
  const bairroSel = bairros.find((b) => b.id === bairroId) ?? null;
  const freteCalc = calcularFrete(bairroSel, dataEntrega || null, adicionalDomingo);
  const taxaNum = ehRetirada ? null : taxaManual || !freteCalc ? paraNumero(taxa) : freteCalc.total;

  // Bairro ou data mudou: refaz a conta, a menos que a taxa esteja assumida
  // à mão.
  useEffect(() => {
    if (taxaManual || ehRetirada) return;
    if (freteCalc) setTaxa(String(freteCalc.total));
  }, [freteCalc?.total, taxaManual, ehRetirada]);
  const subtotal = subtotalItens(itens);
  const total = totalPedido(itens, taxaNum);

  function adicionarAvulso() {
    if (!avulso?.nome.trim()) return;
    const qtd = Math.max(1, Math.min(99, Math.round(paraNumero(avulso.qtd) ?? 1)));
    setItens((prev) => [
      ...prev,
      { nome: avulso.nome.trim(), preco: paraNumero(avulso.valor), qtd },
    ]);
    setAvulso(null);
  }

  function adicionarDoCatalogo(slug: string) {
    const p = produtosLocais.find((x) => x.slug === slug);
    if (!p) return;
    setItens((prev) => [...prev, { slug: p.slug, nome: p.nome, preco: p.preco, qtd: 1 }]);
  }

  function atualizarItem(idx: number, patch: Partial<ItemPedido>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function salvar() {
    // Checa aqui pra dizer o que falta em vez de deixar o servidor recusar.
    const faltando: string[] = [];
    if (!nome.trim()) faltando.push("Cliente");
    if (itens.length === 0) faltando.push("pelo menos um item");
    if (itens.some((i) => !i.nome.trim())) faltando.push("o nome de todos os itens");
    if (faltando.length) {
      setErro(`Falta preencher: ${faltando.join(", ")}.`);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await salvarPedido({
        data: {
          ...(pedido ? { id: pedido.id } : {}),
          cliente_nome: nome.trim() || null,
          cliente_whatsapp: whatsapp.trim() || null,
          cliente_id: clienteId || null,
          itens: itens.map((i) => ({
            slug: i.slug ?? null,
            nome: i.nome,
            preco: i.preco,
            qtd: i.qtd,
            variacao: i.variacao ?? null,
            // Item montado na hora leva a composição junto.
            ...(i.custo != null ? { custo: i.custo } : {}),
            ...(i.insumos ? { insumos: i.insumos } : {}),
          })),
          taxa_entrega: taxaNum,
          destinatario_nome: ehRetirada ? null : destNome.trim() || null,
          destinatario_whatsapp: ehRetirada ? null : destZap.trim() || null,
          bairro_id: ehRetirada ? null : bairroId || null,
          taxa_manual: taxaManual,
          tipo: (tipo || null) as "entrega" | "retirada" | null,
          // Endereço fica guardado mesmo na retirada: se voltar pra entrega,
          // não precisa digitar de novo. A mensagem ao cliente já o omite.
          endereco: endereco.trim() || null,
          bairro: bairro.trim() || null,
          data_entrega: dataEntrega || null,
          janela_entrega: janela === "Outro" ? janelaOutro.trim() || null : janela || null,
          forma_pagamento:
            pagamento === "Outro" ? pagamentoOutro.trim() || null : pagamento || null,
          status,
          observacao: observacao.trim() || null,
          cep: cep.trim() || null,
          referencia: referencia.trim() || null,
          cartao_habilitado: cartaoHabilitado,
          cartao_de: cartaoDe.trim() || null,
          cartao_para: cartaoPara.trim() || null,
          cartao_mensagem: cartaoMsg.trim() || null,
        },
      });
      onSaved();
      onClose();
    } catch (e) {
      // Mensagem crua do banco ajuda mais que "erro ao salvar".
      setErro(mensagemDeErro(e, "salvar o pedido"));
    }
    setSalvando(false);
  }

  const conteudo = (
    <>
      {modoPagina ? (
        <header className="mb-2 border-b border-[var(--cream-deep)] pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--bronze)]">
            Vendas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {pedido ? `Pedido #${pedido.numero}` : "Novo pedido"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha os dados abaixo para registrar o pedido.
          </p>
        </header>
      ) : (
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {pedido ? `Pedido #${pedido.numero}` : "Novo pedido"}
          </DialogTitle>
        </DialogHeader>
      )}

      <div
        className={
          modoPagina
            ? "mx-auto w-full max-w-[1440px] space-y-4"
            : `pedido-dialog-scroll min-h-0 w-full max-w-[1440px] self-center flex-1 space-y-2 overflow-x-hidden pr-1 ${
                pedido || cartaoHabilitado
                  ? "pedido-dialog-scroll-habilitado overflow-y-auto overscroll-contain"
                  : "overflow-y-hidden"
              }`
        }
      >
        {/* Cliente cadastrado preenche tudo de uma vez; quem é novo, digita. */}
        <div className="flex gap-2">
          <BuscaAdicionar
            className="flex-1"
            placeholder={
              clientes.find((c) => c.id === clienteId)?.nome ?? "Busque aqui seu cliente cadastrado"
            }
            buscaPlaceholder="Nome ou WhatsApp…"
            vazio="Nenhum cliente com esse nome."
            grupos={[
              {
                nome: "Clientes",
                itens: clientes.map((c) => ({
                  valor: c.id,
                  rotulo: c.nome,
                  detalhe: c.whatsapp ?? undefined,
                })),
              },
            ]}
            onEscolher={(id) => {
              const c = clientes.find((x) => x.id === id);
              if (!c) return;
              setClienteId(id);
              setNome(c.nome);
              setWhatsapp(c.whatsapp ?? "");
              // Só preenche endereço vazio: se já digitou algo, não sobrescreve.
              setCep((v) => v || c.cep || "");
              setEndereco((v) => v || c.endereco || "");
              setBairro((v) => v || c.bairro || "");
              setReferencia((v) => v || c.referencia || "");
              toast.success(
                c.pedidos > 0
                  ? `${c.nome} — ${c.pedidos} pedido(s) anteriores.`
                  : `${c.nome} carregado.`,
              );
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            title="Cadastrar cliente"
            onClick={() => setNovoCliente(true)}
          >
            Cadastre um novo
          </Button>
          {clienteId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setClienteId("")}
              title="Desvincular"
            >
              limpar
            </Button>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Campo label="Cliente">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" />
          </Campo>
          <Campo label="WhatsApp">
            <Input
              value={whatsapp}
              inputMode="numeric"
              onChange={(e) => setWhatsapp(formatCelular(e.target.value))}
            />
          </Campo>
        </div>

        {/* itens */}
        <div className="rounded-2xl border border-[var(--cream-deep)] p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground">Itens</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAvulso({ nome: "", qtd: "1", valor: "" })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Produto avulso
              </Button>
              <BuscaAdicionar
                className="w-[15rem]"
                placeholder="Adicionar produto cadastrado"
                buscaPlaceholder="Buscar produto…"
                vazio="Nenhum produto com esse nome."
                grupos={gruposCatalogo.map((g) => ({
                  nome: g.nome,
                  itens: g.itens.map((p) => ({
                    valor: p.slug,
                    rotulo: p.nome,
                    detalhe: p.preco != null ? formatBRL(p.preco) : undefined,
                  })),
                }))}
                onEscolher={adicionarDoCatalogo}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Cadastrar produto sem sair do pedido"
                onClick={() => setNovoProduto(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo produto</span>
              </Button>
            </div>
          </div>

          {avulso && (
            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[var(--cream-deep)] p-3">
              <label className="block min-w-[10rem] flex-1">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  O que é
                </span>
                <Input
                  autoFocus
                  value={avulso.nome}
                  onChange={(e) => setAvulso({ ...avulso, nome: e.target.value })}
                  placeholder="Ex.: Cesta personalizada"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Qtd</span>
                <Input
                  className="w-16"
                  inputMode="numeric"
                  value={avulso.qtd}
                  onChange={(e) => setAvulso({ ...avulso, qtd: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Valor (un.)
                </span>
                <Input
                  className="w-28"
                  inputMode="decimal"
                  value={avulso.valor}
                  onChange={(e) => setAvulso({ ...avulso, valor: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && adicionarAvulso()}
                  placeholder="0,00"
                />
              </label>
              <Button onClick={adicionarAvulso} disabled={!avulso.nome.trim()}>
                Adicionar
              </Button>
              <Button variant="ghost" onClick={() => setAvulso(null)}>
                Cancelar
              </Button>
            </div>
          )}

          {itens.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum item ainda.</p>
          ) : (
            <ul className="pedido-itens-lista mt-2 max-h-24 space-y-2 overflow-y-auto pr-1">
              {itens.map((it, idx) => (
                <li
                  key={`${it.slug ?? it.nome}-${idx}`}
                  className="grid grid-cols-[1fr_4rem_6rem_2rem] items-center gap-2"
                >
                  <div className="min-w-0">
                    <Input
                      value={it.nome}
                      onChange={(e) => atualizarItem(idx, { nome: e.target.value })}
                    />
                    {it.insumos && it.insumos.length > 0 && (
                      <p
                        className="mt-0.5 truncate text-[11px] text-muted-foreground"
                        title={it.insumos.map((i) => `${i.quantidade}x ${i.nome}`).join(", ")}
                      >
                        {it.insumos.length} insumo(s)
                        {it.custo != null && ` · custo ${formatBRL(it.custo)}`}
                      </p>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={it.qtd}
                    onChange={(e) =>
                      atualizarItem(idx, { qtd: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                  <Input
                    value={it.preco != null ? String(it.preco) : ""}
                    placeholder="a combinar"
                    onChange={(e) => atualizarItem(idx, { preco: paraNumero(e.target.value) })}
                  />
                  <button
                    type="button"
                    aria-label="Remover item"
                    onClick={() => setItens((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-full p-1.5 text-foreground/40 hover:text-[var(--terracotta)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex justify-end gap-4 text-sm">
            <span className="text-muted-foreground">Subtotal {formatBRL(subtotal)}</span>
            <span className="font-medium text-foreground">Total {formatBRL(total)}</span>
          </div>
        </div>

        <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-4">
          <Campo label="Tipo">
            <select className={campoCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">—</option>
              <option value="entrega">Entrega</option>
              <option value="retirada">Retirada</option>
            </select>
          </Campo>
          {!ehRetirada && (
            <Campo label="Taxa de entrega">
              <Input
                value={taxa}
                onChange={(e) => {
                  setTaxa(e.target.value);
                  if (!freteCalc) setTaxaManual(true);
                }}
                placeholder="0,00"
                disabled={!taxaManual && !!freteCalc}
              />
              {freteCalc && !taxaManual ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {freteCalc.explicacao}{" "}
                  <button
                    type="button"
                    onClick={() => setTaxaManual(true)}
                    className="font-medium text-[var(--terracotta)] underline underline-offset-2"
                  >
                    editar à mão
                  </button>
                </p>
              ) : (
                bairroSel && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Taxa digitada à mão.{" "}
                    <button
                      type="button"
                      onClick={() => setTaxaManual(false)}
                      className="font-medium text-[var(--terracotta)] underline underline-offset-2"
                    >
                      voltar ao automático
                    </button>
                  </p>
                )
              )}
            </Campo>
          )}
          {!ehRetirada && (
            <Campo label="CEP">
              <div className="relative">
                <Input
                  value={cep}
                  inputMode="numeric"
                  onChange={(e) => setCep(formatCep(e.target.value))}
                />
                {buscandoCep && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--bronze)]" />
                )}
              </div>
              {cidadeCep && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {cidadeCep}
                </p>
              )}
            </Campo>
          )}
          {!ehRetirada && (
            <Campo label="Endereço">
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </Campo>
          )}
          {!ehRetirada && (
            <Campo label="Bairro">
              {bairros.length > 0 ? (
                <select
                  className={campoCls}
                  value={bairroId}
                  onChange={(e) => {
                    setBairroId(e.target.value);
                    const b = bairros.find((x) => x.id === e.target.value);
                    // O nome vai gravado junto: o pedido antigo continua legível
                    // mesmo se o bairro sair do cadastro depois.
                    if (b) {
                      setBairro(b.nome);
                      setTaxaManual(false);
                    } else {
                      setTaxaManual(true);
                    }
                  }}
                >
                  <option value="">Outro (digitar)</option>
                  {bairros
                    .filter((b) => b.ativo || b.id === bairroId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome} — {formatBRL(b.taxa)}
                      </option>
                    ))}
                </select>
              ) : null}
              {(!bairroId || bairros.length === 0) && (
                <Input
                  className={bairros.length > 0 ? "mt-2" : ""}
                  value={bairro}
                  onChange={(e) => {
                    setBairro(e.target.value);
                    setTaxaManual(true);
                  }}
                  placeholder="Nome do bairro"
                />
              )}
            </Campo>
          )}
          {!ehRetirada && (
            <Campo label="Quem recebe">
              <Input
                value={destNome}
                onChange={(e) => setDestNome(e.target.value)}
                placeholder="Nome de quem vai receber"
              />
            </Campo>
          )}
          {!ehRetirada && (
            <Campo label="WhatsApp de quem recebe">
              <Input
                value={destZap}
                inputMode="numeric"
                onChange={(e) => setDestZap(formatCelular(e.target.value))}
                placeholder="(48) 99999-9999"
              />
            </Campo>
          )}
          {!ehRetirada && (
            <Campo label="Ponto de referência">
              <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
            </Campo>
          )}
          <Campo label={ehRetirada ? "Data de retirada" : "Data de entrega"}>
            <Input
              type="date"
              value={dataEntrega}
              onChange={(e) => setDataEntrega(e.target.value)}
            />
          </Campo>
          <Campo label="Horário">
            <select className={campoCls} value={janela} onChange={(e) => setJanela(e.target.value)}>
              <option value="">—</option>
              {JANELAS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
              <option value="Outro">Horário marcado</option>
            </select>
            {janela === "Outro" && (
              <Input
                className="mt-2"
                value={janelaOutro}
                onChange={(e) => setJanelaOutro(e.target.value)}
                placeholder="08:00"
                autoFocus
              />
            )}
          </Campo>
          <Campo label="Pagamento">
            <select
              className={campoCls}
              value={pagamento}
              onChange={(e) => setPagamento(e.target.value)}
            >
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
              <option value="Outro">Outro</option>
            </select>
            {pagamento === "Outro" && (
              <Input
                className="mt-2"
                value={pagamentoOutro}
                onChange={(e) => setPagamentoOutro(e.target.value)}
                placeholder="Qual?"
                autoFocus
              />
            )}
          </Campo>
          <Campo label="Status">
            <select
              className={campoCls}
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusPedido)}
            >
              {STATUS_PEDIDO.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div
          className={
            cartaoHabilitado
              ? "space-y-2"
              : "grid items-end gap-2 sm:grid-cols-[minmax(0,410px)_minmax(0,1fr)]"
          }
        >
          {/* cartão que vai dentro da caixa */}
          <div className="w-full rounded-2xl border border-[var(--cream-deep)] p-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">💌 Tem cartão?</h3>
              <p className="text-xs text-muted-foreground">
                {cartaoHabilitado ? "Preencha os dados do cartão." : "Ative para adicionar um cartão ao pedido."}
              </p>
            </div>
            <Switch
              checked={cartaoHabilitado}
              onCheckedChange={setCartaoHabilitado}
              aria-label="Habilitar cartão no pedido"
            />
          </div>
          {cartaoHabilitado && (
            <div className="mt-2 grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-[0.7fr_0.7fr_1.6fr]">
              <Campo label="De">
                <Input value={cartaoDe} onChange={(e) => setCartaoDe(e.target.value)} />
              </Campo>
              <Campo label="Para">
                <Input value={cartaoPara} onChange={(e) => setCartaoPara(e.target.value)} />
              </Campo>
              <div>
                <Campo label={`Mensagem (até ${MAX_LINHAS_CARTAO} linhas)`}>
                  <Textarea
                    rows={2}
                    value={cartaoMsg}
                    onChange={(e) => {
                      // Corta na 5ª linha: é o que cabe no cartão impresso.
                      const linhas = e.target.value.split("\n");
                      setCartaoMsg(
                        linhas.length > MAX_LINHAS_CARTAO
                          ? linhas.slice(0, MAX_LINHAS_CARTAO).join("\n")
                          : e.target.value,
                      );
                    }}
                  />
                </Campo>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cartaoMsg ? cartaoMsg.split("\n").length : 0} de {MAX_LINHAS_CARTAO} linhas
                </p>
              </div>
            </div>
          )}
          </div>

          <Campo label="Observação">
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Campo>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}
      </div>

        <DialogFooter
          className={
            modoPagina
              ? "pt-1"
              : "z-30 -mx-6 shrink-0 border-t border-[var(--cream-deep)] bg-background px-6 py-3"
          }
        >
          <Button variant="outline" onClick={onClose}>
            {modoPagina ? "Voltar aos pedidos" : "Fechar"}
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pedido ? "Salvar alterações" : "Salvar pedido"}
          </Button>
        </DialogFooter>
    </>
  );

  const cadastroCliente = novoCliente ? (
    <ClienteDialog
      cliente={null}
      inicial={{ nome, whatsapp }}
      onClose={() => setNovoCliente(false)}
      onSaved={(id) => {
        if (id) setClienteId(id);
        setNovoCliente(false);
        toast.success("Cliente cadastrado e vinculado ao pedido.");
        onClienteCriado?.();
      }}
    />
  ) : null;

  const cadastroProduto = novoProduto ? (
    <QuickProductDialog
      categorias={categorias}
      produtosExistentes={produtosLocais}
      onClose={() => setNovoProduto(false)}
      onCategoriaCriada={onProdutoCriado}
      onSaved={(produto) => {
        setProdutosLocais((atuais) => [
          ...atuais.filter((item) => item.slug !== produto.slug),
          produto,
        ]);
        setItens((atuais) => [
          ...atuais,
          {
            slug: produto.slug,
            nome: produto.nome,
            preco: produto.preco,
            qtd: 1,
          },
        ]);
        setNovoProduto(false);
        onProdutoCriado?.();
      }}
    />
  ) : null;

  if (modoPagina) {
    return (
      <>
        <div className="mx-auto w-full max-w-6xl space-y-4 pb-10">
          {conteudo}
        </div>
        {cadastroCliente}
        {cadastroProduto}
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        html body [data-pedido-dialog][role="dialog"] {
          top: calc(50% + 14px) !important;
        }
      `}</style>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          data-pedido-dialog
          className="!flex !h-[calc(100dvh-88px)] !w-[calc(100vw-32px)] !max-h-[calc(100dvh-88px)] !max-w-[1760px] !min-h-0 !flex-col !overflow-hidden gap-2 px-6 py-2.5"
        >
          {conteudo}
        </DialogContent>
        {cadastroCliente}
        {cadastroProduto}
      </Dialog>
    </>
  );
}

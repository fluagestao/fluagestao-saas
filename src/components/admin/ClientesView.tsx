import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { formatarDataCurta, formatarDataLonga, hojeISO, somarDias } from "@/lib/prazo";
import { carregarPedidosDoCliente, removerCliente, salvarCliente } from "@/lib/pedidos";
import { carregarCidadeCliente, salvarCidadeCliente } from "@/lib/clientes-cidade";
import type { Cliente, ClienteComHistorico } from "@/lib/pedidos-ops.server";
import { formatBRL, statusCor, statusLabel, whatsappDoCliente, type Pedido } from "@/lib/vendas";
import { formatCelular, formatCep } from "@/lib/formato";
import { Badge } from "@/components/ui/badge";
import { Carregando, EstadoVazio, Num, PageHeader, TabelaEnvelope, useConfirmar } from "./shell";

/** Iniciais para o avatar: primeiro e último nome. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * A cor do avatar sai do próprio nome.
 *
 * Sempre a mesma para a mesma pessoa, então o olho começa a reconhecer quem é
 * antes de ler — que é o ponto de ter avatar numa lista sem foto.
 */
function corDoNome(nome: string): string {
  const paleta = ["#A12820", "#B8893B", "#4A6B4A", "#3d5a66", "#C25B7C", "#7A6A5E"];
  let soma = 0;
  for (const c of nome) soma += c.charCodeAt(0);
  return paleta[soma % paleta.length];
}

/** "Hoje", "Ontem", "21 ago" — data absoluta só quando já não é recente. */
function quando(iso: string | null): string {
  if (!iso) return "—";
  const hoje = hojeISO();
  if (iso === hoje) return "Hoje";
  if (iso === somarDias(hoje, -1)) return "Ontem";
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const [ano, mes, dia] = iso.split("-").map(Number);
  const mesmoAno = String(ano) === hoje.slice(0, 4);
  return `${dia} ${meses[mes - 1]}${mesmoAno ? "" : ` ${ano}`}`;
}

/**
 * Selo de frequência.
 *
 * Duas compras já é alguém que voltou — e voltar é o mais difícil. A partir de
 * cinco é cliente da casa, e isso muda o tom da conversa.
 */
function selo(pedidos: number): { label: string; cor: string; forte: boolean } | null {
  if (pedidos >= 5) return { label: "Cliente da casa", cor: "var(--terracotta)", forte: true };
  if (pedidos > 1) return { label: "Recorrente", cor: "var(--bronze)", forte: false };
  return null;
}

type Ordem = "nome" | "recente" | "gasto" | "pedidos";

const ORDENS: { v: Ordem; label: string }[] = [
  { v: "nome", label: "Nome A–Z" },
  { v: "recente", label: "Última compra" },
  { v: "gasto", label: "Maior gasto" },
  { v: "pedidos", label: "Mais pedidos" },
];

export function ClientesView({
  clientes,
  onChange,
}: {
  clientes: ClienteComHistorico[];
  onChange: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("recente");
  const [soRecorrentes, setSoRecorrentes] = useState(false);
  const [editando, setEditando] = useState<Cliente | "novo" | null>(null);
  const [vendo, setVendo] = useState<ClienteComHistorico | null>(null);
  const confirmar = useConfirmar();

  const recorrentes = clientes.filter((c) => c.pedidos > 1).length;

  const lista = useMemo(() => {
    // Sem acento e sem caixa: quem procura "adelia" tem que achar "Adélia".
    const norm = (v: string) =>
      v
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .trim();
    const b = norm(busca);
    const digitos = busca.replace(/\D/g, "");

    const filtrados = clientes.filter((c) => {
      if (soRecorrentes && c.pedidos < 2) return false;
      if (!b) return true;
      if (norm(c.nome).includes(b)) return true;
      if (norm([c.endereco, c.bairro].filter(Boolean).join(" ")).includes(b)) return true;
      // Só compara telefone quando a busca TEM dígito: `includes("")` é sempre
      // verdadeiro, e isso fazia toda busca por nome devolver a lista inteira.
      return digitos.length > 0 && (c.whatsapp ?? "").replace(/\D/g, "").includes(digitos);
    });

    return [...filtrados].sort((a, b2) => {
      if (ordem === "gasto") return b2.gasto - a.gasto;
      if (ordem === "pedidos") return b2.pedidos - a.pedidos || b2.gasto - a.gasto;
      if (ordem === "recente") return (b2.ultimo ?? "").localeCompare(a.ultimo ?? "");
      return a.nome.localeCompare(b2.nome, "pt-BR");
    });
  }, [clientes, busca, ordem, soRecorrentes]);

  async function excluir(c: ClienteComHistorico) {
    const ok = await confirmar({
      titulo: `Excluir ${c.nome}?`,
      descricao: "Os pedidos dela continuam no sistema — só o cadastro sai.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    try {
      await removerCliente({ data: { id: c.id } });
      toast.success("Cliente excluído.");
      onChange();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir"));
    }
  }

  return (
    <section>
      <PageHeader
        titulo="Clientes"
        descricao={
          <>
            {clientes.length} cadastrado{clientes.length === 1 ? "" : "s"}
            {recorrentes > 0 && ` · ${recorrentes} que já voltaram`}
          </>
        }
        acoes={
          <Button onClick={() => setEditando("novo")}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo cliente
          </Button>
        }
      />

      {/* busca, filtro e ordenação numa linha só */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bronze)]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou endereço…"
            className="h-10 pl-9"
          />
        </div>

        {/* Filtro e ordem separados de propósito: misturar os dois em chips
            iguais faz a pessoa achar que "Maior gasto" esconde clientes. */}
        <div className="flex rounded-full border border-[var(--cream-deep)] bg-card p-0.5">
          {[
            { v: false, label: "Todos" },
            { v: true, label: "Recorrentes" },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setSoRecorrentes(o.v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                soRecorrentes === o.v
                  ? "bg-[var(--terracotta)] text-[var(--cream-soft)]"
                  : "text-foreground/70 hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10">
              <ArrowUpDown className="mr-1.5 h-4 w-4" />
              {ORDENS.find((o) => o.v === ordem)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ORDENS.map((o) => (
              <DropdownMenuItem key={o.v} onClick={() => setOrdem(o.v)}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          titulo={busca || soRecorrentes ? "Nada encontrado" : "Nenhum cliente cadastrado"}
          descricao={
            busca || soRecorrentes
              ? "Tente outro termo ou volte para “Todos”."
              : "Quem comprar passa a entrar aqui sozinho. Ou cadastre à mão."
          }
        />
      ) : (
        <div className="mt-4">
          <TabelaEnvelope>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Local</TableHead>
                  <TableHead className="w-[6rem] text-right">Pedidos</TableHead>
                  <TableHead className="w-[9rem] text-right">Total gasto</TableHead>
                  <TableHead className="hidden w-[9rem] sm:table-cell">Última compra</TableHead>
                  <TableHead className="w-[3rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => {
                  const marca = selo(c.pedidos);
                  const wa = whatsappDoCliente(c.whatsapp);
                  return (
                    <TableRow
                      key={c.id}
                      onClick={() => setVendo(c)}
                      className="group cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span
                            aria-hidden
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: corDoNome(c.nome) }}
                          >
                            {iniciais(c.nome)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-foreground">{c.nome}</span>
                              {marca && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    color: marca.cor,
                                    backgroundColor: marca.forte
                                      ? "rgba(161,40,32,0.10)"
                                      : "rgba(184,137,59,0.12)",
                                  }}
                                >
                                  <Star className="h-2.5 w-2.5" fill="currentColor" />
                                  {marca.label}
                                </span>
                              )}
                            </div>
                            <span className="block text-xs text-muted-foreground">
                              {c.whatsapp ?? "sem WhatsApp"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {c.bairro || c.endereco || "—"}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Num className="text-foreground">{c.pedidos}</Num>
                      </TableCell>

                      <TableCell className="text-right">
                        <Num className="font-medium text-foreground">{formatBRL(c.gasto)}</Num>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{quando(c.ultimo)}</span>
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          {/* WhatsApp só no hover: é a ação mais usada, mas não
                              precisa estar acesa em todas as linhas o tempo todo. */}
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chamar no WhatsApp"
                              className="rounded-full p-1.5 text-foreground/30 opacity-0 transition-opacity hover:text-[var(--whatsapp)] focus:opacity-100 group-hover:opacity-100"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Ações"
                                className="rounded-full p-1.5 text-foreground/40 hover:text-foreground"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setVendo(c)}>
                                Ver cliente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditando(c)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Editar cadastro
                              </DropdownMenuItem>
                              {wa && (
                                <DropdownMenuItem asChild>
                                  <a href={wa} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="mr-2 h-3.5 w-3.5" />
                                    Chamar no WhatsApp
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => excluir(c)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabelaEnvelope>
        </div>
      )}

      {vendo && (
        <PainelCliente
          cliente={vendo}
          onClose={() => setVendo(null)}
          onEditar={() => {
            setEditando(vendo);
            setVendo(null);
          }}
        />
      )}

      {editando && (
        <ClienteDialog
          cliente={editando === "novo" ? null : editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            onChange();
          }}
        />
      )}
    </section>
  );
}

/**
 * Painel lateral do cliente: resumo e histórico sem sair da lista.
 *
 * Abrir página nova para consultar uma compra antiga tira a pessoa do lugar
 * onde ela estava — e ela quase sempre quer voltar e olhar o próximo.
 */
function PainelCliente({
  cliente: c,
  onClose,
  onEditar,
}: {
  cliente: ClienteComHistorico;
  onClose: () => void;
  onEditar: () => void;
}) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const wa = whatsappDoCliente(c.whatsapp);

  useEffect(() => {
    carregarPedidosDoCliente({ data: { cliente_id: c.id } })
      .then((r) => setPedidos(r.pedidos as Pedido[]))
      .catch((e) => setErro(mensagemDeErro(e, "carregar o histórico")));
  }, [c.id]);

  const total = (pedidos ?? []).reduce((t, p) => t + p.total, 0);
  const marca = selo(c.pedidos);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-left">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: corDoNome(c.nome) }}
            >
              {iniciais(c.nome)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-semibold tracking-tight">{c.nome}</span>
              {marca && (
                <span className="text-xs font-normal" style={{ color: marca.cor }}>
                  ★ {marca.label}
                </span>
              )}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1 text-sm">
          {c.whatsapp && <p className="text-muted-foreground">📱 {c.whatsapp}</p>}
          {(c.endereco || c.bairro) && (
            <p className="text-muted-foreground">
              📍 {[c.endereco, c.bairro].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[var(--cream-soft)] p-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--bronze)]">Pedidos</p>
            <Num className="font-semibold">{c.pedidos}</Num>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--bronze)]">Já gastou</p>
            <Num className="font-semibold">{formatBRL(c.gasto)}</Num>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--bronze)]">Ticket</p>
            <Num className="font-semibold">
              {formatBRL(c.pedidos > 0 ? c.gasto / c.pedidos : 0)}
            </Num>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                Chamar no WhatsApp
              </Button>
            </a>
          )}
          <Button variant="outline" onClick={onEditar}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Editar
          </Button>
        </div>

        <h3 className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-[var(--bronze)]">
          Histórico
        </h3>

        {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
        {!pedidos && !erro && <Carregando />}
        {pedidos && pedidos.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido ainda.</p>
        )}

        {pedidos && pedidos.length > 0 && (
          <>
            <ul className="mt-2 space-y-2">
              {pedidos.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border border-[var(--cream-deep)] bg-card px-3 py-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      #{p.numero}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {p.data_entrega
                          ? formatarDataLonga(p.data_entrega)
                          : p.created_at
                            ? formatarDataCurta(p.created_at.slice(0, 10))
                            : ""}
                      </span>
                    </span>
                    <Num className="text-sm font-medium">{formatBRL(p.total)}</Num>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {p.itens.map((i) => `${i.qtd}x ${i.nome}`).join(" · ") || "sem itens"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <Badge variant="outline" style={{ borderColor: statusCor(p.status) }}>
                      {statusLabel(p.status)}
                    </Badge>
                    {p.forma_pagamento && <Badge variant="outline">{p.forma_pagamento}</Badge>}
                    {!p.recebido_em && <Badge variant="destructive">a receber</Badge>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-right text-sm text-muted-foreground">
              {pedidos.length} pedido(s) · <strong>{formatBRL(total)}</strong>
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function ClienteDialog({
  cliente: c,
  onClose,
  onSaved,
  inicial,
}: {
  cliente: Cliente | null;
  onClose: () => void;
  onSaved: (cliente: { id: string; nome: string; whatsapp: string }) => void;
  /** Preenche quando o cadastro é aberto de dentro de um pedido. */
  inicial?: { nome?: string; whatsapp?: string };
}) {
  const [nome, setNome] = useState(c?.nome ?? inicial?.nome ?? "");
  const [whatsapp, setWhatsapp] = useState(c?.whatsapp ?? inicial?.whatsapp ?? "");
  const [email, setEmail] = useState(c?.email ?? "");
  const [documento, setDocumento] = useState(c?.documento ?? "");
  const [cep, setCep] = useState(c?.cep ?? "");
  const [cidade, setCidade] = useState("");
  const [endereco, setEndereco] = useState(c?.endereco ?? "");
  const [bairro, setBairro] = useState(c?.bairro ?? "");
  const [referencia, setReferencia] = useState(c?.referencia ?? "");
  const [aniversario, setAniversario] = useState(
    c ? c.aniversario ?? "" : "",
  );
  const [observacao, setObservacao] = useState(c?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!c?.id) {
      setCidade("");
      return () => {
        ativo = false;
      };
    }

    carregarCidadeCliente({ data: { id: c.id } })
      .then((r) => {
        if (ativo) setCidade(r.cidade ?? "");
      })
      .catch(() => {
        if (ativo) setCidade("");
      });

    return () => {
      ativo = false;
    };
  }, [c?.id]);

  /** Mesmo comportamento do pedido: CEP completo puxa rua, bairro e cidade. */
  async function buscarCep(valor: string) {
    const d = valor.replace(/\D/g, "");
    if (d.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = (await r.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
      };
      if (j.erro) return;
      if (j.logradouro) setEndereco(j.logradouro);
      if (j.bairro) setBairro(j.bairro);
      if (j.localidade) setCidade(j.localidade);
    } catch {
      /* sem rede: digita à mão */
    }
  }

  async function salvar() {
    if (!nome.trim()) {
      setErro("O nome completo é obrigatório.");
      return;
    }
    if (!whatsapp.trim()) {
      setErro("O WhatsApp é obrigatório.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const r = await salvarCliente({
        data: {
          ...(c ? { id: c.id } : {}),
          nome: nome.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim() || null,
          documento: documento.trim() || null,
          cep: cep.trim() || null,
          endereco: endereco.trim() || null,
          bairro: bairro.trim() || null,
          referencia: referencia.trim() || null,
          aniversario: aniversario || null,
          observacao: observacao.trim() || null,
          ativo: true,
        },
      });
      await salvarCidadeCliente({
        data: { id: r.id, cidade: cidade.trim() || null },
      });
      toast.success(c ? "Cliente atualizado." : `"${nome.trim()}" cadastrado.`);
      onSaved({
        id: r.id,
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
      });
      onClose();
    } catch (e) {
      setErro(mensagemDeErro(e, "salvar"));
    }
    setSalvando(false);
  }

  const campo = (label: string, node: React.ReactNode) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {node}
    </label>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {c ? c.nome : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>

        {c && "pedidos" in c && (
          <p className="-mt-2 text-sm text-muted-foreground">
            {(c as ClienteComHistorico).pedidos} pedido(s) ·{" "}
            {formatBRL((c as ClienteComHistorico).gasto)}
            {(c as ClienteComHistorico).ultimo &&
              ` · última em ${formatarDataLonga((c as ClienteComHistorico).ultimo!)}`}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {campo(
            "Nome completo *",
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              required
              autoFocus
            />,
          )}
          {campo(
            "WhatsApp *",
            <Input
              value={whatsapp}
              inputMode="numeric"
              onChange={(e) => setWhatsapp(formatCelular(e.target.value))}
              placeholder="(00) 00000-0000"
              required
            />,
          )}
          {campo("E-mail", <Input value={email} onChange={(e) => setEmail(e.target.value)} />)}
          {campo("CPF", <Input value={documento} onChange={(e) => setDocumento(e.target.value)} />)}
          {campo(
            "CEP",
            <Input
              value={cep}
              inputMode="numeric"
              onChange={(e) => {
                const v = formatCep(e.target.value);
                setCep(v);
                buscarCep(v);
              }}
            />,
          )}
          {campo("Cidade", <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />)}
          {campo(
            "Endereço",
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />,
          )}
          {campo("Bairro", <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />)}
          {campo(
            "Ponto de referência",
            <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />,
          )}
          {campo(
            "Aniversário",
            <Input
              type="date"
              value={aniversario || ""}
              onChange={(e) => setAniversario(e.target.value)}
              autoComplete="off"
            />,
          )}
        </div>

        <p className="-mt-2 text-xs text-muted-foreground">
          O aniversário serve pra lembrar de oferecer no mês certo — é presente que se vende aqui.
        </p>

        {campo(
          "Observação",
          <Textarea rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} />,
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Histórico de compras do cliente.
 *
 * Abre pelo nome na lista. Mostra pedido a pedido — data, itens, forma de
 * pagamento e valor — porque a pergunta que se faz na frente do cliente é "o
 * que ela costuma levar?", e não só quanto gastou no total.
 */

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mensagemDeErro } from "@/lib/erros";
import { formatCelular } from "@/lib/formato";
import {
  carregarFornecedores,
  criarTipoFornecedor,
  excluirTipoFornecedor,
  removerFornecedor,
  salvarFornecedor,
} from "@/lib/fornecedores";
import type { Fornecedor, TipoFornecedor } from "@/lib/fornecedores-ops.server";
import { formatBRL, whatsappDoCliente } from "@/lib/vendas";
import { Carregando, EstadoVazio, Num, PageHeader, TabelaEnvelope, useConfirmar } from "./shell";

type Linha = Fornecedor & { gasto: number };

/**
 * Cadastro de fornecedores.
 *
 * São poucos e repetem sempre, então a tela é uma lista editável direto: clicou
 * no campo, mudou, saiu — salvou. Sem diálogo para três campos.
 */
export function FornecedoresView() {
  const [lista, setLista] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Linha | null>(null);
  const [tiposAberto, setTiposAberto] = useState(false);
  const confirmar = useConfirmar();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarFornecedores();
      setLista(d.fornecedores as Linha[]);
      setTipos(d.tipos);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os fornecedores"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function atualizar(f: Linha, mudanca: Partial<Fornecedor>) {
    try {
      await salvarFornecedor({
        data: {
          id: f.id,
          nome: mudanca.nome ?? f.nome,
          telefone: mudanca.telefone !== undefined ? mudanca.telefone : f.telefone,
          fornece: mudanca.fornece !== undefined ? mudanca.fornece : f.fornece,
          observacao: f.observacao,
          ativo: mudanca.ativo ?? f.ativo,
          // Sem estes, editar o telefone na tabela apagaria documento,
          // endereco e tipo — o save manda a linha inteira.
          documento: f.documento ?? null,
          endereco: f.endereco ?? null,
          cidade: f.cidade ?? null,
          tipo_fornecedor_id: f.tipo_fornecedor_id ?? null,
        },
      });
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar"));
      recarregar();
    }
  }

  async function excluir(f: Linha) {
    const ok = await confirmar({
      titulo: `Excluir "${f.nome}"?`,
      descricao: "As compras já lançadas continuam no financeiro, com o nome digitado.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    try {
      await removerFornecedor({ data: { id: f.id } });
      toast.success(`"${f.nome}" excluído.`);
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir"));
    }
  }

  return (
    <section>
      <PageHeader
        titulo="Fornecedores"
        descricao="Quem vende pra vocês. O nome cadastrado aparece como sugestão ao lançar um pagamento."
        acoes={
          <Button
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
            className="h-10 rounded-full"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Novo fornecedor
          </Button>
        }
      />

      {erro && (
        <p className="mt-4 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}
      {carregando && <Carregando />}

      {!carregando && !erro && lista.length === 0 && (
        <EstadoVazio
          titulo="Nenhum fornecedor ainda"
          descricao="Use Novo fornecedor. Só o nome já basta — o resto é opcional."
        />
      )}

      {lista.length > 0 && (
        <div className="mt-4">
          <TabelaEnvelope>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="hidden sm:table-cell">O que fornece</TableHead>
                  <TableHead className="hidden w-[9rem] lg:table-cell">Tipo</TableHead>
                  <TableHead className="w-[11rem]">Contato</TableHead>
                  <TableHead className="w-[9rem] text-right">Já comprado</TableHead>
                  <TableHead className="w-[6rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((f) => {
                  const wa = whatsappDoCliente(f.telefone);
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Input
                          className="h-8"
                          defaultValue={f.nome}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== f.nome) atualizar(f, { nome: v });
                          }}
                        />
                        {!f.ativo && (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Input
                          className="h-8"
                          defaultValue={f.fornece ?? ""}
                          placeholder="frios, embalagens…"
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (f.fornece ?? "")) atualizar(f, { fornece: v || null });
                          }}
                        />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {f.tipo_fornecedor ? (
                          <Badge variant="outline" className="text-[11px]">
                            {f.tipo_fornecedor}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8"
                          defaultValue={f.telefone ?? ""}
                          inputMode="numeric"
                          placeholder="(48) 99999-9999"
                          onBlur={(e) => {
                            const v = formatCelular(e.target.value).trim();
                            if (v !== (f.telefone ?? "")) atualizar(f, { telefone: v || null });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Num className="text-muted-foreground">{formatBRL(f.gasto)}</Num>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Abrir conversa"
                              className="rounded-full p-1.5 text-foreground/40 hover:text-[var(--whatsapp)]"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            aria-label="Editar cadastro"
                            title="Editar cadastro completo"
                            onClick={() => {
                              setEditando(f);
                              setFormAberto(true);
                            }}
                            className="rounded-full p-1.5 text-foreground/40 hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Excluir"
                            onClick={() => excluir(f)}
                            className="rounded-full p-1.5 text-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      <DialogoFornecedor
        aberto={formAberto}
        editando={editando}
        tipos={tipos}
        onAbrirTipos={() => setTiposAberto(true)}
        onFechar={() => {
          setFormAberto(false);
          setEditando(null);
        }}
        onSalvo={recarregar}
      />

      <DialogoTipos
        aberto={tiposAberto}
        tipos={tipos}
        onFechar={() => setTiposAberto(false)}
        onMudou={recarregar}
      />

    </section>
  );
}

/** CPF e CNPJ na tela; o banco guarda só os dígitos. */
function formatarDocumento(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function DialogoFornecedor({
  aberto,
  editando,
  tipos,
  onAbrirTipos,
  onFechar,
  onSalvo,
}: {
  aberto: boolean;
  editando: (Fornecedor & { gasto: number }) | null;
  tipos: TipoFornecedor[];
  onAbrirTipos: () => void;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState("");
  const [fornece, setFornece] = useState("");
  const [telefone, setTelefone] = useState("");
  const [documento, setDocumento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setNome(editando?.nome ?? "");
    setFornece(editando?.fornece ?? "");
    setTelefone(editando?.telefone ?? "");
    setDocumento(formatarDocumento(editando?.documento ?? ""));
    setEndereco(editando?.endereco ?? "");
    setCidade(editando?.cidade ?? "");
    setTipoId(editando?.tipo_fornecedor_id ?? "");
    setObservacao(editando?.observacao ?? "");
  }, [aberto, editando]);

  const digitos = documento.replace(/\D/g, "");
  const documentoValido = digitos === "" || digitos.length === 11 || digitos.length === 14;

  async function salvar() {
    if (!nome.trim() || salvando || !documentoValido) return;
    setSalvando(true);
    try {
      await salvarFornecedor({
        data: {
          ...(editando ? { id: editando.id } : {}),
          nome: nome.trim(),
          fornece: fornece.trim() || null,
          telefone: telefone.trim() || null,
          documento: documento || null,
          endereco: endereco.trim() || null,
          cidade: cidade.trim() || null,
          tipo_fornecedor_id: tipoId || null,
          observacao: observacao.trim() || null,
          ativo: editando?.ativo ?? true,
        },
      });
      toast.success(editando ? "Fornecedor atualizado." : "Fornecedor cadastrado.");
      onSalvo();
      onFechar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o fornecedor"));
    }
    setSalvando(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>{editando ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>
            Só o nome é obrigatório. O resto é para achar e cobrar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome</span>
            <Input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} className="h-10" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">O que fornece</span>
            <Input value={fornece} onChange={(e) => setFornece(e.target.value)} placeholder="frios, embalagens…" maxLength={120} className="h-10" />
          </label>

          <div className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</span>
            <div className="flex h-10 overflow-hidden rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
              <select
                value={tipoId}
                onChange={(e) => setTipoId(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                aria-label="Tipo de fornecedor"
              >
                <option value="">Sem tipo</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAbrirTipos}
                className="grid w-10 shrink-0 place-items-center border-l border-input text-[var(--terracotta)] transition hover:bg-[var(--cream)]"
                aria-label="Gerenciar tipos de fornecedor"
                title="Gerenciar tipos de fornecedor"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Telefone</span>
            <Input value={telefone} inputMode="numeric" onChange={(e) => setTelefone(formatCelular(e.target.value))} className="h-10" placeholder="(48) 99999-9999" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">CPF ou CNPJ</span>
            <Input
              value={documento}
              inputMode="numeric"
              onChange={(e) => setDocumento(formatarDocumento(e.target.value))}
              className={cn("h-10", !documentoValido && "border-destructive")}
              placeholder="Só se você tiver"
            />
            {!documentoValido && (
              <span className="mt-1 block text-xs text-destructive">
                CPF tem 11 dígitos e CNPJ tem 14.
              </span>
            )}
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Endereço</span>
            <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} maxLength={200} className="h-10" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Cidade</span>
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={80} className="h-10" />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Observação</span>
            <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} maxLength={500} className="h-10" />
          </label>
        </div>

        <DialogFooter className="pt-1">
          <Button variant="outline" onClick={onFechar} className="rounded-full">
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={!nome.trim() || salvando || !documentoValido} className="rounded-full">
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Mini tela dos tipos: só criar e excluir, que é o que a lista precisa. */
function DialogoTipos({
  aberto,
  tipos,
  onFechar,
  onMudou,
}: {
  aberto: boolean;
  tipos: TipoFornecedor[];
  onFechar: () => void;
  onMudou: () => void;
}) {
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function criar() {
    const limpo = nome.trim();
    if (!limpo || salvando) return;
    setSalvando(true);
    try {
      await criarTipoFornecedor({ data: { nome: limpo } });
      setNome("");
      onMudou();
    } catch (e) {
      toast.error(mensagemDeErro(e, "criar o tipo"));
    }
    setSalvando(false);
  }

  async function excluir(tipo: TipoFornecedor) {
    try {
      await excluirTipoFornecedor({ data: { id: tipo.id } });
      onMudou();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir o tipo"));
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Tipos de fornecedor</DialogTitle>
          <DialogDescription>
            Supermercado, boutique, indústria — como você separa quem te vende.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criar()}
            placeholder="Ex.: supermercado"
            maxLength={60}
            className="h-10"
          />
          <Button onClick={criar} disabled={!nome.trim() || salvando} className="h-10 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {tipos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado ainda.</p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {tipos.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--cream-deep)] px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{t.nome}</span>
                <button
                  type="button"
                  onClick={() => excluir(t)}
                  aria-label={`Excluir ${t.nome}`}
                  className="shrink-0 rounded-full p-1 text-foreground/40 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Excluir um tipo não apaga fornecedor: quem usava fica sem tipo.
        </p>
      </DialogContent>
    </Dialog>
  );
}

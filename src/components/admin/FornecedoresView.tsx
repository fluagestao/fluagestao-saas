import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { carregarFornecedores, removerFornecedor, salvarFornecedor } from "@/lib/fornecedores";
import type { Fornecedor } from "@/lib/fornecedores-ops.server";
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
  const [novo, setNovo] = useState({ nome: "", telefone: "", fornece: "" });
  const confirmar = useConfirmar();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarFornecedores();
      setLista(d.fornecedores as Linha[]);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os fornecedores"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionar() {
    if (!novo.nome.trim()) return;
    try {
      await salvarFornecedor({
        data: {
          nome: novo.nome.trim(),
          telefone: novo.telefone.trim() || null,
          fornece: novo.fornece.trim() || null,
          observacao: null,
          ativo: true,
        },
      });
      toast.success(`"${novo.nome.trim()}" cadastrado.`);
      setNovo({ nome: "", telefone: "", fornece: "" });
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "cadastrar o fornecedor"));
    }
  }

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
        descricao="Quem vende pra vocês. O nome cadastrado aparece como sugestão ao lançar uma saída."
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
          descricao="Cadastre no campo abaixo — nome já basta."
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

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[var(--cream-deep)] p-3">
        <Input
          className="h-10 min-w-[10rem] flex-1"
          value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="Nome do fornecedor"
        />
        <Input
          className="h-10 w-44"
          value={novo.fornece}
          onChange={(e) => setNovo({ ...novo, fornece: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="O que fornece"
        />
        <Input
          className="h-10 w-40"
          value={novo.telefone}
          inputMode="numeric"
          onChange={(e) => setNovo({ ...novo, telefone: formatCelular(e.target.value) })}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="(48) 99999-9999"
        />
        <Button className="h-10" onClick={adicionar} disabled={!novo.nome.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Cadastrar
        </Button>
      </div>
    </section>
  );
}

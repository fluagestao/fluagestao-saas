import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  carregarBairros,
  removerBairro,
  salvarAdicionalDomingo,
  salvarBairro,
} from "@/lib/bairros";
import type { Bairro } from "@/lib/frete";
import { formatBRL } from "@/lib/vendas";
import { paraNumero as paraNumeroBase } from "@/lib/numero";
import {
  EstadoVazio,
  Num,
  PageHeader,
  TabelaEnvelope,
  TabelaSkeleton,
  useConfirmar,
} from "./shell";

/** Aceita "12,50" e "12.50". */
/* Contrato local preservado: esta tela ja tratava vazio como zero. A LEITURA
   e que virou uma so, em lib/numero.ts — antes cada arquivo tinha a sua e tres
   das quatro erravam o ponto de milhar. */
function paraNumero(texto: string): number {
  return paraNumeroBase(texto) ?? 0;
}

export function BairrosView() {
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [domingo, setDomingo] = useState("5");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaTaxa, setNovaTaxa] = useState("");
  const confirmar = useConfirmar();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarBairros();
      setBairros(d.bairros as Bairro[]);
      setDomingo(String(d.adicional_domingo));
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os bairros"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionar() {
    if (!novoNome.trim()) return;
    try {
      await salvarBairro({
        data: {
          nome: novoNome.trim(),
          taxa: paraNumero(novaTaxa),
          observacao: null,
          ordem: bairros.length,
          ativo: true,
        },
      });
      toast.success(`"${novoNome.trim()}" cadastrado.`);
      setNovoNome("");
      setNovaTaxa("");
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "cadastrar o bairro"));
    }
  }

  async function atualizar(b: Bairro, mudanca: Partial<Bairro>) {
    try {
      await salvarBairro({
        data: {
          id: b.id,
          nome: mudanca.nome ?? b.nome,
          taxa: mudanca.taxa ?? b.taxa,
          observacao: mudanca.observacao !== undefined ? mudanca.observacao : b.observacao,
          ordem: b.ordem,
          ativo: mudanca.ativo ?? b.ativo,
        },
      });
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o bairro"));
      recarregar();
    }
  }

  async function excluir(b: Bairro) {
    const ok = await confirmar({
      titulo: `Excluir o bairro "${b.nome}"?`,
      descricao: "Os pedidos antigos guardam o nome do bairro, então não perdem a informação.",
      confirmar: "Excluir",
      destrutivo: true,
    });
    if (!ok) return;
    try {
      await removerBairro({ data: { id: b.id } });
      toast.success(`"${b.nome}" excluído.`);
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "excluir o bairro"));
    }
  }

  async function guardarDomingo() {
    try {
      await salvarAdicionalDomingo({ data: { valor: paraNumero(domingo) } });
      toast.success("Adicional de domingo atualizado.");
    } catch (e) {
      toast.error(mensagemDeErro(e, "salvar o adicional de domingo"));
      recarregar();
    }
  }

  if (erro) {
    return (
      <section>
        <PageHeader titulo="Bairros" />
        <p className="rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">{erro}</p>
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        titulo="Bairros"
        descricao="Valor da entrega por bairro. No pedido, escolher o bairro já preenche a taxa."
      />

      {/* adicional de domingo: regra que vale pra todos os bairros */}
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-card)]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Adicional de domingo
          </span>
          <Input
            className="h-9 w-28"
            inputMode="decimal"
            value={domingo}
            onChange={(e) => setDomingo(e.target.value)}
            onBlur={guardarDomingo}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Somado automaticamente a qualquer bairro quando a data de entrega cai num domingo. No
          pedido dá pra sobrescrever à mão em caso especial.
        </p>
      </div>

      {carregando && (
        <div className="mt-4">
          <TabelaEnvelope>
            <TabelaSkeleton linhas={5} colunas={4} />
          </TabelaEnvelope>
        </div>
      )}

      {!carregando && bairros.length === 0 && (
        <EstadoVazio
          titulo="Nenhum bairro cadastrado"
          descricao="Cadastre os bairros que vocês atendem com o valor da entrega."
        />
      )}

      {!carregando && bairros.length > 0 && (
        <div className="mt-4">
          <TabelaEnvelope>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Bairro</TableHead>
                  <TableHead className="w-[9rem] text-right">Taxa</TableHead>
                  <TableHead className="w-[10rem] text-right">Com domingo</TableHead>
                  <TableHead className="w-[7rem]">Situação</TableHead>
                  <TableHead className="w-[3rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bairros.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Input
                        className="h-8"
                        defaultValue={b.nome}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== b.nome) atualizar(b, { nome: v });
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        className="h-8 text-right"
                        inputMode="decimal"
                        defaultValue={String(b.taxa)}
                        onBlur={(e) => {
                          const v = paraNumero(e.target.value);
                          if (v !== b.taxa) atualizar(b, { taxa: v });
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Num className="text-muted-foreground">
                        {formatBRL(b.taxa + paraNumero(domingo))}
                      </Num>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => atualizar(b, { ativo: !b.ativo })}
                        title={b.ativo ? "Desativar" : "Reativar"}
                      >
                        <Badge variant={b.ativo ? "secondary" : "outline"}>
                          {b.ativo ? "ativo" : "inativo"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        aria-label="Excluir bairro"
                        onClick={() => excluir(b)}
                        className="rounded-full p-1.5 text-foreground/40 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabelaEnvelope>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-[var(--cream-deep)] p-3">
        <Input
          className="h-9 max-w-xs flex-1"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="Novo bairro"
        />
        <Input
          className="h-9 w-28"
          inputMode="decimal"
          value={novaTaxa}
          onChange={(e) => setNovaTaxa(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionar()}
          placeholder="0,00"
        />
        <Button onClick={adicionar} disabled={!novoNome.trim()}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar
        </Button>
      </div>
    </section>
  );
}

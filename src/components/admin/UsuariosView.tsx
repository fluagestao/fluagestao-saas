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
import { carregarUsuarios, criarUsuario, removerUsuario } from "@/lib/usuarios";
import type { Usuario } from "@/lib/usuarios-ops.server";
import { Carregando, PageHeader, TabelaEnvelope, useConfirmar } from "./shell";

/** Senha fácil de ditar por telefone e difícil de adivinhar. */
function senhaSugerida(): string {
  const palavras = ["cesta", "cafe", "brunch", "tabua", "presente", "manha", "caixa", "sabor"];
  const p = palavras[Math.floor(Math.random() * palavras.length)];
  return `${p}${Math.floor(Math.random() * 9000) + 1000}`;
}

export function UsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [eu, setEu] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState({ nome: "", email: "", senha: senhaSugerida() });
  const [salvando, setSalvando] = useState(false);
  const confirmar = useConfirmar();

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const d = await carregarUsuarios();
      setUsuarios(d.usuarios as Usuario[]);
      setEu(d.eu ?? "");
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os usuários"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionar() {
    if (!novo.email.trim() || salvando) return;
    setSalvando(true);
    try {
      await criarUsuario({
        data: { email: novo.email.trim(), senha: novo.senha, nome: novo.nome.trim() },
      });
      toast.success(`Acesso criado. Passe o e-mail e a senha "${novo.senha}" para a pessoa.`, {
        duration: 12000,
      });
      setNovo({ nome: "", email: "", senha: senhaSugerida() });
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "criar o acesso"), { duration: 10000 });
    }
    setSalvando(false);
  }

  async function remover(u: Usuario) {
    const ok = await confirmar({
      titulo: `Tirar o acesso de ${u.nome ?? u.email}?`,
      descricao: "A conta é apagada e a pessoa não entra mais. Os dados do sistema ficam.",
      confirmar: "Tirar acesso",
      destrutivo: true,
    });
    if (!ok) return;
    try {
      await removerUsuario({ data: { email: u.email } });
      toast.success("Acesso removido.");
      recarregar();
    } catch (e) {
      toast.error(mensagemDeErro(e, "remover o acesso"), { duration: 8000 });
    }
  }

  return (
    <section>
      <PageHeader
        titulo="Usuários"
        descricao="Quem pode entrar no sistema. A senha aparece uma vez na tela — anote e passe para a pessoa."
      />

      {erro && (
        <p className="mt-4 rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}
      {carregando && <Carregando />}

      {!carregando && !erro && (
        <div className="mt-4">
          <TabelaEnvelope>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pessoa</TableHead>
                  <TableHead className="w-[6rem]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell>
                      <span className="font-medium text-foreground">{u.nome ?? u.email}</span>
                      {u.email.toLowerCase() === eu.toLowerCase() && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px]">
                          você
                        </Badge>
                      )}
                      {!u.temConta && (
                        <Badge variant="destructive" className="ml-1.5 text-[10px]">
                          sem senha
                        </Badge>
                      )}
                      <span className="block text-xs text-muted-foreground">{u.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {u.email.toLowerCase() !== eu.toLowerCase() && (
                          <button
                            type="button"
                            title="Tirar acesso"
                            onClick={() => remover(u)}
                            className="rounded-full p-1.5 text-foreground/40 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabelaEnvelope>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-dashed border-[var(--cream-deep)] p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[9rem] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome</span>
            <Input
              className="h-10"
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Como chamar a pessoa"
            />
          </label>
          <label className="block min-w-[12rem] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">E-mail</span>
            <Input
              className="h-10"
              type="email"
              value={novo.email}
              onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
              placeholder="pessoa@email.com"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Senha</span>
            <Input
              className="h-10 w-36"
              value={novo.senha}
              onChange={(e) => setNovo({ ...novo, senha: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && adicionar()}
            />
          </label>
          <Button className="h-10" onClick={adicionar} disabled={!novo.email.trim() || salvando}>
            <Plus className="mr-1 h-4 w-4" />
            Criar acesso
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          A senha vem sugerida e pode ser trocada. Quem entra vê e mexe em tudo — pedidos, clientes
          e financeiro.
        </p>
      </div>
    </section>
  );
}

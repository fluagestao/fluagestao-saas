import { useCallback, useEffect, useState } from "react";

import { mensagemDeErro } from "@/lib/erros";
import { carregarClientes } from "@/lib/pedidos";
import type { ClienteComHistorico } from "@/lib/pedidos-ops.server";
import { ClientesView } from "./ClientesView";
import { FornecedoresView } from "./FornecedoresView";
import { BairrosView } from "./BairrosView";
import { UsuariosView } from "./UsuariosView";
import { Carregando, PageHeader } from "./shell";

/**
 * Cadastros: clientes, fornecedores e bairros.
 *
 * Saíram de Vendas porque não são trabalho do dia — Vendas ficou só com pedido,
 * cobrança e o que já foi entregue.
 */
export function CadastrosPanel({
  vista,
}: {
  vista?: "clientes" | "fornecedores" | "bairros" | "usuarios";
}) {
  const sub = vista ?? "clientes";

  const [clientes, setClientes] = useState<ClienteComHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregarClientes = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setClientes((await carregarClientes()) as ClienteComHistorico[]);
    } catch (e) {
      setErro(mensagemDeErro(e, "carregar os clientes"));
    }
    setCarregando(false);
  }, []);

  useEffect(() => {
    // Só busca quando a aba de clientes está aberta: fornecedores e bairros
    // carregam os próprios dados.
    if (sub === "clientes") recarregarClientes();
  }, [sub, recarregarClientes]);

  if (sub === "fornecedores") return <FornecedoresView />;
  if (sub === "bairros") return <BairrosView />;
  if (sub === "usuarios") return <UsuariosView />;

  if (erro) {
    return (
      <section>
        <PageHeader titulo="Clientes" />
        <p className="rounded-xl bg-[var(--cream)] px-3 py-2 text-sm text-destructive">{erro}</p>
      </section>
    );
  }
  if (carregando) {
    return (
      <section>
        <PageHeader titulo="Clientes" />
        <Carregando />
      </section>
    );
  }

  return <ClientesView clientes={clientes} onChange={recarregarClientes} />;
}

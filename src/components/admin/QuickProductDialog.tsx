import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { salvarCategoria, salvarProduto } from "@/lib/admin";
import { mensagemDeErro } from "@/lib/erros";

import { BuscaAdicionar } from "./BuscaAdicionar";
import type { ProdutoOpcao } from "./PedidoDialog";

export type CategoriaRapida = {
  id: string;
  nome: string;
  ordem: number | null;
};

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function lerDinheiro(valor: string): number | null {
  const limpo = valor.replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export function QuickProductDialog({
  categorias: categoriasIniciais,
  produtosExistentes = [],
  onClose,
  onSaved,
  onCategoriaCriada,
}: {
  categorias: CategoriaRapida[];
  produtosExistentes?: ProdutoOpcao[];
  onClose: () => void;
  onSaved: (produto: ProdutoOpcao, categoria?: CategoriaRapida) => void;
  onCategoriaCriada?: () => void;
}) {
  const [nome, setNome] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [preco, setPreco] = useState("");
  const [observacao, setObservacao] = useState("");
  const [categorias, setCategorias] = useState(categoriasIniciais);
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [nomeCategoria, setNomeCategoria] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const categoriaSelecionada = useMemo(
    () => categorias.find((categoria) => categoria.id === categoriaId) ?? null,
    [categorias, categoriaId],
  );

  async function criarCategoria() {
    const nomeLimpo = nomeCategoria.trim();
    if (!nomeLimpo) {
      setErro("Digite o nome da nova categoria.");
      return;
    }

    const existente = categorias.find(
      (categoria) => normalizar(categoria.nome) === normalizar(nomeLimpo),
    );
    if (existente) {
      setCategoriaId(existente.id);
      setCriandoCategoria(false);
      setNomeCategoria("");
      setErro(null);
      toast.success(`Categoria “${existente.nome}” selecionada.`);
      return;
    }

    setSalvandoCategoria(true);
    setErro(null);
    try {
      const salva = await salvarCategoria({
        data: {
          nome: nomeLimpo,
          ordem: categorias.length,
          ativa: true,
          cor: null,
          subtitulo: null,
          catalogo_id: null,
        },
      });
      const nova: CategoriaRapida = {
        id: salva.id,
        nome: nomeLimpo,
        ordem: categorias.length,
      };
      setCategorias((atuais) => [...atuais, nova]);
      setCategoriaId(nova.id);
      setCriandoCategoria(false);
      setNomeCategoria("");
      toast.success("Categoria criada e selecionada.");
      onCategoriaCriada?.();
    } catch (e) {
      setErro(mensagemDeErro(e, "criar a categoria"));
    } finally {
      setSalvandoCategoria(false);
    }
  }

  async function salvar() {
    const nomeLimpo = nome.trim();
    const valor = lerDinheiro(preco);

    if (!nomeLimpo) {
      setErro("O nome do produto é obrigatório.");
      return;
    }
    if (
      produtosExistentes.some(
        (produto) => normalizar(produto.nome) === normalizar(nomeLimpo),
      )
    ) {
      setErro("Já existe um produto com esse nome. Pesquise e selecione o produto existente.");
      return;
    }
    if (!categoriaSelecionada) {
      setErro("Selecione ou crie uma categoria.");
      return;
    }
    if (valor == null) {
      setErro("Informe um preço de venda válido.");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      const salvo = await salvarProduto({
        data: {
          nome: nomeLimpo,
          categoria_id: categoriaSelecionada.id,
          preco: valor,
          preco_label: null,
          serve: null,
          itens: [],
          precos_extra: [],
          observacao: observacao.trim() || null,
          ativo: true,
          ordem: 0,
          badge: null,
          badge_cor: null,
        },
      });

      onSaved(
        {
          slug: salvo.slug,
          nome: nomeLimpo,
          preco: valor,
          precos_extra: [],
          grupo: categoriaSelecionada.nome,
          ordemGrupo: categoriaSelecionada.ordem ?? 99,
        },
        categoriasIniciais.some((categoria) => categoria.id === categoriaSelecionada.id)
          ? undefined
          : categoriaSelecionada,
      );
      toast.success("Produto cadastrado e adicionado ao pedido.");
      onClose();
    } catch (e) {
      setErro(mensagemDeErro(e, "salvar o produto"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Cadastrar produto
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cadastre o necessário e continue o pedido de onde parou.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Nome do produto
            </span>
            <Input
              autoFocus
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Cesta Café Especial"
            />
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Categoria
            </span>
            <div className="flex gap-2">
              <BuscaAdicionar
                className="flex-1"
                placeholder={categoriaSelecionada?.nome ?? "Pesquisar categoria…"}
                buscaPlaceholder="Digite o nome da categoria…"
                vazio="Categoria não encontrada. Use o botão + para criar."
                grupos={[
                  {
                    nome: "Categorias",
                    itens: categorias.map((categoria) => ({
                      valor: categoria.id,
                      rotulo: categoria.nome,
                    })),
                  },
                ]}
                onEscolher={setCategoriaId}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                title="Criar categoria"
                onClick={() => setCriandoCategoria(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {criandoCategoria && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[var(--cream-deep)] p-3">
                <Input
                  className="min-w-[12rem] flex-1"
                  value={nomeCategoria}
                  onChange={(event) => setNomeCategoria(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && criarCategoria()}
                  placeholder="Nome da nova categoria"
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={criarCategoria}
                  disabled={salvandoCategoria || !nomeCategoria.trim()}
                >
                  {salvandoCategoria && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar e selecionar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCriandoCategoria(false);
                    setNomeCategoria("");
                  }}
                  disabled={salvandoCategoria}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Preço de venda
            </span>
            <Input
              value={preco}
              inputMode="decimal"
              onChange={(event) => setPreco(event.target.value)}
              placeholder="189,90"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Descrição ou observação (opcional)
            </span>
            <Textarea
              rows={3}
              value={observacao}
              onChange={(event) => setObservacao(event.target.value)}
            />
          </label>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando || salvandoCategoria}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar e usar no pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

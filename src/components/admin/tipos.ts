// Tipos e constantes compartilhados pelos painéis do admin.
// Espelham as colunas do banco (types.ts ainda não conhece as tabelas novas).

export type CatalogoRow = {
  id: string;
  slug: string;
  nome: string;
  ordem: number | null;
  ativo: boolean;
  cor: string | null;
  subtitulo: string | null;
  msg_saudacao?: string | null;
  msg_fecho?: string | null;
  msg_produto?: string | null;
};

export type CategoriaRow = {
  id: string;
  slug: string;
  nome: string;
  ordem: number | null;
  ativa: boolean;
  cor: string | null;
  subtitulo: string | null;
  catalogo_id: string | null;
};

export type EtiquetaRow = {
  id: string;
  nome: string;
  cor: string | null;
  ativo: boolean;
  ordem: number | null;
};

export type ImagemRow = { id: string; url: string; ordem: number | null };

export type ProdutoRow = {
  id: string;
  categoria_id: string | null;
  sku: string;
  slug: string;
  nome: string;
  preco: number | null;
  preco_label: string | null;
  serve: string | null;
  itens: unknown;
  precos_extra: unknown;
  observacao: string | null;
  ativo: boolean | null;
  ordem: number | null;
  badge: string | null;
  badge_cor: string | null;
  produto_imagens: ImagemRow[];
};

/** Insumo do módulo de custo. Espelha a tabela `insumos` depois da planilha. */
export type InsumoRow = {
  id: string;
  sku: string | null;
  nome: string;
  categoria: string | null;
  marca: string | null;
  unidade: string;
  /** Quanto vem no pacote comprado, na unidade acima. */
  qtd_embalagem: number;
  preco_pacote: number;
  /** Derivado: preco_pacote / qtd_embalagem. É o que multiplica na ficha. */
  custo: number;
  fornecedor_id: string | null;
  ativo: boolean;
};

export type FichaItemRow = {
  id: string;
  produto_id: string;
  insumo_id: string;
  quantidade: number;
  ordem: number;
};

export type ProdutoPrecoRow = {
  id: string;
  slug: string;
  nome: string;
  preco: number | null;
  ativo: boolean;
  tempo_producao_min: number;
};

export const CORES_DESTAQUE = [
  { nome: "Padrão", valor: "" },
  { nome: "Terracota", valor: "#A12820" },
  { nome: "Azul", valor: "#3d5a66" },
  { nome: "Rosa", valor: "#C25B7C" },
  { nome: "Vermelho", valor: "#B5322B" },
  { nome: "Verde", valor: "#4A6B4A" },
  { nome: "Dourado", valor: "#B8893B" },
];

export const BADGES_PRESET = [
  { nome: "Mais vendido", cor: "#B8893B" },
  { nome: "Novidade", cor: "#4A6B4A" },
  { nome: "Edição limitada", cor: "#A12820" },
  { nome: "Queridinha", cor: "#C25B7C" },
  { nome: "Escolha da casa", cor: "#B8893B" },
];

export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}
export function asPrecosExtra(v: unknown): { label: string; valor: number }[] {
  return Array.isArray(v) ? (v as { label: string; valor: number }[]) : [];
}

export function slugFromNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

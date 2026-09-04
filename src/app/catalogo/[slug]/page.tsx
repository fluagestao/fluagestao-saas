import {
  MapPin,
  MessageCircle,
  PackageOpen,
  ShoppingBag,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  type HorariosConfig,
} from "@/lib/horarios";
import { createClient } from "@/lib/supabase/server";

type EmpresaPublica = {
  id: string;
  nome: string;
  logo_url: string | null;
  telefone: string | null;
  email: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  timezone: string | null;
};

type ColecaoPublica = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  cor: string | null;
  subtitulo: string | null;
  msg_saudacao: string | null;
  msg_fecho: string | null;
  msg_produto: string | null;
};

type CategoriaPublica = {
  id: string;
  catalogo_id: string | null;
  slug: string;
  nome: string;
  ordem: number;
  cor: string | null;
  subtitulo: string | null;
};

type ProdutoPublico = {
  id: string;
  categoria_id: string | null;
  slug: string;
  sku: string | null;
  nome: string;
  preco: number | string | null;
  preco_label: string | null;
  serve: string | null;
  itens: string[];
  precos_extra: { label: string; valor: number }[];
  observacao: string | null;
  ordem: number;
  badge: string | null;
  badge_cor: string | null;
  imagens: { url: string; ordem: number }[];
};

type CatalogoPublico = {
  empresa: EmpresaPublica;
  horarios: Partial<HorariosConfig> | null;
  colecoes: ColecaoPublica[];
  categorias: CategoriaPublica[];
  produtos: ProdutoPublico[];
};

type GrupoCatalogo = {
  id: string;
  nome: string;
  subtitulo?: string | null;
  produtos: ProdutoPublico[];
};

export const dynamic = "force-dynamic";

function precoProduto(produto: ProdutoPublico) {
  if (produto.preco != null && produto.preco !== "") {
    const valor = Number(produto.preco);
    if (!Number.isNaN(valor)) {
      return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    }
  }
  return "Sob consulta";
}

function enderecoEmpresa(empresa: EmpresaPublica) {
  const linha1 = [empresa.rua, empresa.numero].filter(Boolean).join(", ");
  const linha2 = [empresa.bairro, empresa.cidade, empresa.uf].filter(Boolean).join(" · ");
  return [linha1, linha2].filter(Boolean).join(" — ");
}

function telefoneWhatsapp(telefone?: string | null) {
  const numeros = (telefone || "").replace(/\D/g, "");
  if (!numeros) return null;
  if (numeros.startsWith("55") && numeros.length >= 12) return numeros;
  return `55${numeros}`;
}

function descricaoProduto(produto: ProdutoPublico) {
  if (produto.observacao?.trim()) return produto.observacao.trim();
  if (produto.itens?.length) return produto.itens.slice(0, 4).join(" · ");
  return "Feito com cuidado e preparado especialmente para o seu pedido.";
}

function montarGrupos(data: CatalogoPublico): GrupoCatalogo[] {
  const categoriaPorId = new Map(data.categorias.map((categoria) => [categoria.id, categoria]));
  const colecaoPorId = new Map(data.colecoes.map((colecao) => [colecao.id, colecao]));

  if (data.colecoes.length === 0) {
    const gruposPorCategoria = data.categorias
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map((categoria) => ({
        id: categoria.id,
        nome: categoria.nome,
        subtitulo: categoria.subtitulo,
        produtos: data.produtos.filter((produto) => produto.categoria_id === categoria.id),
      }))
      .filter((grupo) => grupo.produtos.length > 0);

    const semCategoria = data.produtos.filter(
      (produto) => !produto.categoria_id || !categoriaPorId.has(produto.categoria_id),
    );
    if (semCategoria.length) {
      gruposPorCategoria.push({
        id: "sem-categoria",
        nome: "Produtos",
        subtitulo: "Escolha o seu favorito.",
        produtos: semCategoria,
      });
    }
    return gruposPorCategoria;
  }

  const grupos = data.colecoes
    .slice()
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((colecao) => ({
      id: colecao.id,
      nome: colecao.nome,
      subtitulo: colecao.subtitulo,
      produtos: data.produtos.filter((produto) => {
        const categoria = produto.categoria_id
          ? categoriaPorId.get(produto.categoria_id)
          : undefined;
        return categoria?.catalogo_id === colecao.id;
      }),
    }))
    .filter((grupo) => grupo.produtos.length > 0);

  const semColecao = data.produtos.filter((produto) => {
    const categoria = produto.categoria_id
      ? categoriaPorId.get(produto.categoria_id)
      : undefined;
    return !categoria?.catalogo_id || !colecaoPorId.has(categoria.catalogo_id);
  });

  if (semColecao.length) {
    grupos.push({
      id: "outros",
      nome: "Outros produtos",
      subtitulo: "Mais opções disponíveis para encomenda.",
      produtos: semColecao,
    });
  }

  return grupos;
}

export default async function CatalogoPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catalogo_publico", { p_slug: slug });

  if (error || !data) notFound();

  const catalogo = data as CatalogoPublico;
  const empresa = catalogo.empresa;
  const endereco = enderecoEmpresa(empresa);
  const whatsapp = telefoneWhatsapp(empresa.telefone);
  const grupos = montarGrupos(catalogo);

  return (
    <main className="min-h-screen bg-[#f8f3ed] text-[#382724]">
      <header className="border-b border-[#eadfd6] bg-[#fffaf5]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-[#eadfd6] bg-white shadow-sm">
              {empresa.logo_url ? (
                <img
                  src={empresa.logo_url}
                  alt={`Logo ${empresa.nome}`}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-2xl font-bold text-[#8b4a43]">
                  {empresa.nome?.charAt(0)?.toUpperCase() || "L"}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a45a4f]">
                Catálogo digital
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {empresa.nome}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#76655f]">
                {endereco && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {endereco}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Vim pelo catálogo da ${empresa.nome} e gostaria de fazer um pedido.`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6f3936] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#5b2e2c]"
              >
                <MessageCircle className="h-4 w-4" /> Falar com a loja
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#a45a4f]">
            Escolha, clique e peça
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
            Produtos organizados para facilitar sua escolha.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#75645e] sm:text-lg">
            Veja as coleções, valores e detalhes. Quando encontrar o que deseja,
            clique em comprar para falar diretamente com a loja.
          </p>
        </div>

        {grupos.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-[#d9c9bd] bg-white/70 p-12 text-center">
            <PackageOpen className="mx-auto h-9 w-9 text-[#9f6d62]" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum produto publicado ainda</h3>
            <p className="mt-1 text-sm text-[#7d6b65]">
              Assim que a loja liberar os produtos, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="mt-14 space-y-16">
            {grupos.map((grupo) => (
              <section key={grupo.id} id={`colecao-${grupo.id}`}>
                <div className="mb-6 flex flex-col gap-2 border-b border-[#e4d8cf] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#aa7165]">
                      Coleção
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold sm:text-3xl">{grupo.nome}</h3>
                    {grupo.subtitulo && (
                      <p className="mt-1 text-sm text-[#806e67]">{grupo.subtitulo}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[#9a8178]">
                    {grupo.produtos.length} {grupo.produtos.length === 1 ? "produto" : "produtos"}
                  </span>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {grupo.produtos.map((produto) => {
                    const imagens = (produto.imagens ?? [])
                      .slice()
                      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
                    const capa = imagens[0]?.url;
                    const preco = precoProduto(produto);
                    const categoria = produto.categoria_id
                      ? catalogo.categorias.find((item) => item.id === produto.categoria_id)
                      : undefined;
                    const mensagem = `Olá! Quero comprar ${produto.nome} (${preco}). Vi no catálogo da ${empresa.nome}.`;

                    return (
                      <article
                        key={produto.id}
                        className="group overflow-hidden rounded-3xl border border-[#e4d8cf] bg-white shadow-[0_18px_50px_rgba(91,55,50,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(91,55,50,0.12)]"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-[#f1e4d8] to-[#e5cfc1]">
                          {capa ? (
                            <img
                              src={capa}
                              alt={produto.nome}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                            />
                          ) : (
                            <div className="grid h-full place-items-center text-[#a57b70]">
                              <ShoppingBag className="h-10 w-10" />
                            </div>
                          )}
                          {produto.badge && (
                            <span
                              className="absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: produto.badge_cor || "#8d4a43" }}
                            >
                              {produto.badge}
                            </span>
                          )}
                        </div>

                        <div className="p-5">
                          {categoria && (
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#a87065]">
                              {categoria.nome}
                            </p>
                          )}
                          <h4 className="mt-1 text-lg font-semibold leading-tight">{produto.nome}</h4>
                          <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-[#7c6a64]">
                            {descricaoProduto(produto)}
                          </p>

                          <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#efe5de] pt-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a78e85]">
                                Valor
                              </p>
                              <p className="mt-0.5 text-xl font-bold text-[#6f3936]">{preco}</p>
                            </div>

                            {whatsapp ? (
                              <a
                                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6f3936] px-4 text-sm font-bold text-white transition hover:bg-[#5b2e2c]"
                              >
                                Comprar <MessageCircle className="h-4 w-4" />
                              </a>
                            ) : (
                              <a
                                href={empresa.email ? `mailto:${empresa.email}?subject=${encodeURIComponent(`Pedido - ${produto.nome}`)}` : "#"}
                                className="inline-flex h-10 items-center rounded-xl border border-[#dbcac0] px-4 text-sm font-bold text-[#6f3936]"
                              >
                                Comprar
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-8 border-t border-[#e4d8cf] bg-[#efe5dc]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-[#75645e] sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-[#5f403b]">{empresa.nome}</p>
            {endereco && <p className="mt-1">{endereco}</p>}
          </div>
          <p className="text-xs">Catálogo inteligente gerado pela Flua Gestão.</p>
        </div>
      </footer>
    </main>
  );
}

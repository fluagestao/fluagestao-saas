"use server";

import { z } from "zod";

import { slugify } from "@/lib/admin-ops.server";
import { requireCompany } from "@/lib/company-context.server";
import { formatCelular, formatCep } from "@/lib/formato";
import {
  ENTIDADES,
  MAX_LINHAS,
  PREFIXO_EXEMPLO,
  type EntidadeImportacao,
  type LinhaPrevia,
  type LoteImportacao,
  type ResultadoImportacao,
} from "@/lib/importacao-tipos";

/*
 * Importação por planilha.
 *
 * Dois caminhos, uma análise: a prévia e a confirmação passam pela MESMA
 * função `analisar`. O que a pessoa viu na prévia é o que vai ser gravado —
 * o servidor nunca confia no que o navegador diz que validou.
 *
 * Regras que não mudam:
 *  - só cria, nunca atualiza. "Já existe" é pulado e aparece na prévia.
 *  - linha ruim não derruba o arquivo: as boas entram, as ruins voltam listadas.
 *  - cada lote guarda os ids que criou; desfazer apaga só esses, e só os que
 *    ainda não estão em uso.
 */

type Db = Awaited<ReturnType<typeof requireCompany>>["supabase"];

const entidadeSchema = z.enum(["insumos", "fornecedores", "clientes", "produtos"]);

const entradaSchema = z.object({
  entidade: entidadeSchema,
  arquivo: z.string().trim().max(200).nullish(),
  linhas: z.array(z.record(z.string(), z.string())).max(MAX_LINHAS, `No máximo ${MAX_LINHAS} linhas por vez.`),
});

/* ------------------------------------------------------------ helpers */

function texto(valor: string | undefined, max = 500): string | null {
  const t = (valor ?? "").trim();
  if (!t) return null;
  return t.slice(0, max);
}

/** "R$ 1.234,56" → 1234.56; "12.5" → 12.5; "12,5" → 12.5. */
function paraNumero(valor: string | undefined): number | null {
  const bruto = (valor ?? "").replace(/R\$/gi, "").replace(/\s/g, "").trim();
  if (!bruto) return null;
  let normalizado = bruto;
  const temVirgula = bruto.includes(",");
  const temPonto = bruto.includes(".");
  // Grupos de 3 sem decimal ("1.500", "1.234.000") sao separador de milhar.
  // Sem esta regra, Number("1.500") = 1.5 e a cesta de R$ 1.500 entrava por
  // R$ 1,50 — passando por toda a validacao, porque 1.5 e um numero valido.
  const soMilhar = (texto: string, sep: string) =>
    new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`).test(texto);
  if (temVirgula && temPonto) {
    // O ultimo separador que aparece e o decimal; o outro e de milhar.
    normalizado =
      bruto.lastIndexOf(",") > bruto.lastIndexOf(".")
        ? bruto.replace(/\./g, "").replace(",", ".")
        : bruto.replace(/,/g, "");
  } else if (temVirgula) {
    normalizado = soMilhar(bruto, ",") ? bruto.replace(/,/g, "") : bruto.replace(",", ".");
  } else if (temPonto && soMilhar(bruto, ".")) {
    normalizado = bruto.replace(/\./g, "");
  }
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Chave de comparação: minúsculo, sem acento, espaços colapsados. */
function chave(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function ehExemplo(nome: string | null): boolean {
  return chave(nome).startsWith(PREFIXO_EXEMPLO);
}

const UNIDADES: Record<string, string> = {
  un: "UN", unidade: "UN", unidades: "UN", unid: "UN", und: "UN", pc: "UN", peca: "UN", pecas: "UN",
  kg: "KG", quilo: "KG", kilo: "KG", quilograma: "KG",
  g: "G", grama: "G", gramas: "G",
  l: "L", litro: "L", litros: "L",
  ml: "ML", mililitro: "ML",
  cx: "CX", caixa: "CX",
  pct: "PCT", pacote: "PCT",
};

function unidade(valor: string | undefined): string | null {
  const k = chave(valor).replace(/\.$/, "");
  if (!k) return null;
  return UNIDADES[k] ?? null;
}

const FREQUENCIAS: Record<string, string> = {
  semanal: "semanal", semana: "semanal",
  quinzenal: "quinzenal", quinzena: "quinzenal",
  mensal: "mensal", mes: "mensal",
  esporadica: "esporadica", esporadico: "esporadica", eventual: "esporadica", raro: "esporadica",
};

function simNao(valor: string | undefined, padrao: boolean): boolean | null {
  const k = chave(valor);
  if (!k) return padrao;
  if (["sim", "s", "yes", "y", "1", "true", "ativo"].includes(k)) return true;
  if (["nao", "n", "no", "0", "false", "inativo"].includes(k)) return false;
  return null;
}

/** DD/MM/AAAA, DD/MM/AA ou AAAA-MM-DD → AAAA-MM-DD. null = vazio, NaN-like = inválida. */
function data(valor: string | undefined): string | null | "invalida" {
  const t = (valor ?? "").trim();
  if (!t) return null;
  let ano: number, mes: number, dia: number;
  // Numero de serie do Excel (dias desde 30/12/1899): e o que chega quando a
  // celula foi formatada como data e o arquivo veio em XLSX.
  if (/^\d{5,6}$/.test(t) && Number(t) >= 10000 && Number(t) < 80000) {
    const serial = new Date(Date.UTC(1899, 11, 30) + Number(t) * 86400000);
    ano = serial.getUTCFullYear();
    mes = serial.getUTCMonth() + 1;
    dia = serial.getUTCDate();
    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }
  const br = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (br) {
    dia = Number(br[1]);
    mes = Number(br[2]);
    ano = Number(br[3]);
    if (ano < 100) ano += ano > 30 ? 1900 : 2000;
  } else if (iso) {
    ano = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else {
    return "invalida";
  }
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return "invalida";
  }
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function documento(valor: string | undefined): { valor: string | null; erro?: string; aviso?: string } {
  let d = (valor ?? "").replace(/\D/g, "");
  if (!d) return { valor: null };
  // Planilha guardou como numero e comeu o zero da frente: 10 digitos so
  // pode ser CPF, 13 so pode ser CNPJ. Completa e avisa.
  let aviso: string | undefined;
  if (d.length === 10 || d.length === 13) {
    d = "0" + d;
    aviso = "CNPJ/CPF veio sem o zero à esquerda — completei";
  }
  if (d.length !== 11 && d.length !== 14) {
    return { valor: null, erro: "CNPJ/CPF precisa ter 11 ou 14 dígitos" };
  }
  return { valor: d, aviso };
}

/** Digitos canonicos do numero: sem pontuacao e sem o 55 do pais. */
function digitosWhats(valor: string | null | undefined): string {
  let d = (valor ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d;
}

function whatsapp(valor: string | undefined): { digitos: string; formatado: string } | { erro: string } {
  const d = digitosWhats(valor);
  if (d.length < 10 || d.length > 11) {
    return { erro: d ? `WhatsApp com ${d.length} dígitos — precisa ter 10 ou 11 com DDD` : "WhatsApp em branco" };
  }
  return { digitos: d, formatado: formatCelular(d) };
}

/* Teto do PostgREST e 1000 linhas por resposta. Os conjuntos de "ja existe"
   precisam da base INTEIRA: truncar faz a previa mentir e o erro so aparecer
   na gravacao. 20 mil cobre com folga qualquer cesteira. */
const TETO_DEDUP = 20000;

/** Consulta .in() em fatias: mil uuids numa URL só estouram o limite. */
function fatias<T>(itens: T[], tamanho = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) out.push(itens.slice(i, i + tamanho));
  return out;
}

/* ---------------------------------------------------------- análise */

type Preparada = { numero: number; row: Record<string, unknown> };

type Analise = { previa: LinhaPrevia[]; preparadas: Preparada[] };

type Contexto = {
  db: Db;
  companyId: string;
};

async function analisar(
  entidade: EntidadeImportacao,
  linhas: Record<string, string>[],
  ctx: Contexto,
): Promise<Analise> {
  switch (entidade) {
    case "insumos":
      return analisarInsumos(linhas, ctx);
    case "fornecedores":
      return analisarFornecedores(linhas, ctx);
    case "clientes":
      return analisarClientes(linhas, ctx);
    case "produtos":
      return analisarProdutos(linhas, ctx);
  }
}

function linhaErro(numero: number, mensagem: string, dados: Record<string, string>): LinhaPrevia {
  return { numero, status: "erro", mensagem, avisos: [], dados };
}

function linhaExemplo(numero: number, dados: Record<string, string>): LinhaPrevia {
  return { numero, status: "exemplo", mensagem: "Linha de exemplo do gabarito — ignorada", avisos: [], dados };
}

function linhaExiste(numero: number, mensagem: string, dados: Record<string, string>): LinhaPrevia {
  return { numero, status: "existe", mensagem, avisos: [], dados };
}

function mostrar(valores: Record<string, string | number | boolean | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(valores)) {
    if (v === null || v === undefined) out[k] = "";
    else if (typeof v === "boolean") out[k] = v ? "sim" : "não";
    else if (typeof v === "number") out[k] = String(v).replace(".", ",");
    else out[k] = v;
  }
  return out;
}

/* ------------------------------------------------------------ insumos */

async function analisarInsumos(linhas: Record<string, string>[], { db, companyId }: Contexto): Promise<Analise> {
  const [existentesRes, fornecedoresRes] = await Promise.all([
    db.from("insumos").select("nome").eq("company_id", companyId).limit(TETO_DEDUP),
    db.from("fornecedores").select("id, nome").eq("company_id", companyId),
  ]);
  if (existentesRes.error) throw existentesRes.error;
  if (fornecedoresRes.error) throw fornecedoresRes.error;

  const existentes = new Set((existentesRes.data ?? []).map((i) => chave(i.nome)));
  const fornecedores = new Map((fornecedoresRes.data ?? []).map((f) => [chave(f.nome), f.id as string]));
  const vistos = new Map<string, number>();

  const previa: LinhaPrevia[] = [];
  const preparadas: Preparada[] = [];

  linhas.forEach((l, i) => {
    const numero = i + 1;
    const nome = texto(l.nome, 160);
    const dados = mostrar({
      nome,
      unidade: l.unidade,
      quantidade: l.quantidade,
      tipo_embalagem: l.tipo_embalagem,
      preco_embalagem: l.preco_embalagem,
      categoria: l.categoria,
      fornecedor: l.fornecedor,
      frequencia_compra: l.frequencia_compra,
      observacao: l.observacao,
    });

    if (!nome) return void previa.push(linhaErro(numero, "Nome em branco", dados));
    if (ehExemplo(nome)) return void previa.push(linhaExemplo(numero, dados));

    const k = chave(nome);
    if (existentes.has(k)) return void previa.push(linhaExiste(numero, "Já existe um insumo com esse nome", dados));
    const repetida = vistos.get(k);
    if (repetida) return void previa.push(linhaExiste(numero, `Repetido na planilha (mesmo nome da linha ${repetida})`, dados));

    const un = unidade(l.unidade);
    if (!un) {
      return void previa.push(
        linhaErro(numero, l.unidade?.trim() ? `Unidade "${l.unidade.trim()}" não existe — use UN, KG, G, L, ML, CX ou PCT` : "Unidade em branco", dados),
      );
    }

    const qtd = numero_ou(l.quantidade, 1);
    if (qtd === null || qtd <= 0) return void previa.push(linhaErro(numero, "Quantidade por embalagem precisa ser maior que zero", dados));

    const preco = paraNumero(l.preco_embalagem);
    if (preco === null) return void previa.push(linhaErro(numero, "Custo da embalagem em branco", dados));
    if (Number.isNaN(preco) || preco < 0) return void previa.push(linhaErro(numero, `Custo "${l.preco_embalagem}" não é um valor válido`, dados));

    const avisos: string[] = [];

    let fornecedorId: string | null = null;
    const fornecedorNome = texto(l.fornecedor, 120);
    if (fornecedorNome) {
      fornecedorId = fornecedores.get(chave(fornecedorNome)) ?? null;
      if (!fornecedorId) avisos.push(`Fornecedor "${fornecedorNome}" não está cadastrado — ficou em branco`);
    }

    let frequencia: string | null = null;
    const freqBruta = texto(l.frequencia_compra, 40);
    if (freqBruta) {
      frequencia = FREQUENCIAS[chave(freqBruta)] ?? null;
      if (!frequencia) avisos.push(`Frequência "${freqBruta}" não reconhecida — ficou em branco`);
    }

    const custoUnitario = Math.round((preco / qtd) * 10000) / 10000;
    vistos.set(k, numero);
    dados.unidade = un;
    dados.quantidade = String(qtd).replace(".", ",");
    dados.preco_embalagem = preco.toFixed(2).replace(".", ",");
    dados.fornecedor = fornecedorId ? (fornecedorNome ?? "") : "";
    dados.frequencia_compra = frequencia ?? "";

    previa.push({ numero, status: "criar", avisos, dados });
    preparadas.push({
      numero,
      row: {
        company_id: companyId,
        nome,
        unidade: un,
        qtd_embalagem: qtd,
        preco_pacote: preco,
        custo: custoUnitario,
        ativo: true,
        categoria: texto(l.categoria, 60),
        tipo_embalagem: texto(l.tipo_embalagem, 40),
        fornecedor_id: fornecedorId,
        frequencia_compra: frequencia,
        observacao: texto(l.observacao, 500),
      },
    });
  });

  return { previa, preparadas };
}

function numero_ou(valor: string | undefined, padrao: number): number | null {
  const n = paraNumero(valor);
  if (n === null) return padrao;
  if (Number.isNaN(n)) return null;
  return n;
}

/* ------------------------------------------------------- fornecedores */

async function analisarFornecedores(linhas: Record<string, string>[], { db, companyId }: Contexto): Promise<Analise> {
  const [existentesRes, tiposRes] = await Promise.all([
    db.from("fornecedores").select("nome, documento").eq("company_id", companyId).limit(TETO_DEDUP),
    db.from("tipos_fornecedor").select("id, nome").eq("company_id", companyId),
  ]);
  if (existentesRes.error) throw existentesRes.error;
  if (tiposRes.error) throw tiposRes.error;

  const nomes = new Set((existentesRes.data ?? []).map((f) => chave(f.nome)));
  const documentos = new Set(
    (existentesRes.data ?? []).map((f) => (f.documento ?? "").replace(/\D/g, "")).filter(Boolean),
  );
  const tipos = new Map((tiposRes.data ?? []).map((t) => [chave(t.nome), t.id as string]));
  const vistosNome = new Map<string, number>();
  const vistosDoc = new Map<string, number>();

  const previa: LinhaPrevia[] = [];
  const preparadas: Preparada[] = [];

  linhas.forEach((l, i) => {
    const numero = i + 1;
    const nome = texto(l.nome, 120);
    const dados = mostrar({
      nome,
      telefone: l.telefone,
      documento: l.documento,
      tipo: l.tipo,
      fornece: l.fornece,
      endereco: l.endereco,
      cidade: l.cidade,
      observacao: l.observacao,
    });

    if (!nome) return void previa.push(linhaErro(numero, "Nome em branco", dados));
    if (ehExemplo(nome)) return void previa.push(linhaExemplo(numero, dados));

    const doc = documento(l.documento);
    if (doc.erro) return void previa.push(linhaErro(numero, doc.erro, dados));

    const k = chave(nome);
    if (nomes.has(k)) return void previa.push(linhaExiste(numero, "Já existe um fornecedor com esse nome", dados));
    if (doc.valor && documentos.has(doc.valor)) return void previa.push(linhaExiste(numero, "Já existe um fornecedor com esse CNPJ/CPF", dados));
    const rep = vistosNome.get(k) ?? (doc.valor ? vistosDoc.get(doc.valor) : undefined);
    if (rep) return void previa.push(linhaExiste(numero, `Repetido na planilha (linha ${rep})`, dados));

    const avisos: string[] = [];
    if (doc.aviso) avisos.push(doc.aviso);
    let tipoId: string | null = null;
    const tipoNome = texto(l.tipo, 60);
    if (tipoNome) {
      tipoId = tipos.get(chave(tipoNome)) ?? null;
      if (!tipoId) avisos.push(`Tipo "${tipoNome}" não existe — ficou em branco`);
    }

    const telefoneDigitos = (l.telefone ?? "").replace(/\D/g, "");
    const telefone = telefoneDigitos ? formatCelular(telefoneDigitos) : null;

    vistosNome.set(k, numero);
    if (doc.valor) vistosDoc.set(doc.valor, numero);
    dados.telefone = telefone ?? "";
    dados.documento = doc.valor ?? "";
    dados.tipo = tipoId ? (tipoNome ?? "") : "";

    previa.push({ numero, status: "criar", avisos, dados });
    preparadas.push({
      numero,
      row: {
        company_id: companyId,
        nome,
        telefone,
        documento: doc.valor,
        tipo_fornecedor_id: tipoId,
        fornece: texto(l.fornece, 120),
        endereco: texto(l.endereco, 200),
        cidade: texto(l.cidade, 80),
        observacao: texto(l.observacao, 500),
        ativo: true,
      },
    });
  });

  return { previa, preparadas };
}

/* ----------------------------------------------------------- clientes */

async function analisarClientes(linhas: Record<string, string>[], { db, companyId }: Contexto): Promise<Analise> {
  const { data: existentes, error } = await db
    .from("clientes")
    .select("whatsapp")
    .eq("company_id", companyId)
    .limit(TETO_DEDUP);
  if (error) throw error;

  // Mesma normalizacao dos dois lados: um cliente gravado como "+55 48 9..."
  // pelo site tem 13 digitos e nao casava com os 11 da planilha — a mesma
  // pessoa entrava duas vezes.
  const numeros = new Set((existentes ?? []).map((c) => digitosWhats(c.whatsapp)).filter(Boolean));
  const vistos = new Map<string, number>();

  const previa: LinhaPrevia[] = [];
  const preparadas: Preparada[] = [];

  linhas.forEach((l, i) => {
    const numero = i + 1;
    const nome = texto(l.nome, 120);
    const dados = mostrar({
      nome,
      whatsapp: l.whatsapp,
      email: l.email,
      documento: l.documento,
      cep: l.cep,
      endereco: l.endereco,
      bairro: l.bairro,
      cidade: l.cidade,
      referencia: l.referencia,
      aniversario: l.aniversario,
      observacao: l.observacao,
    });

    if (!nome) return void previa.push(linhaErro(numero, "Nome em branco", dados));
    if (ehExemplo(nome)) return void previa.push(linhaExemplo(numero, dados));

    const wa = whatsapp(l.whatsapp);
    if ("erro" in wa) return void previa.push(linhaErro(numero, wa.erro, dados));

    if (numeros.has(wa.digitos)) return void previa.push(linhaExiste(numero, "Já existe um cliente com esse WhatsApp", dados));
    const rep = vistos.get(wa.digitos);
    if (rep) return void previa.push(linhaExiste(numero, `Repetido na planilha (mesmo WhatsApp da linha ${rep})`, dados));

    const aniversario = data(l.aniversario);
    if (aniversario === "invalida") return void previa.push(linhaErro(numero, `Aniversário "${l.aniversario}" não é uma data válida — use DD/MM/AAAA`, dados));

    const avisos: string[] = [];
    const email = texto(l.email, 120);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) avisos.push(`E-mail "${email}" parece inválido — gravado mesmo assim`);

    let cepDigitos = (l.cep ?? "").replace(/\D/g, "");
    if (cepDigitos.length === 7) cepDigitos = "0" + cepDigitos;
    const cep = cepDigitos ? formatCep(cepDigitos) : null;
    if (cepDigitos && cepDigitos.length !== 8) avisos.push(`CEP "${l.cep}" não tem 8 dígitos — gravado como veio`);

    vistos.set(wa.digitos, numero);
    dados.whatsapp = wa.formatado;
    dados.cep = cep ?? "";
    dados.aniversario = aniversario ? aniversario.split("-").reverse().join("/") : "";

    previa.push({ numero, status: "criar", avisos, dados });
    preparadas.push({
      numero,
      row: {
        company_id: companyId,
        nome,
        whatsapp: wa.formatado,
        email,
        documento: texto(l.documento, 30),
        cep,
        endereco: texto(l.endereco, 200),
        bairro: texto(l.bairro, 80),
        cidade: texto(l.cidade, 120),
        referencia: texto(l.referencia, 160),
        aniversario,
        observacao: texto(l.observacao, 1000),
        ativo: true,
      },
    });
  });

  return { previa, preparadas };
}

/* ----------------------------------------------------------- produtos */

async function analisarProdutos(linhas: Record<string, string>[], { db, companyId }: Contexto): Promise<Analise> {
  const [produtosRes, categoriasRes] = await Promise.all([
    db.from("produtos").select("nome, slug, categoria_id, ordem").eq("company_id", companyId).limit(TETO_DEDUP),
    db.from("categorias").select("id, nome").eq("company_id", companyId),
  ]);
  if (produtosRes.error) throw produtosRes.error;
  if (categoriasRes.error) throw categoriasRes.error;

  const nomes = new Set((produtosRes.data ?? []).map((p) => chave(p.nome)));
  const slugs = new Set((produtosRes.data ?? []).map((p) => p.slug as string).filter(Boolean));
  const categorias = new Map((categoriasRes.data ?? []).map((c) => [chave(c.nome), c.id as string]));

  // ordem = max + 1 dentro da categoria, como a tela faz. Vai incrementando
  // no lote para os importados não caírem todos na mesma posição.
  const proximaOrdem = new Map<string, number>();
  for (const p of produtosRes.data ?? []) {
    const k = (p.categoria_id as string | null) ?? "";
    proximaOrdem.set(k, Math.max(proximaOrdem.get(k) ?? 0, (Number(p.ordem) || 0) + 1));
  }

  const vistos = new Map<string, number>();
  const previa: LinhaPrevia[] = [];
  const preparadas: Preparada[] = [];

  linhas.forEach((l, i) => {
    const numero = i + 1;
    const nome = texto(l.nome, 160);
    const dados = mostrar({
      nome,
      preco: l.preco,
      categoria: l.categoria,
      serve: l.serve,
      observacao: l.observacao,
      ativo: l.ativo,
    });

    if (!nome) return void previa.push(linhaErro(numero, "Nome em branco", dados));
    if (ehExemplo(nome)) return void previa.push(linhaExemplo(numero, dados));

    const k = chave(nome);
    if (nomes.has(k)) return void previa.push(linhaExiste(numero, "Já existe um produto com esse nome", dados));
    const rep = vistos.get(k);
    if (rep) return void previa.push(linhaExiste(numero, `Repetido na planilha (mesmo nome da linha ${rep})`, dados));

    const preco = paraNumero(l.preco);
    if (preco === null) return void previa.push(linhaErro(numero, "Preço em branco", dados));
    if (Number.isNaN(preco) || preco < 0) return void previa.push(linhaErro(numero, `Preço "${l.preco}" não é um valor válido`, dados));

    const ativo = simNao(l.ativo, true);
    if (ativo === null) return void previa.push(linhaErro(numero, `Ativo "${l.ativo}" — use sim ou não`, dados));

    const avisos: string[] = [];
    let categoriaId: string | null = null;
    const categoriaNome = texto(l.categoria, 80);
    if (categoriaNome) {
      categoriaId = categorias.get(chave(categoriaNome)) ?? null;
      if (!categoriaId) avisos.push(`Categoria "${categoriaNome}" não existe — o produto entra sem categoria`);
    }

    // Slug único: a tela não trata colisão e o banco rejeita repetido.
    const base = slugify(nome).slice(0, 76) || "produto";
    let slug = base;
    for (let n = 2; slugs.has(slug); n += 1) slug = `${base}-${n}`;
    slugs.add(slug);

    const kOrdem = categoriaId ?? "";
    const ordem = proximaOrdem.get(kOrdem) ?? 0;
    proximaOrdem.set(kOrdem, ordem + 1);

    vistos.set(k, numero);
    dados.preco = preco.toFixed(2).replace(".", ",");
    dados.categoria = categoriaId ? (categoriaNome ?? "") : "";
    dados.ativo = ativo ? "sim" : "não";

    previa.push({ numero, status: "criar", avisos, dados });
    preparadas.push({
      numero,
      row: {
        company_id: companyId,
        nome,
        slug,
        categoria_id: categoriaId,
        preco,
        preco_label: null,
        serve: texto(l.serve, 80),
        itens: [],
        precos_extra: [],
        observacao: texto(l.observacao, 1000),
        ativo,
        ordem,
        badge: null,
        badge_cor: null,
        rascunho: false,
      },
    });
  });

  return { previa, preparadas };
}

/* ------------------------------------------------------------ ações */

export async function previewImportacao(input: { data: unknown }): Promise<LinhaPrevia[]> {
  const { entidade, linhas } = entradaSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();
  const { previa } = await analisar(entidade, linhas, { db: supabase, companyId });
  return previa;
}

export async function confirmarImportacao(input: { data: unknown }): Promise<ResultadoImportacao & { erros: LinhaPrevia[] }> {
  const { entidade, linhas, arquivo } = entradaSchema.parse(input.data);
  const { supabase, companyId } = await requireCompany();
  const { previa, preparadas } = await analisar(entidade, linhas, { db: supabase, companyId });

  /* O lote nasce ANTES de qualquer registro. Se nao der para registra-lo, nada
     e gravado — importar sem poder desfazer e pior do que nao importar. */
  const { data: lote, error: loteError } = await supabase
    .from("importacoes")
    .insert({
      company_id: companyId,
      entidade,
      arquivo: arquivo ?? null,
      total_linhas: linhas.length,
      criados: 0,
      pulados: 0,
      com_erro: 0,
      registros_criados: [],
    })
    .select("id")
    .single();
  if (loteError || !lote) throw loteError ?? new Error("Não consegui registrar a importação.");

  const criados: string[] = [];
  const errosGravacao: LinhaPrevia[] = [];

  // Em fatias. Se uma fatia falhar (uma constraint que a análise não previu),
  // grava linha a linha para isolar a culpada em vez de perder a fatia toda.
  for (const fatia of fatias(preparadas, 200)) {
    const { data, error } = await supabase
      .from(entidade)
      .insert(fatia.map((p) => p.row))
      .select("id");

    if (!error) {
      criados.push(...(data ?? []).map((d) => d.id as string));
      continue;
    }

    for (const p of fatia) {
      const um = await supabase.from(entidade).insert(p.row).select("id").maybeSingle();
      if (um.error || !um.data) {
        const original = previa.find((l) => l.numero === p.numero);
        errosGravacao.push({
          numero: p.numero,
          status: "erro",
          mensagem: um.error?.code === "23505" ? "O banco recusou: já existe um registro igual" : (um.error?.message ?? "Não foi possível gravar"),
          avisos: [],
          dados: original?.dados ?? {},
        });
      } else {
        criados.push(um.data.id as string);
      }
    }
  }

  const errosAnalise = previa.filter((l) => l.status === "erro");
  const pulados = previa.filter((l) => l.status === "existe" || l.status === "exemplo").length;
  const erros = [...errosAnalise, ...errosGravacao].sort((a, b) => a.numero - b.numero);

  /* Fechamento do lote. Aqui NAO se lanca: os registros ja existem, e derrubar
     a action faria a tela dizer que nada foi importado. Se o fechamento falhar,
     o aviso vai junto do resultado. */
  const { error: fecharError } = await supabase
    .from("importacoes")
    .update({
      criados: criados.length,
      pulados,
      com_erro: erros.length,
      registros_criados: criados,
    })
    .eq("id", lote.id)
    .eq("company_id", companyId);

  return {
    id: lote.id as string,
    criados: criados.length,
    pulados,
    comErro: erros.length,
    erros,
    // A tela avisa que este lote nao tem como ser desfeito.
    loteIncompleto: Boolean(fecharError) && criados.length > 0,
  };
}

export async function listarImportacoes(): Promise<LoteImportacao[]> {
  const { supabase, companyId } = await requireCompany();
  const { data, error } = await supabase
    .from("importacoes")
    .select("id, entidade, arquivo, total_linhas, criados, pulados, com_erro, desfeita_em, desfeitos, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as LoteImportacao[];
}

/** Ids do lote que já estão em uso em outra tabela — esses ficam. */
async function emUso(db: Db, companyId: string, entidade: EntidadeImportacao, ids: string[]): Promise<Set<string>> {
  const usados = new Set<string>();
  const coletar = async (tabela: string, coluna: string, ignorarErro = false) => {
    for (const fatia of fatias(ids)) {
      const { data, error } = await db.from(tabela).select(coluna).eq("company_id", companyId).in(coluna, fatia);
      if (error) {
        if (ignorarErro) return;
        throw error;
      }
      for (const linha of data ?? []) {
        const v = (linha as unknown as Record<string, unknown>)[coluna];
        if (typeof v === "string") usados.add(v);
      }
    }
  };

  switch (entidade) {
    case "insumos":
      await coletar("produto_insumos", "insumo_id");
      await coletar("estoque_movimentos", "insumo_id");
      break;
    case "produtos":
      await coletar("produto_insumos", "produto_id");
      // Produto com foto e produto que a pessoa ja trabalhou. Alem disso, o
      // delete cru aqui nao limpa o Storage (quem faz isso e deleteProduto).
      await coletar("produto_imagens", "produto_id", true);
      break;
    case "clientes":
      await coletar("pedidos", "cliente_id");
      await coletar("conversas", "cliente_id", true);
      break;
    case "fornecedores":
      // Nao quebra nada (fornecedor_id e "on delete set null"), mas o insumo
      // perderia o fornecedor em silencio — e o dialogo promete que o que
      // esta em uso fica.
      await coletar("insumos", "fornecedor_id");
      break;
  }
  return usados;
}

/* Erro ESPERADO volta no retorno, nao lancado.

   Em producao o React descarta a mensagem de um Error lancado dentro de um
   arquivo "use server" e manda so um digest — "Essa importacao ja foi desfeita"
   virava "Minified React error #441" na tela, e a pessoa clicava de novo sem
   entender por que nada acontecia. Sao os dois casos que ela realmente encontra:
   duas abas abertas, ou a lista da tela velha depois de desfazer em outro lugar.
   Falha de infraestrutura (erro cru do Supabase) continua sendo lancada: para
   essa o texto generico serve, e nao ha o que a pessoa faca com ele. */
export async function desfazerImportacao(
  input: { data: unknown },
): Promise<{ desfeitos: number; mantidos: number; erro: string | null }> {
  const { id } = z.object({ id: z.string().uuid() }).parse(input.data);
  const { supabase, companyId } = await requireCompany();

  /* maybeSingle, nao single: com single o "nenhuma linha casou" chega como erro
     tambem, e nao havia como separar lote inexistente (esperado, com mensagem)
     de falha de banco (infra, que segue lancada). */
  const { data: lote, error } = await supabase
    .from("importacoes")
    .select("id, entidade, registros_criados, desfeita_em")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  if (!lote) return { desfeitos: 0, mantidos: 0, erro: "Importação não encontrada." };
  if (lote.desfeita_em) return { desfeitos: 0, mantidos: 0, erro: "Essa importação já foi desfeita." };

  // Linha corrompida no banco, nao coisa que a pessoa possa corrigir: segue
  // lancando, como o parse acima.
  const entidade = entidadeSchema.parse(lote.entidade);
  if (!ENTIDADES.includes(entidade)) throw new Error("Entidade desconhecida.");

  const ids = (lote.registros_criados as string[]) ?? [];
  const usados = await emUso(supabase, companyId, entidade, ids);
  const apagar = ids.filter((i) => !usados.has(i));

  /* .select() no delete: sem ele o supabase devolve data null e nao ha como
     saber quantas linhas casaram. A RLS filtra em silencio — o delete "da
     certo" afetando zero linhas, e o contador mentia dizendo que apagou tudo. */
  const apagados = new Set<string>();
  for (const fatia of fatias(apagar)) {
    const { data, error: delError } = await supabase
      .from(entidade)
      .delete()
      .eq("company_id", companyId)
      .in("id", fatia)
      .select("id");

    if (!delError) {
      for (const linha of data ?? []) apagados.add(linha.id as string);
      continue;
    }
    for (const um of fatia) {
      const { data: umDado } = await supabase
        .from(entidade)
        .delete()
        .eq("company_id", companyId)
        .eq("id", um)
        .select("id")
        .maybeSingle();
      if (umDado) apagados.add(umDado.id as string);
    }
  }

  const desfeitos = apagados.size;
  const restantes = ids.filter((i) => !apagados.has(i));

  /* So encerra o lote quando nao sobrou nada. Marcar desfeita_em com registros
     vivos escondia o botao para sempre: quem tirasse o insumo da composicao
     depois nao teria mais como desfazer. */
  const { error: updError } = await supabase
    .from("importacoes")
    .update(
      restantes.length === 0
        ? { desfeita_em: new Date().toISOString(), desfeitos, registros_criados: [] }
        : { desfeitos, registros_criados: restantes },
    )
    .eq("id", id)
    .eq("company_id", companyId);
  if (updError) throw updError;

  return { desfeitos, mantidos: restantes.length, erro: null };
}

/**
 * Leitura e escrita de planilhas no navegador, sem dependência.
 *
 * Por que sem biblioteca: a máquina de build não tem npm, e a Vercel instala
 * pelo package-lock.json — que o bun não atualiza. Uma dependência nova
 * entraria no package.json e não no lock, e o deploy quebraria em silêncio.
 *
 * O que cobre: CSV (qualquer separador, aspas, BOM, UTF-8 ou Windows-1252) e
 * XLSX simples — o que o Excel e o Google Sheets geram ao preencher um
 * gabarito. XLSX é um zip com XML dentro; o navegador descompacta com
 * DecompressionStream e o DOMParser lê o resto.
 *
 * O que NÃO cobre de propósito: datas do XLSX (viram número de série) e
 * fórmulas sem valor calculado. Os gabaritos não têm coluna de data, e o que
 * escapar aparece como erro na prévia, nunca como dado errado gravado.
 */

export type Tabela = string[][];

/* ------------------------------------------------------------------ CSV */

function decodificar(bytes: ArrayBuffer): string {
  // Excel no Windows salva "CSV" em Windows-1252. UTF-8 estrito falha nisso
  // e a gente cai no fallback, em vez de gravar "JosÃ©".
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function detectarSeparador(primeiraLinha: string): string {
  const candidatos = [";", ",", "\t"];
  let melhor = ";";
  let maior = -1;
  for (const sep of candidatos) {
    let contagem = 0;
    let dentroDeAspas = false;
    for (const ch of primeiraLinha) {
      if (ch === '"') dentroDeAspas = !dentroDeAspas;
      else if (ch === sep && !dentroDeAspas) contagem += 1;
    }
    if (contagem > maior) {
      maior = contagem;
      melhor = sep;
    }
  }
  return melhor;
}

export function lerCsv(texto: string): Tabela {
  const limpo = texto.replace(/^\uFEFF/, "");
  const fimPrimeira = limpo.search(/\r?\n/);
  const separador = detectarSeparador(fimPrimeira === -1 ? limpo : limpo.slice(0, fimPrimeira));

  const linhas: Tabela = [];
  let linha: string[] = [];
  let campo = "";
  let dentroDeAspas = false;

  for (let i = 0; i < limpo.length; i += 1) {
    const ch = limpo[i];

    if (dentroDeAspas) {
      if (ch === '"') {
        if (limpo[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += ch;
      }
      continue;
    }

    // Aspa so abre campo quando e o primeiro caractere dele. No meio ("5\" de
    // altura") e caractere literal — tratar como abertura fazia o parser
    // engolir todas as linhas seguintes ate o fim do arquivo, em silencio.
    if (ch === '"' && campo === "") {
      dentroDeAspas = true;
    } else if (ch === separador) {
      linha.push(campo);
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpo[i + 1] === "\n") i += 1;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += ch;
    }
  }
  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return marcarVazias(linhas);
}

/* Linha vazia nao e descartada: vira [] e mantem o lugar. Descartar aqui fazia
   o "#" da previa apontar para a linha errada assim que houvesse um buraco no
   meio do arquivo — e esse numero e o que a pessoa usa para achar a linha. */
function marcarVazias(linhas: Tabela): Tabela {
  return linhas.map((l) => (l.some((c) => c.trim() !== "") ? l : []));
}

/** CSV com BOM e ponto-e-vírgula: abre em colunas no Excel pt-BR e no Sheets. */
export function gerarCsv(linhas: Tabela): string {
  const escapar = (valor: string) => {
    const precisa = /[";\n\r]/.test(valor);
    return precisa ? `"${valor.replace(/"/g, '""')}"` : valor;
  };
  return "\uFEFF" + linhas.map((l) => l.map(escapar).join(";")).join("\r\n") + "\r\n";
}

export function baixarArquivo(nome: string, conteudo: string, tipo = "text/csv;charset=utf-8") {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ----------------------------------------------------------------- XLSX */

type EntradaZip = {
  nome: string;
  metodo: number;
  tamanhoComprimido: number;
  offsetLocal: number;
};

function lerEntradasZip(buffer: ArrayBuffer): EntradaZip[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Fim do diretório central (EOCD): assinatura 0x06054b50, varrendo do fim.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("Arquivo XLSX inválido (sem diretório).");

  const total = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const entradas: EntradaZip[] = [];
  const decoder = new TextDecoder("utf-8");

  for (let n = 0; n < total; n += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const metodo = view.getUint16(pos + 10, true);
    const tamanhoComprimido = view.getUint32(pos + 20, true);
    const tamNome = view.getUint16(pos + 28, true);
    const tamExtra = view.getUint16(pos + 30, true);
    const tamComentario = view.getUint16(pos + 32, true);
    const offsetLocal = view.getUint32(pos + 42, true);
    const nome = decoder.decode(bytes.subarray(pos + 46, pos + 46 + tamNome));
    entradas.push({ nome, metodo, tamanhoComprimido, offsetLocal });
    pos += 46 + tamNome + tamExtra + tamComentario;
  }
  return entradas;
}

async function extrairArquivoZip(buffer: ArrayBuffer, entrada: EntradaZip): Promise<string> {
  const view = new DataView(buffer);
  const p = entrada.offsetLocal;
  if (view.getUint32(p, true) !== 0x04034b50) throw new Error("Arquivo XLSX inválido (entrada).");
  const tamNome = view.getUint16(p + 26, true);
  const tamExtra = view.getUint16(p + 28, true);
  const inicio = p + 30 + tamNome + tamExtra;
  const comprimido = buffer.slice(inicio, inicio + entrada.tamanhoComprimido);

  if (entrada.metodo === 0) return new TextDecoder("utf-8").decode(comprimido);
  if (entrada.metodo !== 8) throw new Error("Arquivo XLSX com compressão não suportada.");

  if (typeof DecompressionStream === "undefined") {
    throw new Error(
      "Este navegador não consegue ler XLSX. Salve a planilha como CSV e envie de novo.",
    );
  }
  const stream = new Blob([comprimido]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

function colunaParaIndice(ref: string): number {
  const letras = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function textoDoNo(no: Element | null): string {
  return no ? (no.textContent ?? "") : "";
}

export async function lerXlsx(buffer: ArrayBuffer): Promise<Tabela> {
  const entradas = lerEntradasZip(buffer);
  const acharEntrada = (nome: string) => entradas.find((e) => e.nome === nome);
  const parser = new DOMParser();

  // Primeira aba do workbook. Cai em sheet1.xml se a estrutura fugir do comum.
  let caminhoAba = "xl/worksheets/sheet1.xml";
  const workbook = acharEntrada("xl/workbook.xml");
  const rels = acharEntrada("xl/_rels/workbook.xml.rels");
  if (workbook && rels) {
    const wbXml = parser.parseFromString(await extrairArquivoZip(buffer, workbook), "application/xml");
    const relsXml = parser.parseFromString(await extrairArquivoZip(buffer, rels), "application/xml");
    const primeiraAba = wbXml.getElementsByTagName("sheet")[0];
    const rId =
      primeiraAba?.getAttribute("r:id") ?? primeiraAba?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    if (rId) {
      const rel = Array.from(relsXml.getElementsByTagName("Relationship")).find(
        (r) => r.getAttribute("Id") === rId,
      );
      const alvo = rel?.getAttribute("Target");
      if (alvo) caminhoAba = alvo.startsWith("/") ? alvo.slice(1) : `xl/${alvo.replace(/^\.\//, "")}`;
    }
  }

  const aba = acharEntrada(caminhoAba) ?? acharEntrada("xl/worksheets/sheet1.xml");
  if (!aba) throw new Error("Não achei a primeira aba da planilha.");

  const compartilhadas: string[] = [];
  const ss = acharEntrada("xl/sharedStrings.xml");
  if (ss) {
    const ssXml = parser.parseFromString(await extrairArquivoZip(buffer, ss), "application/xml");
    for (const si of Array.from(ssXml.getElementsByTagName("si"))) {
      // Texto pode vir fragmentado em vários <t> (formatação rica).
      compartilhadas.push(Array.from(si.getElementsByTagName("t")).map((t) => t.textContent ?? "").join(""));
    }
  }

  const abaXml = parser.parseFromString(await extrairArquivoZip(buffer, aba), "application/xml");
  const linhas: Tabela = [];

  for (const row of Array.from(abaXml.getElementsByTagName("row"))) {
    // O Excel omite do XML as linhas totalmente vazias. Sem olhar o `r` da
    // row, dados nas linhas 2, 3 e 5 virariam 1, 2 e 3 na previa.
    const numeroLinha = Number(row.getAttribute("r") ?? 0);
    if (numeroLinha > 0) {
      while (linhas.length < numeroLinha - 1) linhas.push([]);
    }
    const celulas: string[] = [];
    for (const c of Array.from(row.getElementsByTagName("c"))) {
      const ref = c.getAttribute("r") ?? "";
      const indice = ref ? colunaParaIndice(ref) : celulas.length;
      const tipo = c.getAttribute("t");
      let valor = "";
      if (tipo === "s") {
        valor = compartilhadas[Number(textoDoNo(c.getElementsByTagName("v")[0] ?? null))] ?? "";
      } else if (tipo === "inlineStr") {
        valor = Array.from(c.getElementsByTagName("t")).map((t) => t.textContent ?? "").join("");
      } else if (tipo === "e") {
        // #N/D, #VALOR!: valor calculado que e um erro. Vazio faz a linha cair
        // na validacao de campo obrigatorio, em vez de virar cadastro.
        valor = "";
      } else if (tipo === "b") {
        valor = textoDoNo(c.getElementsByTagName("v")[0] ?? null) === "1" ? "sim" : "não";
      } else {
        valor = textoDoNo(c.getElementsByTagName("v")[0] ?? null);
      }
      while (celulas.length < indice) celulas.push("");
      celulas[indice] = valor;
    }
    linhas.push(celulas);
  }

  return marcarVazias(linhas);
}

/* --------------------------------------------------------------- Entrada */

export async function lerArquivoPlanilha(arquivo: File): Promise<Tabela> {
  const buffer = await arquivo.arrayBuffer();
  const nome = arquivo.name.toLowerCase();

  // XLSX começa com a assinatura de zip "PK". Decide pelo conteúdo, não só
  // pela extensão: tem gente que renomeia.
  const cabecalho = new Uint8Array(buffer.slice(0, 2));
  const pareceZip = cabecalho[0] === 0x50 && cabecalho[1] === 0x4b;

  if (pareceZip || nome.endsWith(".xlsx")) {
    if (!pareceZip) throw new Error("O arquivo tem extensão .xlsx mas não é uma planilha do Excel.");
    return lerXlsx(buffer);
  }
  if (nome.endsWith(".xls")) {
    throw new Error(
      "Formato .xls (Excel antigo) não é suportado. Salve como .xlsx ou .csv e envie de novo.",
    );
  }
  return lerCsv(decodificar(buffer));
}

/** Normaliza cabeçalho para casar com o gabarito: minúsculo, sem acento, sem espaços extras. */
export function normalizarCabecalho(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

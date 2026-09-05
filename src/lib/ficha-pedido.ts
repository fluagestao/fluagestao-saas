// Ficha do pedido para imprimir ou salvar em PDF.
//
// É o papel que vai junto do trabalho: a produção monta a cesta olhando ela, e
// o entregador recebe a mesma folha com endereço e contato de quem recebe.
// Reproduz o modelo que a casa já usava à mão.
//
// Sem biblioteca de PDF: abre uma janela com o layout pronto e chama a
// impressão do próprio navegador, que salva em PDF em qualquer sistema.

import { formatBRL, type Pedido } from "./vendas";

/** Insumo de um produto, como sai do cadastro. */
export type InsumoDaFicha = {
  nome: string;
  quantidade: number;
  unidade: string | null;
};

/** Composição de cada produto, indexada pelo slug que o item do pedido guarda. */
export type ComposicoesDaFicha = Record<string, InsumoDaFicha[]>;

export type EmpresaFichaPedido = {
  nome: string;
  logoUrl?: string | null;
  endereco?: string | null;
  cidadeUf?: string | null;
};

const DIAS = ["DOMINGO", "SEGUNDA", "TERÇA", "QUARTA", "QUINTA", "SEXTA", "SÁBADO"];

function dataPorExtenso(iso: string | null): string {
  if (!iso) return "a combinar";
  const [ano, mes, dia] = iso.split("-").map(Number);
  const semana = DIAS[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")} • ${semana}`;
}

function esc(v: string | null | undefined): string {
  return (v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function escAttr(v: string | null | undefined): string {
  return esc(v).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function htmlDaFicha(
  p: Pedido,
  empresaDados: string | EmpresaFichaPedido = "Sua empresa",
  composicoes: ComposicoesDaFicha = {},
): string {
  const dadosEmpresa: EmpresaFichaPedido =
    typeof empresaDados === "string"
      ? { nome: empresaDados }
      : empresaDados;
  const nomeEmpresa = dadosEmpresa.nome.trim() || "Sua empresa";
  const empresa = esc(nomeEmpresa);
  const linhas = p.itens
    .map((i) => {
      const qtd = i.qtd > 1 ? `${String(i.qtd).padStart(2, "0")} ` : "";
      const nome = `${qtd}${i.nome}${i.variacao ? ` (${i.variacao})` : ""}`;
      const valor = i.preco != null ? formatBRL(i.preco * i.qtd) : "a combinar";
      return `<tr><td>${esc(nome)}</td><td class="v">${valor}</td></tr>`;
    })
    .join("");

  const frete =
    p.tipo === "retirada"
      ? `<tr><td>Retirada na loja</td><td class="v">—</td></tr>`
      : p.taxa_entrega
        ? `<tr><td>Frete</td><td class="v">${formatBRL(p.taxa_entrega)}</td></tr>`
        : "";

  const endereco = [p.endereco, p.bairro].filter(Boolean).join(", ");
  const cartao =
    p.cartao_habilitado !== false &&
    (p.cartao_de || p.cartao_para || p.cartao_mensagem);
  const enderecoEmpresa = [dadosEmpresa.endereco, dadosEmpresa.cidadeUf]
    .filter(Boolean)
    .join(" • ");
  /* LISTA DE MONTAGEM.
     A ficha dizia o que vender e não o que POR DENTRO da cesta — quem monta
     precisava abrir o cadastro do produto numa tela para conferir item a item.
     Aqui ela vira roteiro de bancada: cada produto com os seus insumos e uma
     caixinha para marcar a lápis enquanto monta.

     A quantidade é multiplicada pelo `qtd` do item: dois Kits vinho e queijos
     pedem dois vinhos, e listar "1 un" ao lado de "2x Kit" é o tipo de detalhe
     que faz faltar item na hora da entrega.

     Item personalizado (montado fora do catálogo) não tem slug, mas carrega os
     próprios insumos no pedido — esse caminho também entra. */
  const blocos = p.itens
    .map((item) => {
      const doCatalogo = item.slug ? composicoes[item.slug] : undefined;
      const doItem = item.insumos?.map((i) => ({
        nome: i.nome,
        quantidade: i.quantidade,
        unidade: null as string | null,
      }));
      const insumos = doCatalogo?.length ? doCatalogo : doItem;
      if (!insumos?.length) return "";

      const vezes = Math.max(1, Number(item.qtd) || 1);
      const linhasInsumo = insumos
        .map((i) => {
          const total = i.quantidade * vezes;
          // Sem casas decimais penduradas: 2 em vez de 2,00, mas 0,25 inteiro.
          const numero = Number.isInteger(total)
            ? String(total)
            : String(Number(total.toFixed(3))).replace(".", ",");
          const medida = [numero, i.unidade ?? ""].filter(Boolean).join(" ");
          return `<li><span class="caixa"></span>${esc(i.nome)}<span class="qtd">${esc(medida)}</span></li>`;
        })
        .join("");

      return `<div class="bloco"><p class="titulo">${vezes}x ${esc(item.nome)}</p><ul>${linhasInsumo}</ul></div>`;
    })
    .filter(Boolean)
    .join("");

  const montagem = blocos
    ? `<div class="montagem"><p class="rot-secao">Montagem</p>${blocos}</div>`
    : "";

  const marca = dadosEmpresa.logoUrl
    ? `<img src="${escAttr(dadosEmpresa.logoUrl)}" alt="${escAttr(`Logo de ${nomeEmpresa}`)}"><span>${empresa}</span>`
    : `<strong>${empresa}</strong><span>Gestão via Flua</span>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido #${p.numero} — ${empresa}</title>
<style>
  @page { size: A5; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
    color: #2b2320; margin: 0; padding: 6mm;
    /* O papel é claro: fundo colorido gasta tinta e não ajuda ninguém. */
    background: #fff; font-size: 11pt; line-height: 1.35;
  }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8mm; }
  h1 { font-size: 20pt; letter-spacing: .06em; margin: 0; font-weight: 400; text-transform: uppercase; }
  .sub { color: #9a8578; font-size: 11pt; }
  .marca { text-align: right; max-width: 58mm; }
  .marca strong { display: block; color: #703D3A; font-size: 12pt; }
  .marca img { display: block; max-width: 42mm; max-height: 22mm; margin-left: auto; object-fit: contain; }
  .marca span { display: block; margin-top: 1mm; color: #9a8578; font-size: 7.5pt; }
  .campo, table { border: 1px solid #c9b9ad; border-radius: 2mm; }
  .campo { padding: 2mm 3mm; margin-top: 2.5mm; }
  .rot {
    background: #f2dcd6; color: #8c3a2e; border-radius: 999px;
    padding: .3mm 2.5mm; font-size: 9pt; font-weight: 700; margin-right: 2mm;
  }
  .dupla { display: flex; gap: 2.5mm; }
  .dupla > .campo { flex: 1; margin-top: 2.5mm; }
  table { width: 100%; border-collapse: collapse; margin-top: 3mm; overflow: hidden; }
  th, td { border-bottom: 1px solid #ddcec4; padding: 1.8mm 3mm; text-align: left; }
  th { background: #f7efe9; font-weight: 600; }
  td.v, th.v { text-align: right; white-space: nowrap; width: 26mm; }
  tr:last-child td { border-bottom: 0; }
  .total { display: flex; margin-top: 3mm; border: 1px solid #c9b9ad; border-radius: 2mm; overflow: hidden; }
  .total .lado { flex: 1; padding: 2mm 3mm; }
  .total .destaque { background: #f2dcd6; font-weight: 700; text-align: right; }
  .msg { margin-top: 3mm; min-height: 18mm; white-space: pre-wrap; }
  .montagem { margin-top: 3mm; border: 1px solid #c9b9ad; border-radius: 2mm; padding: 2mm 3mm; }
  .rot-secao {
    margin: 0 0 1.5mm; color: #8c3a2e; font-size: 9pt; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
  }
  .montagem .bloco + .bloco { margin-top: 2mm; padding-top: 2mm; border-top: 1px solid #eaddd5; }
  .montagem .titulo { margin: 0 0 1mm; font-weight: 600; font-size: 10pt; }
  .montagem ul { margin: 0; padding: 0; list-style: none; }
  .montagem li { display: flex; align-items: center; gap: 2mm; font-size: 10pt; padding: .6mm 0; }
  /* Caixa vazia de verdade, para marcar a lápis na bancada. */
  .montagem .caixa {
    flex: 0 0 auto; width: 3.4mm; height: 3.4mm;
    border: 1px solid #a9948a; border-radius: .8mm;
  }
  .montagem .qtd { margin-left: auto; color: #7d6a61; white-space: nowrap; }
  .rodape { margin-top: 4mm; color: #9a8578; font-size: 8.5pt; display: flex; justify-content: space-between; }
  @media print { .aviso { display: none; } }
  .aviso {
    margin-bottom: 4mm; padding: 2mm 3mm; border-radius: 2mm;
    background: #f7efe9; color: #8c3a2e; font-size: 9.5pt;
  }
</style></head>
<body>
  <p class="aviso">Use Imprimir → "Salvar como PDF" para enviar ao entregador. Esta faixa não sai no papel.</p>

  <header>
    <div>
      <h1>Ficha do pedido</h1>
      <div class="sub">#${p.numero}${p.origem === "bia" ? " • pela BIA" : p.origem === "site" ? " • pelo site" : ""}</div>
    </div>
    <div class="marca">${marca}</div>
  </header>

  <div class="campo"><span class="rot">${p.tipo === "retirada" ? "Retirada" : "Entrega"}</span>${dataPorExtenso(p.data_entrega)}${p.janela_entrega ? ` • ${esc(p.janela_entrega)}` : ""}</div>

  <div class="dupla">
    <div class="campo"><span class="rot">Cliente</span>${esc(p.cliente_nome) || "—"}</div>
    <div class="campo"><span class="rot">Contato</span>${esc(p.cliente_whatsapp) || "—"}</div>
  </div>

  ${
    p.tipo !== "retirada" && (p.destinatario_nome || p.destinatario_whatsapp)
      ? `<div class="dupla">
    <div class="campo"><span class="rot">Presenteada/o</span>${esc(p.destinatario_nome) || "—"}</div>
    <div class="campo"><span class="rot">Contato</span>${esc(p.destinatario_whatsapp) || "—"}</div>
  </div>`
      : ""
  }

  ${
    p.tipo !== "retirada" && (endereco || p.cep || p.referencia)
      ? `<div class="campo"><span class="rot">Endereço</span>${esc(endereco)}${p.cep ? `<br>CEP ${esc(p.cep)}` : ""}${p.referencia ? `<br>${esc(p.referencia)}` : ""}</div>`
      : ""
  }

  <table>
    <tr><th>Produto</th><th class="v">R$</th></tr>
    ${linhas}
    ${frete}
  </table>

  ${montagem}

  <div class="total">
    <div class="lado"><span class="rot">Pagamento</span>${esc(p.forma_pagamento) || "a combinar"}${p.recebido_em ? " • PAGO" : ""}</div>
    <div class="lado destaque">Total ${formatBRL(p.total)}</div>
  </div>

  ${
    cartao
      ? `<div class="campo msg">
      ${p.cartao_de ? `<strong>De:</strong> ${esc(p.cartao_de)}<br>` : ""}
      ${p.cartao_para ? `<strong>Para:</strong> ${esc(p.cartao_para)}<br>` : ""}
      ${p.cartao_mensagem ? `<br>${esc(p.cartao_mensagem)}` : ""}
    </div>`
      : ""
  }

  ${p.observacao ? `<div class="campo"><span class="rot">Observação</span>${esc(p.observacao)}</div>` : ""}

  <div class="rodape"><span>${empresa}${enderecoEmpresa ? ` • ${esc(enderecoEmpresa)}` : ""}</span><span>Gerado pela Flua Gestão</span></div>
</body></html>`;
}

/**
 * Abre diretamente o diálogo de impressão/PDF, sem deixar uma página extra
 * da ficha aberta no navegador.
 *
 * Precisa ser chamada direto do clique, sem await antes: o navegador só deixa
 * abrir janela dentro do gesto da pessoa.
 */
export function imprimirFicha(
  p: Pedido,
  empresaDados: string | EmpresaFichaPedido = "Sua empresa",
  composicoes: ComposicoesDaFicha = {},
): boolean {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.opacity = "0";
  document.body.appendChild(frame);

  const documento = frame.contentDocument;
  const janela = frame.contentWindow;
  if (!documento || !janela) {
    frame.remove();
    return false;
  }
  frame.onload = () => {
    janela.focus();
    janela.print();
    window.setTimeout(() => frame.remove(), 1_000);
  };
  documento.open();
  documento.write(htmlDaFicha(p, empresaDados, composicoes));
  documento.close();
  return true;
}

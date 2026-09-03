/**
 * Leitura de número digitado, em português.
 *
 * Existia em doze arquivos, com quatro implementações diferentes — e três
 * delas erravam o ponto de milhar. A do Financeiro tratava o ponto como
 * decimal: "22.127,00" virava lixo, o Number() devolvia NaN e um `|| 0`
 * transformava o saldo inicial em R$ 0,00, calado. A do Estoque tinha o mesmo
 * defeito por outro caminho e fazia 1,5 virar 15.
 *
 * Módulo puro, sem "use server": roda no cliente enquanto a pessoa digita e no
 * servidor quando precisa revalidar.
 */

/**
 * Devolve o número, ou null quando o texto não é um número.
 *
 * Null e não zero de propósito: quem chama decide o que fazer com "não deu
 * para ler". Devolver zero é o que fazia o saldo desaparecer sem avisar —
 * o valor errado passa por válido e ninguém descobre.
 *
 * Aceita as formas que uma pessoa digita de verdade:
 *   "1.234,56" e "1234,56"  → 1234.56
 *   "1,5" e "1.5"           → 1.5
 *   "R$ 89,90"              → 89.9
 *   "1.234"                 → 1234   (milhar, não 1,234)
 */
export function paraNumero(texto: string | number | null | undefined): number | null {
  if (typeof texto === "number") return Number.isFinite(texto) ? texto : null;
  if (texto == null) return null;

  // Fora tudo que não é dígito, separador ou sinal: "R$", espaço, letra solta.
  const limpo = String(texto).trim().replace(/[^\d.,-]/g, "");
  if (!limpo || limpo === "-") return null;

  const temVirgula = limpo.includes(",");
  const temPonto = limpo.includes(".");

  let normalizado: string;

  if (temVirgula && temPonto) {
    // Os dois presentes: o último a aparecer é o decimal. Cobre "1.234,56" e
    // o formato americano "1,234.56", que aparece em planilha exportada.
    const decimal = limpo.lastIndexOf(",") > limpo.lastIndexOf(".") ? "," : ".";
    const milhar = decimal === "," ? "." : ",";
    normalizado = limpo.split(milhar).join("").replace(decimal, ".");
  } else if (temVirgula) {
    // Vírgula sozinha é sempre decimal em português.
    normalizado = limpo.replace(",", ".");
  } else if (temPonto) {
    /* Ponto sozinho é ambíguo: "1.5" é um e meio, "1.234" é mil duzentos e
       trinta e quatro. O que separa os dois é o tamanho do último grupo —
       milhar sempre tem três dígitos. É a mesma regra que já estava em
       importacao.ts e que fez R$ 1.500 parar de virar R$ 1,50. */
    normalizado = /^-?\d{1,3}(\.\d{3})+$/.test(limpo) ? limpo.split(".").join("") : limpo;
  } else {
    normalizado = limpo;
  }

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

/** Atalho para quem já tratou o vazio e aceita zero como padrão. */
export function paraNumeroOuZero(texto: string | number | null | undefined): number {
  return paraNumero(texto) ?? 0;
}

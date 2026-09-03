/**
 * A conta da margem, em um lugar só.
 *
 * Módulo sem "use server" de propósito: a Calculadora e o Simulador precisam
 * recalcular a cada tecla, sem ida ao servidor. Uma fórmula só para as duas
 * telas — se cada uma tivesse a sua, elas divergiriam em algum arredondamento
 * e ninguém descobriria até um preço sair errado.
 */

export type CalculoConfig = {
  custo_hora: number;
  /** Frações (0.13 = 13%), sempre sobre o PREÇO de venda. */
  percentual_fixo: number;
  percentual_taxa: number;
  percentual_perdas: number;
  incluir_no_calculo: boolean;
};

export const CONFIG_VAZIA: CalculoConfig = {
  custo_hora: 0,
  percentual_fixo: 0,
  percentual_taxa: 0,
  percentual_perdas: 0,
  incluir_no_calculo: false,
};

export type Cascata = {
  preco: number | null;
  insumos: number;
  maoDeObra: number;
  custoFixo: number;
  taxa: number;
  perdas: number;
  /** Preço − insumos. Diz se o PRODUTO se paga. */
  contribuicao: number | null;
  margemContribuicao: number | null;
  /** O que sobra depois de tudo. Diz se o NEGÓCIO sobrevive. */
  sobraReal: number | null;
  margemReal: number | null;
  /** Abaixo disso o produto dá prejuízo. */
  precoMinimo: number | null;
  /** Soma dos percentuais aplicados, como fração. */
  fracaoPercentual: number;
  /** true quando os custos de montagem e fixos estão entrando na conta. */
  completa: boolean;
};

function fracaoTotal(config: CalculoConfig): number {
  if (!config.incluir_no_calculo) return 0;
  return config.percentual_fixo + config.percentual_taxa + config.percentual_perdas;
}

function maoDeObraDe(config: CalculoConfig, tempoMin: number | null): number {
  if (!config.incluir_no_calculo || !tempoMin || tempoMin <= 0) return 0;
  return config.custo_hora * (tempoMin / 60);
}

export function calcular(
  preco: number | null,
  insumos: number,
  tempoMin: number | null,
  config: CalculoConfig,
): Cascata {
  const fracao = fracaoTotal(config);
  const maoDeObra = maoDeObraDe(config, tempoMin);

  const custoFixo = preco != null && config.incluir_no_calculo ? preco * config.percentual_fixo : 0;
  const taxa = preco != null && config.incluir_no_calculo ? preco * config.percentual_taxa : 0;
  const perdas = preco != null && config.incluir_no_calculo ? preco * config.percentual_perdas : 0;

  const contribuicao = preco == null ? null : preco - insumos;
  const sobraReal = preco == null ? null : preco - insumos - maoDeObra - custoFixo - taxa - perdas;

  /* Preço mínimo: onde a sobra real zera.
     preço − insumos − mão de obra − preço × P = 0  →  preço = (insumos + mo) / (1 − P)
     O teto de 0,9 no banco garante que o divisor nunca chega a zero. */
  const base = insumos + maoDeObra;
  const precoMinimo = fracao < 1 && base > 0 ? base / (1 - fracao) : null;

  return {
    preco,
    insumos,
    maoDeObra,
    custoFixo,
    taxa,
    perdas,
    contribuicao,
    margemContribuicao: preco != null && preco > 0 ? (preco - insumos) / preco : null,
    sobraReal,
    margemReal: preco != null && preco > 0 && sobraReal != null ? sobraReal / preco : null,
    precoMinimo,
    fracaoPercentual: fracao,
    completa: config.incluir_no_calculo,
  };
}

/**
 * Preço que atinge a margem desejada, já descontando mão de obra e percentuais.
 *
 * preço × (1 − P − margem) = insumos + mão de obra
 *
 * Com a configuração desligada vira custo ÷ (1 − margem), que é o que a tela
 * fazia antes — o comportamento antigo continua sendo um caso deste.
 */
export function precoParaMargem(
  insumos: number,
  tempoMin: number | null,
  margem: number,
  config: CalculoConfig,
): number | null {
  const fracao = fracaoTotal(config);
  const base = insumos + maoDeObraDe(config, tempoMin);
  const divisor = 1 - fracao - margem;
  if (base <= 0 || divisor <= 0) return null;
  return base / divisor;
}

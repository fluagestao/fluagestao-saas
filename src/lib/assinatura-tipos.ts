/**
 * Estado da assinatura, e o limiar do aviso.
 *
 * Arquivo separado de propósito: `assinatura.ts` é "server-only" porque
 * consulta o banco, e o painel — que é client — precisa do tipo e da
 * constante para desenhar a faixa. Importar o módulo servidor de um client
 * quebra o build inteiro.
 */

export type Assinatura = {
  plano: string;
  status: string;
  /** Fim do teste ou do período pago. Null quando não há prazo. */
  terminaEm: string | null;
  /** Dias inteiros até o fim. Negativo depois de vencido, null sem prazo. */
  diasRestantes: number | null;
  /** true = o teste acabou e não virou assinatura paga. */
  expirada: boolean;
  /** Só o teste avisa que está acabando; assinatura paga não incomoda. */
  emTeste: boolean;
};

/* Aviso a partir daqui. Antes disso a pessoa ainda está conhecendo o sistema e
   um contador regressivo no topo só atrapalha. */
export const DIAS_PARA_AVISAR = 3;

export const MOTIVO_EXPIRADA =
  "Seu teste gratuito terminou. Seus dados continuam aqui e você pode consultar tudo — para voltar a lançar, assine o Flua.";

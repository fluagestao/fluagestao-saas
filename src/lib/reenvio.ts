/* O intervalo entre dois e-mails para o MESMO endereço é uma regra do servidor
   ("Minimum interval per user", em Authentication > Emails > SMTP provider
   settings). Dentro dela o Supabase recusa o envio e a ação de servidor devolve
   a mesma frase genérica de sempre — quem clica lê "enviamos o link" e não
   recebe nada.

   Guardar a contagem só no useState da tela não resolve: a tela de cadastro
   concluído tem "Ir para o login" como botão principal, e chegando no login o
   componente monta zerado. A pessoa cai justamente no botão que acabou de ser
   travado, agora liberado, e leva o silêncio. Por isso o prazo mora no
   localStorage e é amarrado ao e-mail: trocar de endereço não deve herdar a
   espera de outro. */

export const INTERVALO_REENVIO = 60;

const CHAVE = "flua.reenvio";

type Marca = { email: string; ate: number };

function ler(): Marca | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const marca = JSON.parse(bruto) as Marca;
    if (typeof marca?.email !== "string" || typeof marca?.ate !== "number") return null;
    return marca;
  } catch {
    return null;
  }
}

export function marcarEnvio(email: string) {
  try {
    const marca: Marca = {
      email: email.trim().toLowerCase(),
      ate: Date.now() + INTERVALO_REENVIO * 1000,
    };
    window.localStorage.setItem(CHAVE, JSON.stringify(marca));
  } catch {
    /* Aba anônima ou armazenamento bloqueado: sem a marca o botão libera na
       hora. É pior que o ideal, não é quebra — o servidor continua sendo quem
       decide de verdade. */
  }
}

export function segundosRestantes(email: string) {
  const marca = ler();
  if (!marca || marca.email !== email.trim().toLowerCase()) return 0;
  return Math.max(0, Math.ceil((marca.ate - Date.now()) / 1000));
}

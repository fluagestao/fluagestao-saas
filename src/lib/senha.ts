/**
 * Política de senha, em um lugar só.
 *
 * Módulo puro, sem "use server": a tela usa para mostrar a força enquanto a
 * pessoa digita, e a ação de servidor usa para decidir. A validação do cliente
 * é conveniência — quem chama a API do Supabase direto pula ela, e por isso a
 * mesma função roda no servidor antes de qualquer cadastro.
 *
 * Antes desta política o cadastro aceitava 6 caracteres quaisquer ("123456"
 * passava), enquanto o redefinir-senha exigia 10 com símbolo. A porta de
 * entrada é que define a força real da conta.
 */

export const MIN_SENHA = 8;

/* Lista curta de propósito: cobre o que aparece em vazamento real e no teclado
   brasileiro, sem virar um dicionário embarcado de 100 mil linhas que pesaria
   no bundle sem impedir nada que a força bruta já não resolva. */
const COMUNS = new Set([
  "12345678", "123456789", "1234567890", "senha123", "password", "password1",
  "qwertyui", "abc12345", "flua1234", "11111111", "00000000", "1q2w3e4r",
  "admin123", "mudar123", "brasil123", "senhasenha", "12341234", "iloveyou",
]);

export type ForcaSenha = {
  valida: boolean;
  /** 0 a 4. Serve só para a barra na tela. */
  nivel: number;
  /** O que ainda falta, na ordem em que deve ser mostrado. */
  faltas: string[];
};

export function avaliarSenha(senha: string, email?: string): ForcaSenha {
  const faltas: string[] = [];

  if (senha.length < MIN_SENHA) faltas.push(`pelo menos ${MIN_SENHA} caracteres`);
  if (!/[A-ZÀ-Þ]/.test(senha)) faltas.push("uma letra maiúscula");
  if (!/[a-zß-ÿ]/.test(senha)) faltas.push("uma letra minúscula");
  if (!/[0-9]/.test(senha)) faltas.push("um número");
  if (!/[^A-Za-zÀ-ÿ0-9]/.test(senha)) faltas.push("um caractere especial");

  const normalizada = senha.toLowerCase();

  if (COMUNS.has(normalizada)) {
    faltas.push("não ser uma senha comum");
  }

  if (email) {
    const usuario = email.split("@")[0]?.toLowerCase() ?? "";
    // O nome do e-mail dentro da senha é o padrão mais previsível que existe:
    // quem tem o e-mail já tem metade da senha.
    if (normalizada === email.toLowerCase() || (usuario.length >= 3 && normalizada.includes(usuario))) {
      faltas.push("ser diferente do seu e-mail");
    }
  }

  // O nível é só a barra: conta os requisitos atendidos, com um degrau extra
  // para quem passou bem do mínimo.
  const atendidos = 5 - faltas.filter((f) => !f.startsWith("não ser") && !f.startsWith("ser diferente")).length;
  const nivel = faltas.length > 0 ? Math.max(0, Math.min(3, atendidos)) : senha.length >= 12 ? 4 : 3;

  return { valida: faltas.length === 0, nivel, faltas };
}

/** Frase única para a tela, montada a partir do que falta. */
export function mensagemSenha(forca: ForcaSenha): string | null {
  if (forca.valida) return null;
  if (forca.faltas.length === 1) return `A senha precisa ter ${forca.faltas[0]}.`;
  const ultima = forca.faltas[forca.faltas.length - 1];
  return `A senha precisa ter ${forca.faltas.slice(0, -1).join(", ")} e ${ultima}.`;
}

export const ROTULO_FORCA = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];

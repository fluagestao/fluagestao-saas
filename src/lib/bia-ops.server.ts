export type Conversa = {
  id: string;
  canal: string;
  wa_id: string | null;
  nome: string | null;
  cliente_id: string | null;
  atendimento_humano: boolean;
  ultima_em: string;
  created_at: string;
};

export type MensagemSalva = {
  id: string;
  conversa_id: string;
  papel: "cliente" | "bia" | "humano" | "sistema";
  texto: string | null;
  created_at: string;
};

export type ResultadoBia = {
  texto: string;
  partes: string[];
  chamouHumano: string | null;
  silenciada: boolean;
  ferramentas: { nome: string; args: string; resultado: string }[];
};

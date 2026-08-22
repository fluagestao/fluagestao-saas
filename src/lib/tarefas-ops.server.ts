export type Tarefa = {
  id: string;
  titulo: string;
  detalhe: string | null;
  prazo: string | null;
  feita: boolean;
  feita_em: string | null;
  prioridade: "baixa" | "normal" | "alta";
  ordem: number;
  criada_por: string | null;
  responsavel_user_id?: string | null;
  created_at?: string;
};

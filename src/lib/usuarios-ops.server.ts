export type Usuario = {
  email: string;
  nome: string | null;
  created_at: string | null;
  temConta: boolean;
  ultimoAcesso: string | null;
  role?: "owner" | "admin" | "member";
  status?: "active" | "suspended";
};

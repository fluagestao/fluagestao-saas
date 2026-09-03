import "server-only";

import { lerAssinatura, MOTIVO_EXPIRADA, type Assinatura } from "@/lib/assinatura";
import { createClient } from "@/lib/supabase/server";

/* Métodos que gravam. Ficam listados aqui, e não espalhados por 106 chamadas
   nos 22 arquivos de lib: com a trava em cada ponto de escrita, bastava
   esquecer uma para o teste vencido continuar gravando por ali — e ninguém
   descobriria, porque a falha é silenciosa (funciona). */
const ESCRITAS = new Set(["insert", "update", "upsert", "delete"]);

/* O storage é um cliente à parte: `db.storage.from(bucket).remove(...)` não
   passa pelo `from` da tabela e escapava da trava. São as fotos de produto —
   apagar foto com o teste vencido é escrita como qualquer outra. */
const ESCRITAS_STORAGE = new Set(["upload", "remove", "copy", "move", "createSignedUploadUrl"]);

/**
 * Devolve o cliente com a escrita travada.
 *
 * Todos os quatro RPCs que passam por este contexto são mutação
 * (complete_onboarding, marcar_recebimento_pedido, marcar_recebimentos_pedidos,
 * registrar_pagamento_pedido), então `rpc` entra na trava junto. O
 * complete_onboarding do cadastro não é afetado: ele roda com o cliente cru,
 * fora deste contexto — senão quem acabou de assinar não conseguiria nascer.
 */
function travarEscrita<T extends object>(supabase: T, motivo: string): T {
  return new Proxy(supabase, {
    get(alvo, prop, receptor) {
      if (prop === "rpc") {
        return () => {
          throw new Error(motivo);
        };
      }

      if (prop === "storage") {
        const store = Reflect.get(alvo, prop) as { from: (b: string) => object };
        return new Proxy(store, {
          get(st, p) {
            if (p !== "from") {
              const v = Reflect.get(st, p);
              return typeof v === "function" ? v.bind(st) : v;
            }
            return (balde: string) => {
              const bucket = st.from(balde);
              return new Proxy(bucket, {
                get(b, metodo) {
                  if (typeof metodo === "string" && ESCRITAS_STORAGE.has(metodo)) {
                    return () => {
                      throw new Error(motivo);
                    };
                  }
                  const v = Reflect.get(b, metodo);
                  return typeof v === "function" ? v.bind(b) : v;
                },
              });
            };
          },
        });
      }

      if (prop === "from") {
        return (tabela: string) => {
          const consulta = (alvo as { from: (t: string) => object }).from(tabela);
          return new Proxy(consulta, {
            get(q, metodo) {
              if (typeof metodo === "string" && ESCRITAS.has(metodo)) {
                return () => {
                  throw new Error(motivo);
                };
              }
              const valor = Reflect.get(q, metodo);
              return typeof valor === "function" ? valor.bind(q) : valor;
            },
          });
        };
      }

      const valor = Reflect.get(alvo, prop, receptor);
      return typeof valor === "function" ? valor.bind(alvo) : valor;
    },
  });
}

export async function requireCompany() {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    throw new Error("Sua sessão expirou. Entre novamente.");
  }

  const { data: membro, error: membroError } = await supabase
    .from("company_members")
    .select("id, company_id, user_id, display_name, email, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membroError) throw membroError;
  if (!membro) {
    throw new Error("Seu usuário ainda não está vinculado a uma empresa ativa.");
  }

  /* A leitura NUNCA é travada, mesmo com o teste vencido: o trabalho que ela
     cadastrou continua dela, e sistema que sequestra o histórico não converte
     — quem ainda vê o que construiu assina para voltar a lançar. */
  const assinatura: Assinatura | null = await lerAssinatura(supabase, membro.company_id);
  const bloqueada = assinatura?.expirada === true;

  return {
    supabase: bloqueada ? travarEscrita(supabase, MOTIVO_EXPIRADA) : supabase,
    assinatura,
    podeEscrever: !bloqueada,
    companyId: membro.company_id,
    memberId: membro.id,
    userId,
    email: membro.email,
    displayName: membro.display_name,
    role: membro.role,
  };
}

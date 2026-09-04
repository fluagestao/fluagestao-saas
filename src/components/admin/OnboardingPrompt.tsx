"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleDollarSign,
  ClipboardCheck,
  Contact,
  Loader2,
  PackagePlus,
  Pause,
  Play,
  ReceiptText,
  Send,
  Settings,
  ShoppingBag,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Switch } from "@/components/ui/switch";
import { atualizarGuiaFlua } from "@/lib/guia-flua";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type EtapaId =
  | "empresa"
  | "insumos"
  | "custos"
  | "produto"
  | "cliente"
  | "pedido"
  | "financeiro"
  | "entregas"
  | "followup"
  | "relacionamento";

type Etapa = {
  id: EtapaId;
  titulo: string;
  resumo: string;
  orientacoes: string[];
  destino: string;
  acao: string;
  icon: LucideIcon;
};

type Progresso = {
  companyId: string;
  introducaoConcluida: boolean;
  habilitado: boolean;
  concluidas: EtapaId[];
  puladas: EtapaId[];
};

const ETAPAS: Etapa[] = [
  {
    id: "empresa",
    titulo: "Configure sua empresa",
    resumo: "Deixe os dados e a identidade da sua empresa prontos.",
    orientacoes: [
      "Confira o nome, endereço e contatos da empresa.",
      "Adicione sua logo para personalizar o sistema e os documentos.",
      "Você poderá alterar essas informações novamente quando quiser.",
    ],
    destino: "/admin/conta/empresa?guiaEtapa=empresa",
    acao: "Abrir configurações",
    icon: Settings,
  },
  {
    id: "insumos",
    titulo: "Cadastre seus insumos",
    resumo: "Registre tudo o que é usado para montar os produtos.",
    orientacoes: [
      "Insumos podem ser alimentos, embalagens, laços, caixas e outros materiais.",
      "Escolha a unidade correta: unidade, kg, grama, litro ou pacote.",
      "Informe sempre o custo unitário; ele será usado no cálculo do produto.",
    ],
    destino: "/insumos?guiaEtapa=insumos",
    acao: "Cadastrar insumo",
    icon: PackagePlus,
  },
  {
    id: "produto",
    titulo: "Cadastre seu produto",
    resumo: "Prepare o catálogo usado nos pedidos e nas vendas.",
    orientacoes: [
      "Informe nome, categoria e uma boa imagem. O preço você define na etapa seguinte, em Custo e preços, junto com o custo.",
      "Monte a composição com os insumos para conhecer o custo real.",
      "Salve o produto para encontrá-lo rapidamente nos próximos pedidos.",
    ],
    destino: "/cadastros/produtos/novo?guiaEtapa=produto",
    acao: "Cadastrar produto",
    icon: ReceiptText,
  },
  {
    id: "custos",
    titulo: "Monte o custo e veja a margem",
    resumo: "Descubra quanto sobra de verdade em cada produto.",
    orientacoes: [
      "Clique no produto e lance os insumos com a quantidade que ele consome.",
      "Exemplo: se 1 kg custa R$ 100 e você usa 250 g, o custo será R$ 25.",
      "A margem bruta desconta só os insumos; a líquida desconta também seu tempo e os custos fixos.",
    ],
    destino: "/custo/calculadora?guiaEtapa=custos",
    acao: "Abrir Custo e preços",
    icon: CircleDollarSign,
  },
  {
    id: "cliente",
    titulo: "Cadastre um cliente",
    resumo: "Salve os dados para não digitá-los em cada venda.",
    orientacoes: [
      "Cadastre o nome e o WhatsApp principal do cliente.",
      "O endereço pode ser preenchido automaticamente a partir do CEP.",
      "Depois, basta buscar o cliente ao abrir um novo pedido.",
    ],
    destino: "/cadastros/clientes?guiaEtapa=cliente",
    acao: "Abrir clientes",
    icon: Contact,
  },
  {
    id: "pedido",
    titulo: "Crie seu primeiro pedido",
    resumo: "Registre cliente, produtos, entrega e pagamento.",
    orientacoes: [
      "Selecione um cliente cadastrado ou cadastre um novo na hora.",
      "Adicione produtos cadastrados ou um produto avulso.",
      "Complete entrega, pagamento e cartão antes de salvar.",
    ],
    destino: "/vendas/pedidos/novo-pedido?guiaEtapa=pedido",
    acao: "Criar pedido",
    icon: ShoppingBag,
  },
  {
    id: "financeiro",
    titulo: "Entenda o financeiro",
    resumo: "Acompanhe entradas, valores a receber e despesas.",
    orientacoes: [
      "Pedidos pagos aparecem automaticamente entre as entradas.",
      "Os que ainda não foram pagos ficam em Entradas, na aba A receber.",
      "Use Saídas para registrar fornecedores e despesas do negócio.",
    ],
    destino: "/financeiro/entradas?guiaEtapa=financeiro",
    acao: "Abrir financeiro",
    icon: CircleDollarSign,
  },
  {
    id: "entregas",
    titulo: "Organize as entregas",
    resumo: "Veja o que precisa ser entregue hoje e nos próximos dias.",
    orientacoes: [
      "A agenda usa a data e o horário informados em cada pedido.",
      "Atualize o status do pedido conforme ele avança.",
      "Assim você acompanha produção, retirada e entrega sem se perder.",
    ],
    destino: "/tarefas?guiaEtapa=entregas",
    acao: "Abrir agenda",
    icon: Truck,
  },
  {
    id: "followup",
    titulo: "Use o Follow-up",
    resumo: "Peça avaliações depois que o pedido for entregue.",
    orientacoes: [
      "Só aparece depois que o primeiro pedido for marcado como entregue.",
      "Pedidos entregues aparecem automaticamente nesta área.",
      "Você pode revisar a mensagem antes de abrir o WhatsApp.",
      "Depois do envio, marque o cliente como já chamado.",
    ],
    destino: "/followup?guiaEtapa=followup",
    acao: "Abrir Follow-up",
    icon: Send,
  },
  {
    id: "relacionamento",
    titulo: "Volte a falar com quem sumiu",
    resumo: "Reative quem comprou e parou de aparecer.",
    orientacoes: [
      "A lista mostra há quanto tempo cada cliente não compra e o que ela costuma levar.",
      "A mensagem sai pronta, com o nome e a próxima data comemorativa — você lê, ajusta e manda.",
      "Em Por ocasião dá para ver quem comprou no Natal passado e oferecer de novo.",
    ],
    destino: "/relacionamento?guiaEtapa=relacionamento",
    acao: "Abrir Relacionamento",
    icon: Contact,
  },
];

const ETAPAS_IDS = new Set<EtapaId>(ETAPAS.map((etapa) => etapa.id));

/* Quem foi convidada nao configura a empresa: nao mexe em insumo, custo,
   produto nem financeiro. O guia dela e o trabalho que ela faz de fato —
   atender, lancar, entregar, pedir avaliacao. Quatro etapas, tamanho de quem
   le em pe. */
const ETAPAS_AJUDANTE: EtapaId[] = ["cliente", "pedido", "entregas", "followup"];

/* O progresso do dono mora em `companies`, ou seja, e da EMPRESA. Se a
   ajudante marcasse etapas la, apagaria o do dono e vice-versa. Como isto e um
   passo a passo de boas-vindas — roda uma vez e acabou —, o dela fica no
   proprio aparelho: trocar de celular custa rever quatro cartoes, e nao uma
   coluna nova no banco. */
const CHAVE_AJUDANTE = "flua:guia-ajudante";

function lerProgressoAjudante(): { concluidas: EtapaId[]; introducaoConcluida: boolean } {
  try {
    const cru = window.localStorage.getItem(CHAVE_AJUDANTE);
    if (!cru) return { concluidas: [], introducaoConcluida: false };
    const dado = JSON.parse(cru) as { concluidas?: unknown; introducaoConcluida?: unknown };
    return {
      concluidas: idsValidos(dado.concluidas).filter((id) => ETAPAS_AJUDANTE.includes(id)),
      introducaoConcluida: dado.introducaoConcluida === true,
    };
  } catch {
    // Aba anonima, armazenamento bloqueado: o guia so reaparece.
    return { concluidas: [], introducaoConcluida: false };
  }
}

function gravarProgressoAjudante(dado: { concluidas: EtapaId[]; introducaoConcluida: boolean }) {
  try {
    window.localStorage.setItem(CHAVE_AJUDANTE, JSON.stringify(dado));
  } catch {
    // Nao poder lembrar nao pode impedir de usar.
  }
}
const ROTAS_DO_SISTEMA = [
  "/admin",
  "/inicio",
  "/insumos",
  "/produtos",
  "/cadastros",
  "/vendas",
  "/financeiro",
  "/followup",
  "/relacionamento",
  "/margem",
  "/estoque",
  "/custo",
  "/dashboard",
  "/tarefas",
  "/clientes",
];

function idsValidos(valor: unknown): EtapaId[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter(
    (item): item is EtapaId =>
      typeof item === "string" && ETAPAS_IDS.has(item as EtapaId),
  );
}


function mensagemErro(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Não foi possível atualizar o Guia do Flua.";
}

export function OnboardingPrompt() {
  const pathname = usePathname();
  const dentroDoSistema = ROTAS_DO_SISTEMA.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [boasVindas, setBoasVindas] = useState(false);
  const [expandido, setExpandido] = useState(true);
  const [etapaAberta, setEtapaAberta] = useState<EtapaId | null>(null);
  const [abertoPelaCentral, setAbertoPelaCentral] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ehAjudante, setEhAjudante] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!dentroDoSistema) {
      setCarregando(false);
      return;
    }

    const parametro = new URLSearchParams(window.location.search).get(
      "guiaEtapa",
    ) as EtapaId | null;
    if (parametro && ETAPAS_IDS.has(parametro)) {
      setEtapaAberta(parametro);
      setExpandido(true);
    }

    const recolhido =
      window.localStorage.getItem("flua-guia-recolhido") === "1";
    if (!parametro) setExpandido(!recolhido);

    let ativo = true;
    const supabase = createClient();

    void (async () => {
      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();
        if (userError || !userData.user) return;

        const { data: membro, error: membroError } = await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", userData.user.id)
          .eq("status", "active")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (membroError) throw membroError;
        if (!membro) return;

        if (membro.role !== "owner") {
          if (!ativo) return;
          const guardado = lerProgressoAjudante();
          setEhAjudante(true);
          setProgresso({
            companyId: membro.company_id,
            introducaoConcluida: guardado.introducaoConcluida,
            habilitado: true,
            concluidas: guardado.concluidas,
            puladas: [],
          });
          setBoasVindas(!guardado.introducaoConcluida);
          setCarregando(false);
          return;
        }

        const [empresa, insumo, produto, cliente, pedido, movimento, followup] =
          await Promise.all([
            supabase
              .from("companies")
              .select(
                "id, logo_url, onboarding_completed_at, guide_enabled, guide_completed_steps, guide_skipped_steps",
              )
              .eq("id", membro.company_id)
              .maybeSingle(),
            supabase
              .from("insumos")
              .select("id")
              .eq("company_id", membro.company_id)
              .limit(1),
            supabase
              .from("produtos")
              .select("id")
              .eq("company_id", membro.company_id)
              .eq("rascunho", false)
              .limit(1),
            supabase
              .from("clientes")
              .select("id")
              .eq("company_id", membro.company_id)
              .limit(1),
            supabase
              .from("pedidos")
              .select("id, data_entrega")
              .eq("company_id", membro.company_id)
              .limit(1),
            supabase
              .from("movimentos")
              .select("id")
              .eq("company_id", membro.company_id)
              .limit(1),
            supabase
              .from("pedidos")
              .select("id")
              .eq("company_id", membro.company_id)
              .not("avaliacao_pedida_em", "is", null)
              .limit(1),
          ]);

        const resultadoComErro = [
          empresa,
          insumo,
          produto,
          cliente,
          pedido,
          movimento,
          followup,
        ].find((resultado) => resultado.error);
        if (resultadoComErro?.error) throw resultadoComErro.error;
        if (!empresa.data) return;

        const concluidas = new Set<EtapaId>(
          idsValidos(empresa.data.guide_completed_steps),
        );
        if (empresa.data.logo_url) concluidas.add("empresa");
        if (insumo.data?.length) concluidas.add("insumos");
        if (produto.data?.length) {
          concluidas.add("custos");
          concluidas.add("produto");
        }
        if (cliente.data?.length) concluidas.add("cliente");
        if (pedido.data?.length) concluidas.add("pedido");
        if (movimento.data?.length) concluidas.add("financeiro");
        if (pedido.data?.some((item) => item.data_entrega))
          concluidas.add("entregas");
        if (followup.data?.length) concluidas.add("followup");

        if (!ativo) return;
        const introducaoConcluida = Boolean(
          empresa.data.onboarding_completed_at,
        );
        setProgresso({
          companyId: empresa.data.id,
          introducaoConcluida,
          habilitado: empresa.data.guide_enabled !== false,
          concluidas: Array.from(concluidas),
          puladas: idsValidos(empresa.data.guide_skipped_steps),
        });
        if (empresa.data.guide_enabled === false && !parametro) {
          setExpandido(false);
        }
        setBoasVindas(!introducaoConcluida);
      } catch (error) {
        if (ativo) setErro(mensagemErro(error));
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  // A navegação interna muda `pathname`, mas não deve reinicializar o estado
  // visual do Guia. No mobile isso fazia o card reaparecer ou sumir ao trocar
  // de aba. Recarregamos apenas ao entrar ou sair da área autenticada.
  }, [dentroDoSistema]);

  /* Aqui existia um efeito que abria a tela clicando em botao do cabecalho
     pelo texto — "Cadastros", depois "Clientes", com 80ms de espera entre um e
     outro. Saiu inteiro, por dois motivos.

     O primeiro: o AdminPathSync ja faz exatamente isso, e melhor. Dois
     mecanismos disputando a mesma tela e uma corrida que uma hora alguem perde.

     O segundo: a etapa das entregas nunca funcionou. Ela procurava
     `button[aria-label="Agenda"]`, e o unico elemento com esse rotulo e um
     <Link> — tag <a>, nao <button> — dentro do AppHeader, que so aparece nas
     paginas de conta. O seletor nunca casou com nada, em nenhuma tela.

     Agora as tres etapas apontam para rota de verdade, e quem abre a tela e o
     AdminPathSync. */

  useEffect(() => {
    async function abrirPelaCentral(event: Event) {
      const detalhe = (event as CustomEvent<{ modo?: string }>).detail;
      setErro(null);

      if (progresso && !progresso.habilitado) {
        setSalvando(true);
        const resultado = await atualizarGuiaFlua({
          data: { habilitado: true },
        });
        setSalvando(false);
        if (!resultado.ok) {
          setErro(resultado.mensagem);
          return;
        }
        setProgresso({ ...progresso, habilitado: true });
      }

      setAbertoPelaCentral(true);
      setEtapaAberta(detalhe?.modo === "revisar" ? "empresa" : null);
      setExpandido(true);
      window.localStorage.removeItem("flua-guia-recolhido");
    }

    window.addEventListener("flua:abrir-guia", abrirPelaCentral);
    return () =>
      window.removeEventListener("flua:abrir-guia", abrirPelaCentral);
  }, [progresso]);

  const contabilizadas = useMemo(
    () =>
      new Set([
        ...(progresso?.concluidas ?? []),
        ...(progresso?.puladas ?? []),
      ]),
    [progresso],
  );
  /* A lista muda com quem esta olhando: o dono ve as nove, a ajudante ve as
     quatro operacionais. Tudo que conta progresso passa por aqui, senao ela
     ficaria eternamente em 44% por causa de etapas que nao sao dela. */
  const etapasVisiveis = useMemo(
    () => (ehAjudante ? ETAPAS.filter((e) => ETAPAS_AJUDANTE.includes(e.id)) : ETAPAS),
    [ehAjudante],
  );
  const percentual = Math.round((contabilizadas.size / etapasVisiveis.length) * 100);
  const etapa = etapasVisiveis.find((item) => item.id === etapaAberta) ?? null;
  const EtapaIcon = etapa?.icon;

  async function atualizarEmpresa(
    alteracoes: {
      habilitado?: boolean;
      introducaoConcluida?: boolean;
      concluidas?: EtapaId[];
      puladas?: EtapaId[];
    },
  ) {
    if (!progresso) return false;

    /* A ajudante nunca escreve em `companies`: aquilo e progresso da empresa e
       apagaria o do dono. O dela fica no aparelho. */
    if (ehAjudante) {
      gravarProgressoAjudante({
        concluidas: alteracoes.concluidas ?? progresso.concluidas,
        introducaoConcluida:
          alteracoes.introducaoConcluida ?? progresso.introducaoConcluida,
      });
      return true;
    }

    setSalvando(true);
    setErro(null);
    const resultado = await atualizarGuiaFlua({ data: alteracoes });
    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return false;
    }
    return true;
  }

  async function iniciarGuia(habilitado: boolean) {
    if (!progresso) return;
    if (
      !(await atualizarEmpresa({
        introducaoConcluida: true,
        habilitado,
      }))
    )
      return;
    setProgresso({
      ...progresso,
      introducaoConcluida: true,
      habilitado,
    });
    setBoasVindas(false);
    setExpandido(habilitado);
  }

  async function alternarGuia(habilitado: boolean) {
    if (
      !progresso ||
      !(await atualizarEmpresa({ habilitado }))
    )
      return;
    setProgresso({ ...progresso, habilitado });
    if (habilitado) {
      setAbertoPelaCentral(true);
      setExpandido(true);
      window.localStorage.removeItem("flua-guia-recolhido");
    }
  }

  async function registrarEtapa(id: EtapaId, pulada: boolean) {
    if (!progresso) return;
    const concluidas = pulada
      ? progresso.concluidas.filter((item) => item !== id)
      : Array.from(new Set([...progresso.concluidas, id]));
    const puladas = pulada
      ? Array.from(new Set([...progresso.puladas, id]))
      : progresso.puladas.filter((item) => item !== id);
    if (
      !(await atualizarEmpresa({
        concluidas,
        puladas,
      }))
    )
      return;
    setProgresso({ ...progresso, concluidas, puladas });
    setEtapaAberta(null);

    const totalContabilizado = new Set([...concluidas, ...puladas]).size;
    if (totalContabilizado === etapasVisiveis.length) {
      setAbertoPelaCentral(false);
      setExpandido(false);
      window.localStorage.setItem("flua-guia-recolhido", "1");
    }
  }

  function ocultarGuiaPausado() {
    setAbertoPelaCentral(false);
    setExpandido(false);
    window.localStorage.setItem("flua-guia-recolhido", "1");
  }

  function recolher() {
    setExpandido(false);
    window.localStorage.setItem("flua-guia-recolhido", "1");
  }

  function abrir() {
    setExpandido(true);
    window.localStorage.removeItem("flua-guia-recolhido");
  }

  if (!dentroDoSistema || carregando || !progresso) return null;

  return (
    <>
      {boasVindas && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#2b2421]/55 p-4 backdrop-blur-sm">
          <section
            className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_90px_rgba(43,36,33,0.3)] sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guia-boas-vindas"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--cream)] px-3 py-1.5 text-xs font-bold text-[var(--terracotta)]">
              <Sparkles className="h-3.5 w-3.5" /> Guia do Flua
            </span>
            <h1
              id="guia-boas-vindas"
              className="mt-4 text-2xl font-bold sm:text-3xl"
            >
              {ehAjudante ? "Bem-vinda ao Flua" : "Vamos preparar seu Flua juntos"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--admin-muted)] sm:text-base">
              {ehAjudante
                ? "Um passo a passo curto para você aprender o dia a dia: atender um cliente, lançar um pedido, organizar as entregas e pedir a avaliação depois."
                : "Um passo a passo curto vai ajudar você a configurar a empresa, calcular custos, cadastrar produtos e registrar sua primeira venda."}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Aprenda fazendo", "Continue quando quiser", "Pule qualquer etapa"].map(
                (texto) => (
                  <div
                    key={texto}
                    className="flex items-center gap-2 rounded-2xl bg-[var(--cream-soft)] p-3 text-sm font-semibold"
                  >
                    <Check className="h-4 w-4 text-[var(--terracotta)]" />
                    {texto}
                  </div>
                ),
              )}
            </div>
            {erro && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </p>
            )}
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void iniciarGuia(false)}
                disabled={salvando}
                className="h-11 rounded-xl border border-[var(--admin-border)] px-5 text-sm font-bold text-[var(--admin-ink-soft)]"
              >
                Explorar sozinho
              </button>
              <button
                type="button"
                onClick={() => void iniciarGuia(true)}
                disabled={salvando}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--terracotta)] px-5 text-sm font-bold text-white hover:bg-[var(--wine)]"
              >
                {salvando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Começar meu guia
              </button>
            </div>
          </section>
        </div>
      )}

      {!boasVindas && !expandido && progresso.habilitado && percentual < 100 && (
        <button
          type="button"
          onClick={abrir}
          className="fixed bottom-20 right-3 z-[65] inline-flex h-12 items-center gap-2 rounded-full bg-[var(--terracotta)] px-4 text-sm font-bold text-white shadow-[0_14px_35px_rgba(126,55,49,0.32)] lg:bottom-6 lg:right-6"
        >
          <BookOpen className="h-4 w-4" /> Guia do Flua
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {percentual}%
          </span>
        </button>
      )}

      {!boasVindas &&
        expandido &&
        (percentual < 100 || abertoPelaCentral) && (
        <aside className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 right-4 z-[65] flex max-h-[min(70dvh,34rem)] w-auto flex-col overflow-hidden rounded-[22px] border border-[var(--admin-border)] bg-white shadow-[0_24px_70px_rgba(58,34,31,0.22)] sm:bottom-20 sm:left-auto sm:right-3 sm:max-h-[min(680px,calc(100dvh-7rem))] sm:w-[calc(100%-1.5rem)] sm:max-w-[370px] lg:bottom-6 lg:right-6">
          <header className="bg-[var(--terracotta)] p-3.5 text-white sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-bold">
                  <BookOpen className="h-4 w-4" /> Guia do Flua
                </p>
                <p className="mt-1 text-xs text-white/75">
                  Aprenda uma etapa de cada vez.
                </p>
              </div>
              <button
                type="button"
                onClick={recolher}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Recolher Guia do Flua"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3 sm:mt-4">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-[width]"
                  style={{ width: `${percentual}%` }}
                />
              </div>
              <span className="text-xs font-bold">{percentual}%</span>
            </div>
          </header>

          <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-3.5 py-2.5 sm:px-4 sm:py-3">
            <div>
              <p className="text-sm font-bold">
                Guia {progresso.habilitado ? "ativado" : "pausado"}
              </p>
              <p className="text-[11px] text-[var(--admin-muted)]">
                Seu progresso fica salvo.
              </p>
            </div>
            <Switch
              checked={progresso.habilitado}
              onCheckedChange={(valor) => void alternarGuia(valor)}
              disabled={salvando}
              aria-label="Ativar ou pausar Guia do Flua"
            />
          </div>

          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-2.5 sm:p-3">
            {!progresso.habilitado ? (
              <div className="flex flex-col items-center px-3 py-5 text-center sm:px-5 sm:py-8">
                <Pause className="h-8 w-8 text-[var(--terracotta)]" />
                <p className="mt-3 font-bold">Guia pausado</p>
                <p className="mt-1 text-sm leading-5 text-[var(--admin-muted)]">
                  Seu progresso continuará salvo. Você poderá ligar o guia
                  novamente pelo botão ? da Central de ajuda.
                </p>
                <button
                  type="button"
                  onClick={ocultarGuiaPausado}
                  className="mt-5 h-10 rounded-xl bg-[var(--terracotta)] px-5 text-sm font-bold text-white hover:bg-[var(--wine)]"
                >
                  Ocultar este card
                </button>
              </div>
            ) : etapa && EtapaIcon ? (
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => setEtapaAberta(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--terracotta)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao checklist
                </button>
                <div className="mt-4 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--cream)] text-[var(--terracotta)]">
                    <EtapaIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-bold">{etapa.titulo}</h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--admin-muted)]">
                      {etapa.resumo}
                    </p>
                  </div>
                </div>
                <ol className="mt-4 space-y-2.5">
                  {etapa.orientacoes.map((orientacao, index) => (
                    <li
                      key={orientacao}
                      className="flex gap-2.5 rounded-xl bg-[var(--cream-soft)] p-3 text-xs leading-5"
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white font-bold text-[var(--terracotta)]">
                        {index + 1}
                      </span>
                      {orientacao}
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => window.location.assign(etapa.destino)}
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[var(--terracotta)] text-sm font-bold text-white"
                >
                  {etapa.acao} <ArrowRight className="h-4 w-4" />
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void registrarEtapa(etapa.id, true)}
                    disabled={salvando}
                    className="h-9 rounded-xl border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-muted)]"
                  >
                    Pular por agora
                  </button>
                  <button
                    type="button"
                    onClick={() => void registrarEtapa(etapa.id, false)}
                    disabled={salvando}
                    className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700"
                  >
                    Marcar concluído
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {etapasVisiveis.map((item) => {
                  const concluida = progresso.concluidas.includes(item.id);
                  const pulada = progresso.puladas.includes(item.id);
                  const Icon = concluida ? Check : pulada ? ChevronUp : Circle;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEtapaAberta(item.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--cream-soft)]"
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                          concluida
                            ? "bg-emerald-100 text-emerald-700"
                            : pulada
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-[var(--cream)] text-[var(--terracotta)]",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm font-semibold",
                            (concluida || pulada) &&
                              "text-[var(--admin-muted)]",
                          )}
                        >
                          {item.titulo}
                        </span>
                        {pulada && (
                          <span className="text-[10px] text-[var(--admin-muted)]">
                            Pulada — pode refazer
                          </span>
                        )}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                    </button>
                  );
                })}
              </div>
            )}
            {erro && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                {erro}
              </p>
            )}
          </div>

          {percentual === 100 && progresso.habilitado && !etapa && (
            <div className="border-t border-[var(--admin-border)] bg-emerald-50 px-4 py-3 text-center text-xs font-bold text-emerald-700">
              <ClipboardCheck className="mr-1.5 inline h-4 w-4" /> Você já
              conhece o essencial do Flua!
            </div>
          )}
        </aside>
      )}
    </>
  );
}

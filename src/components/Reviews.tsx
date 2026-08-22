import { Star, ExternalLink } from "lucide-react";
import { GOOGLE_REVIEWS_URL } from "@/lib/config";

type Review = {
  nome: string;
  inicial: string;
  cor: string;
  quando: string;
  texto: string;
};

// Avaliações reais dos clientes no Google (Perfil da Empresa).
const REVIEWS: Review[] = [
  {
    nome: "Janaina Damian",
    inicial: "J",
    cor: "#2E9E7B",
    quando: "há 2 meses",
    texto:
      "Sou apaixonada pelo trabalho delas! Cada cesta é montada com muito bom gosto e atenção aos detalhes. Dá pra ver o cuidado desde a apresentação até a qualidade dos produtos. É o tipo de presente que realmente surpreende e faz qualquer pessoa se sentir especial. Trabalho impecável!",
  },
  {
    nome: "Isabelle Souza",
    inicial: "I",
    cor: "#7C4A3A",
    quando: "há 7 meses",
    texto:
      "Melhor cesta da VIDA! Amor, carinho e dedicação em cada mínimo detalhe! SUPER RECOMENDADO",
  },
  {
    nome: "Lucas Oliveira",
    inicial: "L",
    cor: "#A12820",
    quando: "há 5 meses",
    texto:
      "Excelente atendimento e, em especial, à Alice, que me atendeu com tanta atenção e carinho. A cesta Manhã de Carinho superou nossas expectativas, simplesmente linda e feita com muito capricho! Muito obrigado pelo cuidado e dedicação!",
  },
  {
    nome: "Day Ne",
    inicial: "D",
    cor: "#5C6B44",
    quando: "há 1 ano",
    texto:
      "Fascinada com o cuidado e amor em cada detalhe da tábua que encomendei, a apresentação perfeita dos frios e das frutas, o capricho — amei, amamos demais! ❤️ Obrigada por fazer essa data tão especial.",
  },
  {
    nome: "Mariela Estevão",
    inicial: "M",
    cor: "#B98527",
    quando: "há 7 meses",
    texto:
      "Encomendamos uma tábua de frios e a experiência foi excelente! Tudo muito saboroso, produtos de ótima qualidade, entrega pontual e um cuidado visível em cada detalhe. Atendimento atencioso e capricho impecável. Com certeza recomendamos!",
  },
  {
    nome: "Antonio Botelho",
    inicial: "A",
    cor: "#C2185B",
    quando: "há 1 ano",
    texto:
      "Simplesmente impecável!! As cestas são lindas, bem montadas e com produtos de excelente qualidade. Dá pra ver o carinho e o bom gosto em cada detalhe. Uma ótima opção pra presentear! Super recomendo o trabalho.",
  },
];

function Estrelas({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-[var(--bronze)]" aria-label="5 de 5 estrelas">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${className} fill-[#E8B23A] text-[#E8B23A]`} strokeWidth={0} />
      ))}
    </span>
  );
}

export function Reviews() {
  return (
    <section id="avaliacoes" className="mx-auto max-w-6xl px-5 pb-20 scroll-mt-24">
      <div className="flex flex-col items-center text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--bronze)]">
          O que dizem nossos clientes
        </span>
        <h2 className="mt-3 font-display text-4xl text-foreground sm:text-5xl">
          Nota <em className="text-[var(--terracotta)]">5,0</em> no Google
        </h2>
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-3 rounded-full border border-[var(--cream-deep)] bg-card px-5 py-2.5 shadow-[var(--shadow-soft)] transition-all hover:border-[var(--terracotta)]/40 hover:shadow-[var(--shadow-card)]"
        >
          <span className="font-display text-2xl font-medium text-foreground">5,0</span>
          <Estrelas className="h-[18px] w-[18px]" />
          <span className="text-sm font-semibold">
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
          </span>
        </a>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {REVIEWS.map((r) => (
          <a
            key={r.nome}
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex"
          >
            <figure className="flex flex-1 flex-col rounded-3xl border border-[var(--cream-deep)]/70 bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg text-white"
                  style={{ backgroundColor: r.cor }}
                  aria-hidden
                >
                  {r.inicial}
                </span>
                <figcaption className="min-w-0">
                  <p className="truncate font-medium text-foreground">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">{r.quando}</p>
                </figcaption>
                <Estrelas className="ml-auto h-4 w-4" />
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/85">
                {r.texto}
              </blockquote>
              <p className="mt-4 text-xs text-muted-foreground">Google · avaliação verificada</p>
            </figure>
          </a>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <a
          href={GOOGLE_REVIEWS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--terracotta)] px-6 py-3 text-sm font-medium text-[var(--terracotta)] transition-all hover:bg-[var(--terracotta)]/10"
        >
          Ver todas as avaliações no Google
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

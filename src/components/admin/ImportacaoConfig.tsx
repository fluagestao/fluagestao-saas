"use client";

import {
  AlertTriangle,
  Check,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Undo2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { mensagemDeErro } from "@/lib/erros";
import {
  confirmarImportacao,
  desfazerImportacao,
  listarImportacoes,
  previewImportacao,
} from "@/lib/importacao";
import {
  DEFINICOES,
  ENTIDADES,
  MAX_LINHAS,
  resumir,
  type EntidadeImportacao,
  type LinhaPrevia,
  type LoteImportacao,
} from "@/lib/importacao-tipos";
import { baixarArquivo, gerarCsv, lerArquivoPlanilha, normalizarCabecalho } from "@/lib/planilha";
import { useConfirmar } from "./shell";

const ESTILO_STATUS: Record<LinhaPrevia["status"], { rotulo: string; classe: string }> = {
  criar: { rotulo: "Vai criar", classe: "bg-[var(--green-soft)] text-[var(--green-ink)]" },
  existe: { rotulo: "Já existe", classe: "bg-[var(--cream)] text-[var(--admin-muted)]" },
  erro: { rotulo: "Erro", classe: "bg-[var(--peach)] text-[var(--coral)]" },
  exemplo: { rotulo: "Exemplo", classe: "bg-[var(--cream)] text-[var(--admin-muted)]" },
};

function dataHora(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function entidadeDaUrl(): EntidadeImportacao | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("importar");
  return ENTIDADES.includes(v as EntidadeImportacao) ? (v as EntidadeImportacao) : null;
}

/**
 * Converte a tabela lida do arquivo nas linhas que o servidor entende,
 * casando cabeçalhos com o gabarito. Colunas extras são ignoradas; coluna
 * obrigatória ausente é erro do arquivo inteiro — não dá para adivinhar.
 */
function mapearLinhas(
  entidade: EntidadeImportacao,
  tabela: string[][],
): { linhas: Record<string, string>[] } | { erro: string } {
  if (tabela.length < 2) return { erro: "O arquivo só tem o cabeçalho — nenhuma linha para importar." };

  const def = DEFINICOES[entidade];
  const cabecalhos = tabela[0].map(normalizarCabecalho);
  const indice = new Map<string, number>();

  for (const coluna of def.colunas) {
    const aceitos = [coluna.rotulo, coluna.chave, ...(coluna.aliases ?? [])].map(normalizarCabecalho);
    const pos = cabecalhos.findIndex((c) => aceitos.includes(c));
    if (pos >= 0) indice.set(coluna.chave, pos);
  }

  const faltando = def.colunas.filter((c) => c.obrigatoria && !indice.has(c.chave));
  if (faltando.length) {
    return {
      erro: `Não achei a coluna ${faltando.map((c) => `"${c.rotulo}"`).join(" nem ")}. Use o gabarito ou renomeie o cabeçalho.`,
    };
  }

  const dados = tabela.slice(1);
  if (dados.length > MAX_LINHAS) {
    return { erro: `O arquivo tem ${dados.length} linhas; o máximo por vez é ${MAX_LINHAS}. Divida em dois.` };
  }

  const linhas = dados.map((l) => {
    const obj: Record<string, string> = {};
    for (const [chave, pos] of indice) obj[chave] = (l[pos] ?? "").trim();
    return obj;
  });

  return { linhas };
}

export function ImportacaoConfig() {
  const [entidade, setEntidade] = useState<EntidadeImportacao>("insumos");
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Record<string, string>[]>([]);
  const [previa, setPrevia] = useState<LinhaPrevia[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erros, setErros] = useState<LinhaPrevia[]>([]);
  const [historico, setHistorico] = useState<LoteImportacao[]>([]);
  const [desfazendo, setDesfazendo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const confirmar = useConfirmar();

  const def = DEFINICOES[entidade];
  const resumo = useMemo(() => (previa ? resumir(previa) : null), [previa]);

  async function carregarHistorico() {
    try {
      setHistorico(await listarImportacoes());
    } catch {
      // Histórico é acessório; a importação continua funcionando sem ele.
    }
  }

  useEffect(() => {
    const daUrl = entidadeDaUrl();
    if (daUrl) {
      setEntidade(daUrl);
      // Veio de um atalho: leva direto para o card, sem fazer a pessoa procurar.
      window.setTimeout(() => raizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
    carregarHistorico();
  }, []);

  function limpar() {
    setNomeArquivo(null);
    setLinhas([]);
    setPrevia(null);
    setErros([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function trocarEntidade(nova: EntidadeImportacao) {
    setEntidade(nova);
    limpar();
  }

  function baixarGabarito() {
    const cabecalho = def.colunas.map((c) => c.rotulo);
    const exemplo = def.colunas.map((c) => c.exemplo);
    baixarArquivo(`gabarito-${entidade}.csv`, gerarCsv([cabecalho, exemplo]));
  }

  async function aoEscolherArquivo(arquivo: File | null) {
    if (!arquivo) return;
    setLendo(true);
    setPrevia(null);
    setErros([]);
    try {
      const tabela = await lerArquivoPlanilha(arquivo);
      const mapeado = mapearLinhas(entidade, tabela);
      if ("erro" in mapeado) {
        toast.error(mapeado.erro, { duration: 8000 });
        limpar();
        return;
      }
      setNomeArquivo(arquivo.name);
      setLinhas(mapeado.linhas);
      setPrevia(await previewImportacao({ data: { entidade, linhas: mapeado.linhas } }));
    } catch (e) {
      toast.error(mensagemDeErro(e, "ler a planilha"), { duration: 8000 });
      limpar();
    } finally {
      setLendo(false);
    }
  }

  async function confirmarEnvio() {
    if (!resumo || resumo.criar === 0) return;
    const ok = await confirmar({
      titulo: `Criar ${resumo.criar} ${resumo.criar === 1 ? def.rotuloSingular : def.rotulo.toLocaleLowerCase("pt-BR")}?`,
      descricao:
        "Isso grava de verdade: a partir daqui são os cadastros que o sistema usa. Se algo sair errado, dá para desfazer este lote em Histórico — o que já estiver em uso fica.",
      confirmar: "Importar",
    });
    if (!ok) return;

    setConfirmando(true);
    try {
      const r = await confirmarImportacao({ data: { entidade, linhas, arquivo: nomeArquivo } });
      setErros(r.erros);
      const partes = [`${r.criados} ${r.criados === 1 ? "criado" : "criados"}`];
      if (r.pulados) partes.push(`${r.pulados} ${r.pulados === 1 ? "pulado" : "pulados"}`);
      if (r.comErro) partes.push(`${r.comErro} com erro`);
      toast.success(`Importação concluída: ${partes.join(" · ")}.`, { duration: 8000 });
      setPrevia(null);
      setLinhas([]);
      if (inputRef.current) inputRef.current.value = "";
      await carregarHistorico();
    } catch (e) {
      toast.error(mensagemDeErro(e, "importar"), { duration: 8000 });
    } finally {
      setConfirmando(false);
    }
  }

  function baixarErros() {
    const cabecalho = [...def.colunas.map((c) => c.rotulo), "Erro"];
    const corpo = erros.map((l) => [...def.colunas.map((c) => l.dados[c.chave] ?? ""), l.mensagem ?? ""]);
    baixarArquivo(`corrigir-${entidade}.csv`, gerarCsv([cabecalho, ...corpo]));
  }

  async function desfazer(lote: LoteImportacao) {
    const rotulo = DEFINICOES[lote.entidade].rotulo.toLocaleLowerCase("pt-BR");
    const ok = await confirmar({
      titulo: `Desfazer a importação de ${rotulo}?`,
      descricao: `Apaga os ${lote.criados} registros que este lote criou. O que já estiver em uso (num produto, num pedido, no estoque) fica.`,
      confirmar: "Desfazer",
      destrutivo: true,
    });
    if (!ok) return;

    setDesfazendo(lote.id);
    try {
      const r = await desfazerImportacao({ data: { id: lote.id } });
      toast.success(
        r.mantidos
          ? `${r.desfeitos} apagados. ${r.mantidos} ficaram porque já estão em uso.`
          : `${r.desfeitos} apagados.`,
        { duration: 8000 },
      );
      await carregarHistorico();
    } catch (e) {
      toast.error(mensagemDeErro(e, "desfazer a importação"));
    } finally {
      setDesfazendo(null);
    }
  }

  return (
    <div ref={raizRef} className="rounded-2xl border border-[var(--admin-border)] bg-white p-5 sm:p-6 xl:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--admin-ink)]">Importar por planilha</p>
          <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
            Para quem já tem a lista pronta. Baixe o gabarito, preencha, envie — você confere tudo
            antes de gravar.
          </p>
        </div>
        <FileSpreadsheet className="h-5 w-5 shrink-0 text-[var(--terracotta)]" />
      </div>

      {/* Passo 1: o quê */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ENTIDADES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => trocarEntidade(e)}
            className={`h-10 rounded-xl border text-sm font-semibold transition-colors ${
              entidade === e
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                : "border-[var(--admin-border)] bg-white text-[var(--admin-ink-soft)] hover:bg-[var(--cream-soft)]"
            }`}
          >
            {DEFINICOES[e].rotulo}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-[var(--admin-ink-soft)]">{def.descricao}</p>

      {/* Colunas do gabarito, para saber o que preencher sem abrir o arquivo */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {def.colunas.map((c) => (
          <span
            key={c.chave}
            title={c.ajuda || undefined}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              c.obrigatoria
                ? "bg-[var(--peach)] text-[var(--coral)]"
                : "bg-[var(--cream)] text-[var(--admin-ink-soft)]"
            }`}
          >
            {c.rotulo}
            {c.obrigatoria ? " *" : ""}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--admin-muted)]">
        * obrigatória · linha repetida ({def.chaveDuplicidade} igual) é pulada, nunca sobrescrita ·
        até {MAX_LINHAS} linhas por vez
      </p>

      {/* Passo 2: gabarito e arquivo */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={baixarGabarito} className="h-10 rounded-xl">
          <Download className="mr-1.5 h-4 w-4" />
          Baixar gabarito
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => aoEscolherArquivo(e.target.files?.[0] ?? null)}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={lendo} className="h-10 rounded-xl">
          {lendo ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
          {lendo ? "Lendo..." : "Enviar planilha preenchida"}
        </Button>
        {nomeArquivo && !lendo && (
          <span className="text-xs text-[var(--admin-muted)]">{nomeArquivo}</span>
        )}
      </div>

      {/* Passo 3: prévia */}
      {previa && resumo && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-[var(--green-ink)]">{resumo.criar} vão ser criados</span>
            {resumo.existe > 0 && (
              <span className="text-[var(--admin-muted)]">{resumo.existe} já existem (pulados)</span>
            )}
            {resumo.erro > 0 && <span className="font-semibold text-[var(--coral)]">{resumo.erro} com erro</span>}
            {resumo.exemplo > 0 && (
              <span className="text-[var(--admin-muted)]">{resumo.exemplo} linha de exemplo ignorada</span>
            )}
          </div>

          <div className="mt-2 max-h-[46vh] overflow-auto rounded-xl border border-[var(--admin-border)]">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[var(--cream-soft)]">
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--admin-muted)]">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Situação</th>
                  {def.colunas.map((c) => (
                    <th key={c.chave} className="px-3 py-2 whitespace-nowrap">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previa.map((l) => (
                  <tr key={l.numero} className="border-t border-[var(--admin-border)] align-top">
                    <td className="px-3 py-2 tabular-nums text-[var(--admin-muted)]">{l.numero}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTILO_STATUS[l.status].classe}`}
                      >
                        {ESTILO_STATUS[l.status].rotulo}
                      </span>
                      {l.mensagem && (
                        <p className="mt-1 max-w-[260px] text-[11px] leading-snug text-[var(--admin-ink-soft)]">
                          {l.mensagem}
                        </p>
                      )}
                      {l.avisos.map((a) => (
                        <p
                          key={a}
                          className="mt-1 flex max-w-[260px] items-start gap-1 text-[11px] leading-snug text-[#a3651f]"
                        >
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {a}
                        </p>
                      ))}
                    </td>
                    {def.colunas.map((c) => (
                      <td
                        key={c.chave}
                        className={`px-3 py-2 ${l.status === "erro" || l.status === "exemplo" ? "text-[var(--admin-muted)]" : "text-[var(--admin-ink)]"}`}
                      >
                        {l.dados[c.chave] || <span className="text-[var(--admin-muted)]">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-xl text-xs text-[var(--admin-muted)]">
              Confira a prévia com atenção: depois de importar, estes passam a ser os cadastros usados
              pelo sistema. Linhas com erro não entram — você pode corrigir e enviar de novo.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={limpar} disabled={confirmando} className="h-10 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={confirmarEnvio}
                disabled={confirmando || resumo.criar === 0}
                className="h-10 rounded-xl"
              >
                {confirmando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                Importar {resumo.criar > 0 ? resumo.criar : ""}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Linhas que ficaram de fora na última importação */}
      {!previa && erros.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--peach)] bg-[var(--peach-soft)] px-4 py-3">
          <p className="text-sm text-[var(--admin-ink-soft)]">
            <strong className="font-semibold text-[var(--coral)]">{erros.length}</strong>{" "}
            {erros.length === 1 ? "linha não entrou" : "linhas não entraram"}. Baixe, corrija a coluna
            "Erro" e envie só elas.
          </p>
          <Button variant="outline" onClick={baixarErros} className="h-9 rounded-xl">
            <Download className="mr-1.5 h-4 w-4" />
            Baixar linhas com erro
          </Button>
        </div>
      )}

      {/* Histórico e desfazer */}
      {historico.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--bronze)]">
            <History className="h-3.5 w-3.5" />
            Histórico
          </p>
          <ul className="divide-y divide-[var(--admin-border)] rounded-xl border border-[var(--admin-border)]">
            {historico.map((lote) => {
              const podeDesfazer = !lote.desfeita_em && lote.criados > 0;
              return (
                <li key={lote.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-[var(--admin-muted)]">{dataHora(lote.created_at)}</span>
                  <span className="font-medium text-[var(--admin-ink)]">{DEFINICOES[lote.entidade].rotulo}</span>
                  <span className="text-[var(--admin-ink-soft)]">
                    {lote.criados} {lote.criados === 1 ? "criado" : "criados"}
                    {lote.pulados ? ` · ${lote.pulados} pulados` : ""}
                    {lote.com_erro ? ` · ${lote.com_erro} com erro` : ""}
                  </span>
                  {lote.arquivo && (
                    <span className="truncate text-xs text-[var(--admin-muted)]">{lote.arquivo}</span>
                  )}
                  <span className="ml-auto">
                    {lote.desfeita_em ? (
                      <span className="text-xs text-[var(--admin-muted)]">
                        Desfeita{lote.desfeitos !== null && lote.desfeitos !== lote.criados ? ` (${lote.desfeitos} de ${lote.criados})` : ""}
                      </span>
                    ) : podeDesfazer ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => desfazer(lote)}
                        disabled={desfazendo === lote.id}
                        className="h-8 text-destructive hover:text-destructive"
                      >
                        {desfazendo === lote.id ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Desfazer
                      </Button>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

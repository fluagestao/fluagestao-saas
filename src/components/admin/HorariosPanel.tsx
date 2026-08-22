import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { carregarConfig, salvarHorarios } from "@/lib/admin";
import {
  DIAS_LABEL,
  ORDEM_DIAS,
  normalizarHorarios,
  statusAtendimento,
  type HorariosConfig,
  type ModoHorario,
} from "@/lib/horarios";
import { cn } from "@/lib/utils";
import { mensagemDeErro } from "@/lib/erros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "./shell";

// ---------- horários de atendimento ----------
const MODOS: { v: ModoHorario; label: string; hint: string }[] = [
  { v: "auto", label: "Automático", hint: "segue os horários abaixo" },
  { v: "aberto", label: "Forçar aberto", hint: "sempre aberto" },
  { v: "fechado", label: "Forçar fechado", hint: "sempre fechado" },
];

export function HorariosPanel() {
  const [cfg, setCfg] = useState<HorariosConfig | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarConfig()
      .then((res) => setCfg(normalizarHorarios(res.horarios as Partial<HorariosConfig> | null)))
      .catch(() => setCfg(normalizarHorarios(null)));
  }, []);

  function patchDia(d: string, patch: Partial<HorariosConfig["dias"][string]>) {
    setCfg((c) => (c ? { ...c, dias: { ...c.dias, [d]: { ...c.dias[d], ...patch } } } : c));
  }

  async function salvar() {
    if (!cfg) return;
    setSalvando(true);
    setErro(null);
    setOk(false);
    try {
      await salvarHorarios({ data: cfg });
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    } catch (e) {
      setErro(
        mensagemDeErro(e, "salvar. rodou a migration das configurações?"),
      );
    }
    setSalvando(false);
  }

  if (!cfg) {
    return (
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Horários de atendimento</h2>
        <div className="mt-4 flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--terracotta)]" />
        </div>
      </section>
    );
  }

  const previa = statusAtendimento(cfg, new Date());

  return (
    <section>
      <PageHeader
        titulo="Horários de atendimento"
        descricao="Controla o selo “Atendimento aberto / Fechado” que aparece no topo do site (fuso de Tubarão/SC)."
      />

      {/* prévia */}
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--cream-deep)] bg-card px-4 py-2 text-sm">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: previa.aberto ? "var(--whatsapp)" : "var(--terracotta)" }}
        />
        <span className="font-medium text-foreground">{previa.texto}</span>
        <span className="text-xs text-muted-foreground">· como está agora</span>
      </div>

      {/* modo */}
      <div className="mt-5 flex flex-wrap gap-2">
        {MODOS.map((m) => (
          <button
            key={m.v}
            type="button"
            onClick={() => setCfg((c) => (c ? { ...c, modo: m.v } : c))}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              cfg.modo === m.v
                ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-[var(--cream-soft)]"
                : "border-[var(--cream-deep)] bg-card text-foreground hover:bg-[var(--cream-soft)]",
            )}
          >
            <span className="font-medium">{m.label}</span>
            <span
              className={cn(
                "ml-1.5 text-xs",
                cfg.modo === m.v ? "text-[var(--cream-soft)]/80" : "text-muted-foreground",
              )}
            >
              · {m.hint}
            </span>
          </button>
        ))}
      </div>

      {/* dias (só relevantes no modo automático) */}
      <div className={cn("mt-5 space-y-2", cfg.modo !== "auto" && "opacity-50")}>
        {ORDEM_DIAS.map((d) => {
          const dia = cfg.dias[d];
          return (
            <div
              key={d}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--cream-deep)] bg-card p-3"
            >
              <span className="w-24 font-medium text-foreground">{DIAS_LABEL[d]}</span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={dia.aberto}
                  disabled={cfg.modo !== "auto"}
                  onCheckedChange={(v) => patchDia(d, { aberto: v })}
                />
                {dia.aberto ? "aberto" : "fechado"}
              </label>
              {dia.aberto && (
                <div className="ml-auto flex items-center gap-2 text-sm">
                  <Input
                    type="time"
                    value={dia.abre}
                    disabled={cfg.modo !== "auto"}
                    onChange={(e) => patchDia(d, { abre: e.target.value })}
                    className="h-9 w-[110px]"
                  />
                  <span className="text-muted-foreground">às</span>
                  <Input
                    type="time"
                    value={dia.fecha}
                    disabled={cfg.modo !== "auto"}
                    onChange={(e) => patchDia(d, { fecha: e.target.value })}
                    className="h-9 w-[110px]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* mensagem quando fechado */}
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="msg-fechado">Mensagem quando fechado (aparece no “Forçar fechado”)</Label>
        <Input
          id="msg-fechado"
          value={cfg.mensagem_fechado}
          onChange={(e) => setCfg((c) => (c ? { ...c, mensagem_fechado: e.target.value } : c))}
          placeholder="Ex.: Estamos fechados — chame no WhatsApp que respondemos ao abrir 💛"
        />
      </div>

      {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar horários
        </Button>
        {ok && <span className="text-sm font-medium text-[var(--whatsapp)]">✓ salvo</span>}
      </div>
    </section>
  );
}

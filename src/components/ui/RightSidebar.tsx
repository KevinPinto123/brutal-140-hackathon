"use client";

import { ANALYSIS, AI_SUGGESTION, MATERIALS } from "@/lib/constants";
import { ANALYSIS_ICONS, Sparkles } from "@/components/icons";
import { useEditor } from "@/components/providers/EditorProvider";
import { useRoom } from "@/components/providers/RoomProvider";
import { useArchitect } from "@/lib/ai/useArchitect";
import { AI_SENDER } from "@/lib/portal/events";
import { HeatmapThumb } from "./HeatmapThumb";
import { Dot, Panel, SectionTitle, cx } from "./primitives";

const TONE: Record<string, string> = {
  green: "text-ok",
  amber: "text-warn",
};

const SWATCH: Record<string, string> = {
  concrete:
    "linear-gradient(145deg,#d6d2cb 0%,#c3bfb8 45%,#cfcbc4 60%,#b9b5ae 100%)",
  steel: "linear-gradient(145deg,#2a2a2d 0%,#141416 50%,#232326 100%)",
  wood: "linear-gradient(145deg,#c99257 0%,#a9763f 40%,#c08a4c 70%,#996a37 100%)",
};

/** Verde solo cuando la métrica está realmente sana; el resto avisa. */
function tone(id: string, value: string) {
  if (id === "light") return (parseInt(value, 10) || 0) >= 70 ? "green" : "amber";
  if (id === "load") return value === "Segura" ? "green" : "amber";
  if (id === "flow") return value === "Óptima" ? "green" : "amber";
  return value === "Alta" ? "green" : "amber";
}

const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

export function RightSidebar() {
  const { chat, entities, locked, replaying, upsertEntity } = useRoom();
  const { selected } = useEditor();
  const { verdict, busy, error, apply, alternatives } = useArchitect();

  // La edición está cerrada por dos motivos distintos y conviene no confundirlos:
  // el diseño se bloqueó para toda la sala, o este cliente está mirando atrás.
  const frozen = replaying ? "Vista histórica" : "Diseño bloqueado";

  // La paleta de materiales actua sobre la seleccion y viaja a la sala como
  // cualquier otra edicion de geometria.
  const target = entities.find((e) => e.id === selected) ?? null;

  // El último mensaje del agente en el log compartido: lo ven todos, no solo
  // quien disparó la evaluación.
  const lastAI = [...chat].reverse().find((m) => m.sender.id === AI_SENDER);

  const message = lastAI?.content.text ?? verdict?.message ?? AI_SUGGESTION.message;
  const time = lastAI ? clock(lastAI.timestamp) : AI_SUGGESTION.messageTime;
  const headline = verdict?.headline ?? AI_SUGGESTION.suggestion;
  const fixes = verdict?.corrections.length ?? 0;

  const metrics = verdict
    ? ANALYSIS.map((a) => {
        const value = verdict.analysis[a.id];
        return { id: a.id, label: a.label, value, tone: tone(a.id, value) };
      })
    : ANALYSIS.map((a) => ({ ...a, tone: a.tone as string }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* AI ARCHITECT */}
      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-accent-2" />
            <h2 className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-white">
              AI Architect
            </h2>
          </div>
          <span
            className={cx(
              "flex items-center gap-1.5 text-[11px]",
              busy ? "text-warn" : "text-ok",
            )}
          >
            <Dot color={busy ? "#f59e0b" : "#22c55e"} size={5} glow />
            {busy ? "Analizando" : "Activo"}
          </span>
        </div>

        <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">
          {/* Mensaje del agente */}
          <div className="rounded-[4px] border border-line bg-panel-2 px-3.5 py-3">
            <p className="text-[12.5px] leading-[1.5] text-fg/85">{message}</p>
            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-dim">
              <span>{verdict?.engine === "openai" ? "gpt · openai" : "heurística local"}</span>
              <span>{time}</span>
            </div>
          </div>

          {/* Sugerencia accionable */}
          <div className="rounded-[4px] border border-accent/30 bg-accent/[0.05] p-3">
            <h3 className="panel-title mb-2.5 text-accent-2">Sugerencia de IA</h3>
            <div className="overflow-hidden rounded-[3px] border border-line">
              <HeatmapThumb entities={entities} corrections={verdict?.corrections ?? []} />
            </div>
            <p className="mt-3 text-[12px] leading-[1.5] text-fg/85">{headline}</p>

            {error && (
              <p className="mt-2 font-mono text-[10px] text-warn">Reintenta: {error}</p>
            )}

            <button
              type="button"
              onClick={() => void apply()}
              disabled={busy || fixes === 0 || locked}
              className={cx(
                "mt-3 w-full rounded-[4px] py-2.5 text-[12.5px] font-medium leading-none text-white transition-colors",
                busy || fixes === 0 || locked
                  ? "cursor-not-allowed bg-accent/30 text-white/50"
                  : "bg-accent hover:bg-accent-2",
              )}
            >
              {locked
                ? frozen
                : fixes > 0
                  ? `Aplicar sugerencia (${fixes})`
                  : "Aplicar sugerencia"}
            </button>
            <button
              type="button"
              onClick={() => void alternatives()}
              disabled={busy || entities.length === 0}
              className={cx(
                "mt-2 w-full rounded-[4px] border border-line bg-panel-2/60 py-2.5 text-[12.5px] leading-none transition-colors",
                busy || entities.length === 0
                  ? "cursor-not-allowed text-dim/50"
                  : "text-fg/85 hover:border-accent/50 hover:text-white",
              )}
            >
              Ver alternativas
            </button>
          </div>
        </div>
      </Panel>

      {/* ANÁLISIS EN TIEMPO REAL */}
      <Panel className="shrink-0 px-4 pb-4 pt-3.5">
        <SectionTitle className="mb-3">Análisis en tiempo real</SectionTitle>
        <ul className="space-y-[11px]">
          {metrics.map((a) => {
            const Icon = ANALYSIS_ICONS[a.id];
            return (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2.5 text-[12px] text-fg/80">
                  <Icon size={14} className="shrink-0 text-muted" />
                  {a.label}
                </span>
                <span className={cx("font-mono text-[12px] tabular-nums", TONE[a.tone])}>
                  {a.value}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* MATERIALES ACTIVOS */}
      <Panel className="shrink-0 px-4 pb-4 pt-3.5">
        <SectionTitle
          className="mb-3"
          right={
            <span className="truncate pl-2 font-mono text-[9.5px] leading-none text-dim">
              {locked
                ? replaying
                  ? "histórico"
                  : "bloqueado"
                : (target?.label ?? "sin selección")}
            </span>
          }
        >
          Materiales activos
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {MATERIALS.map((m) => {
            const on = target?.material === m.texture;
            const enabled = !!target && !locked;
            return (
              <button
                key={m.id}
                type="button"
                disabled={!enabled}
                title={
                  enabled
                    ? `Aplicar a ${target.label}`
                    : locked
                      ? frozen
                      : "Selecciona un volumen en el lienzo"
                }
                onClick={() => target && upsertEntity({ ...target, material: m.texture })}
                className={cx("group text-left", !enabled && "cursor-not-allowed opacity-45")}
              >
                <span
                  className={cx(
                    "block h-[42px] w-full rounded-[3px] border transition-colors",
                    on
                      ? "border-accent ring-1 ring-accent/40"
                      : enabled
                        ? "border-line group-hover:border-accent/60"
                        : "border-line",
                  )}
                  style={{ background: SWATCH[m.texture] }}
                />
                <span
                  className={cx(
                    "mt-2 block whitespace-pre-line text-[10px] leading-[1.35]",
                    on ? "text-fg/90" : "text-muted",
                    enabled && "group-hover:text-fg/80",
                  )}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

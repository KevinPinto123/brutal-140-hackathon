"use client";

import { useEffect, useState } from "react";
import { Broom, Redo, TOOL_ICONS, Trash, Undo } from "@/components/icons";
import { useEditor } from "@/components/providers/EditorProvider";
import { useRoom } from "@/components/providers/RoomProvider";
import { PLOT_RULES, TOOLS } from "@/lib/constants";
import { ENTITY_SPECS, HOT_KW, PLACEABLE, type Entity } from "@/lib/entities";
import { PlotDiagram } from "./PlotDiagram";
import { Panel, SectionTitle, cx } from "./primitives";

/** Ventana para confirmar el vaciado antes de que el boton vuelva a su sitio. */
const CONFIRM_MS = 4_000;

export function LeftSidebar() {
  const { tool, setTool, selected, setSelected } = useEditor();
  const { entities, locked, replaying, removeEntity, upsertEntity, resetPlot } = useRoom();
  /** Pila de rehacer local: el log compartido de Portal no se reescribe. */
  const [undone, setUndone] = useState<Entity[]>([]);
  const [confirming, setConfirming] = useState(false);

  // El vaciado borra el trabajo de todos: pide un segundo clic, no un dialogo.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  function undo() {
    const last = entities.at(-1);
    if (!last) return;
    removeEntity(last.id);
    setUndone((prev) => [...prev, last]);
    if (selected === last.id) setSelected(null);
  }

  function redo() {
    const entity = undone.at(-1);
    if (!entity) return;
    upsertEntity(entity);
    setUndone((prev) => prev.slice(0, -1));
  }

  function remove() {
    if (!selected) return;
    removeEntity(selected);
    setSelected(null);
  }

  function clear() {
    if (!confirming) return setConfirming(true);
    resetPlot();
    setUndone([]);
    setSelected(null);
    setConfirming(false);
  }

  return (
    <Panel className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* PLOT CONFIG */}
      <div className="px-4 pb-3 pt-3.5">
        <SectionTitle className="mb-3">Plot config</SectionTitle>
        <PlotDiagram />
      </div>

      {/* REGLAS DEL PLOT */}
      <div className="border-t border-line-2 px-4 pb-4 pt-3.5">
        <SectionTitle className="mb-3">Reglas del plot</SectionTitle>
        <dl className="space-y-[9px]">
          {PLOT_RULES.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-2">
              <dt className="text-[11.5px] text-muted">{r.label}</dt>
              <dd className="font-mono text-[11.5px] tabular-nums text-fg/90">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* HERRAMIENTAS */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-line-2 px-4 pb-3 pt-3.5">
        <SectionTitle className="mb-2.5">Herramientas</SectionTitle>
        <div className="scroll-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {TOOLS.map((t, i) => {
            const Icon = TOOL_ICONS[t.id];
            const active = tool === t.id;
            const kind = PLACEABLE[t.id];
            const kw = kind ? ENTITY_SPECS[kind].heat : 0;
            return (
              <div key={t.id}>
                {/* Cabecera al cambiar de grupo: el recinto y el programa son cosas distintas. */}
                {t.group !== TOOLS[i - 1]?.group && (
                  <p
                    className={cx(
                      "px-2.5 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-dim",
                      i > 0 && "mt-2.5 border-t border-line-2 pt-2.5",
                    )}
                  >
                    {t.group}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setTool(t.id)}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-[3px] border px-2.5 py-[7px] text-left text-[12px] leading-none transition-colors",
                    active
                      ? "border-[#3a3a41] bg-raised text-white"
                      : "border-transparent text-muted hover:bg-panel-2 hover:text-fg/90",
                  )}
                >
                  <Icon size={14} className="shrink-0 opacity-90" />
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  {kw > 0 && (
                    <span
                      className={cx(
                        "shrink-0 font-mono text-[9.5px] tabular-nums",
                        kw >= HOT_KW ? "text-warn" : "text-dim",
                      )}
                    >
                      {kw} kW
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones de historial */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 overflow-hidden rounded-[3px] border border-line divide-x divide-line">
          {[
            { Icon: Undo, label: "Deshacer", run: undo, on: entities.length > 0 },
            { Icon: Redo, label: "Rehacer", run: redo, on: undone.length > 0 },
            { Icon: Trash, label: "Eliminar", run: remove, on: !!selected },
            {
              Icon: Broom,
              label: confirming ? "Confirmar vaciado" : "Limpiar parcela",
              run: clear,
              on: entities.length > 0,
              danger: confirming,
            },
          ].map(({ Icon, label, run, on, danger }) => {
            const enabled = on && !locked;
            return (
              <button
                key={label}
                type="button"
                aria-label={label}
                title={
                  locked ? (replaying ? "Vista histórica" : "Diseño bloqueado") : label
                }
                onClick={run}
                disabled={!enabled}
                className={cx(
                  "flex items-center justify-center py-2.5 transition-colors",
                  !enabled
                    ? "cursor-not-allowed text-dim/40"
                    : danger
                      ? "bg-warn/15 text-warn hover:bg-warn/25"
                      : "text-muted hover:bg-panel-2 hover:text-fg",
                )}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
        {confirming && !locked && (
          <p className="mt-2 text-center font-mono text-[10px] leading-none text-warn">
            Vaciar los {entities.length} volúmenes de la sala — pulsa otra vez
          </p>
        )}
      </div>
    </Panel>
  );
}

"use client";

import { useState } from "react";
import {
  Camera,
  Cursor,
  Eye,
  GridIcon,
  History,
  Lock,
  Move,
  Rotate,
  Target,
  Unlock,
} from "@/components/icons";
import { useRoom } from "@/components/providers/RoomProvider";
import { Dropdown } from "./Dropdown";
import { SolarControl } from "./SolarControl";
import { Timeline } from "./Timeline";
import { cx } from "./primitives";

const VIEW_MODES = [
  "Planta isométrica",
  "Planta 2D",
  "Sección longitudinal",
  "Fachada frontal",
];

const PROJECTIONS = ["Perspectiva", "Ortográfica"];

const GIZMOS = [
  { id: "select", Icon: Cursor, label: "Seleccionar" },
  { id: "orbit", Icon: Target, label: "Orbitar" },
  { id: "rotate", Icon: Rotate, label: "Rotar" },
  { id: "move", Icon: Move, label: "Mover" },
  { id: "grid", Icon: GridIcon, label: "Rejilla" },
  { id: "visibility", Icon: Eye, label: "Visibilidad" },
  { id: "capture", Icon: Camera, label: "Captura" },
] as const;

/**
 * HUD sobre el lienzo: el marco es transparente (el WebGL se ve a traves) y
 * solo los controles capturan el puntero, dejando el orbit libre.
 */
export function ViewportHud() {
  const { locked, lockedBy, setLocked, entities, replaying, showMoment } = useRoom();
  const [mode, setMode] = useState(VIEW_MODES[0]);
  const [projection, setProjection] = useState(PROJECTIONS[0]);
  const [gizmo, setGizmo] = useState<string>("select");
  const [flat, setFlat] = useState(false);

  return (
    <div
      className={cx(
        "pointer-events-none relative min-h-0 rounded-[4px] border transition-colors",
        locked ? "border-accent/60" : "border-line",
      )}
    >
      {/* Modo de vista */}
      <div className="pointer-events-auto absolute left-4 top-4 w-[152px]">
        <Dropdown options={VIEW_MODES} value={mode} onChange={setMode} />
      </div>

      {/* Gizmos */}
      <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2">
        <div className="hud flex items-center gap-1 p-1.5">
          {GIZMOS.map(({ id, Icon, label }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => setGizmo(id)}
              className={cx(
                "flex size-[30px] items-center justify-center rounded-[3px] transition-colors",
                gizmo === id
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-raised hover:text-fg",
              )}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Proyección + condición solar */}
      <div className="pointer-events-auto absolute right-4 top-4 flex items-start gap-3">
        <Dropdown
          options={PROJECTIONS}
          value={projection}
          onChange={setProjection}
          align="right"
          className="w-[124px]"
        />
        <SolarControl />
      </div>

      {/* Conmutador 2D */}
      <div className="pointer-events-auto absolute bottom-4 left-4">
        <button
          type="button"
          onClick={() => setFlat((f) => !f)}
          className={cx(
            "hud px-3.5 py-2 text-[12px] leading-none transition-colors",
            flat ? "text-accent-2" : "text-fg/90 hover:text-white",
          )}
        >
          {flat ? "Vista 3D" : "Vista 2D"}
        </button>
      </div>

      {/* Cinta del tiempo: el hueco que dejan los dos mandos de abajo */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
        <Timeline />
      </div>

      {/* Cierre del diseño: el ultimo paso del flujo de la demo. Mirando el
          pasado no hay nada que cerrar —el log ya está escrito—, así que el
          mando cede su sitio a la salida en vez de quedarse sin hacer nada. */}
      <div className="pointer-events-auto absolute bottom-4 right-4 flex items-center gap-2.5">
        {replaying ? (
          <button
            type="button"
            onClick={() => showMoment(null)}
            title="Dejar de mirar el pasado y volver al estado en vivo"
            className="flex items-center gap-2 rounded-[4px] border border-accent bg-accent px-3.5 py-2 text-[12px] leading-none text-white transition-colors hover:bg-accent-2"
          >
            <History size={14} />
            Volver al presente
          </button>
        ) : (
          <>
            {locked && lockedBy && (
              <span className="hud px-3 py-2 font-mono text-[10.5px] leading-none text-accent-2">
                Cerrado por {lockedBy}
              </span>
            )}
            <button
              type="button"
              onClick={() => setLocked(!locked)}
              disabled={!locked && entities.length === 0}
              title={
                locked
                  ? "Reabrir el laboratorio para seguir editando"
                  : "Congelar el estado final para toda la sala"
              }
              className={cx(
                "flex items-center gap-2 px-3.5 py-2 text-[12px] leading-none transition-colors",
                locked
                  ? "rounded-[4px] border border-accent bg-accent text-white hover:bg-accent-2"
                  : entities.length === 0
                    ? "hud cursor-not-allowed text-dim/50"
                    : "hud text-fg/90 hover:text-white",
              )}
            >
              {locked ? <Lock size={14} /> : <Unlock size={14} />}
              {locked ? "Diseño bloqueado" : "Bloquear diseño"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

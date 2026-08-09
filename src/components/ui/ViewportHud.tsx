"use client";

import {
  Camera,
  Cursor,
  Eye,
  GridIcon,
  History,
  Lock,
  Rotate,
  Target,
  Unlock,
} from "@/components/icons";
import { useEditor, type Projection } from "@/components/providers/EditorProvider";
import { useRoom } from "@/components/providers/RoomProvider";
import { QUICK_VIEWS } from "@/lib/constants";
import { viewOnPoint } from "@/lib/views";
import { Dropdown } from "./Dropdown";
import { SolarControl } from "./SolarControl";
import { Timeline } from "./Timeline";
import { cx } from "./primitives";

/**
 * El selector de arriba y el panel «Vistas rápidas» de la derecha son el mismo
 * mando visto dos veces: una sola lista de encuadres, para que no puedan
 * contradecirse.
 */
const VIEW_LABELS = QUICK_VIEWS.map((v) => v.label);

/** Lo que dice el selector cuando la cámara se fue por su cuenta. */
const FREE_VIEW = "Vista libre";

const PROJECTIONS: Record<Projection, string> = {
  perspective: "Perspectiva",
  ortho: "Ortográfica",
};

/**
 * Un mando de la barra central. `on` lo enciende (es un interruptor y está
 * puesto), `off` lo apaga (no hay nada sobre lo que actuar); los que solo
 * disparan una acción no llevan ninguno de los dos.
 */
type Gizmo = {
  id: string;
  Icon: typeof Cursor;
  label: string;
  hint?: string;
  on?: boolean;
  off?: boolean;
  run: () => void;
};

/**
 * HUD sobre el lienzo: el marco es transparente (el WebGL se ve a traves) y
 * solo los controles capturan el puntero, dejando el orbit libre.
 *
 * Regla de la casa: aquí no vive ningún mando decorativo. Si un botón se pinta,
 * hace lo que dice su etiqueta; el que no tenga nada que hacer se borra.
 */
export function ViewportHud() {
  const { locked, lockedBy, setLocked, entities, replaying, showMoment, upsertEntity } = useRoom();
  const {
    tool,
    setTool,
    selected,
    quickView,
    showQuickView,
    flyTo,
    projection,
    setProjection,
    grid,
    setGrid,
    overlays,
    setOverlays,
    capture,
  } = useEditor();

  const entity = entities.find((e) => e.id === selected) ?? null;

  /** «Vista 2D» de verdad: cenital y sin fuga, que es como se lee una planta. */
  const flat = projection === "ortho" && quickView === "plan";

  function toggleFlat() {
    setProjection(flat ? "perspective" : "ortho");
    showQuickView(flat ? "iso" : "plan");
  }

  const gizmos: Gizmo[] = [
    {
      id: "select",
      Icon: Cursor,
      label: "Seleccionar",
      hint: "Soltar la herramienta activa y volver a seleccionar",
      on: tool === "mover",
      run: () => setTool("mover"),
    },
    {
      id: "focus",
      Icon: Target,
      label: "Centrar en la selección",
      hint: entity ? `Volar hasta ${entity.label}` : "Selecciona un volumen primero",
      off: !entity,
      run: () => {
        if (entity) flyTo(viewOnPoint(entity.x, entity.z), `focus-${entity.id}`);
      },
    },
    {
      id: "rotate",
      Icon: Rotate,
      label: "Girar 90°",
      hint: locked
        ? "Diseño bloqueado"
        : entity
          ? `Girar ${entity.label} 90° (tecla R)`
          : "Selecciona un volumen primero",
      off: !entity || locked,
      run: () => {
        if (entity) upsertEntity({ ...entity, rotation: (entity.rotation + 90) % 360 });
      },
    },
    {
      id: "grid",
      Icon: GridIcon,
      label: "Rejilla",
      hint: "Cuadrícula de 0.5 m sobre la losa",
      on: grid,
      run: () => setGrid(!grid),
    },
    {
      id: "overlays",
      Icon: Eye,
      label: "Anotaciones",
      hint: "Discos térmicos, aristas y cotas",
      on: overlays,
      run: () => setOverlays(!overlays),
    },
    {
      id: "capture",
      Icon: Camera,
      label: "Captura",
      hint: "Descargar el lienzo en PNG",
      run: capture,
    },
  ];

  return (
    <div
      className={cx(
        "pointer-events-none relative min-h-0 rounded-[4px] border transition-colors",
        locked ? "border-accent/60" : "border-line",
      )}
    >
      {/* Encuadre de la cámara */}
      <div className="pointer-events-auto absolute left-4 top-4 w-[172px]">
        <Dropdown
          options={VIEW_LABELS}
          value={QUICK_VIEWS.find((v) => v.id === quickView)?.label ?? FREE_VIEW}
          onChange={(label) => {
            const view = QUICK_VIEWS.find((v) => v.label === label);
            if (view) showQuickView(view.id);
          }}
        />
      </div>

      {/* Gizmos */}
      <div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2">
        <div className="hud flex items-center gap-1 p-1.5">
          {gizmos.map(({ id, Icon, label, hint, on, off, run }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={on}
              title={hint ?? label}
              onClick={run}
              disabled={off}
              className={cx(
                "flex size-[30px] items-center justify-center rounded-[3px] transition-colors",
                off
                  ? "cursor-not-allowed text-dim/40"
                  : on
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
          options={[PROJECTIONS.perspective, PROJECTIONS.ortho]}
          value={PROJECTIONS[projection]}
          onChange={(v) => setProjection(v === PROJECTIONS.ortho ? "ortho" : "perspective")}
          align="right"
          className="w-[124px]"
        />
        <SolarControl />
      </div>

      {/* Conmutador 2D */}
      <div className="pointer-events-auto absolute bottom-4 left-4">
        <button
          type="button"
          onClick={toggleFlat}
          title={
            flat
              ? "Volver a la isométrica en perspectiva"
              : "Planta cenital sin fuga: lo que se acota"
          }
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

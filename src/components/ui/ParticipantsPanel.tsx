"use client";

import { Eye, Sparkles } from "@/components/icons";
import { useEditor } from "@/components/providers/EditorProvider";
import { useRoom } from "@/components/providers/RoomProvider";
import { AI_SENDER } from "@/lib/portal/events";
import { viewOnPoint, type View } from "@/lib/views";
import { Dot, Panel, SectionTitle, cx } from "./primitives";

const STATUS_TONE: Record<string, string> = {
  green: "text-ok",
  violet: "text-accent-2",
};

type Row = {
  id: string;
  name: string;
  color: string;
  status: string;
  tone: string;
  isAI?: boolean;
  /** Encuadre al que saltar para ver lo que ve, si lo ha difundido. */
  view?: View;
};

/**
 * Roster de la sala y, sobre todo, el salto de cámara: pulsar a alguien lleva
 * tu vista a la suya. Es el gesto del paso 4 del guion —«ambos usuarios ven la
 * corrección y asienten con el modelo de cámara 3D»— convertido en un control.
 *
 * La lista sale entera de la presencia de Portal. Mientras el canal no está
 * listo se queda vacía, y eso es lo que se enseña: un roster de ejemplo daría
 * por presente a gente que no ha entrado, que es justo lo que no puede pasar en
 * una herramienta donde se mira quién está para saber con quién hablas.
 */
export function ParticipantsPanel() {
  const { participants, cameras, cursors, status } = useRoom();
  const { flyTo } = useEditor();

  const rows: Row[] = participants.map((p) => {
    // Cursores y cámaras viajan por el canal de señales, que tiene sus propios
    // ids: se cruzan por `signalId`, no por el de la fila.
    const cam = p.signalId ? cameras[p.signalId] : undefined;
    // Si aún no ha difundido su encuadre, se mira a donde está su cursor:
    // peor que ver lo que ve, pero lleva al sitio correcto igual.
    const cursor = cursors.find((c) => c.id === p.signalId);
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      status: p.status,
      tone: p.isSelf ? "violet" : "green",
      isAI: p.id === AI_SENDER,
      view: p.isSelf
        ? undefined
        : cam
          ? { eye: cam.eye, target: cam.target }
          : cursor
            ? viewOnPoint(cursor.x, cursor.z)
            : undefined,
    };
  });

  return (
    <Panel className="flex min-h-0 flex-col overflow-hidden px-4 pb-3.5 pt-3.5">
      <SectionTitle className="mb-3">Participantes ({rows.length})</SectionTitle>
      {rows.length === 0 && (
        <p className="text-[11.5px] leading-[1.5] text-dim">
          {status === "ready" ? "Nadie más en la sala." : "Conectando con la sala…"}
        </p>
      )}
      <ul className="scroll-thin min-h-0 flex-1 space-y-[3px] overflow-y-auto">
        {rows.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!p.view}
              onClick={() => p.view && flyTo(p.view, `peer-${p.id}`)}
              title={p.view ? `Ir a la vista de ${p.name}` : undefined}
              className={cx(
                "group -mx-1.5 flex w-[calc(100%+12px)] items-center justify-between gap-3 rounded-[3px] px-1.5 py-[5px] text-left transition-colors",
                p.view ? "hover:bg-white/[0.05]" : "cursor-default",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5 text-[12px] text-fg/90">
                {p.isAI ? (
                  <Sparkles size={13} className="shrink-0 text-accent-2" />
                ) : (
                  <Dot color={p.color} size={8} glow />
                )}
                <span className="truncate">{p.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {p.view && (
                  <Eye
                    size={12}
                    className="text-dim opacity-0 transition-opacity group-hover:opacity-100"
                  />
                )}
                <span className={cx("text-[11px]", STATUS_TONE[p.tone])}>{p.status}</span>
                <Dot color={p.color} size={5} glow />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

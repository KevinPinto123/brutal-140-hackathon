"use client";

import { useEffect, useMemo, useState } from "react";
import { History } from "@/components/icons";
import { useRoom } from "@/components/providers/RoomProvider";
import { cx } from "./primitives";

/** Reloj corto: una sesión dura horas, la fecha no aporta nada. */
const clock = (at: number) =>
  new Date(at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

/**
 * La cinta del tiempo.
 *
 * El log durable no solo dice cómo está el laboratorio: dice cómo llegó hasta
 * aquí. Esta cinta recorre esos hitos plegando el mismo reducer hasta un punto
 * anterior —no hay copias del pasado ni snapshots, solo `foldRoom(log, upTo)`—,
 * así que el lienzo, la planta y las vistas rápidas muestran el estado histórico
 * sin enterarse de que están mirando atrás.
 *
 * El viaje es local a propósito: rebobinar para toda la sala le arrancaría el
 * modelo de las manos a quien esté colocando un módulo ahora mismo.
 */
export function Timeline() {
  const { moments, replayAt, replaying, showMoment } = useRoom();
  const [open, setOpen] = useState(false);

  /** Posición en la cinta. `moments.length` es el presente, fuera de la lista. */
  const at = useMemo(() => {
    if (replayAt === null) return moments.length;
    // Por índice del corte, no por igualdad: si el historial trunca por delante
    // los índices se desplazan, y es mejor caer en el hito siguiente que saltar
    // al presente sin avisar.
    const i = moments.findIndex((m) => m.upTo >= replayAt);
    return i === -1 ? moments.length : i;
  }, [moments, replayAt]);

  // Plegar la cinta es volver al presente: dejar la vista congelada en el pasado
  // detrás de un panel cerrado es la mejor forma de que alguien pierda diez
  // minutos preguntándose por qué no le deja colocar un muro.
  useEffect(() => {
    if (!open && replaying) showMoment(null);
  }, [open, replaying, showMoment]);

  // Una sala recién abierta no tiene historia que recorrer.
  if (!moments.length) return null;

  const current = at < moments.length ? moments[at] : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Recorrer la historia del diseño"
        className="hud flex items-center gap-2 px-3.5 py-2 text-[12px] leading-none text-fg/90 transition-colors hover:text-white"
      >
        <History size={14} />
        Historia
        <span className="font-mono text-[10.5px] tabular-nums text-dim">{moments.length}</span>
      </button>
    );
  }

  return (
    <div className={cx("hud w-[380px] px-3.5 py-2.5", replaying && "border-accent/60")}>
      <div className="flex items-baseline justify-between gap-3 leading-none">
        <span
          className={cx("truncate text-[12px]", replaying ? "text-accent-2" : "text-fg/90")}
        >
          {current ? current.text : "Estado en vivo"}
        </span>
        <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-dim">
          {current ? `${at + 1}/${moments.length} · ${clock(current.at)}` : "presente"}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2.5">
        <input
          type="range"
          className="tape min-w-0 flex-1"
          aria-label="Momento del diseño"
          title="Arrastra para recorrer la historia de la parcela"
          min={0}
          max={moments.length}
          step={1}
          value={at}
          onChange={(e) => {
            const i = Number(e.target.value);
            showMoment(i >= moments.length ? null : moments[i].upTo);
          }}
        />
        {/* Cerrar es también volver: el efecto de arriba se encarga. Quien
            quiera seguir con la cinta abierta tiene el mando grande de la HUD. */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Cerrar la cinta y volver al estado en vivo"
          className="shrink-0 rounded-[3px] border border-line px-2 py-1.5 text-[10.5px] leading-none text-muted transition-colors hover:border-accent/60 hover:text-fg"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

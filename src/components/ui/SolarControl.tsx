"use client";

import { Sun } from "@/components/icons";
import { useRoom } from "@/components/providers/RoomProvider";
import { DAY, isNight, sunLight } from "@/lib/sun";
import { cx } from "./primitives";

/**
 * El regulador solar de la sala.
 *
 * Antes aquí había un `12:00 / 21°` de cartón piedra. Ahora es el mando de la
 * hora compartida: al arrastrarlo, las sombras se mueven en el lienzo de todos
 * los peers a la vez —la vista previa viaja por el canal de señales— y al
 * soltarlo la hora queda escrita en el log, así que quien entre después hereda
 * la misma condición de luz.
 *
 * Sigue vivo con el diseño bloqueado, a propósito: mover el sol no edita la
 * geometría, la interroga.
 */
export function SolarControl() {
  const { sun, previewSun, setSun } = useRoom();

  // El indicador no se inventa el umbral: lo lee del mismo sitio que el lienzo.
  const lamps = sunLight(sun).artificial > 0.25;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Sun
          size={16}
          className={cx("shrink-0", isNight(sun) ? "text-info/70" : "text-warn/90")}
        />
        <div className="w-[46px] font-mono text-[11px] leading-[1.35] text-fg/85">
          <div>{sun.label}</div>
          <div className={cx(lamps ? "text-info/80" : "text-muted")}>
            {lamps ? "artif." : `${sun.altitudeDeg}°`}
          </div>
        </div>
      </div>

      <input
        type="range"
        className="solar w-[96px]"
        aria-label="Hora solar de la sala"
        title="Arrastra para mover el sol de toda la sala"
        min={DAY.from}
        max={DAY.to}
        step={0.25}
        value={sun.hour}
        onChange={(e) => previewSun(Number(e.target.value))}
        onPointerUp={(e) => setSun(Number(e.currentTarget.value))}
        onKeyUp={(e) => {
          // Solo las teclas que mueven el mando confirman la hora: tabular
          // fuera del control no debe escribir en el log.
          if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") {
            setSun(Number(e.currentTarget.value));
          }
        }}
      />
    </div>
  );
}

/**
 * Escala térmica compartida. El lienzo 3D, el mapa de calor del panel y el
 * diagnóstico de El Arquitecto tienen que hablar del mismo color y del mismo
 * radio: si divergen, la corrección que propone la IA deja de leerse en pantalla.
 */
import { heatOf, type Entity } from "./entities";

/** Masa sin carga térmica: el recinto. */
export const COOL = "#2563eb";
/** Jardín interno: sumidero de ventilación, no fuente. */
export const SINK = "#22c55e";

/** Tramos de kW → color. Se busca de arriba abajo. */
const SCALE: [number, string][] = [
  [16, "#ef4444"],
  [10, "#f97316"],
  [6, "#facc15"],
  [1, "#0d9488"],
];

export function heatColor(kw: number) {
  if (kw <= 0) return COOL;
  return SCALE.find(([min]) => kw >= min)?.[1] ?? COOL;
}

/** Radio de influencia térmica en metros: crece con la potencia disipada. */
export const heatRadius = (kw: number) => 0.9 + kw * 0.12;

export function entityHeat(e: Pick<Entity, "kind" | "material">) {
  const kw = heatOf(e);
  return {
    kw,
    color: e.material === "biophilic" ? SINK : heatColor(kw),
    radius: heatRadius(kw),
  };
}

"use client";

import { PLOT, type QuickViewId } from "@/lib/constants";
import { MATERIAL_COLORS, extent, type Entity } from "@/lib/entities";
import { measureLight, shadeSpans } from "@/lib/light";
import type { SunState } from "@/lib/sun";

/**
 * Proyecciones de la geometría real de la sala. Las cuatro vistas rápidas leen
 * el mismo array de entidades que el lienzo 3D, así que lo que se ve aquí es el
 * estado compartido, no una lámina de muestra.
 *
 * Todo se dibuja en metros: el `viewBox` se calcula de los propios límites y los
 * trazos usan `non-scaling-stroke`, de modo que la escala no engorda las líneas.
 */

const HX = PLOT.width / 2;
const HZ = PLOT.depth / 2;

/** Isométrica clásica 2:1 en proyección oblicua sobre 30°. */
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

type Pt = [number, number];
type Shape = { key: string; pts: Pt[]; fill: string; op: number };

const rect = (u0: number, v0: number, u1: number, v1: number): Pt[] => [
  [u0, v0],
  [u1, v0],
  [u1, v1],
  [u0, v1],
];

const iso = (x: number, y: number, z: number): Pt => [
  (x - z) * COS30,
  (x + z) * SIN30 - y,
];

/** Aclara u oscurece una cara para dar volumen sin luces reales. */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** Planta: el eje largo en horizontal, que es como cabe en la miniatura. */
function planShapes(entities: Entity[]) {
  return entities.map((e) => {
    const { ex, ez } = extent(e);
    return {
      key: e.id,
      pts: rect(e.z - ez, e.x - ex, e.z + ez, e.x + ex),
      fill: MATERIAL_COLORS[e.material],
      op: e.material === "glass" ? 0.45 : 1,
    };
  });
}

/**
 * Alzados: `long` recorta contra el eje Z (sección longitudinal) y el corto
 * contra el X (fachada frontal). En ambos se pinta de lejos a cerca.
 */
function elevationShapes(entities: Entity[], long: boolean): Shape[] {
  const depth = (e: Entity) => (long ? e.x : e.z);
  return [...entities]
    .sort((a, b) => depth(a) - depth(b))
    .map((e) => {
      const { ex, ez } = extent(e);
      const half = long ? ez : ex;
      const u = long ? e.z : e.x;
      return {
        key: e.id,
        pts: rect(u - half, -e.y, u + half, -(e.y + e.h)),
        fill: MATERIAL_COLORS[e.material],
        op: e.material === "glass" ? 0.5 : 1,
      };
    });
}

/** Isométrica: tres caras por volumen, de la más lejana a la más cercana. */
function isoShapes(entities: Entity[]): Shape[] {
  const out: Shape[] = [];
  for (const e of [...entities].sort((a, b) => a.x + a.z - (b.x + b.z))) {
    const { ex, ez } = extent(e);
    const [x0, x1] = [e.x - ex, e.x + ex];
    const [z0, z1] = [e.z - ez, e.z + ez];
    const [y0, y1] = [e.y, e.y + e.h];
    const base = MATERIAL_COLORS[e.material];
    const op = e.material === "glass" ? 0.55 : 1;

    // Techo, cara izquierda (hacia -X) y cara derecha (hacia +Z).
    out.push({
      key: `${e.id}-t`,
      pts: [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)],
      fill: shade(base, 0.18),
      op,
    });
    out.push({
      key: `${e.id}-l`,
      pts: [iso(x0, y1, z1), iso(x0, y0, z1), iso(x0, y0, z0), iso(x0, y1, z0)],
      fill: shade(base, -0.4),
      op,
    });
    out.push({
      key: `${e.id}-r`,
      pts: [iso(x0, y1, z1), iso(x1, y1, z1), iso(x1, y0, z1), iso(x0, y0, z1)],
      fill: shade(base, -0.18),
      op,
    });
  }
  return out;
}

/** Contorno de la parcela para cada vista, en las mismas coordenadas. */
function frameFor(view: QuickViewId): Pt[] {
  if (view === "plan") return rect(-HZ, -HX, HZ, HX);
  if (view === "section") return rect(-HZ, 0, HZ, -PLOT.maxHeight);
  if (view === "facade") return rect(-HX, 0, HX, -PLOT.maxHeight);
  return [iso(-HX, 0, -HZ), iso(HX, 0, -HZ), iso(HX, 0, HZ), iso(-HX, 0, HZ)];
}

const path = (pts: Pt[]) =>
  `${pts.map(([u, v], i) => `${i ? "L" : "M"}${u.toFixed(3)} ${v.toFixed(3)}`).join("")}Z`;

/** El `viewBox` se ajusta a lo dibujado, con un margen fijo en metros. */
function box(all: Pt[][], pad = 0.8) {
  const pts = all.flat();
  const us = pts.map((p) => p[0]);
  const vs = pts.map((p) => p[1]);
  const u0 = Math.min(...us) - pad;
  const v0 = Math.min(...vs) - pad;
  return `${u0} ${v0} ${Math.max(...us) + pad - u0} ${Math.max(...vs) + pad - v0}`;
}

/** La planta se lee como plano técnico; el resto, como maqueta sobre fondo oscuro. */
const PAPER = { bg: "#f4f3f0", line: "#141416", grid: "#9b9b96" };
const DARK = { bg: "#141417", line: "#5f5f68", grid: "#2c2c31" };

export function Projection({
  view,
  entities,
  sun,
}: {
  view: QuickViewId;
  entities: Entity[];
  /** Con sol, la planta se convierte en un estudio de sombras de verdad. */
  sun?: SunState;
}) {
  const shapes =
    view === "plan"
      ? planShapes(entities)
      : view === "iso"
        ? isoShapes(entities)
        : elevationShapes(entities, view === "section");

  const frame = frameFor(view);
  const skin = view === "plan" ? PAPER : DARK;
  const viewBox = box([frame, ...shapes.map((s) => s.pts)]);

  /**
   * La sombra de la planta sale del mismo medidor que juzga el panel: lo que
   * aquí se ve gris es exactamente la losa que cuenta como no iluminada. Los
   * tramos van en un único `path` —y solapados un pelo— para que las filas
   * contiguas no dejen costuras de antialias.
   */
  const shadow =
    view === "plan" && sun
      ? shadeSpans(measureLight(entities, sun))
          .map((s) => path(rect(s.z0 - 0.01, s.x0 - 0.01, s.z1 + 0.01, s.x1 + 0.01)))
          .join("")
      : "";

  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="block h-full w-full">
      <rect x="-1000" y="-1000" width="2000" height="2000" fill={skin.bg} />

      {/* Ejes de la parcela: la restricción 7 x 20 siempre visible */}
      <path
        d={path(frame)}
        fill={view === "plan" ? "none" : "#ffffff"}
        fillOpacity={view === "plan" ? 0 : 0.04}
        stroke={skin.line}
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
      />

      {/* Sombra arrojada a la hora de la sala, bajo los volúmenes */}
      {shadow && <path d={shadow} fill="#141416" fillOpacity={0.14} />}

      {shapes.map((s) => (
        <path
          key={s.key}
          d={path(s.pts)}
          fill={s.fill}
          fillOpacity={s.op}
          stroke={skin.line}
          strokeWidth={0.7}
          strokeOpacity={0.55}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Ejes de referencia en planta */}
      {view === "plan" && (
        <path
          d={`M${-HZ - 0.6} 0H${HZ + 0.6}M0 ${-HX - 0.6}V${HX + 0.6}`}
          stroke={skin.grid}
          strokeWidth={0.6}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

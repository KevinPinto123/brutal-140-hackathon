/**
 * Medidor de luz natural.
 *
 * Hasta ahora la «iluminación» del panel era un número narrado: 92 menos catorce
 * por cada conflicto. El guion de la demo, en cambio, pide algo literal —«el
 * Usuario B coloca los racks de servidores bloqueando el flujo de luz blanca»—,
 * y eso solo se puede afirmar midiéndolo.
 *
 * El método es el de un cálculo de iluminación de anteproyecto: se cuadricula el
 * plano de trabajo, se lanza un rayo hacia el sol desde cada muestra y se mira
 * si algún volumen opaco se interpone. Sale un porcentaje que se puede defender,
 * un mapa de sombra que se puede dibujar y, sobre todo, el nombre del volumen
 * que está tapando la luz y cuántos metros cuadrados arruina.
 */
import { PLOT } from "./constants";
import { extent, type Entity } from "./entities";
import { isNight, type SunState } from "./sun";

/** Lado de la celda de muestreo, en metros: 14 x 40 = 560 muestras. */
export const CELL = 0.5;
export const COLS = Math.round(PLOT.width / CELL);
export const ROWS = Math.round(PLOT.depth / CELL);

/** Plano de trabajo: la luz se mide donde se trabaja, no en el suelo. */
const PROBE_Y = 0.85;

/** Estado de una celda. */
export const SUN = 0;
export const SHADE = 1;
export const BUSY = 2;

const HX = PLOT.width / 2;
const HZ = PLOT.depth / 2;

export type LightField = {
  hour: number;
  /** Porcentaje de losa útil con sol directo. */
  pct: number;
  cells: Uint8Array;
  cols: number;
  rows: number;
  cell: number;
  /** m² de losa útil a la sombra. */
  shaded: number;
  /** m² de sombra que arroja cada volumen. La luz ya tiene culpables. */
  blame: Record<string, number>;
  /** El que más tapa, si tapa algo que merezca decirse. */
  worst: { id: string; label: string; area: number } | null;
  night: boolean;
};

/**
 * Lo que de verdad corta la luz. El vidrio y las aberturas transmiten —para eso
 * están— y el jardín es una losa de 12 cm: ni tapa ni pretende hacerlo.
 */
export function blocksLight(e: Entity) {
  if (e.material === "glass" || e.material === "biophilic") return false;
  if (e.kind === "puerta" || e.kind === "abertura" || e.kind === "jardin") return false;
  return e.h > 0.4;
}

/** Caja del volumen en coordenadas de mundo, ya con la rotación resuelta. */
function boxOf(e: Entity) {
  const { ex, ez } = extent(e);
  return {
    id: e.id,
    label: e.label,
    x0: e.x - ex,
    x1: e.x + ex,
    y0: e.y,
    y1: e.y + e.h,
    z0: e.z - ez,
    z1: e.z + ez,
  };
}

type Box = ReturnType<typeof boxOf>;

/**
 * Rayo contra caja por el método de las rebanadas. Devuelve la distancia al
 * primer impacto por delante del origen, o null si el rayo la esquiva. Como las
 * rotaciones son múltiplos de 90°, la caja de mundo es exacta y el test también.
 */
function hitDistance(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  b: Box,
) {
  let near = -Infinity;
  let far = Infinity;

  // Un eje con dirección nula solo puede fallar: o el origen ya está dentro de
  // esa rebanada, o el rayo nunca la cruzará.
  const slab = (o: number, d: number, lo: number, hi: number) => {
    if (Math.abs(d) < 1e-9) return o >= lo && o <= hi;
    const t0 = (lo - o) / d;
    const t1 = (hi - o) / d;
    near = Math.max(near, Math.min(t0, t1));
    far = Math.min(far, Math.max(t0, t1));
    return true;
  };

  if (!slab(ox, dx, b.x0, b.x1)) return null;
  if (!slab(oy, dy, b.y0, b.y1)) return null;
  if (!slab(oz, dz, b.z0, b.z1)) return null;
  if (near > far || far < 0) return null;
  return near > 0 ? near : 0;
}

const inside = (b: Box, x: number, z: number) =>
  x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;

/** Centro de la celda en metros de mundo. */
export const cellX = (col: number) => -HX + (col + 0.5) * CELL;
export const cellZ = (row: number) => -HZ + (row + 0.5) * CELL;

export function measureLight(entities: Entity[], sun: SunState): LightField {
  const cells = new Uint8Array(COLS * ROWS);
  const blame: Record<string, number> = {};
  const area = CELL * CELL;
  const night = isNight(sun);

  const boxes = entities.filter(blocksLight).map(boxOf);
  // Solo lo que ocupa el plano de trabajo resta losa útil: un volumen de 12 cm
  // se pisa por encima, uno de 2 m no.
  const solid = boxes.filter((b) => b.y1 > PROBE_Y);
  const [dx, dy, dz] = sun.dir;

  let usable = 0;
  let lit = 0;

  for (let row = 0; row < ROWS; row++) {
    const z = cellZ(row);
    for (let col = 0; col < COLS; col++) {
      const x = cellX(col);
      const i = row * COLS + col;

      if (solid.some((b) => inside(b, x, z))) {
        cells[i] = BUSY;
        continue;
      }

      usable++;
      if (night) {
        cells[i] = SHADE;
        continue;
      }

      // Quien primero se cruza es quien tapa: la sombra tiene un solo culpable.
      let closest: Box | null = null;
      let best = Infinity;
      for (const b of boxes) {
        const t = hitDistance(x, PROBE_Y, z, dx, dy, dz, b);
        if (t !== null && t < best) {
          best = t;
          closest = b;
        }
      }

      if (closest) {
        cells[i] = SHADE;
        blame[closest.id] = (blame[closest.id] ?? 0) + area;
      } else {
        cells[i] = SUN;
        lit++;
      }
    }
  }

  const worstId = Object.keys(blame).reduce<string | null>(
    (top, id) => (top === null || blame[id] > blame[top] ? id : top),
    null,
  );
  const worstBox = worstId ? boxes.find((b) => b.id === worstId) : undefined;

  return {
    hour: sun.hour,
    pct: usable ? Math.round((lit / usable) * 100) : 0,
    cells,
    cols: COLS,
    rows: ROWS,
    cell: CELL,
    shaded: round((usable - lit) * area),
    blame,
    worst:
      worstBox && blame[worstBox.id] >= 1
        ? { id: worstBox.id, label: worstBox.label, area: round(blame[worstBox.id]) }
        : null,
    night,
  };
}

/**
 * Tramos contiguos de sombra por fila, en metros. Dibujar 560 celdas sueltas en
 * un SVG de miniatura sería absurdo; fundidas por fila salen unas pocas bandas.
 */
export function shadeSpans(field: LightField) {
  const out: { z0: number; z1: number; x0: number; x1: number }[] = [];
  for (let row = 0; row < field.rows; row++) {
    let start = -1;
    for (let col = 0; col <= field.cols; col++) {
      const on = col < field.cols && field.cells[row * field.cols + col] === SHADE;
      if (on && start < 0) start = col;
      if (!on && start >= 0) {
        out.push({
          z0: cellZ(row) - CELL / 2,
          z1: cellZ(row) + CELL / 2,
          x0: cellX(start) - CELL / 2,
          x1: cellX(col - 1) + CELL / 2,
        });
        start = -1;
      }
    }
  }
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;

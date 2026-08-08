/**
 * Modelo de entidades del lienzo: los volúmenes que humanos e IA mueven dentro
 * de la parcela. Todo se mide en metros y se ancla al centro de la huella.
 */
import { PLOT } from "./constants";

/**
 * La arquitectura del recinto y el programa que vive dentro. El caso de uso del
 * proyecto es un laboratorio de Robótica, Impresión 3D y HPC: esos módulos son
 * entidades de pleno derecho, no muros a los que se les pone otro nombre.
 */
export type EntityKind =
  | "muro"
  | "puerta"
  | "abertura"
  | "jardin"
  | "pilar"
  | "escalera"
  | "hpc"
  | "racks"
  | "robotica"
  | "impresion";

export type MaterialId = "concrete" | "glass" | "biophilic" | "steel" | "wood";

export type Entity = {
  id: string;
  kind: EntityKind;
  label: string;
  /** Centro de la huella, y = base sobre la losa. */
  x: number;
  y: number;
  z: number;
  /** Grados alrededor de Y, en pasos de 90. */
  rotation: number;
  /** Ancho (X), fondo (Z) y alto (Y) sin rotar. */
  w: number;
  d: number;
  h: number;
  material: MaterialId;
  /** Quién lo colocó (id de Portal o "ai_architect"). */
  by: string;
};

type Spec = {
  label: string;
  w: number;
  d: number;
  h: number;
  material: MaterialId;
  /** kW disipados en continuo. Lo que obliga a ventilar, y a la IA a intervenir. */
  heat: number;
};

/** Piezas que la paleta puede depositar sobre la losa. */
export const ENTITY_SPECS: Record<EntityKind, Spec> = {
  muro: { label: "Muro", w: 3, d: 0.25, h: 2.8, material: "concrete", heat: 0 },
  puerta: { label: "Puerta / Ventana", w: 1.2, d: 0.25, h: 2.2, material: "glass", heat: 0 },
  abertura: { label: "Abertura", w: 1.6, d: 0.25, h: 1.4, material: "glass", heat: 0 },
  jardin: { label: "Jardín interno", w: 2, d: 2, h: 0.12, material: "biophilic", heat: 0 },
  pilar: { label: "Pilar", w: 0.4, d: 0.4, h: 3.2, material: "concrete", heat: 0 },
  escalera: { label: "Escalera", w: 1.2, d: 2.4, h: 2.8, material: "concrete", heat: 0 },

  // Programa del laboratorio. El calor sale de equipo real: un rack denso ronda
  // los 10-15 kW y un nodo HPC refrigerado por aire se va por encima.
  hpc: { label: "Módulo HPC", w: 2.4, d: 1.2, h: 2.2, material: "steel", heat: 18 },
  racks: { label: "Racks de servidores", w: 1.8, d: 1, h: 2.1, material: "steel", heat: 12 },
  impresion: { label: "Impresión 3D", w: 1.6, d: 1.2, h: 1.8, material: "steel", heat: 4 },
  robotica: { label: "Celda de robótica", w: 2.6, d: 2.6, h: 2.4, material: "steel", heat: 2 },
};

/** Umbral a partir del cual un módulo necesita ventilación sí o sí. */
export const HOT_KW = 8;

export const heatOf = (e: Pick<Entity, "kind">) => ENTITY_SPECS[e.kind]?.heat ?? 0;
export const isHot = (e: Pick<Entity, "kind">) => heatOf(e) >= HOT_KW;

export const MATERIAL_COLORS: Record<MaterialId, string> = {
  concrete: "#b4afa7",
  glass: "#7fb6d9",
  biophilic: "#4ade80",
  steel: "#3a3a40",
  wood: "#b5834a",
};

/** Las herramientas que no depositan geometría no aparecen aquí. */
export const PLACEABLE: Record<string, EntityKind | undefined> = {
  muro: "muro",
  puerta: "puerta",
  abertura: "abertura",
  jardin: "jardin",
  pilar: "pilar",
  escalera: "escalera",
  hpc: "hpc",
  racks: "racks",
  impresion: "impresion",
  robotica: "robotica",
};

const HX = PLOT.width / 2;
const HZ = PLOT.depth / 2;

/** Huella real: a 90°/270° el ancho y el fondo se intercambian. */
export function extent(e: Pick<Entity, "w" | "d" | "rotation">) {
  const turned = Math.abs(Math.round(e.rotation / 90)) % 2 === 1;
  return { ex: (turned ? e.d : e.w) / 2, ez: (turned ? e.w : e.d) / 2 };
}

/** Nada puede salirse de los 7 x 20: la restricción es el concepto del proyecto. */
export function clampToPlot<T extends Pick<Entity, "x" | "z" | "w" | "d" | "rotation">>(
  e: T,
): T {
  const { ex, ez } = extent(e);
  return {
    ...e,
    x: Math.min(HX - ex, Math.max(-HX + ex, e.x)),
    z: Math.min(HZ - ez, Math.max(-HZ + ez, e.z)),
  };
}

export function overlaps(a: Entity, b: Entity) {
  const ea = extent(a);
  const eb = extent(b);
  return (
    Math.abs(a.x - b.x) < ea.ex + eb.ex - 0.02 &&
    Math.abs(a.z - b.z) < ea.ez + eb.ez - 0.02
  );
}

/** m2 ocupados en planta, para el panel de análisis. */
export function footprintArea(entities: Entity[]) {
  return entities.reduce((sum, e) => {
    const { ex, ez } = extent(e);
    return sum + ex * 2 * ez * 2;
  }, 0);
}

let seq = 0;

export function makeEntity(
  kind: EntityKind,
  x: number,
  z: number,
  by: string,
  index: number,
): Entity {
  const spec = ENTITY_SPECS[kind];
  seq += 1;
  return clampToPlot({
    id: `${kind}_${Date.now().toString(36)}${seq.toString(36)}`,
    kind,
    label: `${spec.label} ${String(index + 1).padStart(2, "0")}`,
    x,
    y: 0,
    z,
    rotation: 0,
    w: spec.w,
    d: spec.d,
    h: spec.h,
    material: spec.material,
    by,
  });
}

/** Estado compartido tal y como lo describe el README (y lo lee la IA). */
export function toStatePayload(entities: Entity[]) {
  return {
    room_id: "lab_140",
    plot: { width: PLOT.width, depth: PLOT.depth, area: PLOT.area, max_height: PLOT.maxHeight },
    entities: Object.fromEntries(
      entities.map((e) => [
        e.id,
        {
          label: e.label,
          kind: e.kind,
          x: Number(e.x.toFixed(2)),
          y: e.y,
          z: Number(e.z.toFixed(2)),
          rotation: e.rotation,
          size: [e.w, e.d, e.h],
          type: e.material,
          /** Carga térmica en kW: sin esto la IA no puede ver la colisión térmica. */
          heat_kw: heatOf(e),
        },
      ]),
    ),
  };
}

/** Distancia entre centros en planta. */
export const distance = (a: Pick<Entity, "x" | "z">, b: Pick<Entity, "x" | "z">) =>
  Math.hypot(a.x - b.x, a.z - b.z);

/** Holgura real entre huellas: 0 si se tocan, negativa si se solapan. */
export function gapBetween(a: Entity, b: Entity) {
  const ea = extent(a);
  const eb = extent(b);
  return Math.max(
    Math.abs(a.x - b.x) - (ea.ex + eb.ex),
    Math.abs(a.z - b.z) - (ea.ez + eb.ez),
  );
}

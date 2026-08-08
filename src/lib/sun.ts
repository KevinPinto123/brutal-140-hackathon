/**
 * El sol de BRUTAL-140.
 *
 * El brief del proyecto no negocia la luz: «todo blanco con luz blanca
 * artificial y natural». Para poder juzgarla hace falta primero saber de dónde
 * viene, así que la hora del día es estado compartido y de ella sale un único
 * vector solar que usan las tres superficies que hablan de luz: el lienzo 3D,
 * el medidor de `light.ts` y el diagnóstico de El Arquitecto.
 *
 * Es un arco solar simplificado, no un almanaque: sale por el este (−X), pasa
 * por el sur (+Z) y se pone por el oeste (+X). Basta para lo que importa aquí,
 * que es que las fachadas largas (x = ±3.5) reciban luz rasante a primera y a
 * última hora y que los volúmenes arrojen sombras que se puedan medir.
 */
import type { Vec3 } from "./views";

/** Tramo del día que se puede recorrer. Fuera de él la parcela está a oscuras. */
export const DAY = { from: 6, to: 20 } as const;

/** Hora por defecto: mediodía, el encuadre del mockup. */
export const NOON = 12;

/** Altitud máxima del sol en el cénit del arco. */
const MAX_ALT = (72 * Math.PI) / 180;

/** Por debajo de esta altura del vector solar ya no entra luz: es de noche. */
export const NIGHT = 0.03;

export type SunState = {
  hour: number;
  /** Altitud sobre el horizonte, en radianes. Negativa o cero = de noche. */
  alt: number;
  /** Azimut: −π/2 este, 0 sur, +π/2 oeste. */
  az: number;
  /** Vector unitario del suelo HACIA el sol. */
  dir: Vec3;
  altitudeDeg: number;
  /** "07:30" — lo que se lee en la HUD. */
  label: string;
  /** 0 de noche, 1 en el cénit. Modula color, intensidad y luz artificial. */
  day: number;
};

export const clampHour = (h: number) => Math.min(DAY.to, Math.max(DAY.from, h));

/** Un solo umbral de noche para el medidor, el lienzo y la HUD. */
export const isNight = (sun: SunState) => sun.day <= NIGHT;

export function sunAt(hour: number): SunState {
  const h = clampHour(hour);
  const t = (h - DAY.from) / (DAY.to - DAY.from);
  const alt = Math.sin(Math.PI * t) * MAX_ALT;
  const az = (t - 0.5) * Math.PI;
  const c = Math.cos(alt);

  return {
    hour: h,
    alt,
    az,
    // Unitario por construcción: c²(sin²az + cos²az) + sin²alt = 1.
    dir: [Math.sin(az) * c, Math.sin(alt), Math.cos(az) * c],
    altitudeDeg: Math.round((alt * 180) / Math.PI),
    label: formatHour(h),
    day: Math.max(0, Math.sin(alt)),
  };
}

/**
 * Cómo se traduce esa altitud a luz de verdad. Blanca en lo alto y ámbar al
 * ras: la exigencia de «luz blanca» del brief se cumple en las horas de
 * trabajo, y el extremo cálido del amanecer es justo lo que delata una fachada
 * mal resuelta.
 */
export function sunLight(sun: SunState) {
  const k = sun.day;
  return {
    intensity: 0.1 + k * 2.2,
    color: mix("#ff9e57", "#ffffff", Math.min(1, k * 1.9)),
    /** Rebote del cielo: nunca cae a cero del todo. */
    ambient: 0.28 + k * 0.9,
    /** Las luminarias blancas se encienden a medida que el sol se retira. */
    artificial: 1 - Math.min(1, k * 1.7),
  };
}

/** Posición del foco direccional: el vector solar llevado lejos de la parcela. */
export const sunPosition = (sun: SunState, distance = 34): Vec3 => [
  sun.dir[0] * distance,
  Math.max(2, sun.dir[1] * distance),
  sun.dir[2] * distance,
];

export function formatHour(h: number) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function mix(from: string, to: string, k: number) {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * k);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

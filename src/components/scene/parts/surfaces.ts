/**
 * Superficies del laboratorio.
 *
 * Hasta aquí cada volumen era una caja con un color plano sacado de
 * `MATERIAL_COLORS`, y seis muros salían idénticos hasta el último bit. El
 * concreto encofrado no se comporta así: la mezcla, el curado y la tabla dejan
 * variación de tono entre piezas coladas el mismo día.
 *
 * Este módulo da a cada material su respuesta a la luz —rugosidad, metalicidad,
 * transparencia— y una variación estable derivada del id de la entidad, para que
 * la parcela no parezca un render de catálogo. Estable importa: el mismo muro
 * tiene que salir del mismo tono en el cliente de todos, y el id ya viaja por
 * Portal, así que no hace falta difundir nada nuevo.
 */
import { MATERIAL_COLORS, type MaterialId } from "@/lib/entities";

/** FNV-1a recortado a [0,1). Determinista: mismo id, mismo tono en toda la sala. */
export function noise(seed: string, salt = 0): number {
  let h = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Aclara (k > 0) u oscurece (k < 0) un hex sin salirse del rango. */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v * (1 + k))))
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${ch.join("")}`;
}

export type Surface = {
  color: string;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
};

/**
 * Cómo responde cada material a la luz blanca del enunciado.
 *
 * El vidrio no usa transmisión real: `MeshTransmissionMaterial` obliga a
 * renderizar la escena otra vez por objeto y aquí puede haber diez aberturas.
 * Con el entorno procedural encendido, un estándar transparente y poco rugoso
 * ya devuelve reflejo y profundidad, que es lo que se ve en cámara.
 */
export function surface(material: MaterialId, seed = ""): Surface {
  const n = noise(seed) - 0.5;
  switch (material) {
    case "concrete":
      return {
        color: shade(MATERIAL_COLORS.concrete, n * 0.14),
        roughness: 0.93,
        metalness: 0.02,
      };
    case "steel":
      return {
        color: shade(MATERIAL_COLORS.steel, n * 0.16),
        roughness: 0.33,
        metalness: 0.86,
      };
    case "glass":
      return {
        color: MATERIAL_COLORS.glass,
        roughness: 0.06,
        metalness: 0.14,
        transparent: true,
        opacity: 0.26,
      };
    case "biophilic":
      return { color: "#4a7c50", roughness: 0.86, metalness: 0 };
    case "wood":
      return {
        color: shade(MATERIAL_COLORS.wood, n * 0.12),
        roughness: 0.58,
        metalness: 0.04,
      };
  }
}

/** Acero oscuro de carpintería: marcos, bastidores y perfilería. */
export const FRAME: Surface = { color: "#26262b", roughness: 0.42, metalness: 0.8 };

/** Chapa perforada de los frentes de equipo. */
export const PANEL: Surface = { color: "#141418", roughness: 0.62, metalness: 0.55 };

/** Tierra del jardín interno. */
export const SOIL: Surface = { color: "#2e241d", roughness: 1, metalness: 0 };

/** Gama de follaje: la vegetación de un patio no es de un solo verde. */
export const LEAF = ["#4f8f57", "#3d7346", "#68a563", "#2f5f3d", "#5c9a58"];

import { COLORS, type UserColor } from "@/lib/constants";

export type Identity = { name: string; color: string };

const KEY = "brutal140.identity";

/** Un nombre no puede ser vacío ni una parrafada: es una etiqueta sobre un avatar. */
export const NAME_MAX = 24;

export const PALETTE: UserColor[] = ["blue", "violet", "green", "amber", "cyan"];

/**
 * Deja el nombre en algo que se pueda pintar: sin espacios de relleno, sin
 * saltos de línea y sin desbordar la etiqueta. Devuelve "" si no queda nada,
 * que es la señal de que ese nombre no vale.
 */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NAME_MAX);
}

/** Hash estable de una cadena; la misma entrada da siempre el mismo índice. */
function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Color propuesto para un nombre. Determinista a propósito: si fuera al azar,
 * cada recarga te cambiaría de color y la presencia dejaría de reconocerte.
 */
export function colorForName(name: string): string {
  return COLORS[PALETTE[hash(name) % PALETTE.length]];
}

/** Color determinista para un peer que aún no publicó metadata. */
export function fallbackColor(id: string): string {
  return COLORS[PALETTE[hash(id) % PALETTE.length]];
}

/* ------------------------------------------------------ transporte del nombre -- */

/**
 * El nombre viaja a los demás por la metadata de presencia, y ese canal no
 * conserva UTF-8: "Marisol Chávez" vuelve como "Marisol ChÃ¡vez", que son los
 * dos bytes de la `á` releídos como Latin-1. El cuerpo de los mensajes sí lo
 * conserva (el chat con acentos llega intacto), así que el arreglo se limita a
 * la metadata: se publica en ASCII puro —invariante ante esa transformación— y
 * se deshace al leerlo. Media España se llama Muñoz o Ibáñez; no es un detalle.
 */
export function packName(name: string): string {
  return encodeURIComponent(name);
}

/** Inversa de `packName`, tolerante con un nombre que llegue sin empaquetar. */
export function unpackName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/* ------------------------------------------------------------------ store -- */

/**
 * La identidad ya no se inventa: o la escribió la persona en la puerta, o no
 * hay identidad. Ese `null` no es un caso degenerado, es el estado inicial que
 * mantiene la sala cerrada hasta que alguien dice quién es.
 *
 * Vive en un store externo (no en estado de React) porque `RoomProvider` la lee
 * con `useSyncExternalStore`: en el prerender del servidor todavía no existe
 * —localStorage es del navegador—, y así la hidratación coincide en vez de
 * romperse.
 */
let cached: Identity | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Identity>;
    const name = typeof saved.name === "string" ? normalizeName(saved.name) : "";
    if (!name) return null;
    const color = typeof saved.color === "string" ? saved.color : colorForName(name);
    return { name, color };
  } catch {
    // localStorage bloqueado o JSON corrupto: se entra como si fuera la primera vez.
    return null;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/**
 * Snapshot estable para `useSyncExternalStore`: mientras nadie guarde nada
 * devuelve exactamente el mismo objeto, así el render no entra en bucle.
 */
export function getIdentity(): Identity | null {
  if (!hydrated) {
    cached = read();
    hydrated = true;
  }
  return cached;
}

/** En el prerender del servidor todavía no hay identidad. */
export function getServerIdentity(): Identity | null {
  return null;
}

export function subscribeIdentity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Registra a quien entra. El nombre es el que ha escrito; el color, el que ha
 * elegido, o el que le toca por su nombre si no eligió ninguno.
 *
 * Se persiste para que una recarga no vuelva a preguntar —dentro de la misma
 * sesión de diseño eso sería un peaje, no una garantía—, pero si el navegador
 * no deja escribir, la identidad sigue valiendo para esta pestaña.
 */
export function saveIdentity(rawName: string, color?: string): Identity | null {
  const name = normalizeName(rawName);
  if (!name) return null;

  const identity: Identity = { name, color: color ?? colorForName(name) };
  cached = identity;
  hydrated = true;

  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    /* sin persistencia: la identidad vive lo que viva la pestaña */
  }

  emit();
  return identity;
}

/** Olvida quién eres, para poder volver a entrar con otro nombre. */
export function clearIdentity(): void {
  cached = null;
  hydrated = true;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  emit();
}

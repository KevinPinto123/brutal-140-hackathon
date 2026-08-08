import { COLORS, type UserColor } from "@/lib/constants";

export type Identity = { name: string; color: string };

const KEY = "brutal140.identity";

const NAMES = [
  "Diego",
  "Claudia",
  "Mateo",
  "Sofía",
  "Rafa",
  "Nadia",
  "Iván",
  "Lucía",
  "Bruno",
  "Vera",
];

const PALETTE: UserColor[] = ["blue", "violet", "green", "amber", "cyan"];

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/**
 * Identidad anónima estable por navegador. Portal ya mantiene un userId anónimo
 * persistente; esto solo le pone cara (nombre + color) para la UI de presencia.
 * Llamar únicamente en cliente (post-mount) para no romper la hidratación.
 */
export function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Identity;
  } catch {
    /* localStorage bloqueado: seguimos con una identidad efímera */
  }

  const identity: Identity = {
    name: pick(NAMES),
    color: COLORS[pick(PALETTE)],
  };

  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    /* noop */
  }

  return identity;
}

let cached: Identity | null = null;

/**
 * Snapshot estable de la identidad para `useSyncExternalStore`: devuelve
 * siempre el mismo objeto, así el render de cliente no entra en bucle.
 */
export function getIdentity(): Identity {
  cached ??= loadIdentity();
  return cached;
}

/** En el prerender del servidor todavía no hay identidad. */
export function getServerIdentity(): Identity | null {
  return null;
}

/** La identidad no cambia durante la sesión: nunca hay que notificar. */
export function subscribeIdentity(): () => void {
  return () => {};
}

/** Color determinista para un peer que aún no publicó metadata. */
export function fallbackColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[PALETTE[h % PALETTE.length]];
}

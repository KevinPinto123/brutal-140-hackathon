import { Portal } from "@portalsdk/core";

/**
 * Cliente Portal único para toda la app.
 *
 * Modo anónimo: solo la clave pública. El SDK acuña y persiste su propia
 * credencial anónima, así que no hace falta endpoint de token para arrancar.
 * La construcción es síncrona y pasiva — no hay red hasta el primer acquire().
 */
const apiKey = process.env.NEXT_PUBLIC_PORTAL_KEY ?? "";

export const PORTAL_CONFIGURED = apiKey.startsWith("pk_");

export const portal = new Portal({ apiKey });

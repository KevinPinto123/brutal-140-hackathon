import { ROOM_CHANNEL } from "./events";

/**
 * Publicación server-side sobre Portal con la clave secreta.
 * Da a El Arquitecto una identidad estable (`ai_architect`) en el log persistente
 * sin que la `sk_` salga jamás del servidor.
 *
 * Sirve a los dos canales: el de estado (`ROOM_CHANNEL`) y el de señales
 * (`SIGNAL_CHANNEL`), que recibe el cursor fantasma del agente.
 */
const API = process.env.PORTAL_API_URL ?? "https://api.useportal.co";

type Publish = {
  /** Discriminador del envelope (`EVT.*`). */
  type: string;
  content: unknown;
  /** Identidad del emisor; el API la exige en publicaciones server-side. */
  senderId: string;
};

export function portalConfigured() {
  return (
    !!process.env.PORTAL_SECRET?.startsWith("sk_") &&
    !!process.env.NEXT_PUBLIC_PORTAL_KEY?.startsWith("pk_")
  );
}

export async function publish(message: Publish, channel = ROOM_CHANNEL) {
  const res = await fetch(`${API}/v1/channels/${channel}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.PORTAL_SECRET}`,
      "x-portal-key": process.env.NEXT_PUBLIC_PORTAL_KEY ?? "",
      "content-type": "application/json",
    },
    body: JSON.stringify(message),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Portal publish ${res.status}: ${await res.text()}`);
  }

  return (await res.json()) as { id: string; seq?: number; timestamp: number };
}

/** Publica en serie: el orden de llegada importa para la narrativa del agente. */
export async function publishAll(messages: Publish[], channel = ROOM_CHANNEL) {
  for (const message of messages) {
    await publish(message, channel);
  }
}

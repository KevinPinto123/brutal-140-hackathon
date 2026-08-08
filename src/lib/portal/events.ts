import { ROOM_ID } from "@/lib/constants";
import type { Entity } from "@/lib/entities";

/** Estado durable de la sala: su historial ES la geometría compartida. */
export const ROOM_CHANNEL = ROOM_ID;

/**
 * Canal aparte para señales de alta frecuencia (cursores y arrastres).
 *
 * El SDK descarta los mensajes efímeros entrantes (`ingest()`: "incoming
 * ephemeral messages are not modeled … dropped here"), así que la única difusión
 * fiable es el mensaje persistente. Separarlos evita que 8 señales por segundo
 * expulsen la geometría de la ventana de historial; este canal se abre siempre
 * con `history: "none"`, así que un cliente nuevo no hereda ruido.
 */
export const SIGNAL_CHANNEL = `${ROOM_ID}_signals`;

/** Discriminadores de envelope (`Message.type`). */
export const EVT = {
  /** Canal de estado — reconstruyen la sala al recargar. */
  chat: "chat",
  entity: "entity.upsert",
  entityRemove: "entity.remove",
  geometry: "geometry.correction",
  lock: "state.lock",
  reset: "state.reset",
  sun: "sun.set",
  /** Canal de señales — alta frecuencia, sin historial. */
  cursor: "cursor",
  drag: "entity.drag",
  camera: "camera",
  sunDrag: "sun",
} as const;

export type ChatEvent = {
  text: string;
  name: string;
  color: string;
};

/** Presencia física: el cursor vive en la malla (x, y, z), no en píxeles. */
export type CursorEvent = {
  x: number;
  y: number;
  z: number;
  name: string;
  color: string;
  status: string;
  /** Volumen que este peer tiene agarrado ahora mismo, si lo hay. */
  holding?: string | null;
};

/**
 * Hacia dónde mira un peer. El README pide que los demás vean «dónde está
 * mirando» su equipo, así que la cámara viaja como una señal más: el ojo y el
 * punto al que apunta bastan para reconstruir su encuadre en cualquier cliente.
 */
export type CameraEvent = {
  eye: [number, number, number];
  target: [number, number, number];
  name: string;
  color: string;
};

/** Alta o modificación de un volumen. El payload es la entidad completa. */
export type EntityEvent = Entity;

export type EntityRemoveEvent = { id: string };

/** Traslación en vivo mientras se arrastra (no se persiste). */
export type DragEvent = { id: string; x: number; z: number };

/** Corrección espacial emitida por El Arquitecto (IA). */
export type GeometryEvent = {
  entity: string;
  to: { x: number; y: number; z: number };
  rotation?: number;
  reason: string;
};

/**
 * Cierre del diseño: el paso final del flujo de la demo. Congela la edición
 * para toda la sala, así que viaja por el canal durable — quien recargue o
 * entre tarde tiene que ver el laboratorio bloqueado, no editable.
 */
export type LockEvent = { locked: boolean; name: string };

/** Vaciado de la parcela. Una sola línea en el log en vez de N bajas. */
export type ResetEvent = { name: string };

/**
 * Hora solar de la sala. El brief exige juzgar la luz natural, y una luz que
 * cada cliente evalúa a su hora no se puede discutir en equipo: la posición del
 * sol es estado compartido y viaja por el canal durable, como la geometría.
 */
export type SunEvent = { hour: number; name: string };

/** La misma hora mientras se arrastra el control: en vivo y sin persistir. */
export type SunDragEvent = { hour: number };

export type RoomEvent =
  | ChatEvent
  | CursorEvent
  | CameraEvent
  | EntityEvent
  | EntityRemoveEvent
  | DragEvent
  | GeometryEvent
  | LockEvent
  | ResetEvent
  | SunEvent
  | SunDragEvent;

/** Cursor remoto ya materializado en el cliente. */
export type LiveCursor = CursorEvent & { id: string; at: number };

/** Encuadre remoto ya materializado en el cliente. */
export type LiveCamera = CameraEvent & { id: string; at: number };

/** Participante de la sala, unificando presencia + último cursor visto. */
export type RoomParticipant = {
  id: string;
  name: string;
  color: string;
  status: string;
  isSelf: boolean;
};

/** Identidad fija del agente: lo publica el servidor con la clave secreta. */
export const AI_SENDER = "ai_architect";

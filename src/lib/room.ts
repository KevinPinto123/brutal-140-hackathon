import { clampToPlot, type Entity } from "@/lib/entities";
import {
  EVT,
  type EntityEvent,
  type EntityRemoveEvent,
  type GeometryEvent,
  type LockEvent,
  type ResetEvent,
  type SunEvent,
} from "@/lib/portal/events";
import { NOON, clampHour } from "@/lib/sun";

/**
 * El pliegue del log.
 *
 * En BRUTAL-140 no hay base de datos: el historial del canal durable ES el
 * estado de la sala. Esta función es la única que sabe traducir esa lista de
 * mensajes en un laboratorio, y vive fuera de React por dos razones: se puede
 * probar sin navegador, y la cinta del tiempo necesita plegar el mismo log
 * hasta un punto intermedio, no solo hasta el final.
 */

/** Lo mínimo que el pliegue necesita de un mensaje: nada del SDK. */
export type LogEntry = { type: string; content: unknown; timestamp: number };

export type RoomState = {
  entities: Entity[];
  locked: boolean;
  /** Quién tocó el cierre por última vez, lo abriera o lo cerrara. */
  lockedBy: string | null;
  hour: number;
  /**
   * Arranque del diseño que se está viendo: el último vaciado de la parcela o,
   * a falta de él, el mensaje más antiguo que queda en la ventana. Tras un
   * truncado del historial es una cota inferior, nunca una fecha inventada.
   */
  since: number;
  /**
   * Índice del mensaje más antiguo del que todavía depende este estado. Si el
   * historial lo deja caer, el laboratorio pierde piezas de verdad: es la
   * métrica que dispara la compactación.
   */
  oldestNeeded: number;
};

const EMPTY: RoomState = {
  entities: [],
  locked: false,
  lockedBy: null,
  hour: NOON,
  since: 0,
  oldestNeeded: 0,
};

/**
 * Reduce el log a un estado de sala. `upTo` corta el pliegue en un punto
 * intermedio (exclusivo), que es como se mira el pasado sin tocar el presente.
 */
export function foldRoom(log: readonly LogEntry[], upTo = log.length): RoomState {
  const end = Math.min(Math.max(upTo, 0), log.length);
  if (!end) return { ...EMPTY, since: log[0]?.timestamp ?? 0 };

  /** Cada entidad recuerda de qué mensaje salió: eso es lo que hay que conservar. */
  const map = new Map<string, { entity: Entity; from: number }>();
  let frozen = false;
  let lockedBy: string | null = null;
  let lockFrom = -1;
  let hour = NOON;
  let hourFrom = -1;
  let since = log[0].timestamp;

  for (let i = 0; i < end; i++) {
    const m = log[i];

    if (m.type === EVT.lock) {
      const l = m.content as LockEvent;
      frozen = l.locked;
      lockedBy = l.name;
      lockFrom = i;
      continue;
    }

    // El sol se pliega fuera del congelado a propósito: mover la hora no es
    // editar el diseño, es mirarlo. Un laboratorio cerrado se sigue pudiendo
    // estudiar a las ocho de la mañana.
    if (m.type === EVT.sun) {
      hour = clampHour((m.content as SunEvent).hour);
      hourFrom = i;
      continue;
    }

    // Con el diseño cerrado, toda geometría posterior se ignora: una corrección
    // del agente que llegue tarde no despierta un estado ya congelado. La única
    // excepción es la reescritura idéntica —lo que emite la compactación—, que
    // por definición no cambia nada y en cambio salva al laboratorio de que el
    // historial se lleve sus altas por antigüedad.
    if (frozen) {
      if (m.type === EVT.entity) {
        const e = m.content as EntityEvent;
        const current = map.get(e.id);
        if (current && identical(current.entity, e)) map.set(e.id, { entity: e, from: i });
      }
      continue;
    }

    if (m.type === EVT.entity) {
      const e = m.content as EntityEvent;
      map.set(e.id, { entity: e, from: i });
    } else if (m.type === EVT.entityRemove) {
      map.delete((m.content as EntityRemoveEvent).id);
    } else if (m.type === EVT.reset) {
      map.clear();
      since = m.timestamp;
    } else if (m.type === EVT.geometry) {
      const g = m.content as GeometryEvent;
      const current = map.get(g.entity);
      if (current) {
        map.set(g.entity, {
          entity: clampToPlot({
            ...current.entity,
            x: g.to.x,
            y: g.to.y,
            z: g.to.z,
            rotation: g.rotation ?? current.entity.rotation,
          }),
          from: i,
        });
      }
    }
  }

  // De qué mensajes depende lo que acabamos de calcular. El vaciado no entra:
  // si cae del historial, lo que quedó vivo sigue siendo exactamente esto.
  let oldestNeeded = end;
  for (const { from } of map.values()) oldestNeeded = Math.min(oldestNeeded, from);
  if (lockFrom >= 0) oldestNeeded = Math.min(oldestNeeded, lockFrom);
  if (hourFrom >= 0) oldestNeeded = Math.min(oldestNeeded, hourFrom);

  return {
    entities: [...map.values()].map((v) => v.entity),
    locked: frozen,
    lockedBy,
    hour,
    since,
    oldestNeeded,
  };
}

/**
 * Dos altas describen el mismo volumen. Se compara campo a campo y no por
 * JSON: el orden de las claves depende de por dónde haya pasado la entidad.
 */
export function identical(a: Entity, b: Entity) {
  return (
    a.kind === b.kind &&
    a.material === b.material &&
    a.x === b.x &&
    a.y === b.y &&
    a.z === b.z &&
    a.rotation === b.rotation &&
    a.w === b.w &&
    a.d === b.d &&
    a.h === b.h
  );
}

/** Un paso de la cinta del tiempo: el estado justo después de ese mensaje. */
export type Moment = {
  /** Corte para `foldRoom`: exclusivo, por eso es el índice + 1. */
  upTo: number;
  at: number;
  text: string;
};

/** Solo estos tipos mueven el laboratorio; el resto es conversación. */
const MUTATORS = new Set<string>([
  EVT.entity,
  EVT.entityRemove,
  EVT.geometry,
  EVT.reset,
  EVT.lock,
]);

/**
 * Los hitos del diseño, en orden. Cada uno se etiqueta con lo que hizo, para
 * que recorrer la cinta se lea como la crónica de la sesión.
 */
export function timeline(log: readonly LogEntry[]): Moment[] {
  const names = new Map<string, string>();
  const out: Moment[] = [];

  for (let i = 0; i < log.length; i++) {
    const m = log[i];
    if (!MUTATORS.has(m.type)) continue;

    let text = "";
    if (m.type === EVT.entity) {
      const e = m.content as EntityEvent;
      // Un upsert que repite un id ya visto es una reubicación, no un alta.
      text = `${names.has(e.id) ? "Mueve" : "Coloca"} ${e.label}`;
      names.set(e.id, e.label);
    } else if (m.type === EVT.entityRemove) {
      const id = (m.content as EntityRemoveEvent).id;
      text = `Retira ${names.get(id) ?? id}`;
    } else if (m.type === EVT.geometry) {
      const g = m.content as GeometryEvent;
      text = `El Arquitecto corrige ${names.get(g.entity) ?? g.entity}`;
    } else if (m.type === EVT.reset) {
      text = `${(m.content as ResetEvent).name} vacía la parcela`;
      names.clear();
    } else {
      const l = m.content as LockEvent;
      text = l.locked ? `${l.name} bloquea el diseño` : `${l.name} reabre el diseño`;
    }

    out.push({ upTo: i + 1, at: m.timestamp, text });
  }

  return out;
}

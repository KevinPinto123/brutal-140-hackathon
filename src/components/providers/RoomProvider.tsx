"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  AggregatePresence,
  ChannelStatus,
  DetailedPresence,
  Message,
} from "@portalsdk/core";
import { PortalProvider, useChannel } from "@portalsdk/react";
import { portal } from "@/lib/portal/client";
import type { Entity } from "@/lib/entities";
import {
  AI_SENDER,
  EVT,
  ROOM_CHANNEL,
  SIGNAL_CHANNEL,
  type CameraEvent,
  type ChatEvent,
  type CursorEvent,
  type DragEvent,
  type EntityEvent,
  type GeometryEvent,
  type LiveCamera,
  type LiveCursor,
  type RoomEvent,
  type RoomParticipant,
  type SunDragEvent,
} from "@/lib/portal/events";
import { foldRoom, timeline, type Moment } from "@/lib/room";
import { clampHour, sunAt, type SunState } from "@/lib/sun";
import type { Vec3 } from "@/lib/views";
import {
  fallbackColor,
  getIdentity,
  getServerIdentity,
  subscribeIdentity,
  type Identity,
} from "@/lib/portal/identity";

/** Cuánto vive una señal sin refresco antes de desaparecer. */
const CURSOR_TTL = 8_000;
const DRAG_TTL = 2_000;
/** Lo que sobrevive una hora solar en vuelo si el emisor deja de refrescarla. */
const SUN_TTL = 2_500;
/** La cámara se queda quieta al mirar: aguanta más que el puntero. */
const CAMERA_TTL = 30_000;
/** Techo de publicación de señales continuas: ~8 Hz. */
const SIGNAL_INTERVAL = 120;
/** Y solo si el puntero se movió algo apreciable (metros). */
const SIGNAL_EPSILON = 0.08;
/** La órbita recorre mucho más camino que el puntero; su umbral es mayor. */
const CAMERA_EPSILON = 0.2;
/**
 * Backfill al conectar. Es el número medido, no el deseado: Portal entrega
 * como mucho 100 mensajes por mucho que se le pidan (comprobado pidiendo 30,
 * 100, 200 y 500 → 30, 100, 100, 100). Pedir 200 aquí solo serviría para que
 * el techo de la sala pareciera el doble de alto de lo que es.
 */
const HISTORY = 100;
/**
 * Cuando el estado depende de mensajes más viejos que esto, el anfitrión
 * reescribe el laboratorio. El margen que queda hasta HISTORY es el colchón
 * contra el truncado: quien recargue solo recibe los últimos HISTORY mensajes,
 * así que en cuanto la profundidad los pasara, su parcela llegaría incompleta.
 */
const COMPACT_AT = 60;
/** Y no vuelve a intentarlo antes de esto, pase lo que pase con los envíos. */
const COMPACT_COOLDOWN = 15_000;

/**
 * Estado mutable no reactivo. Vive fuera de React a propósito: hay un único
 * RoomProvider por documento y nada de esto debe provocar un render.
 */
const local = {
  selfId: undefined as string | undefined,
  signalId: undefined as string | undefined,
  lastCursorAt: 0,
  lastCursor: { x: 0, y: 0, z: 0 },
  /** Último volumen agarrado: se reenvía al soltar aunque el puntero no se mueva. */
  holding: null as string | null,
  lastDragAt: 0,
  lastCameraAt: 0,
  lastEye: [0, 0, 0] as Vec3,
  lastSunAt: 0,
  /** Compactación en vuelo y último intento, para no dispararla en cascada. */
  compacting: false,
  compactedAt: 0,
};

type Ghost = { x: number; z: number; at: number };

type RoomValue = {
  status: ChannelStatus;
  identity: Identity | null;
  meId: string | undefined;
  /** Este cliente es el anfitrión: le tocan las tareas de una sola vez. */
  isHost: boolean;
  participants: RoomParticipant[];
  cursors: LiveCursor[];
  /** Hacia dónde mira cada peer, para poder adoptar su encuadre. */
  cameras: Record<string, LiveCamera>;
  chat: Message<ChatEvent>[];
  /** Geometría compartida, ya con los arrastres en vuelo aplicados. */
  entities: Entity[];
  corrections: Message<GeometryEvent>[];
  /** Diseño cerrado (o mirando al pasado): nadie edita. */
  locked: boolean;
  /** Quién lo cerró, para poder decirlo en la HUD. */
  lockedBy: string | null;
  /** El sol de la sala: todos juzgan la luz en el mismo instante del día. */
  sun: SunState;
  /** Arranque del diseño que se está viendo: el reloj de sesión sale de aquí. */
  since: number;
  /**
   * Salud del historial. `depth` es de cuántos mensajes atrás depende el estado
   * y `cap` dónde empieza a truncarse: mientras el primero no alcance al
   * segundo, la sala no puede perder un volumen.
   */
  log: { size: number; depth: number; cap: number };
  /** Hitos del diseño, en orden, para recorrer su historia. */
  moments: Moment[];
  /** Corte del log que se está mirando, o null si es el presente. */
  replayAt: number | null;
  replaying: boolean;
  showMoment: (upTo: number | null) => void;
  sendChat: (text: string) => void;
  publishCursor: (
    x: number,
    y: number,
    z: number,
    status?: string,
    holding?: string | null,
  ) => void;
  /** Reemite el cursor con otro volumen agarrado, sin esperar a que se mueva. */
  publishHolding: (holding: string | null) => void;
  publishCamera: (eye: Vec3, target: Vec3) => void;
  upsertEntity: (entity: Entity) => void;
  removeEntity: (id: string) => void;
  publishDrag: (id: string, x: number, z: number) => void;
  /** Mueve el sol en vivo para toda la sala mientras se arrastra el control. */
  previewSun: (hour: number) => void;
  /** Fija la hora solar en el log: quien entre después la hereda. */
  setSun: (hour: number) => void;
  setLocked: (locked: boolean) => void;
  resetPlot: () => void;
  /** Cierra la conexión: la sala sigue viva, este cliente se va de verdad. */
  leave: () => void;
};

const RoomContext = createContext<RoomValue | null>(null);

export function useRoom(): RoomValue {
  const value = useContext(RoomContext);
  if (!value) throw new Error("useRoom() debe usarse dentro de <RoomProvider>");
  return value;
}

function RoomChannel({ children, onLeave }: { children: React.ReactNode; onLeave: () => void }) {
  const [cursors, setCursors] = useState<Record<string, LiveCursor>>({});
  const [cameras, setCameras] = useState<Record<string, LiveCamera>>({});
  const [drags, setDrags] = useState<Record<string, Ghost>>({});
  /** Hora solar en vuelo (de cualquiera), aún sin confirmar en el log. */
  const [sunDraft, setSunDraft] = useState<{ hour: number; at: number } | null>(null);

  // Identidad solo en cliente (localStorage): en el prerender es null, así que
  // la hidratación coincide y el snapshot real entra en el primer render de cliente.
  const identity = useSyncExternalStore<Identity | null>(
    subscribeIdentity,
    getIdentity,
    getServerIdentity,
  );

  // Canal de estado: su historial se reduce a la geometría compartida.
  const { messages, send, status, presence, me, setMetadata } = useChannel<RoomEvent>({
    channelId: ROOM_CHANNEL,
    history: HISTORY,
    onMessage: (msg) => {
      if (msg.sender.id === local.selfId) return;

      // La posición definitiva ya viaja en el mensaje persistente: el fantasma sobra.
      if (msg.type === EVT.entity || msg.type === EVT.geometry) {
        const id =
          msg.type === EVT.entity
            ? (msg.content as EntityEvent).id
            : (msg.content as GeometryEvent).entity;
        setDrags((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
  });

  // Canal de señales: cursores y arrastres, sin historial ni reducción.
  const signals = useChannel<RoomEvent>({
    channelId: SIGNAL_CHANNEL,
    history: "none",
    onMessage: (msg) => {
      if (msg.sender.id === local.signalId) return;

      if (msg.type === EVT.cursor) {
        const c = msg.content as CursorEvent;
        setCursors((prev) => ({
          ...prev,
          [msg.sender.id]: { ...c, id: msg.sender.id, at: Date.now() },
        }));
        return;
      }

      if (msg.type === EVT.camera) {
        const c = msg.content as CameraEvent;
        setCameras((prev) => ({
          ...prev,
          [msg.sender.id]: { ...c, id: msg.sender.id, at: Date.now() },
        }));
        return;
      }

      if (msg.type === EVT.drag) {
        const d = msg.content as DragEvent;
        setDrags((prev) => ({ ...prev, [d.id]: { x: d.x, z: d.z, at: Date.now() } }));
        return;
      }

      if (msg.type === EVT.sunDrag) {
        const s = msg.content as SunDragEvent;
        setSunDraft({ hour: clampHour(s.hour), at: Date.now() });
      }
    },
  });

  const sendSignal = signals.send;

  /**
   * Todo el estado compartido —geometría, cierre y hora— sale de un único
   * pliegue del log, así que quien entra tarde o recarga lo hereda sin negociar
   * nada. Va antes que las acciones porque todas ellas lo miran.
   *
   * `replayAt` corta ese mismo pliegue en un punto anterior: la cinta del
   * tiempo no mantiene una copia del pasado, es este reducer parado antes.
   */
  const [replayAt, setReplayAt] = useState<number | null>(null);
  const live = useMemo(() => foldRoom(messages), [messages]);
  const past = useMemo(
    () => (replayAt === null ? null : foldRoom(messages, replayAt)),
    [messages, replayAt],
  );
  const room = past ?? live;
  const replaying = past !== null;
  const moments = useMemo(() => timeline(messages), [messages]);

  /**
   * Mirar el pasado es de solo lectura, y eso ya lo sabe expresar el cierre:
   * reutilizarlo hace que la paleta, el arrastre y la autoevaluación del agente
   * lo entiendan sin tocar una línea de ellos.
   */
  const locked = live.locked || replaying;

  /**
   * La hora solar queda fuera de la cinta a propósito —mover el sol no es
   * editar el diseño, es mirarlo—, así que se puede estudiar cualquier momento
   * del pasado a cualquier hora del día. Por lo mismo tampoco la frena el
   * cierre. Lo que se arrastra ahora pisa a lo confirmado, venga de quien venga.
   */
  const sun = useMemo(
    () => sunAt(sunDraft?.hour ?? live.hour),
    [sunDraft?.hour, live.hour],
  );

  useEffect(() => {
    local.selfId = me?.id;
  }, [me?.id]);

  useEffect(() => {
    local.signalId = signals.me?.id;
  }, [signals.me?.id]);

  // Publicamos nombre/color como metadata de presencia (presentación, no authz).
  useEffect(() => {
    if (!identity) return;
    setMetadata({ name: identity.name, color: identity.color });
  }, [identity, setMetadata]);

  // Barrido de señales caducas (una desconexión brusca no emite "leave" al instante).
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => prune(prev, now - CURSOR_TTL));
      setCameras((prev) => prune(prev, now - CAMERA_TTL));
      setDrags((prev) => prune(prev, now - DRAG_TTL));
      // Al soltar el control, el borrador aguanta lo que tarda su mensaje
      // durable en volver; para entonces ambos valores ya coinciden y retirarlo
      // no se nota.
      setSunDraft((prev) => (prev && prev.at > now - SUN_TTL ? prev : null));
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

  const publishCursor = useCallback(
    (
      x: number,
      y: number,
      z: number,
      cursorStatus = "explorando",
      holding: string | null = null,
    ) => {
      if (!identity) return;
      const now = Date.now();
      // Agarrar o soltar un volumen es un cambio de estado, no ruido de puntero:
      // pasa la puerta aunque el ratón esté quieto.
      const grabbed = holding !== local.holding;
      if (!grabbed) {
        if (now - local.lastCursorAt < SIGNAL_INTERVAL) return;
        const moved = Math.hypot(x - local.lastCursor.x, z - local.lastCursor.z);
        if (moved < SIGNAL_EPSILON) return;
      }
      local.lastCursorAt = now;
      local.lastCursor = { x, y, z };
      local.holding = holding;
      void sendSignal({
        type: EVT.cursor,
        content: {
          x: round(x),
          y: round(y),
          z: round(z),
          name: identity.name,
          color: identity.color,
          status: cursorStatus,
          holding,
        },
      }).catch(noop);
    },
    [sendSignal, identity],
  );

  /**
   * La selección puede cambiar sin que el puntero se mueva (teclado, panel), y
   * el README quiere que se vea «qué está tocando» el equipo al momento: se
   * reemite el cursor desde su última posición conocida.
   */
  const publishHolding = useCallback(
    (holding: string | null) => {
      const { x, y, z } = local.lastCursor;
      publishCursor(x, y, z, holding ? "seleccionando" : "explorando", holding);
    },
    [publishCursor],
  );

  /**
   * El encuadre propio, difundido como una señal más. Con el ojo y el objetivo
   * cualquier cliente reconstruye la mirada de este peer sin compartir cámara.
   */
  const publishCamera = useCallback(
    (eye: Vec3, target: Vec3) => {
      if (!identity) return;
      const now = Date.now();
      if (now - local.lastCameraAt < SIGNAL_INTERVAL) return;
      const moved = Math.hypot(
        eye[0] - local.lastEye[0],
        eye[1] - local.lastEye[1],
        eye[2] - local.lastEye[2],
      );
      if (moved < CAMERA_EPSILON) return;
      local.lastCameraAt = now;
      local.lastEye = eye;
      void sendSignal({
        type: EVT.camera,
        content: {
          eye: eye.map(round) as Vec3,
          target: target.map(round) as Vec3,
          name: identity.name,
          color: identity.color,
        },
      }).catch(noop);
    },
    [sendSignal, identity],
  );

  const publishDrag = useCallback(
    (id: string, x: number, z: number) => {
      const now = Date.now();
      if (now - local.lastDragAt < SIGNAL_INTERVAL) return;
      local.lastDragAt = now;
      void sendSignal({ type: EVT.drag, content: { id, x: round(x), z: round(z) } }).catch(noop);
    },
    [sendSignal],
  );

  /**
   * Arrastrar el sol mueve las sombras de todos a la vez. Se publica con el
   * mismo techo que el resto de señales y se aplica también en local, para que
   * quien arrastra vea exactamente lo que están viendo los demás.
   */
  const previewSun = useCallback(
    (hour: number) => {
      const h = clampHour(hour);
      const now = Date.now();
      setSunDraft({ hour: h, at: now });
      if (now - local.lastSunAt < SIGNAL_INTERVAL) return;
      local.lastSunAt = now;
      void sendSignal({ type: EVT.sunDrag, content: { hour: h } }).catch(noop);
    },
    [sendSignal],
  );

  const setSun = useCallback(
    (hour: number) => {
      const h = clampHour(hour);
      setSunDraft({ hour: h, at: Date.now() });
      void send({
        type: EVT.sun,
        content: { hour: h, name: identity?.name ?? "Alguien" },
      }).catch(noop);
    },
    [send, identity],
  );

  // El bloqueo se comprueba aquí, en el único punto por el que la geometría
  // entra al log: así ninguna superficie de la UI puede saltárselo por olvido.
  const upsertEntity = useCallback(
    (entity: Entity) => {
      if (locked) return;
      void send({ type: EVT.entity, content: entity }).catch(noop);
    },
    [send, locked],
  );

  const removeEntity = useCallback(
    (id: string) => {
      if (locked) return;
      void send({ type: EVT.entityRemove, content: { id } }).catch(noop);
    },
    [send, locked],
  );

  // No se gobierna con `locked` porque reabrir es justo lo contrario, pero sí
  // con la cinta: nadie cierra la sala desde una vista del pasado.
  const setLocked = useCallback(
    (next: boolean) => {
      if (replaying) return;
      void send({
        type: EVT.lock,
        content: { locked: next, name: identity?.name ?? "Alguien" },
      }).catch(noop);
    },
    [send, identity, replaying],
  );

  /**
   * Viajar en el tiempo es una decisión personal: si se difundiera, rebobinar
   * arrastraría también a quien está colocando un módulo ahora mismo. Cada uno
   * mira la historia por su cuenta y vuelve al presente cuando quiere.
   */
  const showMoment = useCallback(
    (upTo: number | null) => setReplayAt(upTo === null ? null : Math.max(0, upTo)),
    [],
  );

  /** Vacía la parcela de una sola vez; el reductor lo trata como un corte. */
  const resetPlot = useCallback(() => {
    if (locked) return;
    void send({ type: EVT.reset, content: { name: identity?.name ?? "Alguien" } }).catch(noop);
  }, [send, identity, locked]);

  const sendChat = useCallback(
    (text: string) => {
      void send({
        type: EVT.chat,
        content: {
          text,
          name: identity?.name ?? "Anónimo",
          color: identity?.color ?? "#8b5cf6",
        },
      }).catch(noop);
    },
    [send, identity],
  );

  const chat = useMemo(
    () => messages.filter((m) => m.type === EVT.chat) as Message<ChatEvent>[],
    [messages],
  );

  const corrections = useMemo(
    () => messages.filter((m) => m.type === EVT.geometry) as Message<GeometryEvent>[],
    [messages],
  );

  /** El log persistente ES el estado: se reduce en orden de llegada. */
  /**
   * Los arrastres en vuelo solo pisan al presente: el pasado ya pasó, y
   * dibujarle encima el fantasma de otro peer sería mentir sobre lo que hubo.
   */
  const entities = useMemo(
    () =>
      replaying
        ? room.entities
        : room.entities.map((e) => {
            const ghost = drags[e.id];
            return ghost ? { ...e, x: ghost.x, z: ghost.z } : e;
          }),
    [room.entities, drags, replaying],
  );

  const participants = useMemo<RoomParticipant[]>(() => {
    const rows = detailedParticipants(presence).map((p) => {
      const meta = p.metadata ?? {};
      const live = cursors[p.id];
      const isSelf = p.id === me?.id;
      return {
        id: p.id,
        name:
          (typeof meta.name === "string" && meta.name) ||
          (isSelf ? identity?.name : undefined) ||
          "Invitado",
        color:
          (typeof meta.color === "string" && meta.color) ||
          (isSelf ? identity?.color : undefined) ||
          fallbackColor(p.id),
        status: isSelf ? "Tú" : (live?.status ?? "En línea"),
        isSelf,
      };
    });

    // El Arquitecto publica por HTTP, así que no abre sesión de presencia. Entra
    // en la lista mientras su cursor siga vivo: el README lo quiere como un
    // miembro más de la sala, no como un servicio externo.
    const agent = cursors[AI_SENDER];
    if (agent) {
      rows.push({
        id: AI_SENDER,
        name: agent.name,
        color: agent.color,
        status: agent.status,
        isSelf: false,
      });
    }

    return rows;
  }, [presence, cursors, me?.id, identity]);

  const liveCursors = useMemo(() => Object.values(cursors), [cursors]);

  /**
   * Anfitrión de la sala: el id humano más bajo. Es una elección determinista y
   * sin negociación —todos los clientes llegan a la misma conclusión mirando el
   * mismo roster—, y sirve para que lo que debe ocurrir una sola vez no se
   * multiplique por cada pestaña abierta. El agente no puede ser anfitrión: no
   * abre sesión de presencia, publica por HTTP.
   */
  const isHost = useMemo(() => {
    const humans = participants.filter((p) => p.id !== AI_SENDER).map((p) => p.id);
    return humans.length === 0 || [...humans].sort()[0] === me?.id;
  }, [participants, me?.id]);

  /**
   * Compactación del historial.
   *
   * El canal solo entrega los últimos HISTORY mensajes. Como aquí el log ES el
   * estado, cuando los más viejos empiezan a caer se llevan por delante el alta
   * de los volúmenes colocados al principio: quien recargue verá un laboratorio
   * incompleto y no habrá ningún error en ninguna consola. La cura es que el
   * anfitrión reescriba el estado vivo como mensajes corrientes —los mismos
   * upserts que emitiría un humano— antes de que eso ocurra. El pliegue ya es
   * idempotente sobre ellos, así que nadie ve moverse nada; simplemente el
   * estado deja de depender de mensajes remotos.
   *
   * Se reescribe en vez de publicar una instantánea porque el payload de Portal
   * son 2 KB: un laboratorio entero no cabe en un mensaje, pero cabe de sobra
   * repartido en los suyos.
   */
  useEffect(() => {
    if (!isHost || local.compacting) return;
    if (messages.length - live.oldestNeeded <= COMPACT_AT) return;
    if (Date.now() - local.compactedAt < COMPACT_COOLDOWN) return;
    local.compacting = true;
    local.compactedAt = Date.now();

    void (async () => {
      try {
        // Primero la geometría; el cierre va al final, o el pliegue congelaría
        // las altas que acabamos de reescribir.
        for (const entity of live.entities) {
          await send({ type: EVT.entity, content: entity });
        }
        // La hora se reemite siempre: si se omitiera cuando coincide con el
        // mediodía, un `sun.set` viejo que sobreviviera al truncado ganaría.
        await send({
          type: EVT.sun,
          content: { hour: live.hour, name: identity?.name ?? "Compactación" },
        });
        if (live.lockedBy) {
          await send({
            type: EVT.lock,
            content: { locked: live.locked, name: live.lockedBy },
          });
        }
      } catch (error) {
        console.error("[sala] no se pudo compactar el historial:", error);
      } finally {
        local.compacting = false;
      }
    })();
  }, [isHost, messages.length, live, send, identity]);

  const value = useMemo<RoomValue>(
    () => ({
      status,
      identity,
      meId: me?.id,
      isHost,
      participants,
      cursors: liveCursors,
      cameras,
      chat,
      entities,
      corrections,
      locked,
      lockedBy: live.lockedBy,
      sun,
      since: live.since,
      log: { size: messages.length, depth: messages.length - live.oldestNeeded, cap: HISTORY },
      moments,
      replayAt,
      replaying,
      showMoment,
      sendChat,
      publishCursor,
      publishHolding,
      publishCamera,
      upsertEntity,
      removeEntity,
      publishDrag,
      previewSun,
      setSun,
      setLocked,
      resetPlot,
      leave: onLeave,
    }),
    [
      status,
      identity,
      me?.id,
      isHost,
      participants,
      liveCursors,
      cameras,
      chat,
      entities,
      corrections,
      locked,
      live,
      sun,
      messages.length,
      moments,
      replayAt,
      replaying,
      showMoment,
      sendChat,
      publishCursor,
      publishHolding,
      publishCamera,
      upsertEntity,
      removeEntity,
      publishDrag,
      previewSun,
      setSun,
      setLocked,
      resetPlot,
      onLeave,
    ],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

const noop = () => {};
const round = (n: number) => Math.round(n * 100) / 100;

/** La presencia agregada no trae roster; solo la detallada lista participantes. */
function detailedParticipants(presence: DetailedPresence | AggregatePresence | undefined) {
  return presence?.kind === "detailed" ? presence.participants : [];
}

function prune<T extends { at: number }>(map: Record<string, T>, cutoff: number) {
  const next = Object.fromEntries(Object.entries(map).filter(([, v]) => v.at > cutoff));
  return Object.keys(next).length === Object.keys(map).length ? map : next;
}

/**
 * Provider raíz: cliente Portal (anónimo con pk_) + estado de la sala lab_140.
 *
 * Salir desmonta el canal, que es la única forma honesta de irse: se sueltan
 * las suscripciones y la presencia de este cliente cae para todos los demás.
 * El laboratorio no se toca —vive en el log— y volver a entrar lo reconstruye.
 */
export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [joined, setJoined] = useState(true);

  return (
    <PortalProvider client={portal}>
      {joined ? (
        <RoomChannel onLeave={() => setJoined(false)}>{children}</RoomChannel>
      ) : (
        <Lobby onJoin={() => setJoined(true)} />
      )}
    </PortalProvider>
  );
}

function Lobby({ onJoin }: { onJoin: () => void }) {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-ink">
      <div className="w-[420px] rounded-[4px] border border-line bg-panel px-8 py-9">
        <h1 className="text-[21px] font-bold leading-none tracking-[-0.02em] text-white">
          Has salido de la sesión
        </h1>
        <p className="mt-3.5 text-[12.5px] leading-[1.6] text-muted">
          Tu presencia ya no aparece en la sala. El laboratorio sigue donde estaba: vive
          en el historial de Portal, no en esta pestaña.
        </p>
        <button
          type="button"
          onClick={onJoin}
          className="mt-7 w-full rounded-[4px] border border-accent bg-accent px-4 py-3 text-[13px] leading-none text-white transition-colors hover:bg-accent-2"
        >
          Volver a entrar
        </button>
      </div>
    </main>
  );
}

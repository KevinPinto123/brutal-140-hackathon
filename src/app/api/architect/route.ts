import { NextResponse } from "next/server";
import { evaluate, type Verdict } from "@/lib/ai/architect";
import { AI_SENDER, EVT, SIGNAL_CHANNEL } from "@/lib/portal/events";
import { portalConfigured, publish } from "@/lib/portal/publish";
import type { Entity } from "@/lib/entities";

export const runtime = "nodejs";

const AI_NAME = "AI Architect";
const AI_COLOR = "#8b5cf6";
/** Waypoints del cursor fantasma mientras razona y mientras corrige. */
const GLIDE = 5;

type Body = {
  entities?: unknown;
  note?: unknown;
  /** true = además de opinar, mueve la geometría en la sala. */
  apply?: unknown;
  /** Hora solar que la sala está mirando; sin ella se juzga a mediodía. */
  hour?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.entities)) {
    return NextResponse.json({ error: "Falta `entities`" }, { status: 400 });
  }

  const entities = body.entities as Entity[];
  const note = typeof body.note === "string" ? body.note.slice(0, 400) : undefined;
  const apply = body.apply === true;
  const hour =
    typeof body.hour === "number" && Number.isFinite(body.hour) ? body.hour : undefined;

  const verdict = await evaluate(entities, note, hour);

  // Portal es opcional para razonar: sin claves el veredicto vuelve igual por HTTP
  // y el panel lo pinta; solo se pierde la difusión a los demás participantes.
  if (!portalConfigured()) {
    return NextResponse.json({ ...verdict, broadcast: false });
  }

  try {
    await broadcast(verdict, apply);
  } catch (error) {
    console.error("[architect] fallo al publicar en Portal:", error);
    return NextResponse.json({ ...verdict, broadcast: false });
  }

  return NextResponse.json({ ...verdict, broadcast: true, applied: apply });
}

/**
 * El agente se comporta como un participante más: primero su cursor volumétrico
 * viaja hasta la zona en conflicto, luego (si toca) emite las correcciones y
 * finalmente comenta en el chat de la sala.
 */
async function broadcast(verdict: Verdict, apply: boolean) {
  await glide({ x: 0, z: 0 }, verdict.focus, "analizando");

  if (apply) {
    let from = verdict.focus;
    for (const c of verdict.corrections) {
      await glide(from, { x: c.to.x, z: c.to.z }, "corrigiendo");
      await publish({ type: EVT.geometry, senderId: AI_SENDER, content: c });
      from = { x: c.to.x, z: c.to.z };
    }
  }

  await publish({
    type: EVT.chat,
    senderId: AI_SENDER,
    content: {
      text:
        apply && verdict.corrections.length
          ? `${verdict.message} Aplico ${verdict.corrections.length} corrección(es).`
          : verdict.message,
      name: AI_NAME,
      color: AI_COLOR,
    },
  });

  // El fantasma se apaga solo por TTL en los clientes; una última señal lo deja
  // aparcado sobre la zona intervenida.
  await cursor(verdict.focus.x, verdict.focus.z, "observando");
}

/** Interpola el cursor fantasma para que se vea *moverse*, no teletransportarse. */
async function glide(a: { x: number; z: number }, b: { x: number; z: number }, status: string) {
  for (let i = 1; i <= GLIDE; i++) {
    const t = i / GLIDE;
    await cursor(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, status);
    await sleep(70);
  }
}

/** Señal al canal de alta frecuencia: nunca entra en el historial de la sala. */
function cursor(x: number, z: number, status: string) {
  return publish(
    {
      type: EVT.cursor,
      senderId: AI_SENDER,
      content: {
        x: Math.round(x * 100) / 100,
        y: 0,
        z: Math.round(z * 100) / 100,
        name: AI_NAME,
        color: AI_COLOR,
        status,
      },
    },
    SIGNAL_CHANNEL,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

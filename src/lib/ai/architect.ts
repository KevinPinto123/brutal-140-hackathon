/**
 * El Arquitecto — evaluador espacial de BRUTAL-140.
 *
 * Recibe el estado compartido de la sala y devuelve correcciones en (x, y, z).
 * Si no hay clave de OpenAI cae a un evaluador heurístico determinista, para que
 * la demo nunca dependa de la red.
 */
import OpenAI from "openai";
import { PLOT } from "@/lib/constants";
import {
  clampToPlot,
  distance,
  extent,
  gapBetween,
  heatOf,
  HOT_KW,
  isHot,
  overlaps,
  toStatePayload,
  type Entity,
} from "@/lib/entities";
import { measureLight, type LightField } from "@/lib/light";
import { NOON, formatHour, sunAt, type SunState } from "@/lib/sun";

export type Correction = {
  entity: string;
  to: { x: number; y: number; z: number };
  rotation?: number;
  reason: string;
};

export type Verdict = {
  /** Lectura corta para el chat de la sala. */
  message: string;
  /** Titular para el panel SUGERENCIA DE IA. */
  headline: string;
  corrections: Correction[];
  analysis: { light: string; load: string; flow: string; acoustic: string };
  /** Dónde se planta el cursor fantasma mientras razona. */
  focus: { x: number; z: number };
  engine: "openai" | "heuristic";
};

const HX = PLOT.width / 2;
const HZ = PLOT.depth / 2;

/** Distancia máxima a un jardín para dar por ventilado un módulo caliente. */
const VENT_RADIUS = 4.5;
/** Por debajo de esta holgura, dos equipos se recalientan entre ellos. */
const CLUSTER_GAP = 1.2;
/** Losa con sol directo por debajo de la cual la luz es un conflicto. */
const LIGHT_TARGET = 78;
/** Puntos de losa que tiene que ganar una reubicación para merecer proponerse. */
const LIGHT_GAIN = 3;

const SYSTEM = `Eres "El Arquitecto", un agente autónomo que co-diseña en tiempo real una parcela BRUTALISTA de exactamente 7 m (eje X) por 20 m (eje Z), 140 m². El origen (0,0) es el centro: x va de -3.5 a 3.5, z va de -10 a 10. Altura libre máxima 4.5 m.

Programa: laboratorio modular de innovación (Robótica, Impresión 3D y High-Performance Computing).

Cada entidad trae "heat_kw", la potencia que disipa en continuo. Los módulos de programa (kind "hpc", "racks", "impresion", "robotica") son equipo, no arquitectura: calientan. Los jardines son sumideros de ventilación.

Parámetros de diseño NO negociables:
1. Estética brutalista, concreto expuesto.
2. Iluminación blanca: el estado incluye "luz_medida", un cálculo real de sombras sobre el plano de trabajo a la hora solar de la sala. Es un dato medido, NO lo inventes ni lo contradigas: razona sobre él y nombra al volumen que aparece como obstáculo. Además, las fachadas largas (x = ±3.5) deben quedar despejadas; un volumen opaco a menos de 0.9 m de una fachada larga bloquea la entrada de luz.
3. Térmica: todo módulo con heat_kw >= ${HOT_KW} necesita un jardín (kind "jardin") a menos de ${VENT_RADIUS} m de su centro. Si no lo tiene, la corrección es reubicarlo junto al jardín para ventilación cruzada, no apagarlo ni borrarlo.
4. Dos equipos con heat_kw > 0 separados por menos de ${CLUSTER_GAP} m forman un clúster térmico: sepáralos o lleva el más caliente al jardín.
5. Bioclimática: es obligatorio al menos un jardín interno. Si no existe ninguno, dilo en el mensaje: sin él no hay dónde ventilar.
6. Circulación: debe quedar un pasillo continuo de al menos 1.1 m de ancho en el eje Z.
7. Nada puede salirse de la parcela ni solaparse con otro volumen.

Prioridad cuando hay varios conflictos: térmico > solape > luz.

Devuelve SOLO un objeto JSON con esta forma exacta:
{
  "message": "una frase en español, tono de colega ingeniero, máx 140 caracteres",
  "headline": "la corrección principal en una frase, máx 120 caracteres",
  "corrections": [{"entity":"<id exacto>","to":{"x":<num>,"y":0,"z":<num>},"rotation":<0|90|180|270>,"reason":"<por qué, máx 90 caracteres>"}],
  "analysis": {"load":"<Segura|Revisar>","flow":"<Óptima|Media|Bloqueada>","acoustic":"<Alta|Media|Baja>"},
  "focus": {"x":<num>,"z":<num>}
}

Reglas de salida: usa únicamente ids que existan en el estado. Como máximo 2 correcciones, las más urgentes. Coordenadas con 2 decimales dentro de la parcela. Si el diseño ya cumple, devuelve "corrections": [].`;

export async function evaluate(
  entities: Entity[],
  note?: string,
  /** Hora solar de la sala. La luz se juzga cuando el equipo la está mirando. */
  hour?: number,
): Promise<Verdict> {
  const sun = sunAt(hour ?? NOON);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return heuristic(entities, sun);

  const client = new OpenAI({ apiKey: key });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          // El estado viaja con la forma que define el README del proyecto.
          content: JSON.stringify({
            ...toStatePayload(entities),
            luz_medida: lightPayload(measureLight(entities, sun)),
            diagnostico_local: findings(entities, measureLight(entities, sun)).map(
              (f) => `[${f.axis}] ${f.text}`,
            ),
            nota_del_equipo: note ?? null,
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return heuristic(entities, sun);

    return sanitize(JSON.parse(raw), entities, "openai", sun);
  } catch {
    // Un fallo del LLM no puede tumbar la demo en vivo.
    return heuristic(entities, sun);
  }
}

/** Lo que el LLM necesita saber de la luz, ya masticado y en su idioma. */
function lightPayload(field: LightField) {
  return {
    hora: formatHour(field.hour),
    de_noche: field.night,
    losa_con_sol_directo: `${field.pct}%`,
    m2_en_sombra: field.shaded,
    principal_obstaculo: field.worst
      ? { id: field.worst.id, m2_que_ensombrece: field.worst.area }
      : null,
  };
}

/** Cada conflicto sabe qué métrica degrada: el panel no miente por acumulación. */
type Axis = "light" | "flow" | "thermal" | "program";
type Finding = { axis: Axis; text: string };

/**
 * Orden de gravedad. Un laboratorio de 30 kW sin jardín tiene un problema
 * térmico, no un problema de luz: el primer conflicto que se lee tiene que ser
 * el que de verdad manda, y es también el orden en que se los damos al LLM.
 */
const AXIS_RANK: Record<Axis, number> = { thermal: 0, program: 1, flow: 2, light: 3 };

/** Diagnóstico determinista: alimenta al LLM y sirve de plan B. */
function findings(entities: Entity[], field: LightField): Finding[] {
  const out: Finding[] = [];
  const solid = entities.filter((e) => e.material !== "biophilic");
  const gardens = entities.filter((e) => e.kind === "jardin");
  const equipment = entities.filter((e) => heatOf(e) > 0);

  // La sombra medida, con nombre y metros cuadrados. De noche no hay nada que
  // reprochar a la geometría: la luz que falta la ponen las luminarias.
  if (!field.night && field.worst && field.pct < LIGHT_TARGET) {
    out.push({
      axis: "light",
      text: `${field.worst.id} deja ${field.worst.area} m² a la sombra a las ${formatHour(field.hour)}; solo el ${field.pct}% de la losa recibe sol directo`,
    });
  }

  for (const e of solid) {
    const { ex } = extent(e);
    const gap = HX - (Math.abs(e.x) + ex);
    if (gap < 0.9) {
      out.push({
        axis: "light",
        text: `${e.id} bloquea la fachada larga (holgura ${gap.toFixed(2)} m)`,
      });
    }
  }

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      if (overlaps(entities[i], entities[j])) {
        out.push({ axis: "flow", text: `${entities[i].id} solapa con ${entities[j].id}` });
      }
    }
  }

  // Colisión térmica: un módulo caliente sin jardín al alcance no ventila.
  for (const e of equipment.filter(isHot)) {
    const near = gardens.length ? Math.min(...gardens.map((g) => distance(e, g))) : Infinity;
    if (near > VENT_RADIUS) {
      out.push({
        axis: "thermal",
        text: gardens.length
          ? `${e.id} disipa ${heatOf(e)} kW y el jardín más cercano está a ${near.toFixed(1)} m (máx ${VENT_RADIUS} m)`
          : `${e.id} disipa ${heatOf(e)} kW y no hay ningún jardín donde ventilar`,
      });
    }
  }

  // Clúster térmico: dos equipos pegados se recalientan mutuamente.
  for (let i = 0; i < equipment.length; i++) {
    for (let j = i + 1; j < equipment.length; j++) {
      const a = equipment[i];
      const b = equipment[j];
      const total = heatOf(a) + heatOf(b);
      if (total >= HOT_KW && gapBetween(a, b) < CLUSTER_GAP) {
        out.push({
          axis: "thermal",
          text: `${a.id} y ${b.id} forman un clúster de ${total} kW a menos de ${CLUSTER_GAP} m`,
        });
      }
    }
  }

  if (!gardens.length) {
    out.push({
      axis: "program",
      text: "no hay ningún jardín interno: incumple el requisito bioclimático",
    });
  }

  return out.sort((a, b) => AXIS_RANK[a.axis] - AXIS_RANK[b.axis]);
}

/**
 * Sitio libre pegado al jardín: la corrección que pide el guion de la demo
 * —«reubica los racks junto a la zona del jardín interno para ventilación»—.
 * Se prueban los cuatro costados en anillos crecientes y se descarta lo ocupado.
 */
function ventilationSpot(hot: Entity, garden: Entity, all: Entity[]) {
  const others = all.filter((e) => e.id !== hot.id);
  const { ex, ez } = extent(hot);
  const g = extent(garden);

  for (let ring = 0; ring < 4; ring++) {
    const pad = 0.5 + ring * 0.45;
    const sides = [
      { x: garden.x, z: garden.z - (g.ez + ez + pad) },
      { x: garden.x, z: garden.z + (g.ez + ez + pad) },
      { x: garden.x - (g.ex + ex + pad), z: garden.z },
      { x: garden.x + (g.ex + ex + pad), z: garden.z },
    ];
    for (const side of sides) {
      const moved = clampToPlot({ ...hot, x: side.x, z: side.z });
      if (distance(moved, garden) > VENT_RADIUS) continue;
      if (others.some((o) => overlaps(moved, o))) continue;
      return moved;
    }
  }
  return null;
}

/**
 * Dónde llevar el volumen que más luz tapa.
 *
 * A media mañana la sombra viaja sobre todo en X y al mediodía en Z, así que no
 * hay una dirección buena que valga para todo el día: se tantea una malla corta
 * de sitios y se vuelve a MEDIR cada uno. Solo se propone el que de verdad
 * recupera losa, y se descartan de antemano los que romperían la ventilación de
 * un equipo caliente o volverían a tapar la fachada larga —la térmica y el
 * envolvente mandan sobre este ajuste—.
 */
function lightSpot(worst: Entity, all: Entity[], sun: SunState, current: number) {
  const others = all.filter((e) => e.id !== worst.id);
  const gardens = all.filter((e) => e.kind === "jardin");
  const { ex, ez } = extent(worst);
  // Los tres carriles dejan por construcción la holgura de 0.9 m a la fachada.
  const lane = Math.max(0, HX - ex - 1.1);
  const xs = [0, -lane, lane];
  const zs = [0, 1, 2, 3].map((k) => -HZ + ez + 0.3 + k * 1.6);
  let best: { entity: Entity; pct: number } | null = null;

  for (const x of xs) {
    for (const z of zs) {
      const moved = clampToPlot({ ...worst, x, z });
      if (others.some((o) => overlaps(moved, o))) continue;
      if (
        isHot(moved) &&
        gardens.length &&
        !gardens.some((g) => distance(moved, g) <= VENT_RADIUS)
      ) {
        continue;
      }
      const { pct } = measureLight([...others, moved], sun);
      if (pct > (best?.pct ?? current)) best = { entity: moved, pct };
    }
  }

  return best && best.pct >= current + LIGHT_GAIN ? best : null;
}

function heuristic(entities: Entity[], sun: SunState): Verdict {
  const field = measureLight(entities, sun);
  const issues = findings(entities, field);
  const corrections: Correction[] = [];
  const gardens = entities.filter((e) => e.kind === "jardin");

  // 1. Térmico primero: es el conflicto que el guion de la demo pone en escena.
  const overheating = entities
    .filter(isHot)
    .find((e) => !gardens.some((g) => distance(e, g) <= VENT_RADIUS));

  if (overheating && gardens.length) {
    // El jardín más cercano es el que menos hay que mover al módulo.
    const garden = gardens.reduce((best, g) =>
      distance(overheating, g) < distance(overheating, best) ? g : best,
    );
    const spot = ventilationSpot(overheating, garden, entities);
    if (spot) {
      corrections.push({
        entity: overheating.id,
        to: { x: round(spot.x), y: 0, z: round(spot.z) },
        reason: `Ventilar los ${heatOf(overheating)} kW junto al jardín interno`,
      });
    }
  }

  // 2. Luz: apartar del paso del sol el volumen que más losa ensombrece. Es la
  // corrección que pide el guion —«los racks bloquean el flujo de luz blanca»—
  // y ahora se puede decir con metros cuadrados delante.
  const worstBlocker = field.night
    ? undefined
    : entities.find((e) => e.id === field.worst?.id);

  if (!corrections.length && worstBlocker && field.pct < LIGHT_TARGET) {
    const spot = lightSpot(worstBlocker, entities, sun, field.pct);
    if (spot) {
      corrections.push({
        entity: worstBlocker.id,
        to: { x: round(spot.entity.x), y: 0, z: round(spot.entity.z) },
        reason: `Apartar ${worstBlocker.label} del paso del sol: la losa iluminada sube del ${field.pct}% al ${spot.pct}%`,
      });
    }
  }

  // 3. Despegar de la fachada larga el primer volumen que la tapa.
  const blocker = entities.find((e) => {
    if (e.material === "biophilic") return false;
    const { ex } = extent(e);
    return HX - (Math.abs(e.x) + ex) < 0.9;
  });

  if (!corrections.length && blocker) {
    const { ex } = extent(blocker);
    const target = Math.sign(blocker.x || 1) * Math.max(0, HX - ex - 1.1);
    corrections.push({
      entity: blocker.id,
      to: { x: round(target), y: 0, z: round(blocker.z) },
      reason: "Liberar la fachada larga para el ingreso de luz natural",
    });
  }

  // 4. Deshacer el primer solape encontrado.
  if (!corrections.length) {
    outer: for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (overlaps(entities[i], entities[j])) {
          const a = entities[i];
          const b = entities[j];
          const { ez } = extent(a);
          const { ez: ezb } = extent(b);
          corrections.push({
            entity: b.id,
            to: { x: round(b.x), y: 0, z: round(clampZ(a.z + ez + ezb + 0.6)) },
            reason: "Separar volúmenes para recuperar la circulación",
          });
          break outer;
        }
      }
    }
  }

  const on = (axis: Axis) => issues.filter((f) => f.axis === axis).length;
  const noGarden = !gardens.length;
  const totalKw = entities.reduce((sum, e) => sum + heatOf(e), 0);
  const loud = entities.filter((e) => heatOf(e) > 0).length;

  return {
    message: entities.length
      ? issues.length
        ? `Detecté ${issues.length} conflicto(s): ${issues[0].text}.`
        : "El estado actual cumple luz, circulación y térmica. Sigo observando."
      : "Lienzo vacío. Coloca volúmenes y evalúo la luz, la térmica y la circulación al vuelo.",
    headline: corrections.length
      ? corrections[0].reason
      : noGarden
        ? "Falta el jardín interno obligatorio del programa bioclimático"
        : "Sin correcciones pendientes",
    corrections,
    analysis: {
      // Cada métrica responde a su propia causa: un problema térmico no puede
      // bajar la iluminación natural solo por sumar al contador de conflictos.
      // Y la luz ya no se narra: es el porcentaje de losa que el medidor ve.
      light: field.night ? "0% · noche" : `${field.pct}%`,
      load: totalKw > 30 || entities.length > 12 ? "Revisar" : "Segura",
      flow: on("flow") > 1 ? "Bloqueada" : on("flow") ? "Media" : "Óptima",
      acoustic: on("thermal") || loud > 2 ? "Baja" : noGarden ? "Media" : "Alta",
    },
    focus: corrections.length
      ? { x: corrections[0].to.x, z: corrections[0].to.z }
      : overheating
        ? { x: round(overheating.x), z: round(overheating.z) }
        : { x: 0, z: 0 },
    engine: "heuristic",
  };
}

/** El JSON del LLM es entrada no confiable: se recorta a la parcela y a ids reales. */
function sanitize(
  raw: unknown,
  entities: Entity[],
  engine: Verdict["engine"],
  sun: SunState,
): Verdict {
  const base = heuristic(entities, sun);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const byId = new Map(entities.map((e) => [e.id, e]));

  const corrections: Correction[] = Array.isArray(r.corrections)
    ? r.corrections
        .slice(0, 2)
        .map((c) => c as Record<string, unknown>)
        .filter((c) => typeof c.entity === "string" && byId.has(c.entity))
        .map((c) => {
          const entity = byId.get(c.entity as string)!;
          const to = (c.to ?? {}) as Record<string, unknown>;
          const rotation = num(c.rotation);
          const placed = clampToPlot({
            ...entity,
            x: num(to.x) ?? entity.x,
            z: num(to.z) ?? entity.z,
            rotation: rotation !== undefined ? ((Math.round(rotation / 90) * 90) % 360) : entity.rotation,
          });
          return {
            entity: entity.id,
            to: { x: round(placed.x), y: 0, z: round(placed.z) },
            rotation: placed.rotation,
            reason: text(c.reason, 90) || "Corrección espacial",
          };
        })
    : [];

  const analysis = (r.analysis ?? {}) as Record<string, unknown>;
  const focus = (r.focus ?? {}) as Record<string, unknown>;

  return {
    message: text(r.message, 160) || base.message,
    headline: text(r.headline, 140) || corrections[0]?.reason || base.headline,
    corrections,
    analysis: {
      // La luz no se negocia con el modelo: es una medición, y la medición gana
      // aunque el LLM devuelva otra cifra.
      light: base.analysis.light,
      load: text(analysis.load, 12) || base.analysis.load,
      flow: text(analysis.flow, 12) || base.analysis.flow,
      acoustic: text(analysis.acoustic, 12) || base.analysis.acoustic,
    },
    focus: {
      x: clamp(num(focus.x) ?? corrections[0]?.to.x ?? 0, -HX, HX),
      z: clampZ(num(focus.z) ?? corrections[0]?.to.z ?? 0),
    },
    engine,
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const clampZ = (n: number) => clamp(n, -HZ, HZ);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

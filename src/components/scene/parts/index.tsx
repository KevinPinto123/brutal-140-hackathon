"use client";

/**
 * Las piezas del laboratorio.
 *
 * Hasta aquí los diez tipos de entidad compartían una única `boxGeometry`: un
 * muro, una escalera y una celda de robótica eran el mismo cubo con otro color y
 * otras proporciones. El brief promete un laboratorio de robótica, impresión 3D
 * y HPC, y una caja gris no lo cuenta.
 *
 * Cada pieza se construye aquí con su propia geometría, procedimental y sin un
 * solo asset externo: nada que descargar, nada que se caiga sin red, y sigue
 * siendo el WebGL ligero que pide el README.
 *
 * REGLA: la caja `w x d x h` de la entidad es la envolvente. Esas tres cifras son
 * las que usan `clampToPlot`, `overlaps`, `footprintArea` y el medidor de luz; si
 * la geometría se saliera, el panel de análisis empezaría a mentir sobre lo que se
 * ve en pantalla. La huella `w x d` no la pisa nadie, nunca.
 *
 * Una sola excepción, deliberada y solo en altura: la vegetación del jardín. Su
 * `h` declarada son 12 cm, que es la jardinera; una planta que no pasara de ahí
 * sería musgo. `blocksLight()` excluye `jardin` del modelo de luz, así que nada de
 * lo que crezca ahí puede desmentir al panel.
 *
 * Y de ahí sale la otra mitad de la regla, la que sí es absoluta: la sombra de la
 * pantalla y el porcentaje del panel tienen que contar la misma historia. Traducida
 * a código, la regla es esta:
 *
 *  - Si `blocksLight()` ignora la entidad —vidrio, jardín, puerta, abertura—,
 *    nada suyo puede proyectar sombra por encima del plano de trabajo (0,85 m).
 *    Por eso el vidrio y el follaje van con `castShadow` en `false`, y por eso el
 *    bordillo del jardín, de 12 cm, sí puede proyectar: no llega.
 *  - Si `blocksLight()` la cuenta, la pieza tiene que ser opaca de verdad hasta
 *    arriba. De ahí el trasero ciego de los racks y la malla del vallado, que se
 *    ve translúcida pero proyecta.
 *
 * `parts-envelope.mjs` en el scratchpad comprueba las dos cosas sobre el árbol
 * renderizado de los diez tipos.
 */

import type { Entity } from "@/lib/entities";
import { FRAME, LEAF, PANEL, SOIL, noise, surface, type Surface } from "./surfaces";

type Vec = [number, number, number];

/**
 * Los tipos que son arquitectura. Solo ellos llevan el filo dibujado: el canto
 * marcado es lo que hace legible el concreto expuesto, pero alrededor de un
 * brazo robótico esa misma caja de aristas parece una jaula.
 */
export const ARCH_KINDS = new Set(["muro", "pilar", "escalera", "puerta", "abertura"]);

/** Caja con superficie. Casi todo el laboratorio se construye con esto. */
function Box({
  s,
  at,
  size,
  rot,
  cast = true,
}: {
  s: Surface;
  at: Vec;
  size: Vec;
  rot?: Vec;
  cast?: boolean;
}) {
  return (
    <mesh position={at} rotation={rot} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial {...s} />
    </mesh>
  );
}

/** Piloto de equipo. No ilumina la escena: solo se ve encendido. */
function Led({
  at,
  size,
  color,
  on = 1,
}: {
  at: Vec;
  size: Vec;
  color: string;
  on?: number;
}) {
  return (
    <mesh position={at}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={on}
        toneMapped={false}
        roughness={0.4}
      />
    </mesh>
  );
}

/* ---------------------------------------------------------------- arquitectura */

/**
 * Muro de concreto encofrado. El cuerpo se retranquea y las juntas de la tabla
 * quedan por delante: es ese resalto, y no el color, lo que lee «hormigón visto»
 * cuando le entra el sol de lado.
 */
function Muro({ e }: { e: Entity }) {
  const s = surface(e.material, e.id);
  const bands = Math.max(2, Math.min(6, Math.round(e.h / 0.55)));
  return (
    <>
      <Box s={s} at={[0, e.h / 2, 0]} size={[e.w, e.h, e.d * 0.84]} />
      <Box s={s} at={[0, 0.05, 0]} size={[e.w, 0.1, e.d]} />
      <Box s={s} at={[0, e.h - 0.04, 0]} size={[e.w, 0.08, e.d]} />
      {Array.from({ length: bands }, (_, i) => (
        <Box
          key={i}
          s={s}
          at={[0, ((i + 1) / (bands + 1)) * e.h, 0]}
          size={[e.w * 0.998, 0.045, e.d]}
        />
      ))}
    </>
  );
}

/** Pilar con basa y capitel: un prisma pelado no sostiene nada a la vista. */
function Pilar({ e }: { e: Entity }) {
  const s = surface(e.material, e.id);
  return (
    <>
      <Box s={s} at={[0, e.h / 2, 0]} size={[e.w * 0.8, e.h, e.d * 0.8]} />
      <Box s={s} at={[0, 0.07, 0]} size={[e.w, 0.14, e.d]} />
      <Box s={s} at={[0, e.h - 0.1, 0]} size={[e.w, 0.2, e.d]} />
    </>
  );
}

/**
 * Tramo de escalera macizo. Cada peldaño arranca de la losa, que es como se cuela
 * una escalera de concreto: por debajo no hay hueco, hay masa.
 */
function Escalera({ e }: { e: Entity }) {
  const s = surface(e.material, e.id);
  const steps = Math.max(5, Math.min(14, Math.round(e.h / 0.19)));
  const rise = e.h / steps;
  const run = e.d / steps;
  return (
    <>
      {Array.from({ length: steps }, (_, i) => {
        const top = (i + 1) * rise;
        return (
          <Box
            key={i}
            s={s}
            at={[0, top / 2, -e.d / 2 + (i + 0.5) * run]}
            size={[e.w, top, run]}
          />
        );
      })}
    </>
  );
}

/**
 * Puerta o ventana: marco de acero y hoja acristalada.
 *
 * La hoja no proyecta sombra a propósito. `blocksLight()` no cuenta el vidrio
 * como obstáculo —para eso está—, así que si aquí la dibujáramos tapando el sol,
 * la sombra de la pantalla contradiría el porcentaje del panel.
 */
function Puerta({ e }: { e: Entity }) {
  const g = surface(e.material, e.id);
  const jw = Math.min(0.12, e.w * 0.1);
  const hh = Math.min(0.12, e.h * 0.06);
  return (
    <>
      <Box s={FRAME} at={[-e.w / 2 + jw / 2, e.h / 2, 0]} size={[jw, e.h, e.d]} cast={false} />
      <Box s={FRAME} at={[e.w / 2 - jw / 2, e.h / 2, 0]} size={[jw, e.h, e.d]} cast={false} />
      <Box s={FRAME} at={[0, e.h - hh / 2, 0]} size={[e.w - jw * 2, hh, e.d]} cast={false} />
      <Box s={FRAME} at={[0, 0.02, 0]} size={[e.w - jw * 2, 0.04, e.d]} cast={false} />
      <Box
        s={g}
        at={[0, (e.h - hh + 0.04) / 2, 0]}
        size={[e.w - jw * 2, e.h - hh - 0.04, e.d * 0.34]}
        cast={false}
      />
      <Box
        s={FRAME}
        at={[e.w / 2 - jw - 0.08, e.h * 0.46, e.d * 0.28]}
        size={[0.035, 0.3, 0.05]}
        cast={false}
      />
    </>
  );
}

/** Abertura: mochetas, dintel, alféizar y un parteluz. Un hueco tiene canto. */
function Abertura({ e }: { e: Entity }) {
  const g = surface(e.material, e.id);
  const t = Math.min(0.1, Math.min(e.w, e.h) * 0.08);
  return (
    <>
      <Box s={FRAME} at={[-e.w / 2 + t / 2, e.h / 2, 0]} size={[t, e.h, e.d]} cast={false} />
      <Box s={FRAME} at={[e.w / 2 - t / 2, e.h / 2, 0]} size={[t, e.h, e.d]} cast={false} />
      <Box s={FRAME} at={[0, t / 2, 0]} size={[e.w - t * 2, t, e.d]} cast={false} />
      <Box s={FRAME} at={[0, e.h - t / 2, 0]} size={[e.w - t * 2, t, e.d]} cast={false} />
      <Box s={FRAME} at={[0, e.h / 2, 0]} size={[t * 0.5, e.h - t * 2, e.d * 0.92]} cast={false} />
      <Box
        s={g}
        at={[0, e.h / 2, 0]}
        size={[e.w - t * 2, e.h - t * 2, e.d * 0.3]}
        cast={false}
      />
    </>
  );
}

/**
 * Jardín interno: bordillo de concreto, tierra y plantación.
 *
 * La vegetación no proyecta sombra, por la misma razón que la hoja de vidrio: el
 * medidor de luz trata el jardín como una losa de 12 cm que no tapa nada, y la
 * pantalla tiene que decir lo mismo que el panel.
 */
function Jardin({ e }: { e: Entity }) {
  const s = surface(e.material === "biophilic" ? "concrete" : e.material, e.id);
  const t = Math.min(0.12, Math.min(e.w, e.d) * 0.09);
  const bx = e.w - t * 2;
  const bz = e.d - t * 2;
  const plants = 8;
  const tree = e.w >= 1.5 && e.d >= 1.5;

  return (
    <>
      {/* Bordillo */}
      <Box s={s} at={[0, e.h / 2, -e.d / 2 + t / 2]} size={[e.w, e.h, t]} />
      <Box s={s} at={[0, e.h / 2, e.d / 2 - t / 2]} size={[e.w, e.h, t]} />
      <Box s={s} at={[-e.w / 2 + t / 2, e.h / 2, 0]} size={[t, e.h, bz]} />
      <Box s={s} at={[e.w / 2 - t / 2, e.h / 2, 0]} size={[t, e.h, bz]} />

      {/* Sustrato */}
      <Box s={SOIL} at={[0, e.h * 0.46, 0]} size={[bx, e.h * 0.92, bz]} cast={false} />

      {/* Plantación: matas de porte y verde distintos, estables por entidad */}
      {Array.from({ length: plants }, (_, i) => {
        const r = 0.12 + noise(e.id, i * 5 + 3) * 0.12;
        return (
          <mesh
            key={i}
            position={[
              (noise(e.id, i * 5 + 1) - 0.5) * bx * 0.84,
              e.h + r * 0.66,
              (noise(e.id, i * 5 + 2) - 0.5) * bz * 0.84,
            ]}
            scale={[1, 0.78, 1]}
            castShadow={false}
            receiveShadow
          >
            <icosahedronGeometry args={[r, 0]} />
            <meshStandardMaterial
              color={LEAF[i % LEAF.length]}
              roughness={0.88}
              metalness={0}
              flatShading
            />
          </mesh>
        );
      })}

      {/* Un ejemplar de porte alto cuando la jardinera da para ello */}
      {tree && (
        <group
          position={[(noise(e.id, 91) - 0.5) * bx * 0.4, e.h, (noise(e.id, 92) - 0.5) * bz * 0.4]}
        >
          <mesh position={[0, 0.34, 0]} castShadow={false} receiveShadow>
            <cylinderGeometry args={[0.035, 0.055, 0.68, 6]} />
            <meshStandardMaterial color="#4a3b2c" roughness={1} metalness={0} />
          </mesh>
          <mesh position={[0, 0.86, 0]} scale={[1, 0.86, 1]} castShadow={false} receiveShadow>
            <icosahedronGeometry args={[0.36, 0]} />
            <meshStandardMaterial color="#3f7346" roughness={0.88} metalness={0} flatShading />
          </mesh>
        </group>
      )}
    </>
  );
}

/* ------------------------------------------------------------------- programa */

/** Verde de servicio, ámbar si el nodo va cargado. Estable por entidad y fila. */
const ledColor = (id: string, i: number) => (noise(id, i * 7 + 5) > 0.78 ? "#f59e0b" : "#4ade80");

/**
 * Armario de servidores. Lo que hace reconocible un rack no es la caja: es la
 * repetición de unidades en el frente y la columna de pilotos.
 */
function Racks({ e }: { e: Entity }) {
  const s = surface(e.material, e.id);
  const side = Math.min(0.07, e.w * 0.06);
  const units = 6;
  const inner = e.h - 0.16;
  const uh = (inner / units) * 0.76;

  return (
    <>
      <Box s={s} at={[-e.w / 2 + side / 2, e.h / 2, 0]} size={[side, e.h, e.d]} />
      <Box s={s} at={[e.w / 2 - side / 2, e.h / 2, 0]} size={[side, e.h, e.d]} />
      <Box s={s} at={[0, e.h - 0.04, 0]} size={[e.w, 0.08, e.d]} />
      <Box s={s} at={[0, 0.04, 0]} size={[e.w, 0.08, e.d]} />
      <Box s={PANEL} at={[0, e.h / 2, -e.d / 2 + 0.025]} size={[e.w - side * 2, inner, 0.05]} />

      {Array.from({ length: units }, (_, i) => {
        const y = 0.08 + ((i + 0.5) / units) * inner;
        return (
          <group key={i}>
            {/* El frente se retranquea 1 cm para que el piloto sobresalga de él
                sin salirse de la caja declarada. */}
            <Box s={PANEL} at={[0, y, e.d / 2 - 0.035]} size={[e.w - side * 2, uh, 0.05]} />
            <Led
              at={[e.w / 2 - side - 0.05, y, e.d / 2 - 0.006]}
              size={[0.028, 0.018, 0.012]}
              color={ledColor(e.id, i)}
              on={1.3}
            />
          </group>
        );
      })}
    </>
  );
}

/**
 * Módulo HPC: dos bahías sobre plinto, frente ciego perforado y rejilla de
 * extracción arriba. Los 18 kW del spec salen por algún sitio.
 */
function Hpc({ e }: { e: Entity }) {
  const s = surface(e.material, e.id);
  const bays = 2;
  const bw = e.w / bays;
  const bh = e.h - 0.12;

  return (
    <>
      <Box s={s} at={[0, 0.06, 0]} size={[e.w, 0.12, e.d]} />
      {Array.from({ length: bays }, (_, i) => (
        <group key={i} position={[-e.w / 2 + bw * (i + 0.5), 0.12, 0]}>
          <Box s={s} at={[0, bh / 2, 0]} size={[bw * 0.94, bh, e.d]} />
          <Box
            s={PANEL}
            at={[0, bh * 0.46, e.d / 2 - 0.03]}
            size={[bw * 0.76, bh * 0.7, 0.05]}
          />
          {[0, 1, 2].map((k) => (
            <Box
              key={k}
              s={PANEL}
              at={[0, bh - 0.07 - k * 0.06, e.d / 2 - 0.035]}
              size={[bw * 0.68, 0.026, 0.06]}
            />
          ))}
          <Led
            at={[bw * 0.3, bh * 0.46, e.d / 2 - 0.007]}
            size={[0.022, bh * 0.5, 0.014]}
            color="#7dd3fc"
            on={1.1}
          />
        </group>
      ))}
    </>
  );
}

/** Impresora 3D: gabinete, campana acristalada, pórtico con cabezal y cama. */
function Impresion({ e }: { e: Entity }) {
  const s = surface(e.material, e.id);
  const g = surface("glass", e.id);
  const baseH = e.h * 0.34;
  const boxH = e.h - baseH;
  const post = Math.min(0.08, e.w * 0.07);

  return (
    <>
      {/* El gabinete se retranquea 1 cm en fondo: le deja sitio al piloto por
          delante sin que nada asome fuera de la caja declarada. */}
      <Box s={s} at={[0, baseH / 2, 0]} size={[e.w, baseH, e.d - 0.01]} />
      <Box s={s} at={[-e.w / 2 + post / 2, baseH + boxH / 2, 0]} size={[post, boxH, e.d]} />
      <Box s={s} at={[e.w / 2 - post / 2, baseH + boxH / 2, 0]} size={[post, boxH, e.d]} />
      <Box s={s} at={[0, e.h - 0.04, 0]} size={[e.w, 0.08, e.d]} />
      <Box s={s} at={[0, baseH + boxH / 2, -e.d / 2 + 0.025]} size={[e.w, boxH, 0.05]} />

      {/* Campana: transparente y sin sombra, como el resto del vidrio */}
      <Box
        s={g}
        at={[0, baseH + boxH / 2, e.d / 2 - 0.02]}
        size={[e.w - post * 2, boxH - 0.1, 0.03]}
        cast={false}
      />

      <Box s={PANEL} at={[0, baseH + 0.035, 0]} size={[(e.w - post * 2) * 0.82, 0.07, e.d * 0.66]} />
      <Box s={FRAME} at={[0, baseH + boxH * 0.64, 0]} size={[e.w - post * 2, 0.05, 0.05]} />
      <Box s={FRAME} at={[e.w * 0.12, baseH + boxH * 0.58, 0]} size={[0.11, 0.16, 0.11]} />
      <Led
        at={[-e.w / 2 + post + 0.07, baseH * 0.55, e.d / 2 - 0.006]}
        size={[0.06, 0.02, 0.012]}
        color="#f59e0b"
        on={1.3}
      />
    </>
  );
}

/**
 * Malla de la valla. Se ve a través, pero sí proyecta sombra, al revés que el
 * vidrio y el follaje: `blocksLight()` cuenta la celda de robótica como un
 * volumen opaco de 2,6 x 2,4 m, y el vallado llega a 1,87 m —por encima del plano
 * de trabajo, que está a 0,85 m—. Si no proyectara, el panel culparía a la celda
 * de una sombra que en pantalla no existe. Una malla de acero al 20 % de paso, de
 * lejos, tampoco deja pasar mucho más que esto.
 */
const MESH: Surface = {
  color: "#5d6470",
  roughness: 0.5,
  metalness: 0.45,
  transparent: true,
  opacity: 0.17,
};

/**
 * Celda de robótica: vallado en tres lados con el frente abierto, pedestal y un
 * brazo articulado. Los ángulos están fijados para que la punta no se salga de
 * la altura declarada de la entidad.
 */
function Robotica({ e }: { e: Entity }) {
  const s = surface(e.material, e.id);
  const post = 0.075;
  const fence = Math.min(e.h * 0.78, 1.9);
  const pedR = Math.min(e.w, e.d) * 0.17;
  const pedH = e.h * 0.16;
  const reach = e.h - pedH;
  const upper = reach * 0.42;
  const fore = reach * 0.34;
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  return (
    <>
      {/* Zona de seguridad pintada en la losa */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[e.w * 0.98, e.d * 0.98]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.1} depthWrite={false} />
      </mesh>

      {/* Postes del vallado */}
      {corners.map(([sx, sz], i) => (
        <Box
          key={i}
          s={s}
          at={[(sx * (e.w - post)) / 2, fence / 2, (sz * (e.d - post)) / 2]}
          size={[post, fence, post]}
        />
      ))}

      {/* Paneles: tres lados. El frente (+Z) se deja abierto para operar. */}
      <Box s={MESH} at={[0, fence / 2, -e.d / 2 + post / 2]} size={[e.w - post, fence - 0.1, 0.02]} />
      <Box s={MESH} at={[-e.w / 2 + post / 2, fence / 2, 0]} size={[0.02, fence - 0.1, e.d - post]} />
      <Box s={MESH} at={[e.w / 2 - post / 2, fence / 2, 0]} size={[0.02, fence - 0.1, e.d - post]} />

      {/* Pedestal */}
      <mesh position={[0, pedH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[pedR, pedR * 1.15, pedH, 16]} />
        <meshStandardMaterial {...s} />
      </mesh>

      {/* Brazo */}
      <group position={[0, pedH, 0]}>
        <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[pedR * 0.78, pedR * 0.86, 0.22, 14]} />
          <meshStandardMaterial {...FRAME} />
        </mesh>
        <group position={[0, 0.22, 0]} rotation={[-0.55, 0, 0]}>
          <Box s={FRAME} at={[0, upper / 2, 0]} size={[0.17, upper, 0.17]} />
          <group position={[0, upper, 0]} rotation={[1, 0, 0]}>
            <Box s={FRAME} at={[0, fore / 2, 0]} size={[0.13, fore, 0.13]} />
            <group position={[0, fore, 0]}>
              <Box s={s} at={[0, 0.06, 0]} size={[0.16, 0.12, 0.12]} />
              <Box s={s} at={[-0.05, 0.17, 0]} size={[0.03, 0.12, 0.07]} />
              <Box s={s} at={[0.05, 0.17, 0]} size={[0.03, 0.12, 0.07]} />
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

/** Salvavidas: un tipo nuevo en el modelo sigue apareciendo, aunque sea cúbico. */
function Generic({ e }: { e: Entity }) {
  return <Box s={surface(e.material, e.id)} at={[0, e.h / 2, 0]} size={[e.w, e.h, e.d]} />;
}

/** Despacho por tipo. Todo se dibuja con la base en y = 0 del grupo padre. */
export function Parts({ entity }: { entity: Entity }) {
  switch (entity.kind) {
    case "muro":
      return <Muro e={entity} />;
    case "pilar":
      return <Pilar e={entity} />;
    case "escalera":
      return <Escalera e={entity} />;
    case "puerta":
      return <Puerta e={entity} />;
    case "abertura":
      return <Abertura e={entity} />;
    case "jardin":
      return <Jardin e={entity} />;
    case "racks":
      return <Racks e={entity} />;
    case "hpc":
      return <Hpc e={entity} />;
    case "impresion":
      return <Impresion e={entity} />;
    case "robotica":
      return <Robotica e={entity} />;
    default:
      return <Generic e={entity} />;
  }
}

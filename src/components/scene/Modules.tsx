"use client";

import { Html, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { extent, type Entity } from "@/lib/entities";
import { entityHeat } from "@/lib/heat";
import { ARCH_KINDS, Parts } from "./parts";

const RAD = Math.PI / 180;

/**
 * Se excluye del test de impacto.
 *
 * El `onPointerDown` cuelga del grupo entero, no de cada pieza: un vallado de
 * robótica es casi todo aire y agarrar un brazo por la pinza sería puntería. Pero
 * dentro del grupo también viven adornos que no son el volumen —el disco térmico,
 * que puede ser mucho más ancho que el módulo, y los contornos a ras de suelo—, y
 * si atraparan el clic no se podría depositar nada al lado de un rack.
 *
 * El área de agarre es el colisionador invisible, y es exactamente la caja
 * declarada de la entidad. Ni un centímetro más.
 */
const NO_HIT = () => null;

/** Contorno a ras de suelo. `pad` lo separa para que dos halos no se pisen. */
function Halo({
  entity,
  color = "#a78bfa",
  pad = 0,
}: {
  entity: Entity;
  color?: string;
  pad?: number;
}) {
  const { ex, ez } = extent(entity);
  const [x, z] = [ex + pad, ez + pad];
  const y = 0.02 + pad;
  const points: [number, number, number][] = [
    [-x, y, -z],
    [x, y, -z],
    [x, y, z],
    [-x, y, z],
    [-x, y, -z],
  ];
  return <Line points={points} color={color} lineWidth={1.6} raycast={NO_HIT} />;
}

/** Quién tiene agarrado este volumen ahora mismo, si no soy yo. */
export type HeldBy = { name: string; color: string };

function Module({
  entity,
  selected,
  dragging,
  heldBy,
  overlays,
  onGrab,
}: {
  entity: Entity;
  selected: boolean;
  dragging: boolean;
  heldBy?: HeldBy;
  /** Capa de anotación encendida: lo que se dibuja para leer, no para habitar. */
  overlays: boolean;
  onGrab: (e: ThreeEvent<PointerEvent>, id: string) => void;
}) {
  // El equipamiento del laboratorio no es arquitectura: se lee metálico y con
  // su firma térmica dibujada en el suelo.
  const { kw, color: heat, radius } = entityHeat(entity);
  const arch = ARCH_KINDS.has(entity.kind);

  return (
    <group
      position={[entity.x, entity.y, entity.z]}
      rotation={[0, entity.rotation * RAD, 0]}
      onPointerDown={(e) => onGrab(e, entity.id)}
    >
      {/*
        Colisionador: la caja declarada de la entidad, invisible. La geometría de
        detalle también recibe el evento y lo burbujea al grupo, pero por sí sola
        dejaría huecos —el vallado de una celda de robótica es casi todo aire— y
        agarrar un brazo por la pinza sería un ejercicio de puntería.
      */}
      <mesh position={[0, entity.h / 2, 0]}>
        <boxGeometry args={[entity.w, entity.h, entity.d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* La pieza de verdad: cada tipo con su geometría */}
      <Parts entity={entity} />

      {/* Selección: una funda sobre el volumen declarado. Con geometría de varias
          piezas ya no vale teñir «el» material, porque no hay uno solo. */}
      {selected && (
        <mesh position={[0, entity.h / 2, 0]} raycast={NO_HIT}>
          <boxGeometry args={[entity.w + 0.05, entity.h + 0.05, entity.d + 0.05]} />
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#8b5cf6"
            emissiveIntensity={0.45}
            transparent
            opacity={0.1}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Firma térmica: el disco crece con los kW disipados. */}
      {overlays && kw > 0 && (
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={NO_HIT}>
          <ringGeometry args={[radius * 0.82, radius, 56]} />
          <meshBasicMaterial color={heat} transparent opacity={0.42} depthWrite={false} />
        </mesh>
      )}

      {/* Aristas: el concreto expuesto se lee por su canto. Solo la arquitectura
          las lleva; alrededor de un equipo, esa caja parecería una jaula. */}
      {overlays && arch && (
        <Line
          points={edges(entity.w, entity.h, entity.d)}
          color="#f3f1ee"
          lineWidth={0.8}
          transparent
          opacity={0.26}
          segments
          raycast={NO_HIT}
        />
      )}

      {(selected || dragging) && <Halo entity={entity} />}

      {/* «Qué está tocando tu equipo»: el volumen lleva el color de quien lo agarra. */}
      {heldBy && (
        <>
          <Halo entity={entity} color={heldBy.color} pad={0.09} />
          <Html
            position={[0, entity.h + (selected && overlays ? 0.72 : 0.35), 0]}
            center
            zIndexRange={[54, 0]}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <span
              className="whitespace-nowrap rounded-[3px] px-1.5 py-[3px] font-mono text-[9.5px] leading-none text-white shadow-lg shadow-black/50"
              style={{ background: heldBy.color }}
            >
              {heldBy.name}
            </span>
          </Html>
        </>
      )}

      {/* Cota de la selección. Se va con las anotaciones; el halo y la funda se
          quedan, porque no describen el proyecto sino lo que estás tocando. */}
      {overlays && selected && (
        <Html
          position={[0, entity.h + 0.35, 0]}
          center
          zIndexRange={[55, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <span className="whitespace-nowrap rounded-[3px] border border-line bg-panel-2/95 px-2 py-1 font-mono text-[10px] tracking-tight text-fg">
            {entity.label} · {entity.x.toFixed(2)} / {entity.z.toFixed(2)}
            {kw > 0 && <span style={{ color: heat }}> · {kw} kW</span>}
          </span>
        </Html>
      )}
    </group>
  );
}

/** 12 aristas de la caja, en pares para `segments`. */
function edges(w: number, h: number, d: number): [number, number, number][] {
  const x = w / 2;
  const z = d / 2;
  const lo = 0.001;
  const hi = h;
  const corners: [number, number][] = [
    [-x, -z],
    [x, -z],
    [x, z],
    [-x, z],
  ];
  const out: [number, number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = corners[i];
    const [bx, bz] = corners[(i + 1) % 4];
    out.push([ax, lo, az], [bx, lo, bz]);
    out.push([ax, hi, az], [bx, hi, bz]);
    out.push([ax, lo, az], [ax, hi, az]);
  }
  return out;
}

export function Modules({
  entities,
  selected,
  dragId,
  held = {},
  overlays = true,
  onGrab,
}: {
  entities: Entity[];
  selected: string | null;
  dragId: string | null;
  /** Volúmenes agarrados por otros peers, indexados por id de entidad. */
  held?: Record<string, HeldBy>;
  overlays?: boolean;
  onGrab: (e: ThreeEvent<PointerEvent>, id: string) => void;
}) {
  return (
    <group>
      {entities.map((e) => (
        <Module
          key={e.id}
          entity={e}
          selected={e.id === selected}
          dragging={e.id === dragId}
          heldBy={held[e.id]}
          overlays={overlays}
          onGrab={onGrab}
        />
      ))}
    </group>
  );
}

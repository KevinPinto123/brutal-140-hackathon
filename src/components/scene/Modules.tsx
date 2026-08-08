"use client";

import { Html, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { MATERIAL_COLORS, extent, type Entity } from "@/lib/entities";
import { entityHeat } from "@/lib/heat";

const RAD = Math.PI / 180;

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
  return <Line points={points} color={color} lineWidth={1.6} />;
}

/** Quién tiene agarrado este volumen ahora mismo, si no soy yo. */
export type HeldBy = { name: string; color: string };

function Module({
  entity,
  selected,
  dragging,
  heldBy,
  onGrab,
}: {
  entity: Entity;
  selected: boolean;
  dragging: boolean;
  heldBy?: HeldBy;
  onGrab: (e: ThreeEvent<PointerEvent>, id: string) => void;
}) {
  const color = MATERIAL_COLORS[entity.material];
  const glass = entity.material === "glass";
  const garden = entity.material === "biophilic";
  // El equipamiento del laboratorio no es arquitectura: se lee metálico y con
  // su firma térmica dibujada en el suelo.
  const { kw, color: heat, radius } = entityHeat(entity);

  return (
    <group position={[entity.x, entity.y, entity.z]} rotation={[0, entity.rotation * RAD, 0]}>
      <mesh
        position={[0, entity.h / 2, 0]}
        castShadow
        receiveShadow
        onPointerDown={(e) => onGrab(e, entity.id)}
      >
        <boxGeometry args={[entity.w, entity.h, entity.d]} />
        <meshStandardMaterial
          color={color}
          roughness={glass ? 0.15 : garden ? 0.8 : kw > 0 ? 0.35 : 0.95}
          metalness={glass ? 0.1 : kw > 0 ? 0.65 : 0}
          transparent={glass}
          opacity={glass ? 0.42 : 1}
          emissive={selected ? "#8b5cf6" : kw > 0 ? heat : "#000000"}
          emissiveIntensity={selected ? 0.28 : kw > 0 ? Math.min(0.3, kw / 70) : 0}
        />
      </mesh>

      {/* Firma térmica: el disco crece con los kW disipados. */}
      {kw > 0 && (
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 0.82, radius, 56]} />
          <meshBasicMaterial color={heat} transparent opacity={0.42} depthWrite={false} />
        </mesh>
      )}

      {/* Aristas: el concreto expuesto se lee por su canto */}
      <Line
        points={edges(entity.w, entity.h, entity.d)}
        color={garden ? "#86efac" : kw > 0 ? heat : "#f3f1ee"}
        lineWidth={0.8}
        transparent
        opacity={kw > 0 ? 0.5 : 0.28}
        segments
      />

      {(selected || dragging) && <Halo entity={entity} />}

      {/* «Qué está tocando tu equipo»: el volumen lleva el color de quien lo agarra. */}
      {heldBy && (
        <>
          <Halo entity={entity} color={heldBy.color} pad={0.09} />
          <Html
            position={[0, entity.h + (selected ? 0.72 : 0.35), 0]}
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

      {selected && (
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
  onGrab,
}: {
  entities: Entity[];
  selected: string | null;
  dragId: string | null;
  /** Volúmenes agarrados por otros peers, indexados por id de entidad. */
  held?: Record<string, HeldBy>;
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
          onGrab={onGrab}
        />
      ))}
    </group>
  );
}

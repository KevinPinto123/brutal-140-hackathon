"use client";

import type { ReactNode } from "react";
import { Html } from "@react-three/drei";
import { COLORS, PARTICIPANTS, PLOT } from "@/lib/constants";
import { AI_SENDER, type LiveCamera, type LiveCursor } from "@/lib/portal/events";

/**
 * Presencia física 3D. El README es explícito: «los cursores no son flechas 2D;
 * son avatares volumétricos dentro de la malla (x, y, z)», y los demás tienen
 * que ver «dónde está mirando» cada uno. Así que cada peer es un cuerpo real a
 * escala humana, girado según su propia cámara, que llega por el canal de
 * señales. El Arquitecto no tiene cámara: se dibuja como lo que es, un volumen
 * flotante que no pertenece a nadie.
 */
type Cursor = {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  status?: string;
  /** Giro en radianes: hacia dónde mira este peer. */
  yaw: number;
  isAI?: boolean;
};

/** Altura de los ojos del avatar, en metros. */
const EYE = 1.56;
/** Semiapertura del cono de visión dibujado en el suelo. */
const FOV_HALF = 0.44;

/** Escena de referencia mientras no hay peers conectados (una sola pestaña). */
const SEED: Cursor[] = PARTICIPANTS.map((p) => ({
  id: p.id,
  name: p.name,
  color: COLORS[p.color],
  position: p.cursor,
  status: p.status,
  yaw: Math.atan2(-p.cursor[0], -p.cursor[2]),
  isAI: p.isAI,
}));

/**
 * De dónde sale la mirada: del encuadre real del peer si lo ha difundido, y si
 * no, de mirar hacia el centro de la parcela, que es lo que hace todo el mundo.
 */
function yawOf(cursor: LiveCursor, camera?: LiveCamera) {
  if (camera) {
    const dx = camera.target[0] - camera.eye[0];
    const dz = camera.target[2] - camera.eye[2];
    if (Math.hypot(dx, dz) > 0.01) return Math.atan2(dx, dz);
  }
  return Math.atan2(-cursor.x, -cursor.z);
}

/** Cuerpo humano esquemático: cabeza, torso y base. Nada de animación. */
function Body({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, EYE, 0]} castShadow>
        <sphereGeometry args={[0.15, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.72, 6, 16]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.12, 0.19, 0.48, 14]} />
        <meshStandardMaterial color={color} roughness={0.7} opacity={0.75} transparent />
      </mesh>
    </group>
  );
}

/** El agente: un volumen que no imita a nadie, con su doble anillo de la fase 4. */
function GhostBody() {
  return (
    <group>
      <mesh position={[0, 1.15, 0]}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial
          color="#a78bfa"
          emissive="#7c3aed"
          emissiveIntensity={0.5}
          roughness={0.25}
          metalness={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <octahedronGeometry args={[0.52, 0]} />
        <meshBasicMaterial color="#a78bfa" wireframe transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[0.78, 0.85, 64]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function PresenceCursor({ cursor }: { cursor: Cursor }) {
  const { color } = cursor;
  const isAI = !!cursor.isAI;

  return (
    <group position={cursor.position}>
      {/* Ancla en el suelo: dónde está tocando la malla */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.22, 0.32, 48]} />
        <meshBasicMaterial color={isAI ? "#ffffff" : color} transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[isAI ? 0.85 : 0.5, 48]} />
        <meshBasicMaterial color={isAI ? "#a78bfa" : color} transparent opacity={0.12} />
      </mesh>

      {/* Todo lo que depende de la mirada cuelga de este giro */}
      <group rotation={[0, cursor.yaw, 0]}>
        {isAI ? <GhostBody /> : <Body color={color} />}

        {!isAI && (
          <>
            {/* Cono de visión proyectado en el suelo: hacia dónde mira, en metros */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
              <ringGeometry
                args={[0.45, 2.9, 28, 1, -Math.PI / 2 - FOV_HALF, FOV_HALF * 2]}
              />
              <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
            </mesh>
            {/* Y la punta de la nariz, para leer el frente de cerca */}
            <mesh position={[0, EYE, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.075, 0.22, 4]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
            </mesh>
          </>
        )}
      </group>

      <Html
        position={[0, isAI ? 1.75 : EYE + 0.3, 0]}
        center
        zIndexRange={[60, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div className="flex flex-col items-center">
          <div
            className={
              "whitespace-nowrap rounded-[5px] px-2 py-[3px] text-[11px] font-medium leading-none text-white shadow-lg shadow-black/50" +
              (isAI ? " ring-1 ring-accent-2/70" : "")
            }
            style={{ background: isAI ? "#1c1c20" : color }}
          >
            {isAI && <span className="mr-1.5 text-accent-2">◆</span>}
            {cursor.name}
          </div>
          {cursor.status && (
            <div
              className={
                "mt-1 whitespace-nowrap font-mono text-[9.5px] leading-none tracking-tight" +
                (isAI ? " text-accent-2" : " text-white/70")
              }
              style={{ textShadow: "0 1px 3px rgba(0,0,0,.9)" }}
            >
              {cursor.status}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

function DimLabel({
  position,
  children,
  boxed,
}: {
  position: [number, number, number];
  children: ReactNode;
  boxed?: boolean;
}) {
  return (
    <Html
      position={position}
      center
      zIndexRange={[50, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <span
        className={
          boxed
            ? "rounded-[3px] border border-line bg-panel-2/90 px-2 py-1 font-mono text-[11px] tracking-tight text-fg"
            : "font-mono text-[12px] tracking-tight text-muted"
        }
      >
        {children}
      </span>
    </Html>
  );
}

export function PresenceLayer({
  cursors = [],
  cameras = {},
}: {
  cursors?: LiveCursor[];
  cameras?: Record<string, LiveCamera>;
}) {
  const HX = PLOT.width / 2;
  const HZ = PLOT.depth / 2;

  const shown: Cursor[] = cursors.length
    ? cursors.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        position: [c.x, c.y, c.z],
        status: c.status,
        yaw: yawOf(c, cameras[c.id]),
        isAI: c.id === AI_SENDER,
      }))
    : SEED;

  return (
    <group>
      {shown.map((c) => (
        <PresenceCursor key={c.id} cursor={c} />
      ))}

      {/* Acotaciones tecnicas ancladas a la geometria real */}
      <DimLabel position={[0, 0.02, HZ + 1.3]}>7.00 m</DimLabel>
      <DimLabel position={[-HX - 1.6, 0.02, 0]}>20.00 m</DimLabel>
      <DimLabel position={[-HX - 0.35, 1.5, HZ - 4.5]} boxed>
        2.80 m
      </DimLabel>
    </group>
  );
}

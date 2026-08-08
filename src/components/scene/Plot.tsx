"use client";

import { Grid, Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { PLOT } from "@/lib/constants";

const { width: W, depth: D } = PLOT;
const HX = W / 2;
const HZ = D / 2;

/** Perimetro exacto de la parcela, a ras de suelo. */
const OUTLINE: [number, number, number][] = [
  [-HX, 0.012, -HZ],
  [HX, 0.012, -HZ],
  [HX, 0.012, HZ],
  [-HX, 0.012, HZ],
  [-HX, 0.012, -HZ],
];

const CURB_H = 0.45;
const CURB_T = 0.14;

/**
 * Parcela BRUTAL-140: plano de suelo de exactamente 7 x 20 unidades,
 * grid tecnico (celda 0.5m / seccion 1m) y zocalo perimetral de concreto.
 */
type FloorHandlers = {
  /** Raycast sobre la losa: coordenadas de mundo del cursor del usuario. */
  onPoint?: (x: number, y: number, z: number) => void;
  onFloorDown?: (e: ThreeEvent<PointerEvent>) => void;
  onFloorUp?: (e: ThreeEvent<PointerEvent>, x: number, z: number) => void;
};

export function Plot({ onPoint, onFloorDown, onFloorUp }: FloorHandlers) {
  function handleMove(e: ThreeEvent<PointerEvent>) {
    if (!onPoint) return;
    e.stopPropagation();
    onPoint(e.point.x, e.point.y, e.point.z);
  }

  return (
    <group>
      {/* Losa 7 x 20 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onPointerMove={handleMove}
        onPointerDown={onFloorDown}
        onPointerUp={(e) => onFloorUp?.(e, e.point.x, e.point.z)}
      >
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#141417" roughness={0.96} metalness={0} />
      </mesh>

      {/* Grid tecnico acotado al plano (no infinito) */}
      <Grid
        position={[0, 0.004, 0]}
        args={[W, D]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2c2c33"
        sectionSize={1}
        sectionThickness={0.9}
        sectionColor="#3d3d47"
        fadeDistance={70}
        fadeStrength={1.2}
        infiniteGrid={false}
        side={2}
      />

      {/* Contorno de la parcela */}
      <Line points={OUTLINE} color="#5c5c68" lineWidth={1.2} />

      {/* Zocalo perimetral (concreto expuesto) */}
      <group>
        <mesh position={[0, CURB_H / 2, -HZ + CURB_T / 2]} castShadow receiveShadow>
          <boxGeometry args={[W, CURB_H, CURB_T]} />
          <meshStandardMaterial color="#25252a" roughness={1} metalness={0} />
        </mesh>
        <mesh position={[0, CURB_H / 2, HZ - CURB_T / 2]} castShadow receiveShadow>
          <boxGeometry args={[W, CURB_H, CURB_T]} />
          <meshStandardMaterial color="#25252a" roughness={1} metalness={0} />
        </mesh>
        <mesh position={[-HX + CURB_T / 2, CURB_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[CURB_T, CURB_H, D]} />
          <meshStandardMaterial color="#25252a" roughness={1} metalness={0} />
        </mesh>
        <mesh position={[HX - CURB_T / 2, CURB_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[CURB_T, CURB_H, D]} />
          <meshStandardMaterial color="#25252a" roughness={1} metalness={0} />
        </mesh>
      </group>
    </group>
  );
}

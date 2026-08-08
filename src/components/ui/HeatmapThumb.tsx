"use client";

import { PLOT } from "@/lib/constants";
import { extent, type Entity } from "@/lib/entities";
import { entityHeat } from "@/lib/heat";
import type { Correction } from "@/lib/ai/architect";

/**
 * Miniatura de la sugerencia: planta real de la sala con el movimiento que
 * propone El Arquitecto dibujado encima. El calor sale de la potencia que
 * disipa cada módulo —los mismos kW que ve la IA—, así que el foco rojo del
 * HPC y el verde del jardín son el conflicto que la corrección resuelve.
 */

const HX = PLOT.width / 2;
const HZ = PLOT.depth / 2;

export function HeatmapThumb({
  entities = [],
  corrections = [],
}: {
  entities?: Entity[];
  corrections?: Correction[];
}) {
  const moved = new Set(corrections.map((c) => c.entity));

  return (
    <svg
      viewBox={`${-HZ - 0.5} ${-HX - 0.5} ${PLOT.depth + 1} ${PLOT.width + 1}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-[70px] w-full"
      role="img"
      aria-label="Planta con la corrección propuesta"
    >
      <defs>
        <filter id="hm-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <marker
          id="hm-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 10 5 0 10Z" fill="#a78bfa" />
        </marker>
      </defs>

      <rect x={-HZ - 1} y={-HX - 1} width={PLOT.depth + 2} height={PLOT.width + 2} fill="#0c0c0f" />

      {/* Mapa de calor: el foco crece con los kW que disipa cada módulo */}
      <g filter="url(#hm-blur)" opacity="0.8">
        {entities.map((e) => {
          const { ex, ez } = extent(e);
          const { color, radius } = entityHeat(e);
          return (
            <ellipse
              key={e.id}
              cx={e.z}
              cy={e.x}
              rx={ez + radius}
              ry={ex + radius}
              fill={color}
            />
          );
        })}
      </g>

      {/* Parcela + huellas reales */}
      <g stroke="#ffffff" fill="none" opacity="0.92" vectorEffect="non-scaling-stroke">
        <rect x={-HZ} y={-HX} width={PLOT.depth} height={PLOT.width} strokeWidth={0.14} />
        {entities.map((e) => {
          const { ex, ez } = extent(e);
          return (
            <rect
              key={e.id}
              x={e.z - ez}
              y={e.x - ex}
              width={ez * 2}
              height={ex * 2}
              strokeWidth={moved.has(e.id) ? 0.22 : 0.14}
              strokeDasharray={moved.has(e.id) ? "0.5 0.35" : undefined}
            />
          );
        })}
      </g>

      {/* La corrección: destino en violeta y el vector del movimiento */}
      {corrections.map((c) => {
        const from = entities.find((e) => e.id === c.entity);
        if (!from) return null;
        const { ex, ez } = extent(from);
        return (
          <g key={c.entity}>
            <rect
              x={c.to.z - ez}
              y={c.to.x - ex}
              width={ez * 2}
              height={ex * 2}
              fill="#a78bfa"
              fillOpacity={0.28}
              stroke="#a78bfa"
              strokeWidth={0.16}
            />
            <line
              x1={from.z}
              y1={from.x}
              x2={c.to.z}
              y2={c.to.x}
              stroke="#a78bfa"
              strokeWidth={0.14}
              markerEnd="url(#hm-arrow)"
            />
          </g>
        );
      })}
    </svg>
  );
}

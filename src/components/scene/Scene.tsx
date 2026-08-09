"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo } from "react";
import { useEditor } from "@/components/providers/EditorProvider";
import { useRoom } from "@/components/providers/RoomProvider";
import type { HeldBy } from "@/components/scene/Modules";
import { PLACEABLE, makeEntity } from "@/lib/entities";

/** WebGL solo en cliente: evita cualquier intento de SSR sobre el canvas. */
const Viewport3D = dynamic(
  () => import("./Viewport3D").then((m) => m.Viewport3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-ink">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-dim">
          Inicializando lienzo 7 × 20…
        </span>
      </div>
    ),
  },
);

/**
 * Lienzo 3D a pantalla completa; la UI se dibuja encima.
 * Puente entre el estado de la sala (Portal), la herramienta activa y el arbol
 * de R3F: todo entra como props, sin cruzar contexto por el reconciliador.
 */
export function Scene() {
  const {
    cursors,
    cameras,
    entities,
    locked,
    sun,
    publishCursor,
    publishHolding,
    publishCamera,
    publishDrag,
    upsertEntity,
    removeEntity,
    meId,
  } = useRoom();
  const { tool, selected, setSelected, view, projection, grid, overlays, shot } = useEditor();

  const kind = PLACEABLE[tool];

  // El mapa de cursores solo contiene peers remotos —el propio se descarta al
  // recibirlo—, así que todo lo que traiga `holding` lo está tocando otro.
  const held = useMemo(() => {
    const out: Record<string, HeldBy> = {};
    for (const c of cursors) {
      if (c.holding) out[c.holding] = { name: c.name, color: c.color };
    }
    return out;
  }, [cursors]);

  // Seleccionar no mueve el puntero, pero sí cambia qué estás tocando.
  useEffect(() => {
    publishHolding(selected);
  }, [selected, publishHolding]);

  const place = useCallback(
    (x: number, z: number) => {
      if (!kind) return;
      const index = entities.filter((e) => e.kind === kind).length;
      upsertEntity(makeEntity(kind, x, z, meId ?? "anon", index));
    },
    [kind, entities, upsertEntity, meId],
  );

  // Atajos sobre la seleccion: rotar, borrar, deseleccionar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (e.key === "Escape") return setSelected(null);
      if (!selected) return;
      const entity = entities.find((x) => x.id === selected);
      if (!entity) return;
      if (e.key === "r" || e.key === "R") {
        upsertEntity({ ...entity, rotation: (entity.rotation + 90) % 360 });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        removeEntity(entity.id);
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, entities, upsertEntity, removeEntity, setSelected]);

  return (
    <div className="fixed inset-0 z-0 h-screen w-screen">
      <Viewport3D
        sun={sun}
        cursors={cursors}
        cameras={cameras}
        entities={entities}
        selected={selected}
        held={held}
        view={view}
        projection={projection}
        grid={grid}
        overlays={overlays}
        shot={shot}
        canPlace={!!kind && !locked}
        locked={locked}
        onPoint={publishCursor}
        onCamera={publishCamera}
        onSelect={setSelected}
        onPlace={place}
        onDrag={publishDrag}
        onCommit={upsertEntity}
      />
    </div>
  );
}

"use client";

import { useEditor } from "@/components/providers/EditorProvider";
import { useRoom } from "@/components/providers/RoomProvider";
import { QUICK_VIEWS } from "@/lib/constants";
import { Projection } from "./Projection";
import { Panel, SectionTitle, cx } from "./primitives";

/**
 * Las cuatro proyecciones se calculan de la geometría compartida, así que se
 * actualizan solas cuando alguien —o El Arquitecto— mueve un volumen. Pulsar
 * una lleva además la cámara del lienzo a ese mismo encuadre: la miniatura y
 * la vista 3D dejan de ser dos cosas distintas.
 */
export function QuickViews() {
  const { entities, sun } = useRoom();
  const { quickView, showQuickView } = useEditor();

  return (
    <Panel className="flex min-h-0 flex-col overflow-hidden px-4 pb-3.5 pt-3.5">
      <SectionTitle
        className="mb-2.5"
        right={
          <span className="font-mono text-[9.5px] leading-none text-dim">
            {entities.length} vol.
          </span>
        }
      >
        Vistas rápidas
      </SectionTitle>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">
        {QUICK_VIEWS.map((v) => {
          const on = quickView === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => showQuickView(v.id)}
              title={`Llevar la cámara a ${v.label}`}
              className="flex min-h-0 flex-col text-left"
            >
              <span
                className={cx(
                  "block min-h-0 flex-1 overflow-hidden rounded-[3px] border transition-colors",
                  on
                    ? "border-accent ring-1 ring-accent/40"
                    : "border-line hover:border-[#3a3a41]",
                )}
              >
                <Projection view={v.id} entities={entities} sun={sun} />
              </span>
              <span
                className={cx(
                  "mt-2 block truncate text-center text-[10.5px] leading-none",
                  on ? "text-fg/90" : "text-muted",
                )}
              >
                {v.label}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

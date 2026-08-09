"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { QuickViewId, ToolId } from "@/lib/constants";
import { VIEW_PRESETS, type View, type ViewRequest } from "@/lib/views";

/** Cómo proyecta la cámara: en perspectiva se habita, en ortográfica se acota. */
export type Projection = "perspective" | "ortho";

type EditorValue = {
  /** Herramienta activa de la paleta izquierda. */
  tool: ToolId;
  setTool: (tool: ToolId) => void;
  /** Entidad seleccionada en el lienzo. */
  selected: string | null;
  setSelected: (id: string | null) => void;
  /** Encuadre pedido a la cámara; su identidad es lo que dispara el vuelo. */
  view: ViewRequest | null;
  /** Vista rápida activa, o null si la cámara se fue a otro sitio. */
  quickView: QuickViewId | null;
  /** Lleva la cámara a un encuadre cualquiera (un peer, una corrección…). */
  flyTo: (to: View, key: string) => void;
  /** Lleva la cámara a una de las cuatro proyecciones del panel. */
  showQuickView: (id: QuickViewId) => void;
  projection: Projection;
  setProjection: (p: Projection) => void;
  /** Rejilla técnica de 0.5 m sobre la losa. */
  grid: boolean;
  setGrid: (on: boolean) => void;
  /** Capa de anotación del lienzo: discos térmicos, aristas y etiquetas. */
  overlays: boolean;
  setOverlays: (on: boolean) => void;
  /**
   * Petición de captura. Es un contador, no un booleano: pulsar dos veces tiene
   * que disparar dos PNG, y un booleano se quedaría pegado en `true`.
   */
  shot: number;
  capture: () => void;
};

const EditorContext = createContext<EditorValue | null>(null);

export function useEditor(): EditorValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor() debe usarse dentro de <EditorProvider>");
  return value;
}

/**
 * Contador de peticiones de cámara. Fuera de React: solo sirve para que pedir
 * dos veces el mismo encuadre siga siendo un objeto nuevo, y por tanto un vuelo
 * nuevo, sin que su valor provoque ningún render por sí mismo.
 */
let seq = 0;

/** Estado de edición puramente local: no viaja por Portal. */
export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [tool, setTool] = useState<ToolId>("muro");
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<ViewRequest | null>(null);
  const [quickView, setQuickView] = useState<QuickViewId | null>("iso");
  const [projection, setProjection] = useState<Projection>("perspective");
  const [grid, setGrid] = useState(true);
  const [overlays, setOverlays] = useState(true);
  const [shot, setShot] = useState(0);

  const flyTo = useCallback((to: View, key: string) => {
    setView({ ...to, id: `${key}-${++seq}` });
    setQuickView(null);
  }, []);

  const showQuickView = useCallback((id: QuickViewId) => {
    setView({ ...VIEW_PRESETS[id], id: `qv-${id}-${++seq}` });
    setQuickView(id);
  }, []);

  const capture = useCallback(() => setShot((n) => n + 1), []);

  const value = useMemo(
    () => ({
      tool,
      setTool,
      selected,
      setSelected,
      view,
      quickView,
      flyTo,
      showQuickView,
      projection,
      setProjection,
      grid,
      setGrid,
      overlays,
      setOverlays,
      shot,
      capture,
    }),
    [tool, selected, view, quickView, flyTo, showQuickView, projection, grid, overlays, shot, capture],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

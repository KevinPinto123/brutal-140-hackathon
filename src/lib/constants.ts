/**
 * BRUTAL-140 — Constantes del proyecto: geometría de la parcela, paleta de
 * herramientas y materiales.
 *
 * Lo que era estado de maqueta ya no está aquí. Ni participantes de ejemplo, ni
 * avatares de sesión, ni una conversación de arranque, ni una frase puesta en
 * boca del agente: todo eso se pintaba como si fuera real y no lo era. La gente
 * de la sala sale de la presencia de Portal, y lo que dice el agente sale de lo
 * que el agente haya dicho. Cuando no hay nada, se dice que no hay nada.
 */
import type { MaterialId } from "./entities";

export const PLOT = {
  width: 7, // metros (eje X)
  depth: 20, // metros (eje Z)
  area: 140, // m2
  maxHeight: 4.5, // altura libre maxima
} as const;

export const ROOM_ID = "lab_140";

export type UserColor = "violet" | "green" | "blue" | "amber" | "cyan";

export const COLORS: Record<UserColor, string> = {
  violet: "#a855f7",
  green: "#22c55e",
  blue: "#3b82f6",
  amber: "#f59e0b",
  cyan: "#06b6d4",
};

export type ToolId =
  | "mover"
  | "muro"
  | "puerta"
  | "abertura"
  | "jardin"
  | "pilar"
  | "escalera"
  | "hpc"
  | "racks"
  | "robotica"
  | "impresion"
  | "material"
  | "anotacion";

/** La paleta separa el recinto del programa que se mete dentro. */
export type ToolGroup = "Arquitectura" | "Programa" | "Utilidades";

export const TOOLS: { id: ToolId; label: string; group: ToolGroup }[] = [
  { id: "mover", label: "Mover", group: "Arquitectura" },
  { id: "muro", label: "Muro", group: "Arquitectura" },
  { id: "puerta", label: "Puerta / Ventana", group: "Arquitectura" },
  { id: "abertura", label: "Abertura", group: "Arquitectura" },
  { id: "jardin", label: "Jardín interno", group: "Arquitectura" },
  { id: "pilar", label: "Pilar", group: "Arquitectura" },
  { id: "escalera", label: "Escalera", group: "Arquitectura" },
  { id: "hpc", label: "Módulo HPC", group: "Programa" },
  { id: "racks", label: "Racks de servidores", group: "Programa" },
  { id: "robotica", label: "Celda de robótica", group: "Programa" },
  { id: "impresion", label: "Impresión 3D", group: "Programa" },
  { id: "material", label: "Material", group: "Utilidades" },
  { id: "anotacion", label: "Anotación", group: "Utilidades" },
];

export const PLOT_RULES = [
  { label: "Ancho fijo:", value: "7.00 m" },
  { label: "Largo fijo:", value: "20.00 m" },
  { label: "Área:", value: "140.00 m²" },
  { label: "Altura libre máx.:", value: "4.50 m" },
];

export const ANALYSIS = [
  { id: "light", label: "Iluminación natural", value: "76%", tone: "green" },
  { id: "load", label: "Carga estructural", value: "Segura", tone: "green" },
  { id: "flow", label: "Circulación", value: "Óptima", tone: "green" },
  { id: "acoustic", label: "Privacidad acústica", value: "Media", tone: "amber" },
] as const;

/** `texture` es el `MaterialId` real de la entidad: la paleta escribe geometría. */
export const MATERIALS: {
  id: string;
  label: string;
  swatch: string;
  texture: MaterialId;
}[] = [
  { id: "concreto", label: "Concreto\nPulido", swatch: "#cdc9c3", texture: "concrete" },
  { id: "acero", label: "Acero\nNegro", swatch: "#1c1c1e", texture: "steel" },
  { id: "madera", label: "Madera\nRoble Claro", swatch: "#b5834a", texture: "wood" },
];

export type QuickViewId = "plan" | "iso" | "section" | "facade";

export const QUICK_VIEWS: { id: QuickViewId; label: string }[] = [
  { id: "plan", label: "Planta 2D" },
  { id: "iso", label: "Isométrica" },
  { id: "section", label: "Sección Longitudinal" },
  { id: "facade", label: "Fachada Frontal" },
];


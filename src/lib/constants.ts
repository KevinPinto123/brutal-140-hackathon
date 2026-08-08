/**
 * BRUTAL-140 — Single source of truth for plot geometry, roster and mock state.
 * Everything the realtime layer (Portal) will eventually drive lives here first
 * as static data, so swapping in live state is a one-file change per surface.
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

export type Participant = {
  id: string;
  name: string;
  color: UserColor;
  status: string;
  statusTone: "muted" | "green" | "blue" | "violet";
  isAI?: boolean;
  /** Posicion del cursor volumetrico dentro de la malla (x, y, z) en metros. */
  cursor: [number, number, number];
};

export const PARTICIPANTS: Participant[] = [
  {
    id: "diego",
    name: "Diego",
    color: "blue",
    status: "Editando",
    statusTone: "muted",
    cursor: [-2.6, 0.05, 6.4],
  },
  {
    id: "claudia",
    name: "Claudia",
    color: "violet",
    status: "Moviendo muro",
    statusTone: "green",
    cursor: [-2.9, 0.05, -7.8],
  },
  {
    id: "mateo",
    name: "Mateo",
    color: "green",
    status: "Vista 3D",
    statusTone: "blue",
    cursor: [3.0, 0.05, -3.4],
  },
  {
    id: "ai_architect",
    name: "AI Architect",
    color: "violet",
    status: "Diseñando",
    statusTone: "violet",
    isAI: true,
    cursor: [0.2, 0.05, 0.6],
  },
];

export const SESSION_AVATARS = [
  { id: "a1", initials: "DG", ring: "#3b82f6", from: "#3f4b63", to: "#232a36" },
  { id: "a2", initials: "CL", ring: "#f59e0b", from: "#6b4a2a", to: "#33241a" },
  { id: "a3", initials: "MT", ring: "#a855f7", from: "#4a2f6b", to: "#281a38" },
  { id: "a4", initials: "SV", ring: "#3b82f6", from: "#2f4a6b", to: "#1a2638" },
  { id: "a5", initials: "RN", ring: "#22c55e", from: "#2c5a3c", to: "#1a2f22" },
];

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

export type ChatMessage = {
  id: string;
  author: string;
  authorId: string;
  time: string;
  body: string;
  isAI?: boolean;
};

export const CHAT_SEED: ChatMessage[] = [
  {
    id: "m1",
    author: "Mateo",
    authorId: "mateo",
    time: "12:38 PM",
    body: "¿Qué tal si abrimos un patio aquí?",
  },
  {
    id: "m2",
    author: "AI Architect",
    authorId: "ai_architect",
    time: "12:39 PM",
    body: "Buena idea. Mejoraría la ventilación cruzada.",
    isAI: true,
  },
  {
    id: "m3",
    author: "Claudia",
    authorId: "claudia",
    time: "12:40 PM",
    body: "Me gusta, y podríamos agregar vegetación.",
  },
];

export type QuickViewId = "plan" | "iso" | "section" | "facade";

export const QUICK_VIEWS: { id: QuickViewId; label: string }[] = [
  { id: "plan", label: "Planta 2D" },
  { id: "iso", label: "Isométrica" },
  { id: "section", label: "Sección Longitudinal" },
  { id: "facade", label: "Fachada Frontal" },
];

export const AI_SUGGESTION = {
  message: "He detectado un posible problema de iluminación y circulación.",
  messageTime: "12:40 PM",
  suggestion:
    "Mover muro 0.80m hacia la izquierda para mejorar el ingreso de luz natural y la circulación.",
};

/**
 * Icon set — 16px stroke icons, currentColor. No external deps.
 */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 14, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---------- chrome ---------- */

export const ChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const Plus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const Check = (p: P) => (
  <Svg {...p}>
    <path d="m20 6-11 11-5-5" />
  </Svg>
);

/** Reloj con la flecha hacia atrás: la cinta del tiempo del log. */
export const History = (p: P) => (
  <Svg {...p}>
    <path d="M3 3v6h6" />
    <path d="M3.5 13a9 9 0 1 0 2.1-6.4L3 9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
);

export const Send = (p: P) => (
  <Svg {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </Svg>
);

export const Lock = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="10.5" width="16" height="10.5" rx="1.8" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </Svg>
);

/** Candado abierto: el arco sale por la derecha. */
export const Unlock = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="10.5" width="16" height="10.5" rx="1.8" />
    <path d="M8 10.5V7a4 4 0 0 1 7.7-1.5" />
  </Svg>
);

/** Escoba: vaciar la parcela. */
export const Broom = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 3.5 20 9" />
    <path d="m9 15 6.5-6.5a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L12 18" />
    <path d="M9 15l-4 4 4 2 3-3" />
  </Svg>
);

export const Sun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);

export const Sparkles = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5 13.6 8.4 18.5 10 13.6 11.6 12 16.5 10.4 11.6 5.5 10 10.4 8.4Z" />
    <path d="M18.5 3v3M20 4.5h-3M6 17v3M7.5 18.5h-3" />
  </Svg>
);

export const Minus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);

export const Circle = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
  </Svg>
);

/* ---------- viewport toolbar ---------- */

export const Cursor = (p: P) => (
  <Svg {...p}>
    <path d="m5 3 6.5 16.5 2.3-6.7 6.7-2.3Z" />
  </Svg>
);

export const Target = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    <circle cx="12" cy="12" r="5" />
  </Svg>
);

export const Rotate = (p: P) => (
  <Svg {...p}>
    <path d="M12 4.5a7.5 7.5 0 1 1-6.4 3.6" />
    <path d="M4.4 4v4.2h4.2" />
  </Svg>
);

export const Move = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v18M3 12h18" />
    <path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
  </Svg>
);

export const GridIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
  </Svg>
);

export const Eye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);

export const Camera = (p: P) => (
  <Svg {...p}>
    <path d="M3 8.5h3.2L8 6h8l1.8 2.5H21v10H3Z" />
    <circle cx="12" cy="13" r="3.2" />
  </Svg>
);

/* ---------- tools ---------- */

export const Wall = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="6" width="17" height="12" rx="1" />
  </Svg>
);

export const Door = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="1" />
    <path d="M9 4v16" />
  </Svg>
);

export const Opening = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="1" />
    <path d="M8 4v16M16 4v16" />
  </Svg>
);

export const Leaf = (p: P) => (
  <Svg {...p}>
    <path d="M20 4c0 8-4.5 13-11 13H5c0-8 4.6-13 11-13Z" />
    <path d="M4 21c2-5 5.5-8.5 10-11" />
  </Svg>
);

export const Pillar = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="3.5" width="8" height="17" rx="1" />
    <path d="M6 3.5h12M6 20.5h12" />
  </Svg>
);

export const Stairs = (p: P) => (
  <Svg {...p}>
    <path d="M3 20h4v-4h5v-4h5V8h4" />
    <path d="M3 20V4" opacity="0.35" />
  </Svg>
);

export const Layers = (p: P) => (
  <Svg {...p}>
    <path d="m12 3 9 5-9 5-9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Svg>
);

export const Annotation = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.2v.01M11.2 11.5h1v4.3h1" />
  </Svg>
);

export const Undo = (p: P) => (
  <Svg {...p}>
    <path d="M4 10h10a5 5 0 0 1 0 10h-4" />
    <path d="m8 6-4 4 4 4" />
  </Svg>
);

export const Redo = (p: P) => (
  <Svg {...p}>
    <path d="M20 10H10a5 5 0 0 0 0 10h4" />
    <path d="m16 6 4 4-4 4" />
  </Svg>
);

export const Trash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
  </Svg>
);

/* ---------- analysis ---------- */

export const Structure = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v4M4 21l8-14 8 14M7.6 15h8.8" />
  </Svg>
);

export const Flow = (p: P) => (
  <Svg {...p}>
    <circle cx="6" cy="7" r="1.6" />
    <circle cx="18" cy="7" r="1.6" />
    <circle cx="6" cy="17" r="1.6" />
    <circle cx="18" cy="17" r="1.6" />
    <path d="M9 8.5 15 15.5M15 8.5 9 15.5" opacity="0.5" />
  </Svg>
);

export const Acoustic = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" />
    <path d="M16 9.2a4 4 0 0 1 0 5.6M18.6 6.6a7.6 7.6 0 0 1 0 10.8" />
  </Svg>
);

/* ---------- programa del laboratorio ---------- */

/** Nodo HPC: bastidor con disipación. */
export const Hpc = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="1.6" />
    <path d="M8 8h8M8 12h8M8 16h4" />
    <path d="M17.4 15.2v3.4" opacity="0.55" />
  </Svg>
);

/** Racks: dos torres con sus bahías. */
export const Racks = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7" height="17" rx="1.4" />
    <rect x="13.5" y="3.5" width="7" height="17" rx="1.4" />
    <path d="M5.5 8h3M5.5 12h3M15.5 8h3M15.5 12h3" />
  </Svg>
);

/** Celda de robótica: brazo articulado sobre su base. */
export const Robot = (p: P) => (
  <Svg {...p}>
    <path d="M4 21h7" />
    <path d="M7.5 21v-6.5L14 9l4.5 2.2" />
    <circle cx="7.5" cy="14.5" r="1.6" />
    <path d="M16.4 8.2 20 4.6" />
    <path d="M18.2 3.2h3.2v3.2" />
  </Svg>
);

/** Impresión 3D: pórtico y pieza en construcción. */
export const Printer3D = (p: P) => (
  <Svg {...p}>
    <path d="M4 4h16" />
    <path d="M12 4v6" />
    <path d="M8.5 10h7" />
    <path d="M5 20h14" />
    <path d="M9 20v-4h6v4" />
  </Svg>
);

export const TOOL_ICONS = {
  mover: Move,
  muro: Wall,
  puerta: Door,
  abertura: Opening,
  jardin: Leaf,
  pilar: Pillar,
  escalera: Stairs,
  hpc: Hpc,
  racks: Racks,
  robotica: Robot,
  impresion: Printer3D,
  material: Layers,
  anotacion: Annotation,
} as const;

export const ANALYSIS_ICONS = {
  light: Sun,
  load: Structure,
  flow: Flow,
  acoustic: Acoustic,
} as const;

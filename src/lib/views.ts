import { PLOT, type QuickViewId } from "@/lib/constants";

/**
 * Encuadres de cámara compartidos por todo el producto.
 *
 * Un encuadre es un par ojo/objetivo en metros, nada más: así el mismo tipo
 * sirve para las vistas rápidas, para el vuelo hacia la corrección de la IA y
 * para adoptar el punto de vista de otro participante, que llega por el canal
 * de señales exactamente con esta forma.
 */
export type Vec3 = [number, number, number];

export type View = {
  eye: Vec3;
  target: Vec3;
};

/** Petición de vuelo: la identidad del objeto es lo que dispara el movimiento. */
export type ViewRequest = View & { id: string };

/** Encuadre de arranque. Coincide con la cámara inicial del lienzo. */
export const HOME: View = { eye: [10.5, 9.5, 16], target: [0, 0.4, 0] };

const HALF_Z = PLOT.depth / 2;

/**
 * Las cuatro proyecciones rápidas, llevadas a la cámara real. Las distancias
 * salen de encajar la parcela en un campo de 36°: la planta necesita cubrir los
 * 20 m del eje largo, la fachada solo los 7 m del corto.
 */
export const VIEW_PRESETS: Record<QuickViewId, View> = {
  // Cenital. El ojo se desplaza un poco en Z para no degenerar el vector "arriba".
  plan: { eye: [0, 34, 0.8], target: [0, 0, 0] },
  iso: HOME,
  // Sección longitudinal: se mira a lo largo del eje X, contra el muro de 20 m.
  section: { eye: [19, 5.5, 0], target: [0, 1.5, 0] },
  // Fachada frontal: de frente a la cara corta, desde fuera de la parcela.
  facade: { eye: [0, 4, HALF_Z + 2], target: [0, 1.5, 0] },
};

/**
 * Altura del campo ortográfico, en metros.
 *
 * Una cámara ortográfica no tiene campo de visión: lo que fija la escala es el
 * `zoom`, y el `zoom` de three se mide en píxeles por unidad de mundo. Repartir
 * la altura del lienzo entre estos metros da un encuadre que no depende de la
 * resolución de la pantalla. 26 m dejan entrar los 20 m del eje largo con
 * margen para el zócalo y las etiquetas.
 */
export const ORTHO_FIT = 26;

/** Encuadre que mira de cerca a un punto de la parcela, desde el aire. */
export function viewOnPoint(x: number, z: number): View {
  return { eye: [x + 6.5, 6, z + 8], target: [x, 0.8, z] };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const lerpVec3 = (a: Vec3, b: Vec3, k: number): Vec3 => [
  lerp(a[0], b[0], k),
  lerp(a[1], b[1], k),
  lerp(a[2], b[2], k),
];

/** Suavizado del vuelo: arranca y frena, sin tirón en los extremos. */
export const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

/** Duración del vuelo en ms. Corto: en la demo nadie espera a una cámara. */
export const FLIGHT_MS = 620;

"use client";

import { PLOT } from "@/lib/constants";
import { sunLight, sunPosition, type SunState } from "@/lib/sun";

/**
 * La luz de la parcela, gobernada por la hora compartida.
 *
 * El brief pide «todo blanco con luz blanca artificial y natural», y hasta ahora
 * el lienzo tenía un sol clavado en [8, 14, 9]: bonito, pero incapaz de sostener
 * el momento de la demo en que unos racks tapan la luz. Aquí el foco direccional
 * ES el vector solar de `sun.ts`, así que la sombra que se ve en pantalla y los
 * metros cuadrados que mide `light.ts` salen de la misma posición del sol.
 *
 * La segunda mitad del enunciado —la luz artificial— entra al retirarse la
 * natural: las luminarias blancas suben solas a última hora. No es decoración,
 * es lo que hace legible el laboratorio a las 19:00.
 */

/** La cámara de sombras cubre la parcela entera con holgura para los volúmenes. */
const SHADOW_EXTENT = 14;

/** Luminarias cenitales, repartidas por el eje largo de la nave. */
const LUMINAIRES = [-7.5, -2.5, 2.5, 7.5];
const LUMINAIRE_Y = 4.4;

export function Sky({ sun }: { sun: SunState }) {
  const { intensity, color, ambient, artificial } = sunLight(sun);
  const position = sunPosition(sun);

  return (
    <>
      {/* Rebote del cielo: nunca desaparece del todo, ni de noche. */}
      <ambientLight intensity={ambient} color="#ffffff" />

      {/* El sol. Su sombra es la que se mide en el panel. */}
      <directionalLight
        position={position}
        intensity={intensity}
        color={color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={90}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
      />

      {/* Relleno frío del norte: separa los volúmenes contra el fondo. */}
      <directionalLight position={[-10, 7, -8]} intensity={0.25} color="#cdd8ff" />

      {/* Marcador del sol: al arrastrar la hora se ve moverse, no solo su sombra. */}
      <mesh position={position} visible={sun.day > 0.02}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Luz blanca artificial: entra cuando la natural se va. */}
      {LUMINAIRES.map((z) => (
        <group key={z} position={[0, LUMINAIRE_Y, z]}>
          <pointLight
            intensity={artificial * 22}
            color="#ffffff"
            distance={14}
            decay={2}
          />
          <mesh>
            <boxGeometry args={[PLOT.width * 0.55, 0.07, 0.22]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={artificial * 2.4}
              toneMapped={false}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

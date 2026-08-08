"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { clampToPlot, type Entity } from "@/lib/entities";
import type { LiveCamera, LiveCursor } from "@/lib/portal/events";
import type { SunState } from "@/lib/sun";
import {
  FLIGHT_MS,
  HOME,
  easeInOut,
  lerpVec3,
  type Vec3,
  type View,
  type ViewRequest,
} from "@/lib/views";
import { Modules, type HeldBy } from "./Modules";
import { Plot } from "./Plot";
import { PresenceLayer } from "./PresenceLayer";
import { Sky } from "./Sky";

export type ViewportProps = {
  /** Hora solar de la sala: de ella salen la luz, la sombra y el porcentaje. */
  sun: SunState;
  cursors?: LiveCursor[];
  cameras?: Record<string, LiveCamera>;
  entities?: Entity[];
  selected?: string | null;
  /** Volúmenes que otros peers tienen agarrados ahora mismo. */
  held?: Record<string, HeldBy>;
  /** Encuadre al que volar. Cambiar la identidad del objeto dispara el vuelo. */
  view?: ViewRequest | null;
  /** La herramienta activa deposita geometría al hacer clic en la losa. */
  canPlace?: boolean;
  /** Diseño cerrado: se puede mirar y orbitar, no tocar. */
  locked?: boolean;
  onPoint?: (x: number, y: number, z: number, status?: string, holding?: string | null) => void;
  onCamera?: (eye: Vec3, target: Vec3) => void;
  onSelect?: (id: string | null) => void;
  onPlace?: (x: number, z: number) => void;
  onDrag?: (id: string, x: number, z: number) => void;
  onCommit?: (entity: Entity) => void;
};

/** Umbral en píxeles para distinguir un clic de una órbita de cámara. */
const CLICK_SLOP = 4;

/**
 * Último objetivo real de los controles. Vive fuera de React porque cambia a
 * 60 Hz mientras alguien orbita y no debe provocar ni un solo render: solo se
 * lee al arrancar un vuelo, para salir desde donde está la cámara de verdad.
 */
const live = { target: HOME.target as Vec3 };

/**
 * Cámara declarativa. Durante un vuelo el encuadre es estado de React y R3F lo
 * aplica cuadro a cuadro; cuando el vuelo termina el valor deja de cambiar, R3F
 * deja de escribirlo y OrbitControls recupera el mando sin pelearse con nadie.
 */
function CameraRig({
  view,
  frozen,
  onCamera,
}: {
  view?: ViewRequest | null;
  /** Los controles se apagan mientras se arrastra un volumen. */
  frozen?: boolean;
  onCamera?: (eye: Vec3, target: Vec3) => void;
}) {
  const camera = useThree((s) => s.camera);
  const [frame, setFrame] = useState<View>(HOME);

  useEffect(() => {
    if (!view) return;
    const from: View = {
      eye: [camera.position.x, camera.position.y, camera.position.z],
      target: live.target,
    };
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = easeInOut(Math.min(1, (now - start) / FLIGHT_MS));
      setFrame({
        eye: lerpVec3(from.eye, view.eye, k),
        target: lerpVec3(from.target, view.target, k),
      });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [view, camera]);

  // `change` dispara en cada cuadro con amortiguación; el techo de publicación
  // lo pone el provider, aquí solo se lee el estado de los controles.
  const handleChange = useCallback(
    (e?: { target?: { target?: { x: number; y: number; z: number } } }) => {
      const t = e?.target?.target;
      if (t) live.target = [t.x, t.y, t.z];
      onCamera?.([camera.position.x, camera.position.y, camera.position.z], live.target);
    },
    [camera, onCamera],
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={frame.eye} fov={36} near={0.1} far={300} />
      <OrbitControls
        makeDefault
        enabled={!frozen}
        target={frame.target}
        onChange={handleChange}
        enableDamping
        dampingFactor={0.07}
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.12}
      />
    </>
  );
}

function SceneGraph({
  cursors,
  cameras,
  entities = [],
  selected = null,
  held,
  view,
  canPlace,
  locked,
  onPoint,
  onCamera,
  onSelect,
  onPlace,
  onDrag,
  onCommit,
}: Omit<ViewportProps, "sun">) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; z: number } | null>(null);
  const dragPosRef = useRef<{ x: number; z: number } | null>(null);
  const down = useRef({ x: 0, y: 0 });

  // El volumen arrastrado se pinta en local; a la sala va por el canal de señales.
  const shown = entities.map((e) =>
    e.id === dragId && dragPos ? clampToPlot({ ...e, x: dragPos.x, z: dragPos.z }) : e,
  );

  function grab(e: ThreeEvent<PointerEvent>, id: string) {
    e.stopPropagation();
    onSelect?.(id);
    if (locked) return; // con el diseño cerrado se selecciona, pero no se mueve
    down.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
    dragPosRef.current = null;
    setDragId(id);
    setDragPos(null);
  }

  function point(x: number, y: number, z: number) {
    // El puntero lleva encima qué volumen se está tocando: es lo que pinta el
    // halo de color en el cliente de los demás.
    onPoint?.(x, y, z, dragId ? "dragging" : "explorando", dragId ?? selected);
    if (!dragId) return;
    dragPosRef.current = { x, z };
    setDragPos({ x, z });
    onDrag?.(dragId, x, z);
  }

  function floorDown(e: ThreeEvent<PointerEvent>) {
    down.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  }

  function floorUp(e: ThreeEvent<PointerEvent>, x: number, z: number) {
    if (dragId) return; // el cierre del arrastre lo lleva el listener global
    const moved = Math.hypot(
      e.nativeEvent.clientX - down.current.x,
      e.nativeEvent.clientY - down.current.y,
    );
    if (moved > CLICK_SLOP) return; // fue una órbita de cámara
    if (canPlace) onPlace?.(x, z);
    else onSelect?.(null);
  }

  // Soltar fuera del lienzo tambien cierra el arrastre.
  useEffect(() => {
    if (!dragId) return;
    function end() {
      const entity = entities.find((e) => e.id === dragId);
      const to = dragPosRef.current;
      if (entity && to) onCommit?.(clampToPlot({ ...entity, x: to.x, z: to.z }));
      dragPosRef.current = null;
      setDragId(null);
      setDragPos(null);
    }
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, [dragId, entities, onCommit]);

  return (
    <>
      <Plot onPoint={point} onFloorDown={floorDown} onFloorUp={floorUp} />
      <Modules entities={shown} selected={selected} dragId={dragId} held={held} onGrab={grab} />
      <PresenceLayer cursors={cursors} cameras={cameras} />

      <CameraRig view={view} frozen={!!dragId} onCamera={onCamera} />
    </>
  );
}

/**
 * Lienzo WebGL a pantalla completa (100vh). La HUD se superpone encima:
 * el area visible del canvas es la ventana central del layout.
 */
export function Viewport3D({ sun, ...props }: ViewportProps) {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: HOME.eye, fov: 36, near: 0.1, far: 300 }}
    >
      <color attach="background" args={["#0a0a0b"]} />
      <fog attach="fog" args={["#0a0a0b", 34, 90]} />

      {/* Luz blanca, natural y artificial, gobernada por la hora de la sala */}
      <Sky sun={sun} />

      <SceneGraph {...props} />
    </Canvas>
  );
}

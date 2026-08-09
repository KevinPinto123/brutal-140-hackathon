"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import type { Object3D } from "three";
import {
  Environment,
  Lightformer,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
import type { Projection } from "@/components/providers/EditorProvider";
import { clampToPlot, type Entity } from "@/lib/entities";
import type { LiveCamera, LiveCursor } from "@/lib/portal/events";
import type { SunState } from "@/lib/sun";
import {
  FLIGHT_MS,
  HOME,
  ORTHO_FIT,
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
  /** Perspectiva para habitar el espacio, ortográfica para acotarlo. */
  projection?: Projection;
  /** Rejilla técnica de 0.5 m sobre la losa. */
  grid?: boolean;
  /** Capa de anotación: discos térmicos, aristas y etiquetas de los volúmenes. */
  overlays?: boolean;
  /** Contador de capturas; al subir, el lienzo se baja como PNG. */
  shot?: number;
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
 * Encuadre real de los controles, ojo y objetivo. Vive fuera de React porque
 * cambia a 60 Hz mientras alguien orbita y no debe provocar ni un solo render:
 * solo se lee en dos momentos, al arrancar un vuelo y al cambiar de proyección,
 * y en los dos hace falta saber dónde está la cámara de verdad, no dónde la
 * dejó el último encuadre declarado.
 */
const live = { eye: HOME.eye as Vec3, target: HOME.target as Vec3 };

/**
 * Cámara declarativa. Durante un vuelo el encuadre es estado de React y R3F lo
 * aplica cuadro a cuadro; cuando el vuelo termina el valor deja de cambiar, R3F
 * deja de escribirlo y OrbitControls recupera el mando sin pelearse con nadie.
 */
function CameraRig({
  view,
  projection = "perspective",
  frozen,
  onCamera,
}: {
  view?: ViewRequest | null;
  projection?: Projection;
  /** Los controles se apagan mientras se arrastra un volumen. */
  frozen?: boolean;
  onCamera?: (eye: Vec3, target: Vec3) => void;
}) {
  const camera = useThree((s) => s.camera);
  const height = useThree((s) => s.size.height);
  const [frame, setFrame] = useState<View>(HOME);

  // El vuelo sale de `live`, no de `camera`: así cambiar de proyección —que
  // sustituye el objeto cámara— no cuenta como una petición de vuelo nueva.
  useEffect(() => {
    if (!view) return;
    const from: View = { eye: live.eye, target: live.target };
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
  }, [view]);

  /**
   * Cambiar de proyección monta otra cámara, y la nueva nacería en `frame`, que
   * es donde acabó el último vuelo: todo lo orbitado a mano desde entonces se
   * perdería de golpe. Esto la coloca donde estaba la anterior de verdad.
   *
   * Va en un ref y no en un efecto por dos razones: React llama al ref en el
   * commit, antes de pintar, así que no hay ni un cuadro en el sitio
   * equivocado; y con identidad estable solo se llama al montar y al
   * desmontar, de modo que no le pisa la posición al vuelo, que sí es estado.
   */
  const placeCamera = useCallback((cam: Object3D | null) => {
    if (cam) cam.position.set(live.eye[0], live.eye[1], live.eye[2]);
  }, []);

  // `change` dispara en cada cuadro con amortiguación; el techo de publicación
  // lo pone el provider, aquí solo se lee el estado de los controles.
  const handleChange = useCallback(
    (e?: { target?: { target?: { x: number; y: number; z: number } } }) => {
      const t = e?.target?.target;
      if (t) live.target = [t.x, t.y, t.z];
      live.eye = [camera.position.x, camera.position.y, camera.position.z];
      onCamera?.(live.eye, live.target);
    },
    [camera, onCamera],
  );

  return (
    <>
      {projection === "ortho" ? (
        /*
          Sin campo de visión no hay fuga: las paredes paralelas salen paralelas
          y una medida vale igual en cualquier punto del lienzo. Es la vista con
          la que se acota un plano.

          `near` negativo a propósito: el plano de recorte cercano de una cámara
          ortográfica es una rebanada perpendicular a la mirada, y con los ojos
          de las vistas rápidas —la fachada mira desde 12 m— cortaría el modelo
          por la mitad. Dejarlo detrás de la cámara evita el corte.
        */
        <OrthographicCamera
          ref={placeCamera}
          makeDefault
          position={frame.eye}
          zoom={height / ORTHO_FIT}
          near={-200}
          far={400}
        />
      ) : (
        <PerspectiveCamera
          ref={placeCamera}
          makeDefault
          position={frame.eye}
          fov={36}
          near={0.1}
          far={300}
        />
      )}
      <OrbitControls
        makeDefault
        enabled={!frozen}
        target={frame.target}
        onChange={handleChange}
        enableDamping
        dampingFactor={0.07}
        // El acercamiento en perspectiva se mide en metros y en ortográfica en
        // zoom; OrbitControls ignora el par que no toca según la cámara activa.
        minDistance={5}
        maxDistance={60}
        minZoom={10}
        maxZoom={260}
        maxPolarAngle={Math.PI / 2.12}
      />
    </>
  );
}

/**
 * Captura del lienzo. Se dibuja un cuadro a mano y se lee el búfer en el mismo
 * turno: WebGL descarta el contenido del lienzo en cuanto lo compone, así que
 * leerlo un tick más tarde daría un PNG en negro. La alternativa —arrancar el
 * contexto con `preserveDrawingBuffer`— cuesta memoria en cada cuadro de la
 * sesión a cambio de una foto que casi nadie pide.
 *
 * Lo que sale es exactamente el WebGL: las etiquetas de drei son DOM flotando
 * encima del lienzo y no entran, igual que no entra la HUD.
 */
function Capture({ shot }: { shot?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!shot) return;
    gl.render(scene, camera);
    const link = document.createElement("a");
    link.href = gl.domElement.toDataURL("image/png");
    link.download = `brutal-140-${String(shot).padStart(2, "0")}.png`;
    link.click();
  }, [shot, gl, scene, camera]);

  return null;
}

function SceneGraph({
  cursors,
  cameras,
  entities = [],
  selected = null,
  held,
  view,
  projection,
  grid = true,
  overlays = true,
  shot,
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
      <Plot grid={grid} onPoint={point} onFloorDown={floorDown} onFloorUp={floorUp} />
      <Modules
        entities={shown}
        selected={selected}
        dragId={dragId}
        held={held}
        overlays={overlays}
        onGrab={grab}
      />
      <PresenceLayer cursors={cursors} cameras={cameras} />

      <CameraRig
        view={view}
        projection={projection}
        frozen={!!dragId}
        onCamera={onCamera}
      />
      <Capture shot={shot} />
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

      {/*
        Entorno de reflejo, montado a mano. El acero de los racks y el vidrio de
        las aberturas necesitan algo que reflejar: sin mapa de entorno, `metalness`
        alto se ve negro y el vidrio se ve plano.

        Los presets de drei (`preset="city"`) descargan un HDRI de un CDN: fuera,
        porque la promesa del README es WebGL ligero y porque una demo en vivo no
        se juega a que responda un servidor ajeno. Estos lightformers se cocinan en
        un cubemap de 128 px y con `frames={1}` se hornean una sola vez.
      */}
      <Environment resolution={128} frames={1}>
        {/* Cielo: la fuente ancha de arriba */}
        <Lightformer form="rect" intensity={2.2} position={[0, 12, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[40, 40, 1]} color="#dfe7f2" />
        {/* Ventanal al sur, el que da el brillo largo sobre el acero */}
        <Lightformer form="rect" intensity={1.6} position={[0, 3, 16]} scale={[24, 6, 1]} color="#ffffff" />
        {/* Rebote frío desde el norte, para que el lado en sombra no muera en negro */}
        <Lightformer form="rect" intensity={0.7} position={[0, 4, -16]} rotation={[0, Math.PI, 0]} scale={[24, 6, 1]} color="#8ea6c4" />
        {/* Suelo: la losa clara devuelve luz cálida por abajo */}
        <Lightformer form="rect" intensity={0.5} position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[40, 40, 1]} color="#b9b2a6" />
      </Environment>

      <SceneGraph {...props} />
    </Canvas>
  );
}

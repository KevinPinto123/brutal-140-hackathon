"use client";

import { useCallback, useEffect, useState } from "react";
import { useRoom } from "@/components/providers/RoomProvider";
import type { Verdict } from "./architect";

/** Espera tras el último cambio de geometría antes de opinar sola. */
const DEBOUNCE = 2_500;

export type ArchitectVerdict = Verdict & { broadcast?: boolean; applied?: boolean };

/**
 * Estado no reactivo compartido por el documento: evita reevaluar dos veces el
 * mismo diseño y solapar peticiones.
 */
const local = { evaluated: "", running: false };

export function useArchitect() {
  const { entities, isHost, locked, sun } = useRoom();
  const [verdict, setVerdict] = useState<ArchitectVerdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (opts?: { apply?: boolean; note?: string }) => {
      if (local.running) return;
      local.running = true;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/architect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entities,
            apply: opts?.apply ?? false,
            note: opts?.note,
            // El agente juzga la luz en el mismo instante del día que el equipo.
            hour: sun.hour,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setVerdict((await res.json()) as ArchitectVerdict);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fallo al consultar al agente");
      } finally {
        local.running = false;
        setBusy(false);
      }
    },
    [entities, sun.hour],
  );

  // La hora entra en la firma: mover el sol cambia el diagnóstico de luz tanto
  // como mover un volumen, y el agente debe volver a opinar. Mientras se
  // arrastra el control la firma cambia a 8 Hz y el debounce absorbe el ruido;
  // la petición sale una sola vez, cuando el sol se queda quieto.
  // Sin geometría no hay nada que opinar: la firma vacía apaga la autoevaluación.
  const signature = entities.length
    ? entities
        .map((e) => `${e.id}:${e.x}:${e.z}:${e.rotation}`)
        .concat(`sun:${sun.hour}`)
        .join("|")
    : "";

  /**
   * Solo opina un cliente, para no duplicar los mensajes del agente: el mismo
   * anfitrión determinista que compacta el log. Y con el diseño cerrado —o
   * mientras alguien mira el pasado, que viaja por el mismo interruptor— calla:
   * el estado final no se renegocia, y la historia menos aún.
   */
  useEffect(() => {
    if (!isHost || !signature || locked) return;
    if (local.evaluated === signature) return;
    const timer = setTimeout(() => {
      local.evaluated = signature;
      void run();
    }, DEBOUNCE);
    return () => clearTimeout(timer);
  }, [isHost, signature, locked, run]);

  const apply = useCallback(() => run({ apply: true }), [run]);

  const alternatives = useCallback(
    () =>
      run({
        note: "Propón un enfoque distinto al anterior: prioriza el patio/jardín interno y la ventilación cruzada.",
      }),
    [run],
  );

  return { verdict, busy, error, evaluate: run, apply, alternatives };
}

"use client";

import { useEffect, useState } from "react";
import type { ChannelStatus } from "@portalsdk/core";
import { Check, Plus } from "@/components/icons";
import { useRoom } from "@/components/providers/RoomProvider";
import { Avatar, Dot, cx } from "./primitives";

function fmt(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Estado real del canal de Portal, en el idioma de la UI. */
const LINK: Record<ChannelStatus, { label: string; dot: string }> = {
  idle: { label: "Inicializando Portal", dot: "#5a5a62" },
  connecting: { label: "Conectando con Portal…", dot: "#fbbf24" },
  ready: { label: "Sincronizado con Portal", dot: "#22c55e" },
  reconnecting: { label: "Reconectando con Portal…", dot: "#fbbf24" },
  degraded: { label: "Portal en modo degradado", dot: "#fbbf24" },
  "degraded-http": { label: "Portal sin socket (HTTP)", dot: "#fbbf24" },
  blocked: { label: "Portal no disponible", dot: "#ef4444" },
};

export function TopBar() {
  const { status, participants, since, log, leave } = useRoom();
  const [now, setNow] = useState(0);
  const [copied, setCopied] = useState(false);

  // El reloj solo aporta el latido; la edad sale de la resta con el log, así
  // que dos pestañas abiertas a la vez marcan el mismo tiempo.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const link = LINK[status] ?? LINK.idle;
  const age = since && now > since ? Math.floor((now - since) / 1000) : 0;

  /** Invitar es compartir la sala: la URL basta, la entrada es anónima. */
  const invite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copia el enlace de la sala:", window.location.href);
    }
  };

  return (
    <header className="relative flex h-[84px] shrink-0 items-center justify-between border-b border-line bg-ink/85 px-6 backdrop-blur-xl">
      {/* Identidad del proyecto */}
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[25px] font-bold leading-none tracking-[-0.02em] text-white">
            140M² BRUTALIST CANVAS
          </h1>
          <span className="rounded-[3px] bg-raised px-2 py-[3px] text-[9.5px] font-semibold uppercase tracking-[0.12em] text-fg/70">
            Beta
          </span>
        </div>
        <p className="mt-2 flex items-center gap-2 text-[11.5px] leading-none text-muted">
          7x20m Plot
          <Dot color="#5a5a62" size={4} />
          Multiplayer Design Session
        </p>
      </div>

      {/* Estado de la sesion realtime */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="flex items-center justify-center gap-2.5 leading-none">
          <span className="text-[13.5px] text-fg/90">Sesión en vivo</span>
          <Dot color={link.dot} size={7} glow />
          <span
            className="font-mono text-[13.5px] tabular-nums text-accent-2"
            title="Edad del diseño actual, contada desde el último vaciado de la parcela"
          >
            {fmt(age)}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-none text-dim">
          {link.label}
          <span
            className="ml-2 font-mono text-[10.5px] tabular-nums"
            title={`El estado depende de los últimos ${log.depth} mensajes; el canal guarda ${log.cap}`}
          >
            memoria {log.depth}/{log.cap}
          </span>
        </p>
      </div>

      {/* Roster + salida */}
      <div className="flex items-center gap-3.5">
        {/* Una cara por persona conectada. Vacío mientras Portal no responde:
            unos avatares de relleno harían parecer llena una sala que no lo está. */}
        <div className="flex items-center -space-x-2.5">
          {participants.slice(0, 4).map((p) => (
            <Avatar
              key={p.id}
              initials={p.name.slice(0, 2).toUpperCase()}
              from={p.color}
              to="#25252a"
              ring={p.isSelf ? p.color : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={invite}
          aria-label="Invitar colaborador"
          title="Copiar el enlace de la sala"
          className={cx(
            "flex size-[34px] items-center justify-center rounded-full border bg-panel-2 transition-colors",
            copied
              ? "border-accent text-accent-2"
              : "border-line text-muted hover:border-accent/60 hover:text-fg",
          )}
        >
          {copied ? <Check size={15} /> : <Plus size={15} />}
        </button>
        <button
          type="button"
          onClick={leave}
          title="Cerrar la conexión con la sala"
          className="rounded-[4px] border border-line bg-panel-2/70 px-4 py-2.5 text-[13px] leading-none text-fg/90 transition-colors hover:border-accent/60 hover:text-white"
        >
          Salir de la sesión
        </button>
      </div>
    </header>
  );
}

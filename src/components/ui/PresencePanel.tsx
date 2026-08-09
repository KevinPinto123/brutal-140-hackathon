"use client";

import { Circle, Minus } from "@/components/icons";
import { useRoom } from "@/components/providers/RoomProvider";
import { AI_SENDER } from "@/lib/portal/events";
import { Panel, SectionTitle } from "./primitives";

type Body = { top: string; bottom: string; skin: string };

type Row = { id: string; color: string; body: Body; isAI?: boolean };

/** Cada peer viste su propio color de presencia: el que eligió al entrar. */
const bodyFor = (color: string): Body => ({
  top: color,
  bottom: "#2b2f36",
  skin: "#c9a68a",
});

function Figure({ id, color, body, isAI }: { id: string; color: string; body: Body; isAI?: boolean }) {
  const gid = `pg-${id}`;

  return (
    <svg viewBox="0 0 62 116" className="h-full w-full" aria-hidden>
      <defs>
        <filter id={`${gid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <radialGradient id={`${gid}-halo`} cx="50%" cy="50%">
          <stop offset="0" stopColor={color} stopOpacity="0.55" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Base de presencia */}
      <ellipse cx="31" cy="102" rx="26" ry="8" fill={`url(#${gid}-halo)`} />
      <ellipse
        cx="31"
        cy="102"
        rx="21"
        ry="6"
        fill="none"
        stroke={color}
        strokeWidth="2"
        filter={`url(#${gid}-glow)`}
      />
      <ellipse cx="31" cy="102" rx="21" ry="6" fill="none" stroke={color} strokeWidth="1.4" />

      {isAI ? (
        <g stroke={color} fill="none" strokeWidth="1.6">
          <circle cx="31" cy="26" r="10" />
          <circle cx="31" cy="26" r="10" filter={`url(#${gid}-glow)`} />
          <path d="M31 36v30M31 66l-11 26M31 66l11 26M20 48h22" />
          <path d="M31 36v30M31 66l-11 26M31 66l11 26" filter={`url(#${gid}-glow)`} />
          <ellipse cx="31" cy="52" rx="17" ry="9" opacity="0.55" />
        </g>
      ) : (
        <g>
          <circle cx="31" cy="19" r="8.5" fill={body.skin} />
          <path d={`M31 28c-9 0-14 5-14 12v22h28V40c0-7-5-12-14-12Z`} fill={body.top} />
          <path d="M17 62h12v34H19Z" fill={body.bottom} />
          <path d="M33 62h12v34H35Z" fill={body.bottom} />
          <path d="M17 40c-3 3-4 8-4 14l4 1Z" fill={body.top} opacity="0.75" />
        </g>
      )}
    </svg>
  );
}

/**
 * Los cuerpos que hay en la sala, en pequeño. Uno por peer conectado y ninguno
 * más: si la rejilla se queda vacía es que estás solo, y eso también es
 * información.
 */
export function PresencePanel() {
  const { participants, status } = useRoom();

  const rows: Row[] = participants.slice(0, 4).map((p) => ({
    id: p.id,
    color: p.color,
    body: bodyFor(p.color),
    isAI: p.id === AI_SENDER,
  }));

  return (
    <Panel className="flex min-h-0 flex-col overflow-hidden px-4 pb-3 pt-3.5">
      <SectionTitle
        className="mb-1"
        right={
          <span className="flex items-center gap-1.5 text-dim">
            <Minus size={11} />
            <Circle size={10} />
          </span>
        }
      >
        Presencia en 3D
      </SectionTitle>
      {rows.length === 0 ? (
        <p className="flex min-h-0 flex-1 items-center text-[11.5px] leading-[1.5] text-dim">
          {status === "ready" ? "Nadie en la parcela todavía." : "Conectando con la sala…"}
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-1">
          {rows.map((p) => (
            <div key={p.id} className="flex min-h-0 items-end justify-center">
              <Figure id={p.id} color={p.color} body={p.body} isAI={p.isAI} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

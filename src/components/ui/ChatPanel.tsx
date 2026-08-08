"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "@/components/icons";
import { useRoom } from "@/components/providers/RoomProvider";
import { CHAT_SEED } from "@/lib/constants";
import { Panel, SectionTitle, cx } from "./primitives";

const AVATAR_BG: Record<string, string> = {
  mateo: "linear-gradient(150deg,#4a4a52,#26262b)",
  claudia: "linear-gradient(150deg,#6b4a2a,#33241a)",
  diego: "linear-gradient(150deg,#3f4b63,#232a36)",
};

type Row = {
  id: string;
  author: string;
  time: string;
  body: string;
  isAI?: boolean;
  color?: string;
  seedId?: string;
  pending?: boolean;
  failed?: boolean;
};

/** Conversacion de referencia mientras el canal aun no tiene historial. */
const SEED_ROWS: Row[] = CHAT_SEED.map((m) => ({
  id: m.id,
  author: m.author,
  time: m.time,
  body: m.body,
  isAI: m.isAI,
  seedId: m.authorId,
}));

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

function MessageAvatar({ row }: { row: Row }) {
  if (row.isAI) {
    return (
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-2">
        <Sparkles size={12} />
      </span>
    );
  }
  return (
    <span
      className="size-[22px] shrink-0 rounded-full"
      style={{
        background: row.color
          ? `linear-gradient(150deg, ${row.color}, ${row.color}55)`
          : (AVATAR_BG[row.seedId ?? ""] ?? "linear-gradient(150deg,#44444c,#25252a)"),
      }}
    />
  );
}

export function ChatPanel() {
  const { chat, sendChat, status } = useRoom();
  const [draft, setDraft] = useState("");
  const feed = useRef<HTMLDivElement>(null);

  const rows: Row[] = chat.length
    ? chat.map((m) => ({
        id: m.id,
        author: m.content.name,
        time: clock(m.timestamp),
        body: m.content.text,
        color: m.content.color,
        isAI: m.sender.id === "ai_architect",
        pending: m.status === "pending",
        failed: m.status === "failed",
      }))
    : SEED_ROWS;

  useEffect(() => {
    const el = feed.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  function submit() {
    const body = draft.trim();
    if (!body) return;
    sendChat(body);
    setDraft("");
  }

  return (
    <Panel className="flex min-h-0 flex-col overflow-hidden px-4 pb-3.5 pt-3.5">
      <SectionTitle className="mb-2.5">Chat del proyecto</SectionTitle>

      <div
        ref={feed}
        className="scroll-thin -mr-2 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-2"
      >
        {rows.map((m) => (
          <div key={m.id} className={cx("flex gap-2.5", m.pending && "opacity-55")}>
            <MessageAvatar row={m} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2 leading-none">
                <span
                  className={
                    m.isAI
                      ? "text-[11.5px] font-medium text-accent-2"
                      : "text-[11.5px] font-medium text-fg/90"
                  }
                >
                  {m.author}
                </span>
                <span className="font-mono text-[9.5px] text-dim">
                  {m.failed ? "no enviado" : m.time}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-[1.45] text-muted">{m.body}</p>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-3 flex items-center gap-2 rounded-[4px] border border-line bg-panel-2 pl-3 pr-1.5"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={status === "ready" ? "Escribe un mensaje..." : "Conectando con Portal..."}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-[11.5px] text-fg placeholder:text-dim focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Enviar mensaje"
          className="flex size-[26px] items-center justify-center rounded-[3px] text-muted transition-colors hover:bg-raised hover:text-accent-2"
        >
          <Send size={14} />
        </button>
      </form>
    </Panel>
  );
}

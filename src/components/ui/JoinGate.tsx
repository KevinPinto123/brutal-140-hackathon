"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import {
  NAME_MAX,
  PALETTE,
  clearIdentity,
  colorForName,
  normalizeName,
  saveIdentity,
  type Identity,
} from "@/lib/portal/identity";
import { cx } from "./primitives";

/**
 * La puerta de la sala.
 *
 * Nadie entra sin decir quién es: hasta que hay nombre no se abre el canal de
 * Portal, así que tampoco hay presencia que enseñar a los demás. Es la regla
 * que sostiene todo lo demás: en esta sala solo aparece gente que está.
 *
 * El color acompaña al nombre porque la presencia es visual —tu avatar, tu
 * cursor, tu punto en el roster—: dos personas se distinguen antes por el color
 * que por leer la etiqueta. Se propone uno derivado del nombre y se puede
 * cambiar; lo que no hay es un color al azar que cambie en cada recarga.
 */
export function JoinGate({
  identity,
  onEnter,
}: {
  /** Identidad ya guardada, si esto es una vuelta tras salir. */
  identity: Identity | null;
  onEnter: () => void;
}) {
  // Volver a entrar con el mismo nombre no debería obligar a reescribirlo, pero
  // tiene que poder cambiarse: la puerta arranca plegada si ya sabemos quién eres.
  const [editing, setEditing] = useState(!identity);
  const [name, setName] = useState(identity?.name ?? "");
  const [color, setColor] = useState<string | null>(identity?.color ?? null);
  const [error, setError] = useState<string | null>(null);

  const clean = normalizeName(name);
  const swatch = color ?? (clean ? colorForName(clean) : COLORS[PALETTE[0]]);

  function submit() {
    if (!clean) {
      setError("Escribe un nombre para entrar.");
      return;
    }
    if (!saveIdentity(clean, swatch)) {
      setError("Ese nombre no vale. Prueba con otro.");
      return;
    }
    onEnter();
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-ink px-6">
      <div className="w-[420px] rounded-[4px] border border-line bg-panel px-8 py-9">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
          Laboratorio 7 × 20 m
        </p>
        <h1 className="mt-3 text-[21px] font-bold leading-none tracking-[-0.02em] text-white">
          {editing ? "¿Quién entra?" : "Has salido de la sesión"}
        </h1>

        {editing ? (
          <>
            <p className="mt-3.5 text-[12.5px] leading-[1.6] text-muted">
              Tu nombre es lo que verá el resto de la sala sobre tu avatar, en tu cursor
              dentro de la parcela y en cada cosa que muevas.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="mt-7"
            >
              <label
                htmlFor="join-name"
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim"
              >
                Tu nombre
              </label>
              <input
                id="join-name"
                autoFocus
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Como quieres que te llamen"
                aria-invalid={!!error}
                className={cx(
                  "mt-2 w-full rounded-[4px] border bg-panel-2 px-3.5 py-3 text-[13px] text-fg outline-none transition-colors placeholder:text-dim",
                  error ? "border-warn" : "border-line focus:border-accent/70",
                )}
              />

              <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
                Tu color
              </p>
              <div className="mt-2.5 flex items-center gap-2.5">
                {PALETTE.map((id) => {
                  const value = COLORS[id];
                  const on = swatch === value;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={`Color ${id}`}
                      aria-pressed={on}
                      onClick={() => setColor(value)}
                      className={cx(
                        "size-7 rounded-full transition-transform",
                        on ? "scale-110 ring-2 ring-white/80" : "opacity-60 hover:opacity-100",
                      )}
                      style={{ background: value }}
                    />
                  );
                })}
              </div>

              {error && <p className="mt-5 text-[11.5px] leading-none text-warn">{error}</p>}

              <button
                type="submit"
                disabled={!clean}
                className={cx(
                  "mt-7 w-full rounded-[4px] border px-4 py-3 text-[13px] leading-none transition-colors",
                  clean
                    ? "border-accent bg-accent text-white hover:bg-accent-2"
                    : "cursor-not-allowed border-line bg-panel-2 text-dim",
                )}
              >
                Entrar al laboratorio
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-3.5 text-[12.5px] leading-[1.6] text-muted">
              Tu presencia ya no aparece en la sala. El laboratorio sigue donde estaba: vive
              en el historial de Portal, no en esta pestaña.
            </p>

            <button
              type="button"
              onClick={onEnter}
              className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-[4px] border border-accent bg-accent px-4 py-3 text-[13px] leading-none text-white transition-colors hover:bg-accent-2"
            >
              <span
                className="size-2.5 rounded-full ring-2 ring-white/40"
                style={{ background: identity?.color }}
              />
              Volver a entrar como {identity?.name}
            </button>
            <button
              type="button"
              onClick={() => {
                clearIdentity();
                setName("");
                setColor(null);
                setEditing(true);
              }}
              className="mt-3 w-full py-1 text-[11.5px] leading-none text-dim transition-colors hover:text-fg"
            >
              Entrar con otro nombre
            </button>
          </>
        )}
      </div>
    </main>
  );
}

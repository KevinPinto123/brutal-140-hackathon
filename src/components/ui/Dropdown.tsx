"use client";

import { useState } from "react";
import { ChevronDown } from "@/components/icons";
import { cx } from "./primitives";

export function Dropdown({
  options,
  value,
  onChange,
  className,
  align = "left",
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cx("relative", className)}>
      {open && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hud flex w-full items-center justify-between gap-3 px-3 py-2 text-[12px] leading-none text-fg/90 transition-colors hover:text-white"
      >
        {value}
        <ChevronDown
          size={13}
          className={cx("text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className={cx(
            "hud absolute top-[calc(100%+4px)] z-20 min-w-full overflow-hidden py-1",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={cx(
                "block w-full whitespace-nowrap px-3 py-1.5 text-left text-[12px] leading-none transition-colors hover:bg-raised",
                o === value ? "text-accent-2" : "text-muted hover:text-fg",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

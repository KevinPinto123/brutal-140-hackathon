import type { ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <section className={cx("panel", className)}>{children}</section>;
}

export function SectionTitle({
  children,
  className,
  right,
}: {
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <div className={cx("flex items-center justify-between", className)}>
      <h2 className="panel-title">{children}</h2>
      {right}
    </div>
  );
}

export function Dot({
  color,
  size = 6,
  glow,
  className,
}: {
  color: string;
  size?: number;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx("inline-block shrink-0 rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: glow ? `0 0 8px ${color}` : undefined,
      }}
    />
  );
}

export function Avatar({
  initials,
  from,
  to,
  ring,
  size = 34,
}: {
  initials: string;
  from: string;
  to: string;
  ring?: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-medium text-white/85"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(150deg, ${from}, ${to})`,
        boxShadow: ring ? `0 0 0 1.5px ${ring}, 0 0 0 3px #0a0a0b` : undefined,
      }}
    >
      {initials}
    </span>
  );
}

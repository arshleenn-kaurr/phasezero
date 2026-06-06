import type { ReactNode } from "react";

export const ACCENT = "#A8C979";

// Maps the backend status_color / severity keys onto on-brand muted tones.
const STATUS_HEX: Record<string, string> = {
  green: "#A8C979",
  amber: "#D6B25A",
  blue: "#7FA8B8",
  red: "#C98A8A",
};

export function statusHex(key: string | undefined): string {
  return STATUS_HEX[key ?? ""] ?? "#7FA8B8";
}

export function severityHex(severity: string | undefined): string {
  if (severity === "high") return "#C98A8A";
  if (severity === "medium") return "#D6B25A";
  return "#8A8F86";
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`pz-panel rounded-sm p-6 ${className}`}>{children}</section>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-muted">
      {children}
    </div>
  );
}

export function Chip({
  label,
  color = ACCENT,
}: {
  label: string;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono-pz text-[9px] tracking-[0.18em] uppercase"
      style={{ borderColor: `${color}55`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function ScoreBar({
  label,
  value,
  max = 100,
  color = ACCENT,
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between font-mono-pz text-[9.5px] tracking-[0.16em] uppercase text-pz-muted">
        <span>{label}</span>
        <span className="text-pz-soft">{Math.round(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[rgba(168,201,121,0.12)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 justify-center">
      <span className="h-5 w-5 rounded-full border border-[rgba(168,201,121,0.35)] border-t-pz-accent animate-spin" />
      <span className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-muted">
        {label}
      </span>
    </div>
  );
}

export function ErrorPanel({
  label = "Backend unavailable — showing nothing to avoid stale data.",
}: {
  label?: string;
}) {
  return (
    <Panel>
      <div className="font-mono-pz text-[10px] tracking-[0.18em] uppercase text-pz-muted">
        {label}
      </div>
    </Panel>
  );
}

export function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div>
      <div
        className="font-serif-display text-[28px] leading-none"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      <div className="mt-1 font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-muted">
        {label}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-6">
      <div className="font-mono-pz text-[10px] tracking-[0.28em] uppercase text-pz-accent">
        {eyebrow}
      </div>
      <h1 className="mt-2 font-serif-display text-[40px] leading-none text-pz-text font-normal">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-[13px] text-pz-soft font-light max-w-2xl">{subtitle}</p>
      )}
    </header>
  );
}

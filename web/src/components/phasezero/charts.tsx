export function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={`font-serif-display text-[30px] leading-none ${
          accent ? "text-pz-accent" : "text-pz-text"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-muted">
        {label}
      </div>
    </div>
  );
}

export function Histogram({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="mt-5 flex items-end gap-[2px] h-16">
      {counts.map((c, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{
            height: `${(c / max) * 100}%`,
            background: `rgba(168,201,121,${0.25 + 0.6 * (c / max)})`,
          }}
        />
      ))}
    </div>
  );
}

export function Tornado({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="mt-3 flex flex-col gap-2">
      {entries.map(([name, value]) => (
        <div key={name} className="flex items-center gap-3">
          <span className="w-[52%] truncate text-[11px] text-pz-soft font-light">{name}</span>
          <div className="flex-1 h-2 rounded-full bg-[rgba(168,201,121,0.1)]">
            <div
              className="h-full rounded-full bg-pz-accent"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Gauge({ label, value }: { label: string; value?: number }) {
  const v = value ?? 0;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="font-serif-display text-[28px] leading-none text-pz-text">{v}</div>
      <div className="mt-1.5 h-1 w-full rounded-full bg-[rgba(168,201,121,0.12)]">
        <div className="h-full rounded-full bg-pz-accent" style={{ width: `${v}%` }} />
      </div>
      <div className="mt-1.5 font-mono-pz text-[8.5px] tracking-[0.14em] uppercase text-pz-muted">
        {label}
      </div>
    </div>
  );
}

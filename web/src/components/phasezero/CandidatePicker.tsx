import type { CandidateSummary } from "@/lib/api";
import { statusHex } from "./primitives";

export default function CandidatePicker({
  candidates,
  selectedId,
  onSelect,
}: {
  candidates: CandidateSummary[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {candidates.map((c) => {
        const active = c.id === selectedId;
        const color = statusHex(c.status_color);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={`rounded-sm border px-3.5 py-2 text-left transition-colors ${
              active
                ? "bg-[color:var(--pz-panel-alt)] border-[color:var(--pz-border-strong)]"
                : "pz-border hover:bg-[color:var(--pz-panel-alt)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              <span
                className={`text-[12.5px] font-light ${active ? "text-pz-text" : "text-pz-soft"}`}
              >
                {c.name}
              </span>
            </div>
            <div className="mt-0.5 font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted">
              {c.id} · {c.score}/100
            </div>
          </button>
        );
      })}
    </div>
  );
}

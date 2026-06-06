import { ArrowRight } from "lucide-react";

const DRIVERS = [
  "Best-in-class payload differentiation",
  "Validated internalization mechanism",
  "Strong translational evidence in cervical",
  "Large 2L+ addressable population",
];

const RISKS = [
  "Potential hematologic toxicity",
  "Manufacturing complexity at scale",
  "Competitive landscape evolving",
];

export default function RecommendationPanel() {
  return (
    <aside className="pz-panel rounded-sm p-6 flex flex-col">
      <div className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-muted">
        Recommendation
      </div>
      <div className="mt-1 font-mono-pz text-[12px] tracking-[0.22em] uppercase text-pz-accent">
        Advance · High Conviction
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-serif-display text-[64px] leading-none text-pz-text">86</span>
        <span className="font-mono-pz text-[12px] text-pz-muted">/100</span>
      </div>
      <div className="mt-1 text-[12.5px] text-pz-soft font-light">High Conviction</div>

      <Sparkline />

      <Section title="Key Drivers" items={DRIVERS} markClass="text-pz-accent" mark="●" />
      <Section title="Key Risks" items={RISKS} markClass="text-pz-warning" mark="▲" />

      <button className="mt-5 pt-4 border-t pz-border flex items-center gap-2 text-pz-accent font-mono-pz text-[10.5px] tracking-[0.18em] uppercase hover:text-pz-text transition-colors w-fit">
        View Full Analysis <ArrowRight size={12} />
      </button>
    </aside>
  );
}

function Section({
  title,
  items,
  mark,
  markClass,
}: {
  title: string;
  items: string[];
  mark: string;
  markClass: string;
}) {
  return (
    <div className="mt-5 border-t pz-border pt-4">
      <div className="font-mono-pz text-[9.5px] tracking-[0.22em] uppercase text-pz-muted">
        {title}
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {items.map((it) => (
          <li key={it} className="flex gap-2 text-[12px] leading-snug text-pz-soft">
            <span className={`${markClass} text-[8px] pt-1.5`}>{mark}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline() {
  const W = 260;
  const H = 64;
  // mock upward-trending series
  const data = [38, 36, 40, 35, 42, 41, 44, 39, 46, 48, 45, 52, 50, 56, 54, 60, 58, 64];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / (max - min)) * (H - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${pts} L${W},${H} L0,${H} Z`;
  const lastX = W;
  const lastY = H - ((data[data.length - 1] - min) / (max - min)) * (H - 4) - 2;
  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[60px]">
        <defs>
          <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#A8C979" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#A8C979" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={pts} stroke="#A8C979" strokeWidth="1.2" fill="none" />
        <circle cx={lastX} cy={lastY} r="2.4" fill="#A8C979" />
        <circle cx={lastX} cy={lastY} r="5" fill="none" stroke="#A8C979" strokeOpacity="0.4" className="pz-pulse" />
      </svg>
      <div className="flex justify-between font-mono-pz text-[9px] text-pz-muted mt-1">
        <span>30D CONVICTION TREND</span>
        <span className="text-pz-accent">+18.2%</span>
      </div>
    </div>
  );
}
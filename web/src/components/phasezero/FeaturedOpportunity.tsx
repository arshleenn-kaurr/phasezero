import { Star, ArrowRight } from "lucide-react";
import protein from "@/assets/protein.jpg";

const META = [
  { k: "Therapeutic Area", v: "Oncology" },
  { k: "Modality", v: "ADC" },
  { k: "Development Stage", v: "IND-Enabling" },
];

export default function FeaturedOpportunity() {
  return (
    <section className="relative pz-panel rounded-sm p-7 overflow-hidden">
      <CornerBrackets />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-6 items-center">
        {/* LEFT: text content */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full border pz-border flex items-center justify-center">
              <Star size={10} className="text-pz-accent" fill="currentColor" />
            </span>
            <span className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-muted">
              Featured Opportunity
            </span>
          </div>

          <h2 className="mt-5 font-serif-display text-[52px] leading-none text-pz-text font-normal">
            PZ-1092
          </h2>
          <div className="mt-2 font-mono-pz text-[12px] tracking-[0.18em] text-pz-accent">
            TF-ADC · CERVICAL
          </div>

          <p className="mt-5 text-[13.5px] leading-relaxed text-pz-soft font-light max-w-md">
            Tissue Factor antibody-drug conjugate with differentiated payload
            and tumor-selective delivery addressing high unmet need in 2L+
            cervical cancer.
          </p>

          <div className="mt-7 border-t pz-border pt-4 grid grid-cols-4 gap-3">
            {META.map((m) => (
              <div key={m.k}>
                <div className="font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
                  {m.k}
                </div>
                <div className="mt-1 text-[13px] text-pz-text font-light">{m.v}</div>
              </div>
            ))}
            <ScoreRing score={86} />
          </div>

          <button className="mt-7 flex items-center gap-2 text-pz-accent font-mono-pz text-[11px] tracking-[0.18em] uppercase hover:text-pz-text transition-colors w-fit">
            Review Opportunity <ArrowRight size={13} />
          </button>
        </div>

        {/* RIGHT: protein render */}
        <div className="relative aspect-square w-full max-w-[460px] mx-auto">
          <img
            src={protein}
            alt="PZ-1092 molecular structure"
            className="h-full w-full object-contain"
          />
          {/* crosshair overlay */}
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none opacity-60"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <circle cx="50" cy="50" r="6" fill="none" stroke="#A8C979" strokeOpacity="0.5" strokeWidth="0.15" />
            <circle cx="50" cy="50" r="11" fill="none" stroke="#A8C979" strokeOpacity="0.25" strokeWidth="0.12" />
            <line x1="44" y1="50" x2="56" y2="50" stroke="#A8C979" strokeOpacity="0.5" strokeWidth="0.15" />
            <line x1="50" y1="44" x2="50" y2="56" stroke="#A8C979" strokeOpacity="0.5" strokeWidth="0.15" />
          </svg>
          <div className="absolute bottom-2 right-2 font-mono-pz text-[9px] tracking-wider text-pz-accent pz-blink">
            ● LIVE
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-12 w-12">
        <svg viewBox="0 0 44 44" className="h-12 w-12 -rotate-90">
          <circle cx="22" cy="22" r={r} stroke="rgba(168,201,121,0.15)" strokeWidth="2" fill="none" />
          <circle
            cx="22"
            cy="22"
            r={r}
            stroke="#A8C979"
            strokeWidth="2"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[12px] text-pz-text font-serif-display">
          {score}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted">Overall</span>
        <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-accent">Top Decile</span>
      </div>
    </div>
  );
}

function CornerBrackets() {
  const b = "absolute h-3 w-3 border-[color:var(--pz-border-strong)]";
  return (
    <>
      <span className={`${b} top-2 left-2 border-l border-t`} />
      <span className={`${b} top-2 right-2 border-r border-t`} />
      <span className={`${b} bottom-2 left-2 border-l border-b`} />
      <span className={`${b} bottom-2 right-2 border-r border-b`} />
    </>
  );
}
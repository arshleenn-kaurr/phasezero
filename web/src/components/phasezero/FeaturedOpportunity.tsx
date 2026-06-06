import { useState } from "react";
import { Star, ArrowRight } from "lucide-react";
import type { FeaturedOpportunity as FeaturedOpportunityData } from "@/lib/api";
import ProteinViewer, { type ProteinViewerMode } from "@/components/ProteinViewer";

export default function FeaturedOpportunity({
  opportunity,
}: {
  opportunity: FeaturedOpportunityData;
}) {
  const meta = [
    { k: "Therapeutic Area", v: "Oncology" },
    { k: "Modality", v: opportunity.modality },
    { k: "Diligence Status", v: opportunity.stage },
  ];

  const [cartoonOn, setCartoonOn] = useState(true);
  const [surfaceOn, setSurfaceOn] = useState(false);
  const mode: ProteinViewerMode =
    cartoonOn && surfaceOn
      ? "both"
      : cartoonOn
        ? "cartoon"
        : surfaceOn
          ? "surface"
          : "cartoon";

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
            {opportunity.id}
          </h2>
          <div className="mt-2 font-mono-pz text-[12px] tracking-[0.18em] text-pz-accent">
            {`${opportunity.name} · ${opportunity.indication}`.toUpperCase()}
          </div>

          <p className="mt-5 text-[13.5px] leading-relaxed text-pz-soft font-light max-w-md">
            Tissue Factor antibody-drug conjugate with differentiated payload
            and tumor-selective delivery addressing high unmet need in 2L+
            cervical cancer.
          </p>

          <div className="mt-7 border-t pz-border pt-4 grid grid-cols-4 gap-3">
            {meta.map((m) => (
              <div key={m.k}>
                <div className="font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
                  {m.k}
                </div>
                <div className="mt-1 text-[13px] text-pz-text font-light">{m.v}</div>
              </div>
            ))}
            <ScoreRing score={opportunity.score} />
          </div>

          <button className="mt-7 flex items-center gap-2 text-pz-accent font-mono-pz text-[11px] tracking-[0.18em] uppercase hover:text-pz-text transition-colors w-fit">
            Review Opportunity <ArrowRight size={13} />
          </button>
        </div>

        {/* RIGHT: protein render (3Dmol.js via CDN) */}
        <div className="w-full max-w-[420px] mx-auto">
          <ProteinViewer pdbId="1CRN" height={360} mode={mode} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RepToggle
              label="Surface"
              active={surfaceOn}
              onClick={() => setSurfaceOn((v) => !v)}
            />
            <RepToggle
              label="Cartoon"
              active={cartoonOn}
              onClick={() => setCartoonOn((v) => !v)}
            />
            <RepToggle label="Ligand" active={false} disabled />
            <RepToggle label="Pocket" active={false} disabled />
          </div>
        </div>
      </div>
    </section>
  );
}

function RepToggle({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 font-mono-pz text-[9px] tracking-[0.18em] uppercase transition-colors ${
        disabled
          ? "border-[color:var(--pz-border)] text-pz-muted/60 cursor-not-allowed"
          : active
            ? "border-[color:var(--pz-border-strong)] bg-[color:var(--pz-panel-alt)] text-pz-accent"
            : "border-[color:var(--pz-border)] text-pz-muted hover:text-pz-soft"
      }`}
    >
      {label}
    </button>
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
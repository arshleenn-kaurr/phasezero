import { Lightbulb, FileSearch, Sigma, FlaskConical, Target } from "lucide-react";

const STEPS = [
  { n: 1, name: "Hypothesis", sub: "Biology + Unmet Need", icon: Lightbulb, status: "done" },
  { n: 2, name: "Evidence", sub: "Multi-omic + Literature", icon: FileSearch, status: "done" },
  { n: 3, name: "Prediction", sub: "Models + Backtests", icon: Sigma, status: "done" },
  { n: 4, name: "Validation", sub: "In Vitro + In Vivo", icon: FlaskConical, status: "active" },
  { n: 5, name: "Decision", sub: "Prioritize / Deprioritize", icon: Target, status: "pending" },
];

export default function PipelineBar() {
  return (
    <section className="mt-6 pz-panel rounded-sm px-7 py-5">
      <div className="flex items-baseline justify-between">
        <div className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-muted">
          Evidence to Decision Pipeline
        </div>
        <div className="font-mono-pz text-[9.5px] tracking-[0.18em] uppercase text-pz-accent pz-blink">
          ● Streaming · Run 0x7F3A
        </div>
      </div>

      <div className="mt-5 flex items-stretch gap-0 overflow-x-auto">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = step.status === "active";
          const isPending = step.status === "pending";
          return (
            <div key={step.n} className="flex items-stretch min-w-0 flex-1">
              <div className="flex-1 min-w-[140px] flex items-start gap-3 py-1">
                <div
                  className={`mt-0.5 h-9 w-9 shrink-0 rounded-full border flex items-center justify-center ${
                    isPending
                      ? "border-[color:var(--pz-border)] text-pz-muted"
                      : "border-[color:var(--pz-border-strong)] text-pz-accent"
                  } ${isActive ? "bg-[color:var(--pz-panel-alt)]" : ""}`}
                >
                  <Icon size={14} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-pz text-[9.5px] tracking-[0.16em] text-pz-muted">
                      0{step.n}
                    </span>
                    <span
                      className={`text-[13px] font-light ${
                        isPending ? "text-pz-soft" : "text-pz-text"
                      }`}
                    >
                      {step.name}
                    </span>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" />}
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-pz-muted font-light truncate">
                    {step.sub}
                  </div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex items-center pr-3 text-pz-muted font-mono-pz text-[11px]">
                  ——
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
import AppLayout from "../AppLayout";
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Panel,
  SectionLabel,
  statusHex,
} from "../primitives";
import { useCandidates } from "@/lib/usePhaseZero";
import type { CandidateScores } from "@/lib/api";

const MODELS: { name: string; kind: string; detail: string }[] = [
  { name: "ADC Opportunity Readiness", kind: "Weighted Blend", detail: "Target selectivity, therapeutic index, biomarker strategy, clinical & regulatory signals." },
  { name: "Commercial Alpha", kind: "Stress-Tested", detail: "Unmet need and whitespace penalized by competitive saturation and consensus attention." },
  { name: "Evidence Quality", kind: "Coverage Model", detail: "Literature, trial, regulatory, and BioNeMo signal coverage blend." },
  { name: "Failure Similarity", kind: "Cosine Match", detail: "Distance to 23 prior ADC failure archetypes via weighted feature vectors." },
  { name: "BioNeMo Plausibility", kind: "Biology Layer", detail: "Pathway proximity, druggability, and internalization plausibility (API-ready)." },
  { name: "Diligence Priority", kind: "Composite", detail: "Top-level ranking signal combining all models minus failure penalty." },
  { name: "Monte Carlo Engine", kind: "Simulation", detail: "Thesis stress test under uncertainty with sensitivity tornado and scenarios." },
  { name: "HMM State Tracker", kind: "Sequence Model", detail: "Probabilistic development-state inference and regime-shift detection." },
];

const SCORE_COLUMNS: { key: keyof CandidateScores; label: string }[] = [
  { key: "readiness", label: "Readiness" },
  { key: "commercial_alpha", label: "Comm. Alpha" },
  { key: "evidence_quality", label: "Evidence" },
  { key: "bionemo_plausibility", label: "BioNeMo" },
  { key: "failure_similarity", label: "Failure Sim" },
  { key: "diligence_priority", label: "Priority" },
];

export default function ModelsPage() {
  const { data, loading, error } = useCandidates();

  return (
    <AppLayout title="Models" loading={loading}>
      <PageHeader
        eyebrow="Quant Model Registry"
        title="Models"
        subtitle="The deterministic models that power every PhaseZero score. All run offline and are reproducible."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {MODELS.map((m) => (
          <Panel key={m.name}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-pz-text">{m.name}</span>
              <span className="flex items-center gap-1.5 font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" /> Online
              </span>
            </div>
            <div className="mt-1 font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
              {m.kind}
            </div>
            <p className="mt-2 text-[12px] leading-snug text-pz-soft font-light">{m.detail}</p>
          </Panel>
        ))}
      </div>

      {loading && <LoadingPanel label="Loading model outputs" />}
      {error && !loading && <ErrorPanel />}

      {data && (
        <Panel>
          <SectionLabel>Live Model Outputs by Candidate</SectionLabel>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <th className="border-b pz-border py-2 pr-4 text-left font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted font-normal">
                    Candidate
                  </th>
                  {SCORE_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="border-b pz-border py-2 px-3 text-right font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted font-normal"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td className="border-b pz-border py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: statusHex(c.status_color) }}
                        />
                        <span className="text-pz-text">{c.name}</span>
                      </div>
                    </td>
                    {SCORE_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={`border-b pz-border py-2.5 px-3 text-right font-light ${
                          col.key === "diligence_priority" ? "text-pz-accent" : "text-pz-soft"
                        }`}
                      >
                        {c.scores[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AppLayout>
  );
}

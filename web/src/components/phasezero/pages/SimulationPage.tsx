import AppLayout from "../AppLayout";
import CandidatePicker from "../CandidatePicker";
import { Histogram, Stat, Tornado } from "../charts";
import {
  Chip,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Panel,
  ScoreBar,
  SectionLabel,
} from "../primitives";
import { useSelectedCandidate } from "@/lib/usePhaseZero";

export default function SimulationPage() {
  const s = useSelectedCandidate();

  return (
    <AppLayout title="Simulation" loading={s.candidatesLoading || s.detailLoading}>
      <PageHeader
        eyebrow="Monte Carlo + HMM"
        title="Simulation"
        subtitle="A stress test of the opportunity thesis under uncertainty — not a prediction of approval."
      />

      {s.candidatesLoading && <LoadingPanel label="Loading candidates" />}
      {s.candidatesError && !s.candidatesLoading && <ErrorPanel />}

      {s.candidates && (
        <>
          <CandidatePicker
            candidates={s.candidates}
            selectedId={s.selectedId}
            onSelect={s.setSelectedId}
          />

          {s.detailLoading && <LoadingPanel label="Running Monte Carlo" />}
          {s.detailError && !s.detailLoading && <ErrorPanel />}

          {s.detail && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Panel>
                <SectionLabel>
                  Monte Carlo Distribution · {s.detail.simulation.n.toLocaleString()} runs
                </SectionLabel>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Stat label="P10" value={s.detail.simulation.p10} />
                  <Stat label="P50" value={s.detail.simulation.p50} accent />
                  <Stat label="P90" value={s.detail.simulation.p90} />
                  <Stat
                    label={`> ${s.detail.simulation.threshold}`}
                    value={`${s.detail.simulation.p_threshold}%`}
                  />
                </div>
                <Histogram counts={s.detail.simulation.histogram.counts} />
                <div className="mt-2 flex justify-between font-mono-pz text-[9px] text-pz-muted">
                  <span>{s.detail.simulation.histogram.min}</span>
                  <span>diligence priority outcome</span>
                  <span>{s.detail.simulation.histogram.max}</span>
                </div>
                <div className="mt-5">
                  <SectionLabel>Sensitivity Drivers</SectionLabel>
                  <Tornado data={s.detail.simulation.tornado} />
                </div>
              </Panel>

              <Panel>
                <SectionLabel>HMM Development State</SectionLabel>
                <div className="mt-4 flex flex-wrap items-center gap-2 font-mono-pz text-[11px] tracking-[0.14em] uppercase">
                  <span className="text-pz-text">{s.detail.hmm.current_state}</span>
                  <span className="text-pz-muted">→</span>
                  <span className="text-pz-accent">{s.detail.hmm.next_state}</span>
                  {s.detail.hmm.regime_shift && <Chip label="Regime Shift" color="#D6B25A" />}
                </div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {Object.entries(s.detail.hmm.state_probs).map(([state, prob]) => (
                    <ScoreBar key={state} label={state} value={prob * 100} />
                  ))}
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-pz-soft font-light">
                  {s.detail.hmm.explanation}
                </p>
              </Panel>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

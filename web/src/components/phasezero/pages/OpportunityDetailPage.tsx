import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import AppLayout from "../AppLayout";
import ProteinViewer from "@/components/ProteinViewer";
import Markdown from "../Markdown";
import { Gauge, Histogram, Stat, Tornado } from "../charts";
import {
  ACCENT,
  Chip,
  ErrorPanel,
  LoadingPanel,
  Panel,
  ScoreBar,
  SectionLabel,
  severityHex,
  statusHex,
} from "../primitives";
import { useCandidateDetail } from "@/lib/usePhaseZero";
import type { CandidateDetail } from "@/lib/api";

export default function OpportunityDetailPage({ id }: { id: string }) {
  const { data, loading, error } = useCandidateDetail(id);

  return (
    <AppLayout title="Opportunity Diligence" loading={loading}>
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-mono-pz text-[10px] tracking-[0.18em] uppercase text-pz-muted hover:text-pz-accent transition-colors"
      >
        <ArrowLeft size={12} /> Back to Search
      </Link>

      {loading && <LoadingPanel label="Running diligence pipeline" />}
      {error && !loading && (
        <div className="mt-6">
          <ErrorPanel label={`Could not load diligence for ${id}.`} />
        </div>
      )}

      {data && <Detail d={data} />}
    </AppLayout>
  );
}

function Detail({ d }: { d: CandidateDetail }) {
  const color = statusHex(d.status_color);
  return (
    <div className="mt-5 flex flex-col gap-5">
      {/* Header */}
      <Panel>
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-center">
          <div>
            <div className="font-mono-pz text-[10px] tracking-[0.2em] uppercase text-pz-accent">
              {d.id} · {d.target}
            </div>
            <h1 className="mt-2 font-serif-display text-[40px] leading-[1.02] text-pz-text">
              {d.full_name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip label={d.stage} color={color} />
              <Chip label={`${d.recommendation} · ${d.confidence}`} />
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-pz-soft font-light max-w-xl">
              {d.patient_subgroup}
            </p>
          </div>
          <div className="w-full max-w-[360px] mx-auto">
            <ProteinViewer pdbId="1STP" height={300} mode="both" />
          </div>
        </div>
      </Panel>

      {/* Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <SectionLabel>Composite Scores</SectionLabel>
          <div className="mt-4 flex flex-col gap-3">
            <ScoreBar label="Diligence Priority" value={d.scores.diligence_priority} color={ACCENT} />
            <ScoreBar label="Readiness" value={d.scores.readiness} />
            <ScoreBar label="Commercial Alpha" value={d.scores.commercial_alpha} />
            <ScoreBar label="Evidence Quality" value={d.scores.evidence_quality} />
            <ScoreBar label="BioNeMo Plausibility" value={d.scores.bionemo_plausibility} />
            <ScoreBar label="Failure Similarity" value={d.scores.failure_similarity} color="#C98A8A" />
          </div>
        </Panel>
        <Panel>
          <SectionLabel>Scorecard Breakdown</SectionLabel>
          <div className="mt-4 flex flex-col gap-3">
            {Object.entries(d.score_components).map(([label, value]) => (
              <ScoreBar key={label} label={label} value={value} />
            ))}
          </div>
        </Panel>
      </div>

      {/* Monte Carlo + HMM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <SectionLabel>Monte Carlo Stress Test</SectionLabel>
          <div className="mt-4 flex items-end justify-between">
            <Stat label="P10" value={d.simulation.p10} />
            <Stat label="P50" value={d.simulation.p50} accent />
            <Stat label="P90" value={d.simulation.p90} />
            <Stat label={`> ${d.simulation.threshold}`} value={`${d.simulation.p_threshold}%`} />
          </div>
          <Histogram counts={d.simulation.histogram.counts} />
          <div className="mt-5">
            <SectionLabel>Sensitivity Drivers</SectionLabel>
            <Tornado data={d.simulation.tornado} />
          </div>
        </Panel>

        <Panel>
          <SectionLabel>HMM Development State</SectionLabel>
          <div className="mt-4 flex items-center gap-2 font-mono-pz text-[11px] tracking-[0.14em] uppercase">
            <span className="text-pz-text">{d.hmm.current_state}</span>
            <span className="text-pz-muted">→</span>
            <span className="text-pz-accent">{d.hmm.next_state}</span>
            {d.hmm.regime_shift && <Chip label="Regime Shift" color="#D6B25A" />}
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            {Object.entries(d.hmm.state_probs).map(([state, prob]) => (
              <ScoreBar key={state} label={state} value={prob * 100} />
            ))}
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-pz-soft font-light">
            {d.hmm.explanation}
          </p>
        </Panel>
      </div>

      {/* BioNeMo */}
      <Panel>
        <SectionLabel>BioNeMo Plausibility</SectionLabel>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Gauge label="Overall" value={d.bionemo.overall_plausibility} />
          <Gauge label="Pathway Proximity" value={d.bionemo.pathway_proximity} />
          <Gauge label="Druggability" value={d.bionemo.druggability_score} />
          <Gauge label="Internalization" value={d.bionemo.internalization_efficiency} />
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-pz-soft font-light max-w-3xl">
          {d.bionemo.summary}
        </p>
      </Panel>

      {/* Flags + thesis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <SectionLabel>Failure Pattern Flags</SectionLabel>
          <ul className="mt-4 flex flex-col gap-3">
            {d.failure_flags.map((f) => (
              <li key={f.flag} className="border-l-2 pl-3" style={{ borderColor: severityHex(f.severity) }}>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono-pz text-[9px] tracking-[0.16em] uppercase"
                    style={{ color: severityHex(f.severity) }}
                  >
                    {f.severity}
                  </span>
                  <span className="text-[12.5px] text-pz-text">{f.flag}</span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-pz-soft font-light">{f.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <SectionLabel>What Would Need To Be True</SectionLabel>
          <p className="mt-3 text-[12.5px] leading-relaxed text-pz-soft font-light">
            {d.what_would_need_to_be_true}
          </p>
          <div className="mt-5">
            <SectionLabel>Recommended Next Actions</SectionLabel>
            <ol className="mt-3 flex flex-col gap-2">
              {d.recommended_next_actions.map((a, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug text-pz-soft font-light">
                  <span className="font-mono-pz text-[10px] text-pz-accent pt-0.5">0{i + 1}</span>
                  <span>{a}</span>
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      </div>

      {/* Agents */}
      <Panel>
        <SectionLabel>Agentic Evidence Layer</SectionLabel>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {d.agents.map((agent) => (
            <div key={agent.name} className="border-t pz-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-pz-text">{agent.name}</span>
                <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-accent">
                  {agent.confidence}% conf
                </span>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {agent.findings.map((f, i) => (
                  <li key={i} className="flex gap-2 text-[11.5px] leading-snug text-pz-soft font-light">
                    <span className="text-pz-accent text-[7px] pt-1.5">●</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>

      {/* Memo */}
      <Panel>
        <SectionLabel>Diligence Memo</SectionLabel>
        <div className="mt-3 max-h-[520px] overflow-y-auto pr-2">
          <Markdown source={d.memo} />
        </div>
      </Panel>
    </div>
  );
}

import AppLayout from "../AppLayout";
import CandidatePicker from "../CandidatePicker";
import {
  Chip,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Panel,
  ScoreBar,
  SectionLabel,
} from "../primitives";
import { useAgentActivity, useSelectedCandidate } from "@/lib/usePhaseZero";
import type { MomentumMetric, SignalEvent } from "@/lib/api";

const MOMENTUM_LABELS: Record<string, string> = {
  publication: "Publication",
  trial: "Trial",
  regulatory: "Regulatory",
  patent_conference: "Patent / Conference",
  pipeline: "Pipeline",
};

const POLARITY_COLOR: Record<string, string> = {
  positive: "#A8C979",
  neutral: "#7FA8B8",
  negative: "#C98A8A",
};

export default function SignalsPage() {
  const s = useSelectedCandidate();
  const activity = useAgentActivity();
  const loading = s.candidatesLoading || s.detailLoading || activity.loading;
  const signal = s.detail?.signal_intelligence;

  return (
    <AppLayout title="Signal Intelligence" loading={loading}>
      <PageHeader
        eyebrow="Signal Intelligence Layer"
        title="Signal Intelligence"
        subtitle="This is where PhaseZero converts messy public evidence into weighted support, warnings, contradictions, missing-data burden, and a signal regime for the selected ADC opportunity."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <StoryCard
          label="What You Are Looking At"
          text="A deterministic signal ledger for one candidate, built from literature, trial, regulatory, commercial, and biology-facing evidence events."
        />
        <StoryCard
          label="Why It Matters"
          text="The layer separates real opportunity alpha from noisy consensus, crowded pursuit, weak evidence, and diligence gaps."
        />
        <StoryCard
          label="What To Do Next"
          text="Pick a candidate, inspect the regime, then use the disputed claim and diligence questions to guide expert review."
        />
      </div>

      {s.candidatesLoading && <LoadingPanel label="Loading candidates" />}
      {s.candidatesError && !s.candidatesLoading && <ErrorPanel />}

      {s.candidates && (
        <>
          <CandidatePicker
            candidates={s.candidates}
            selectedId={s.selectedId}
            onSelect={s.setSelectedId}
          />

          {s.detailLoading && <LoadingPanel label="Computing signal intelligence" />}
          {s.detailError && !s.detailLoading && <ErrorPanel />}

          {s.detail && signal && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.9fr] gap-5">
                <Panel className="flex flex-col justify-between">
                  <div>
                    <SectionLabel>Current Signal Regime</SectionLabel>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-serif-display text-[38px] leading-none text-pz-text">
                          {signal.signal_regime}
                        </div>
                        <p className="mt-3 text-[12.5px] leading-snug text-pz-soft font-light">
                          {regimeCopy(signal.signal_regime)}
                        </p>
                      </div>
                      <Chip label={s.detail.recommendation} />
                    </div>
                  </div>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <MiniMetric label="Momentum" value={signal.momentum_score} />
                    <MiniMetric label="Consensus Attention" value={signal.consensus_attention} />
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>Signal Burdens</SectionLabel>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                    <ScoreBar
                      label="Evidence Agreement"
                      value={signal.evidence_agreement}
                      color="#A8C979"
                    />
                    <ScoreBar
                      label="Contradiction Burden"
                      value={signal.contradiction_burden}
                      color="#D6B25A"
                    />
                    <ScoreBar
                      label="Missing Data Burden"
                      value={signal.missing_data_burden}
                      color="#C98A8A"
                    />
                  </div>
                  <div className="mt-6 border-t pz-border pt-4">
                    <div className="font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
                      Most Disputed Claim
                    </div>
                    <p className="mt-2 text-[13px] leading-snug text-pz-text">
                      {signal.most_disputed_claim}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-pz-soft font-light">
                      {signal.most_disputed_detail}
                    </p>
                  </div>
                </Panel>
              </div>

              <Panel>
                <SectionLabel>Momentum Dashboard</SectionLabel>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  {Object.entries(signal.momentum).map(([key, metric]) => (
                    <MomentumCard
                      key={key}
                      label={MOMENTUM_LABELS[key] ?? metric.label}
                      metric={metric}
                    />
                  ))}
                </div>
              </Panel>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <SignalList
                  title="Alpha-Supporting Signals"
                  items={signal.alpha_supporting}
                  empty="No dominant alpha-supporting signal."
                  color="#A8C979"
                />
                <SignalList
                  title="Warning Signals"
                  items={signal.warning_signals}
                  empty="No dominant warning signal."
                  color="#C98A8A"
                />
              </div>

              <Panel>
                <SectionLabel>Agent Signal Ledger</SectionLabel>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-[12px]">
                    <thead>
                      <tr>
                        {["Agent", "Source", "Claim", "Polarity", "Tier", "Weight", "Next Question"].map(
                          (head) => (
                            <th
                              key={head}
                              className="border-b pz-border py-2 px-3 first:pl-0 text-left font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted font-normal"
                            >
                              {head}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {signal.events.map((event) => (
                        <SignalRow key={event.id} event={event} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <Panel>
                  <SectionLabel>Missing Data Burden</SectionLabel>
                  <ul className="mt-4 flex flex-col">
                    {signal.missing_fields.map((field) => (
                      <li key={field} className="border-t pz-border py-3 first:border-t-0">
                        <span className="text-[12.5px] text-pz-soft font-light">{field}</span>
                      </li>
                    ))}
                    {signal.missing_fields.length === 0 && (
                      <li className="text-[12.5px] text-pz-soft font-light">
                        No required diligence field is visibly missing from this signal layer.
                      </li>
                    )}
                  </ul>
                </Panel>

                <Panel>
                  <SectionLabel>Next Diligence Questions</SectionLabel>
                  <ol className="mt-4 flex flex-col">
                    {signal.diligence_questions.map((question, i) => (
                      <li
                        key={question}
                        className="border-t pz-border py-3 first:border-t-0 flex gap-3"
                      >
                        <span className="font-mono-pz text-[10px] text-pz-accent">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[12.5px] leading-snug text-pz-soft font-light">
                          {question}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </div>

              {activity.data && (
                <Panel>
                  <SectionLabel>Supporting Agent Activity</SectionLabel>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniMetric label="Signals Parsed" value={activity.data.total_signals_parsed} />
                    <MiniMetric label="Candidates" value={activity.data.candidates_evaluated} />
                    <MiniMetric label="Failure Flags" value={activity.data.failure_flags_raised} />
                    <MiniMetric label="Missing Items" value={activity.data.missing_data_items} />
                  </div>
                </Panel>
              )}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

function StoryCard({ label, text }: { label: string; text: string }) {
  return (
    <Panel className="p-5">
      <SectionLabel>{label}</SectionLabel>
      <p className="mt-3 text-[12.5px] leading-snug text-pz-soft font-light">{text}</p>
    </Panel>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border pz-border rounded-sm px-3 py-3">
      <div className="font-serif-display text-[28px] leading-none text-pz-text">
        {Math.round(value)}
      </div>
      <div className="mt-2 font-mono-pz text-[8.5px] tracking-[0.18em] uppercase text-pz-muted">
        {label}
      </div>
    </div>
  );
}

function MomentumCard({ label, metric }: { label: string; metric: MomentumMetric }) {
  const color = directionColor(metric.direction);
  return (
    <div className="border pz-border rounded-sm p-4 bg-[rgba(255,255,255,0.015)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12.5px] text-pz-text">{label}</span>
        <span
          className="font-mono-pz text-[8.5px] tracking-[0.16em] uppercase"
          style={{ color }}
        >
          {metric.direction}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="font-serif-display text-[30px] leading-none text-pz-text">
            {Math.round(metric.velocity)}
          </div>
          <div className="mt-1 font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-muted">
            Velocity
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-pz text-[12px]" style={{ color }}>
            {metric.acceleration > 0 ? "+" : ""}
            {metric.acceleration.toFixed(1)}
          </div>
          <div className="mt-1 font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-muted">
            Accel.
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11.5px] leading-snug text-pz-soft font-light">
        {metric.interpretation}
      </p>
    </div>
  );
}

function SignalList({
  title,
  items,
  empty,
  color,
}: {
  title: string;
  items: string[];
  empty: string;
  color: string;
}) {
  return (
    <Panel>
      <SectionLabel>{title}</SectionLabel>
      <ul className="mt-4 flex flex-col">
        {(items.length ? items : [empty]).map((item) => (
          <li key={item} className="border-t pz-border py-3 first:border-t-0 flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[12.5px] leading-snug text-pz-soft font-light">{item}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SignalRow({ event }: { event: SignalEvent }) {
  const color = POLARITY_COLOR[event.polarity] ?? "#7FA8B8";
  return (
    <tr>
      <td className="border-b pz-border py-3 px-3 pl-0 text-pz-text">{event.agent_name}</td>
      <td className="border-b pz-border py-3 px-3 text-pz-soft font-light">
        {event.source_type}
        <div className="font-mono-pz text-[8.5px] tracking-[0.14em] uppercase text-pz-muted">
          {event.quarter}
        </div>
      </td>
      <td className="border-b pz-border py-3 px-3 text-pz-soft font-light leading-snug">
        {event.claim}
      </td>
      <td className="border-b pz-border py-3 px-3">
        <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase" style={{ color }}>
          {event.polarity}
        </span>
      </td>
      <td className="border-b pz-border py-3 px-3 font-light text-pz-soft">
        {event.evidence_tier}
      </td>
      <td className="border-b pz-border py-3 px-3 font-mono-pz text-[11px]" style={{ color }}>
        {event.weighted_signal > 0 ? "+" : ""}
        {event.weighted_signal.toFixed(1)}
      </td>
      <td className="border-b pz-border py-3 px-3 text-pz-soft font-light leading-snug">
        {event.diligence_question}
      </td>
    </tr>
  );
}

function directionColor(direction: MomentumMetric["direction"]) {
  if (direction === "increasing" || direction === "supportive") return "#A8C979";
  if (direction === "declining" || direction === "warning") return "#C98A8A";
  if (direction === "mixed") return "#D6B25A";
  return "#7FA8B8";
}

function regimeCopy(regime: string) {
  if (regime === "Hidden Alpha") return "Support is building before the market has fully crowded into the thesis.";
  if (regime === "Crowded Consensus") return "Evidence is strong, but consensus attention may compress differentiation and timing advantage.";
  if (regime === "Noisy Signal") return "Momentum is visible, but contradiction burden is high enough to demand focused review.";
  if (regime === "Failure-Risk Drift") return "Warning signals are outweighing support in the current evidence set.";
  if (regime === "Weak Signal") return "The opportunity needs stronger, independent support before deeper diligence.";
  return "The next diligence questions matter more than a simple rank order.";
}

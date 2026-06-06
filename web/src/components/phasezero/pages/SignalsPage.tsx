import AppLayout from "../AppLayout";
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Panel,
  SectionLabel,
} from "../primitives";
import { useAgentActivity } from "@/lib/usePhaseZero";

export default function SignalsPage() {
  const { data, loading, error } = useAgentActivity();

  return (
    <AppLayout title="Signal Scan" loading={loading}>
      <PageHeader
        eyebrow="Agentic Parsing Layer"
        title="Signal Scan"
        subtitle="Each agent parses evidence deterministically across literature, trials, regulatory, and commercial domains."
      />

      {loading && <LoadingPanel label="Loading scan telemetry" />}
      {error && !loading && <ErrorPanel />}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Metric label="Signals Parsed" value={data.total_signals_parsed} />
            <Metric label="Candidates Evaluated" value={data.candidates_evaluated} />
            <Metric label="Failure Flags Raised" value={data.failure_flags_raised} />
            <Metric label="Missing Data Items" value={data.missing_data_items} />
          </div>

          <Panel>
            <SectionLabel>Scan Sequence</SectionLabel>
            <div className="mt-4 flex flex-col">
              {data.scan_sequence.map((step, i) => (
                <div
                  key={step.agent}
                  className="flex items-start gap-4 border-t pz-border py-3.5 first:border-t-0"
                >
                  <span className="font-mono-pz text-[10px] text-pz-muted pt-0.5 w-6">
                    0{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-pz-accent" />
                      <span className="text-[13px] text-pz-text">{step.agent}</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-pz-soft font-light">
                      {step.action}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-pz text-[10px] text-pz-accent">
                      {step.duration_ms}ms
                    </div>
                    <div className="font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-muted">
                      {step.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </AppLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <div className="font-serif-display text-[34px] leading-none text-pz-text">{value}</div>
      <div className="mt-2 font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
        {label}
      </div>
    </Panel>
  );
}

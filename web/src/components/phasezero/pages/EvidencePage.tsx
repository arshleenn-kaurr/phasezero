import AppLayout from "../AppLayout";
import CandidatePicker from "../CandidatePicker";
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Panel,
  SectionLabel,
} from "../primitives";
import { useSelectedCandidate } from "@/lib/usePhaseZero";

const QUALITY_COLOR: Record<string, string> = {
  high: "#A8C979",
  medium: "#D6B25A",
  low: "#8A8F86",
};

export default function EvidencePage() {
  const s = useSelectedCandidate();

  return (
    <AppLayout title="Evidence" loading={s.candidatesLoading || s.detailLoading}>
      <PageHeader
        eyebrow="Evidence Graph"
        title="Evidence"
        subtitle="Offline evidence graph connecting candidates, domains, agents, and signals — ranked by network centrality."
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

          {s.detailLoading && <LoadingPanel label="Building evidence graph" />}
          {s.detailError && !s.detailLoading && <ErrorPanel />}

          {s.detail && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Metric label="Graph Nodes" value={s.detail.evidence_graph.node_count} />
                <Metric label="Graph Edges" value={s.detail.evidence_graph.edge_count} />
                <Metric
                  label="High-Quality Signals"
                  value={s.detail.evidence_graph.quality_counts.high ?? 0}
                />
                <Metric
                  label="Domains Covered"
                  value={Object.keys(s.detail.evidence_graph.domain_counts).length}
                />
              </div>

              <Panel>
                <SectionLabel>Top Signals by Centrality</SectionLabel>
                <ul className="mt-4 flex flex-col">
                  {s.detail.evidence_graph.top_signals.map((sig, i) => (
                    <li key={i} className="border-t pz-border py-3 first:border-t-0">
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ background: QUALITY_COLOR[sig.quality] ?? "#8A8F86" }}
                        />
                        <div className="min-w-0">
                          <p className="text-[12.5px] leading-snug text-pz-soft font-light">
                            {sig.signal}
                          </p>
                          <div className="mt-1 font-mono-pz text-[9px] tracking-[0.14em] uppercase text-pz-muted">
                            {sig.source} · {sig.quality} · centrality {sig.centrality}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel>
                <SectionLabel>Agent Findings</SectionLabel>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  {s.detail.agents.map((agent) => (
                    <div key={agent.name} className="border-t pz-border pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] text-pz-text">{agent.name}</span>
                        <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-accent">
                          {agent.confidence}%
                        </span>
                      </div>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {agent.findings.map((f, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-[11.5px] leading-snug text-pz-soft font-light"
                          >
                            <span className="text-pz-accent text-[7px] pt-1.5">●</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <div className="font-serif-display text-[32px] leading-none text-pz-text">{value}</div>
      <div className="mt-2 font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
        {label}
      </div>
    </Panel>
  );
}

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import AppLayout from "../AppLayout";
import {
  Chip,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Panel,
  ScoreBar,
  statusHex,
} from "../primitives";
import { useCandidates } from "@/lib/usePhaseZero";

export default function OpportunitiesPage() {
  const { data, loading, error } = useCandidates();

  return (
    <AppLayout title="Opportunities" loading={loading}>
      <PageHeader
        eyebrow="Diligence Pipeline"
        title="ADC Opportunities"
        subtitle="Candidates ranked by computed diligence priority. Every score is generated live by the PhaseZero scoring engine."
      />

      {loading && <LoadingPanel label="Scoring candidates" />}
      {error && !loading && <ErrorPanel />}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {data.map((c) => {
            const color = statusHex(c.status_color);
            return (
              <Link
                key={c.id}
                to="/opportunities/$id"
                params={{ id: c.id }}
                className="block group"
              >
                <Panel className="h-full transition-colors group-hover:bg-[color:var(--pz-panel-alt)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono-pz text-[10px] tracking-[0.18em] uppercase text-pz-muted">
                        {c.id}
                      </div>
                      <h2 className="mt-1.5 font-serif-display text-[24px] leading-tight text-pz-text">
                        {c.name}
                      </h2>
                    </div>
                    <div className="text-right">
                      <div className="font-serif-display text-[34px] leading-none text-pz-text">
                        {c.score}
                      </div>
                      <div className="font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-muted">
                        Priority
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Chip label={c.stage} color={color} />
                    <Chip label={c.recommendation} />
                  </div>

                  <p className="mt-3 text-[12px] leading-relaxed text-pz-soft font-light line-clamp-3">
                    {c.headline}
                  </p>

                  <div className="mt-4 flex flex-col gap-2.5 border-t pz-border pt-4">
                    <ScoreBar label="Readiness" value={c.scores.readiness} />
                    <ScoreBar label="Commercial Alpha" value={c.scores.commercial_alpha} />
                    <ScoreBar label="Evidence Quality" value={c.scores.evidence_quality} />
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-pz-accent font-mono-pz text-[10px] tracking-[0.18em] uppercase">
                    Open Diligence <ArrowRight size={12} />
                  </div>
                </Panel>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

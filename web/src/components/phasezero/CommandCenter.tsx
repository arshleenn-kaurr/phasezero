import { useEffect, useState } from "react";
import AppLayout from "./AppLayout";
import FeaturedOpportunity from "./FeaturedOpportunity";
import RecommendationPanel from "./RecommendationPanel";
import PipelineBar from "./PipelineBar";
import {
  fetchCommandCenter,
  MOCK_COMMAND_CENTER,
  type CommandCenterData,
} from "@/lib/api";

export default function CommandCenter() {
  // Seed with mock data so the page renders fully on first paint and acts as a
  // fallback if the backend is unavailable.
  const [data, setData] = useState<CommandCenterData>(MOCK_COMMAND_CENTER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchCommandCenter(controller.signal)
      .then((live) => setData(live))
      .catch(() => {
        // Keep the mock fallback already in state.
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <AppLayout title="Command Center" loading={loading}>
      <Hero />
      <StatsRow status={data.status} />

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
        <FeaturedOpportunity opportunity={data.featured_opportunity} />
        <RecommendationPanel
          opportunity={data.featured_opportunity}
          memo={data.decision_memo}
        />
      </div>

      <PipelineBar />
    </AppLayout>
  );
}

function Hero() {
  return (
    <header>
      <h1 className="font-serif-display text-pz-text text-[56px] md:text-[68px] leading-[0.98] tracking-tight font-normal">
        Find therapeutic <em className="italic text-pz-accent font-normal">alpha</em>
        <br />
        before consensus forms.
      </h1>
      <p className="mt-5 font-mono-pz text-[10.5px] tracking-[0.28em] uppercase text-pz-muted">
        AI-Native · Evidence-First · Outcome-Driven
      </p>
    </header>
  );
}

function StatsRow({ status }: { status: CommandCenterData["status"] }) {
  const STATS = [
    { label: "System Status", value: status.system_status, accent: true },
    {
      label: "Signals Monitored",
      value: status.signals_monitored.toLocaleString("en-US"),
    },
    { label: "Models Active", value: String(status.models_active) },
    {
      label: "Opportunities Tracked",
      value: String(status.opportunities_tracked),
    },
    { label: "Last Update", value: status.last_update },
  ];
  return (
    <div className="mt-9 border-t border-b pz-border py-4 grid grid-cols-2 md:grid-cols-5 gap-y-3">
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className={`px-5 first:pl-0 ${i > 0 ? "md:border-l pz-border" : ""}`}
        >
          <div className="flex items-center gap-2">
            {s.accent && <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" />}
            <div className="font-mono-pz text-[9.5px] tracking-[0.22em] uppercase text-pz-muted">
              {s.label}
            </div>
          </div>
          <div
            className={`mt-1.5 text-[14px] ${
              s.accent ? "text-pz-accent" : "text-pz-text"
            } font-light`}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
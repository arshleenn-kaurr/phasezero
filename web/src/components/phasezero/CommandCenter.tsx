import Sidebar from "./Sidebar";
import FeaturedOpportunity from "./FeaturedOpportunity";
import RecommendationPanel from "./RecommendationPanel";
import PipelineBar from "./PipelineBar";
import { Search } from "lucide-react";

export default function CommandCenter() {
  return (
    <div className="min-h-screen w-full bg-pz-bg text-pz-text flex">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />

        <main className="flex-1 px-8 lg:px-12 pt-8 pb-10">
          <Hero />
          <StatsRow />

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
            <FeaturedOpportunity />
            <RecommendationPanel />
          </div>

          <PipelineBar />
        </main>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div className="px-8 lg:px-12 pt-7 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-pz-accent" />
        <span className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-accent">
          Command Center
        </span>
      </div>
      <div className="flex items-center gap-2.5 min-w-[280px] max-w-[420px] w-full border-b pz-border pb-1.5">
        <Search size={13} className="text-pz-muted" />
        <input
          type="text"
          placeholder="Search targets, modalities, or data…"
          className="bg-transparent text-[12.5px] text-pz-soft placeholder:text-pz-muted outline-none w-full font-light"
        />
      </div>
    </div>
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

const STATS = [
  { label: "System Status", value: "All Systems Operational", accent: true },
  { label: "Signals Monitored", value: "12,842" },
  { label: "Models Active", value: "37" },
  { label: "Opportunities Tracked", value: "184" },
  { label: "Last Update", value: "2m ago" },
];

function StatsRow() {
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
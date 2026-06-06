import { useState, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Search, TrendingUp, Crosshair, FlaskConical, BarChart3, Microscope } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import MoleculeHero from "./MoleculeHero";
import ShaderBackground from "@/components/ui/shader-background";
import { FloatingPaths } from "@/components/ui/background-paths";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import phasezeroDashboard from "@/assets/phasezero-dashboard.png";
import pzLogo from "@/assets/phasezero-logo.png";

// ---------------------------------------------------------------------------
// Brand mark
// ---------------------------------------------------------------------------

function PZMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 0.9)}
      viewBox="0 0 48 44"
      fill="none"
      aria-hidden="true"
    >
      <path d="M5 40 L5 6" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M5 6 L26 6" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M26 6 L16 23" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M16 23 L5 23" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M14 13 L43 13" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M43 13 L14 40" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
      <path d="M14 40 L43 40" stroke="currentColor" strokeWidth="3.8" strokeLinecap="square" />
    </svg>
  );
}

function PZLogo({ scale = 1 }: { scale?: number }) {
  const markSize = Math.round(44 * scale);
  const nameSize = Math.round(18 * scale);
  const subSize = Math.round(9 * scale);
  const divH = Math.round(36 * scale);
  const gap = Math.round(14 * scale);
  return (
    <div className="flex items-center" style={{ gap }}>
      <div className="text-pz-text">
        <PZMark size={markSize} />
      </div>
      <div className="bg-pz-muted/40 shrink-0" style={{ width: 1, height: divH }} />
      <div className="flex flex-col justify-center">
        <div
          className="font-mono-pz text-pz-text font-medium leading-none"
          style={{ fontSize: nameSize, letterSpacing: "0.28em" }}
        >
          <span>PHASE</span>
          <span className="text-pz-accent">ZERO</span>
        </div>
        <div
          className="font-mono-pz text-pz-muted leading-none mt-1"
          style={{ fontSize: subSize, letterSpacing: "0.32em" }}
        >
          SCIENTIFIC INTELLIGENCE
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface Opp {
  id: string;
  name: string;
  target: string;
  modality: string;
  indication: string;
  whySurfaced: string;
  priority: number;
  evidenceDelta: number;
  action: string;
  scoreColor: string;
  isResearch: boolean;
  researchQuery?: string;
}

const OPPORTUNITIES: Opp[] = [
  {
    id: "tf-adc",
    name: "Tissue Factor ADC",
    target: "F3 / CD142",
    modality: "ADC",
    indication: "Recurrent / Metastatic Cervical Cancer",
    whySurfaced:
      "New trial activity combined with high target expression data and significant commercial whitespace in the 2L+ setting.",
    priority: 70,
    evidenceDelta: 12,
    action: "Advance to diligence memo",
    scoreColor: "#A8C979",
    isResearch: false,
  },
  {
    id: "cldn18-adc",
    name: "CLDN18.2 ADC",
    target: "CLDN18",
    modality: "ADC",
    indication: "Gastric Cancer",
    whySurfaced:
      "Strong target rationale and validated clinical precedent, but increasingly crowded competitive landscape demands a differentiation thesis.",
    priority: 64,
    evidenceDelta: 8,
    action: "Monitor differentiation",
    scoreColor: "#D6B25A",
    isResearch: true,
    researchQuery: "CLDN18.2 ADC gastric cancer",
  },
  {
    id: "nectin4-adc",
    name: "Nectin-4 ADC Expansion",
    target: "NECTIN4",
    modality: "ADC",
    indication: "Non-Urothelial Solid Tumors",
    whySurfaced:
      "Label expansion potential across multiple solid tumor types, backed by known ADC structural precedent from the approved urothelial program.",
    priority: 62,
    evidenceDelta: 6,
    action: "Stress-test indication expansion",
    scoreColor: "#D6B25A",
    isResearch: false,
  },
  {
    id: "b7h4-adc",
    name: "B7-H4 ADC",
    target: "VTCN1",
    modality: "ADC",
    indication: "Triple-Negative Breast Cancer",
    whySurfaced:
      "Emerging target interest with early-phase clinical signals, but failure-risk flags from hematologic toxicity precedents require de-risking before advancement.",
    priority: 52,
    evidenceDelta: 4,
    action: "Needs de-risking",
    scoreColor: "#C98A8A",
    isResearch: false,
  },
];

const FEED_ITEMS = [
  {
    type: "signal" as const,
    agent: "Trial Agent",
    finding: "found 2 new ADC studies in cervical cancer",
    time: "4m ago",
  },
  {
    type: "signal" as const,
    agent: "Literature Agent",
    finding: "extracted 14 target-expression signals across 3 candidates",
    time: "12m ago",
  },
  {
    type: "flag" as const,
    agent: "Failure Agent",
    finding: "flagged hematologic toxicity precedent in B7-H4 program",
    time: "28m ago",
  },
  {
    type: "signal" as const,
    agent: "Commercial Agent",
    finding: "identified 2L+ cervical whitespace in competitive landscape",
    time: "41m ago",
  },
  {
    type: "signal" as const,
    agent: "Structure Agent",
    finding: "found predicted AlphaFold structure candidate for VTCN1",
    time: "1h ago",
  },
];

const STATS = [
  { value: "128", label: "signals monitored" },
  { value: "8", label: "agents active" },
  { value: "4", label: "opportunities surfaced" },
  { value: "2", label: "memos drafted" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesQuery(opp: Opp, q: string): boolean {
  const norm = q.toLowerCase();
  return [opp.name, opp.target, opp.modality, opp.indication, opp.action].some((f) =>
    f.toLowerCase().includes(norm),
  );
}

// ---------------------------------------------------------------------------
// Opportunity row
// ---------------------------------------------------------------------------

const OPP_ICONS: Record<string, React.ReactNode> = {
  ADC: <FlaskConical size={20} />,
  default: <Crosshair size={20} />,
};

function OpportunityRow({ opp, idx }: { opp: Opp; idx: number }) {
  const icon = OPP_ICONS[opp.modality] ?? OPP_ICONS.default;
  const detailTo = opp.isResearch
    ? { to: "/research" as const, search: { q: opp.researchQuery ?? opp.name } }
    : { to: "/opportunities/$id" as const, params: { id: opp.id } };

  return (
    <>
      <Separator className="bg-[rgba(168,201,121,0.12)]" />
      <div className="group grid items-center gap-4 px-0 py-5 md:grid-cols-[1fr_2fr_auto]">

        {/* Col 1 — icon + name + category */}
        <div className="flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border"
            style={{ borderColor: `${opp.scoreColor}33`, color: opp.scoreColor, background: `${opp.scoreColor}0D` }}
          >
            {icon}
          </span>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="font-mono-pz text-[9px] tracking-[0.2em] uppercase"
                style={{ color: opp.scoreColor }}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <h3 className="font-serif-display text-[18px] leading-none text-pz-text group-hover:text-pz-accent transition-colors truncate">
                {opp.name}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono-pz text-[10px] tracking-[0.14em] uppercase text-pz-muted">
                {opp.target} · {opp.modality}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-mono-pz text-[8px] tracking-[0.12em] uppercase"
                style={{ borderColor: `${opp.scoreColor}33`, color: opp.scoreColor }}
              >
                <span className="h-1 w-1 rounded-full shrink-0" style={{ background: opp.scoreColor }} />
                {opp.action}
              </span>
            </div>
          </div>
        </div>

        {/* Col 2 — description + delta */}
        <div>
          <p className="text-[13px] leading-relaxed text-pz-soft font-light">{opp.whySurfaced}</p>
          <div className="mt-2 flex items-center gap-1.5 font-mono-pz text-[10px] tracking-[0.12em] text-pz-muted">
            <TrendingUp size={10} className="text-pz-accent" />
            <span className="text-pz-accent">+{opp.evidenceDelta} signals</span>
            <span>this week</span>
            <span className="mx-2 opacity-30">·</span>
            <span className="font-serif-display text-[16px] leading-none" style={{ color: opp.scoreColor }}>
              {opp.priority}
            </span>
            <span className="text-pz-muted">/ 100</span>
          </div>
        </div>

        {/* Col 3 — CTA */}
        {opp.isResearch ? (
          <Link
            to="/research"
            search={{ q: opp.researchQuery ?? opp.name }}
            className="ml-auto flex items-center gap-2 rounded-sm border pz-border px-4 py-2 font-mono-pz text-[9.5px] tracking-[0.18em] uppercase text-pz-muted hover:border-pz-accent hover:text-pz-accent transition-colors whitespace-nowrap"
          >
            View Details <ArrowRight size={11} />
          </Link>
        ) : (
          <Link
            to="/opportunities/$id"
            params={{ id: opp.id }}
            className="ml-auto flex items-center gap-2 rounded-sm border pz-border px-4 py-2 font-mono-pz text-[9.5px] tracking-[0.18em] uppercase text-pz-muted hover:border-pz-accent hover:text-pz-accent transition-colors whitespace-nowrap"
          >
            View Details <ArrowRight size={11} />
          </Link>
        )}
      </div>
    </>
  );
}

function OpportunityList({ opps }: { opps: Opp[] }) {
  return (
    <div className="flex flex-col">
      {opps.map((opp, idx) => <OpportunityRow key={opp.id} opp={opp} idx={idx} />)}
      <Separator className="bg-[rgba(168,201,121,0.12)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SearchHome() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const trimmed = query.trim();
  const visibleOpps = trimmed
    ? OPPORTUNITIES.filter((o) => matchesQuery(o, trimmed))
    : OPPORTUNITIES;
  const hasNoMatches = trimmed.length > 0 && visibleOpps.length === 0;

  function handleResearch() {
    if (trimmed) navigate({ to: "/research", search: { q: trimmed } });
  }

  function focusSearch() {
    searchRef.current?.focus();
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-pz-bg text-pz-text flex flex-col">

      {/* ── Persistent sidebar trigger — fixed top-left ── */}
      <div className="fixed top-4 left-4 z-50">
        <SidebarTrigger className="h-9 w-9 rounded-sm border pz-border bg-pz-bg/80 backdrop-blur-sm text-pz-muted hover:text-pz-accent hover:border-pz-accent transition-colors" />
      </div>

      {/* ── Full-screen molecule hero ── */}
      <MoleculeHero />

      {/* ── Bridge: animated wave zone between hero and section header ── */}
      <div className="relative overflow-hidden bg-pz-bg" style={{ height: "clamp(100px, 14vw, 180px)" }}>
        <FloatingPaths position={1} opacityScale={5} />
        <FloatingPaths position={-1} opacityScale={5} />
      </div>

      {/* ── Animated section: subtle shader behind section header + ContainerScroll (no path clutter) ── */}
      <div className="relative">
        {/* Shader canvas embedded here — visible because it's inside this div, not fighting solid fixed bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <ShaderBackground />
        </div>

        {/* Section header */}
        <div className="relative z-10 px-8 lg:px-14 pt-4 pb-4 flex items-center justify-between">
          <div>
            <div className="font-mono-pz text-[9.5px] tracking-[0.34em] uppercase text-pz-accent">
              Today's Opportunity Brief
            </div>
            <h2 className="mt-2 font-serif-display text-[28px] leading-tight text-pz-text">
              Plausible ADC targets, ranked by signal.
            </h2>
          </div>
          <Link
            to="/opportunities"
            className="hidden lg:flex items-center gap-1.5 font-mono-pz text-[9.5px] tracking-[0.2em] uppercase text-pz-muted hover:text-pz-accent transition-colors"
          >
            All Opportunities <ArrowUpRight size={10} />
          </Link>
        </div>

        {/* Second wave bridge — just below the section header text, before ContainerScroll */}
        <div className="relative overflow-hidden" style={{ height: "90px" }}>
          <FloatingPaths position={-1} opacityScale={3} />
          <FloatingPaths position={0.5} opacityScale={3} />
        </div>

        {/* ContainerScroll inside the animated zone */}
        <div className="relative z-10">
      <ContainerScroll
        titleComponent={
          <div className="mb-6">
            <div className="font-mono-pz text-[9.5px] tracking-[0.34em] uppercase text-pz-accent mb-4">
              Intelligence Platform
            </div>
            <h2 className="font-serif-display text-[40px] md:text-[58px] leading-[0.92] text-pz-text">
              Signal to decision,
              <br />
              <em className="italic text-pz-accent font-normal">at machine speed.</em>
            </h2>
            <p className="mt-4 text-[13.5px] font-light text-pz-soft max-w-xl mx-auto">
              Eight autonomous agents continuously monitor biomedical literature, clinical trials,
              regulatory filings, and commercial data — surfacing ranked opportunities in real time.
            </p>
          </div>
        }
      >
        <img
          src={phasezeroDashboard}
          alt="PhaseZero analytics dashboard"
          className="mx-auto rounded-2xl object-cover h-full w-full object-top"
          draggable={false}
        />
      </ContainerScroll>
        </div>{/* end relative z-10 ContainerScroll wrapper */}
      </div>{/* end animated gap section */}

      {/* ── Compact search ── */}
      <section className="px-8 lg:px-14 pb-10">
        <div className="max-w-2xl">
          <div
            className={`flex items-center gap-3 border rounded-sm px-4 py-3 transition-colors ${
              focused
                ? "border-[color:var(--pz-border-strong)] bg-[color:var(--pz-panel-alt)]"
                : "pz-border"
            }`}
          >
            <Search size={13} className="text-pz-muted shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleResearch();
              }}
              placeholder="Search targets, modalities, indications, companies, or mechanisms…"
              className="flex-1 bg-transparent text-[13px] font-light text-pz-text placeholder:text-pz-muted/50 outline-none"
            />
            {trimmed && (
              <button
                onClick={() => setQuery("")}
                className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted hover:text-pz-soft transition-colors shrink-0"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Opportunity Queue ── */}
      <section className="px-8 lg:px-14 pb-16 flex-1">
        {/* Explore hint banner */}
        <div className="mb-5 flex items-center gap-3 rounded-sm border pz-border bg-[rgba(168,201,121,0.04)] px-4 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-pz-accent shrink-0 pz-pulse" />
          <p className="text-[13px] text-pz-soft font-light flex-1">
            Click <span className="text-pz-accent font-medium">View Details</span> on any target below to open the full diligence suite — clinical simulations, regulatory pathway, market sizing, and BD analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-mono-pz text-[11px] tracking-[0.24em] uppercase text-pz-muted">
            Active Opportunities
          </span>
          <span className="font-mono-pz text-[10px] tracking-[0.16em] uppercase text-pz-accent">
            {visibleOpps.length} surfaced
          </span>
          {trimmed && (
            <span className="font-mono-pz text-[9px] tracking-[0.12em] text-pz-muted">
              · filtered: "{trimmed}"
            </span>
          )}
        </div>

        {hasNoMatches ? (
          <div className="border-t pz-border mt-2 pt-12 pb-8 flex flex-col items-center gap-4 text-center">
            <div className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-muted">
              No opportunities match "{trimmed}"
            </div>
            <p className="text-[13px] text-pz-soft font-light max-w-sm">
              This target or indication isn't in the current brief. Run a fresh research scan to
              surface biomedical evidence from live sources.
            </p>
            <button
              onClick={handleResearch}
              className="mt-2 flex items-center gap-2 border border-[color:var(--pz-border-strong)] rounded-sm px-5 py-2.5 font-mono-pz text-[9.5px] tracking-[0.2em] uppercase text-pz-accent hover:text-pz-text hover:border-pz-accent transition-colors"
            >
              Run new research scan <ArrowRight size={11} />
            </button>
          </div>
        ) : (
          <OpportunityList opps={visibleOpps} />
        )}
      </section>

      {/* ── Intelligence Feed ── */}
      <section className="px-8 lg:px-14 border-t pz-border py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10 lg:gap-16 items-start">

          {/* Feed */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono-pz text-[10px] tracking-[0.24em] uppercase text-pz-muted">
                Intelligence Feed
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" />
              <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-accent">
                Live
              </span>
            </div>
            <ul>
              {FEED_ITEMS.map((item, i) => (
                <li
                  key={i}
                  className="border-t pz-border py-3.5 flex items-start gap-3"
                >
                  <span
                    className="mt-[5px] h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      background: item.type === "flag" ? "#D6B25A" : "#A8C979",
                    }}
                  />
                  <div className="flex-1 min-w-0 text-[13px] text-pz-soft font-light leading-snug">
                    <span className="text-pz-text">{item.agent}</span>{" "}
                    {item.finding}
                  </div>
                  <span className="font-mono-pz text-[9px] tracking-[0.12em] text-pz-muted shrink-0 pt-0.5">
                    {item.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* System status column */}
          <div className="border-t pz-border pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-10">
            <div className="font-mono-pz text-[10px] tracking-[0.24em] uppercase text-pz-muted mb-5">
              System Status
            </div>
            <div className="flex items-center gap-2 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-pz-accent pz-pulse" />
              <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-accent">
                All systems operational
              </span>
            </div>
            <div className="flex flex-col gap-0">
              {STATS.map((s) => (
                <div key={s.label} className="border-t pz-border py-3.5">
                  <div className="font-serif-display text-[30px] leading-none text-pz-text">
                    {s.value}
                  </div>
                  <div className="mt-1 font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer stats strip ── */}
      <footer className="shrink-0 border-t pz-border px-8 lg:px-14 py-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 justify-between">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <span className="font-serif-display text-[20px] leading-none text-pz-text">
                  {s.value}
                </span>
                <span className="font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <img
            src={pzLogo}
            alt="PhaseZero"
            className="h-14 w-auto opacity-85"
            style={{ filter: "invert(1) hue-rotate(180deg) brightness(2.2) saturate(1.2)" }}
          />
        </div>
      </footer>
    </div>
  );
}

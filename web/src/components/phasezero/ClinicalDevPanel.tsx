import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Panel, SectionLabel, Stat } from "@/components/phasezero/primitives";
import ProteinViewer from "@/components/ProteinViewer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  name: string;
  target: string;
  indication: string;
  pdbId?: string;
  pdbUrl?: string;
}

interface Props {
  candidate: Candidate;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Box–Muller normal sample with mean 0, std σ */
function randn(sigma: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12))) * Math.cos(2 * Math.PI * u2) * sigma;
}

// ---------------------------------------------------------------------------
// PK data builder
// ---------------------------------------------------------------------------

function buildPkData(aucPct: number): { t: number; C: number }[] {
  const times = [
    0, 0.5, 1, 2, 3, 4, 6, 8, 12,
    ...Array.from({ length: 57 - 9 }, (_, i) => 15 + i * 12),
  ];
  return times.map((t) => {
    const raw =
      80 *
      (aucPct / 60) *
      (Math.exp((-0.693 / 96) * t) - Math.exp((-0.693 / 1.5) * t));
    return { t, C: Math.max(0, raw) };
  });
}

// ---------------------------------------------------------------------------
// PD data builder
// ---------------------------------------------------------------------------

function buildPdData(): { c: number; effect: number }[] {
  return Array.from({ length: 51 }, (_, i) => {
    const c = i * 3; // 0, 3, 6, ..., 150
    return { c, effect: (100 * c) / (30 + c) };
  });
}

// ---------------------------------------------------------------------------
// Monte Carlo
// ---------------------------------------------------------------------------

interface McResult {
  bins: { bin: string; count: number }[];
  p10: number;
  p50: number;
  p90: number;
}

function runMonteCarlo(aucPct: number): McResult {
  const N = 2000;
  const values: number[] = [];

  for (let i = 0; i < N; i++) {
    const cl = 0.006 * Math.exp(randn(0.3));
    const ec50 = 30 * Math.exp(randn(0.4));
    const dose = (aucPct / 60) * 3;
    const auc_i = dose / cl;
    const cavg_i = auc_i / 672;
    const p_resp_i = 100 * (cavg_i / (ec50 + cavg_i));
    values.push(p_resp_i);
  }

  values.sort((a, b) => a - b);

  // Percentiles
  const pctile = (p: number) => {
    const idx = Math.floor((p / 100) * (N - 1));
    return Math.round(values[idx] * 10) / 10;
  };

  // 20 equal bins 0–100
  const BIN_COUNT = 20;
  const binCounts = Array<number>(BIN_COUNT).fill(0);
  for (const v of values) {
    const idx = Math.min(BIN_COUNT - 1, Math.floor((Math.max(0, Math.min(100, v)) / 100) * BIN_COUNT));
    binCounts[idx]++;
  }

  const bins = binCounts.map((count, i) => ({
    bin: `${i * 5}–${(i + 1) * 5}%`,
    count,
  }));

  return { bins, p10: pctile(10), p50: pctile(50), p90: pctile(90) };
}

// ---------------------------------------------------------------------------
// Colour helpers for stat boxes
// ---------------------------------------------------------------------------

const ACCENT = "#A8C979";
const AMBER = "#D6B25A";
const RED = "#C98A8A";

function pResponseColor(v: number): string {
  if (v > 50) return ACCENT;
  if (v >= 20) return AMBER;
  return RED;
}

function pToxColor(v: number): string {
  if (v > 30) return RED;
  if (v >= 15) return AMBER;
  return ACCENT;
}

// ---------------------------------------------------------------------------
// Shared chart style constants
// ---------------------------------------------------------------------------

const GRID_STROKE = "rgba(168,201,121,0.06)";
const TICK_COLOR = "#8B9288";
const TICK_FONT_SIZE = 10;
const CHART_BG = "transparent";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ClinicalDevPanel({ candidate }: Props) {
  const [aucPct, setAucPct] = useState<number>(60);

  // Derived PK/PD scalars
  const auc = aucPct * 16;
  const pResponse = Math.round(1000 / (1 + Math.exp(-0.008 * (auc - 480)))) / 10;
  const pTox = Math.round(1000 / (1 + Math.exp(-0.006 * (auc - 1200)))) / 10;
  const ti = (pResponse / Math.max(pTox, 0.1)).toFixed(1);

  // Chart data (recomputed on aucPct change)
  const pkData = useMemo(() => buildPkData(aucPct), [aucPct]);
  const pdData = useMemo(() => buildPdData(), []);
  const cmax = (80 * aucPct) / 60;

  // Monte Carlo (expensive — memoised)
  const mc = useMemo(() => runMonteCarlo(aucPct), [aucPct]);

  const pdbId = candidate.pdbId ?? "4ETQ";
  const [viewMode, setViewMode] = useState<"cartoon" | "surface" | "both">("both");

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Mechanism of Action + AUC Simulator                              */}
      {/* ------------------------------------------------------------------ */}
      <Panel>
        <SectionLabel>Mechanism of Action</SectionLabel>

        <p className="mt-3 text-[13px] leading-relaxed text-pz-soft font-light max-w-3xl">
          An antibody targeting <span className="text-pz-text">{candidate.target}</span> conjugated
          to a cytotoxic payload delivers selective tumor cell kill. Payload release is triggered by{" "}
          <span className="text-pz-text">{candidate.target}</span> internalization following ADC
          binding.
        </p>

        {/* Slider */}
        <div className="mt-5">
          <div className="flex items-center justify-between font-mono-pz text-[9.5px] tracking-[0.16em] uppercase text-pz-muted mb-2">
            <span>Target AUC Exposure</span>
            <span className="text-pz-soft">{auc.toFixed(0)} μg·h/mL</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={aucPct}
            onChange={(e) => setAucPct(Number(e.target.value))}
            className="w-full accent-[#A8C979] cursor-pointer"
          />
        </div>

        {/* Stat boxes */}
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div>
            <Stat label="P(Response)" value={`${pResponse}%`} color={pResponseColor(pResponse)} />
          </div>
          <div>
            <Stat label="P(Toxicity)" value={`${pTox}%`} color={pToxColor(pTox)} />
          </div>
          <div>
            <Stat label="Therapeutic Index" value={`${ti}×`} />
          </div>
        </div>
      </Panel>

      {/* ------------------------------------------------------------------ */}
      {/* 2. PK/PD Charts                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PK Chart */}
        <Panel>
          <SectionLabel>Plasma Concentration vs Time</SectionLabel>
          <div className="mt-4" style={{ height: 220, background: CHART_BG }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pkData} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
                <defs>
                  <linearGradient id="pkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(168,201,121,0.3)" />
                    <stop offset="100%" stopColor="rgba(168,201,121,0)" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_STROKE} />
                <XAxis
                  dataKey="t"
                  label={{
                    value: "Time (h)",
                    position: "insideBottom",
                    offset: -10,
                    fill: TICK_COLOR,
                    fontSize: TICK_FONT_SIZE,
                  }}
                  tick={{ fill: TICK_COLOR, fontSize: TICK_FONT_SIZE }}
                  tickLine={false}
                />
                <YAxis
                  label={{
                    value: "C (μg/mL)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fill: TICK_COLOR,
                    fontSize: TICK_FONT_SIZE,
                  }}
                  tick={{ fill: TICK_COLOR, fontSize: TICK_FONT_SIZE }}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0d1412",
                    border: "1px solid rgba(168,201,121,0.2)",
                    fontSize: 10,
                    color: "#c8ccc5",
                  }}
                  formatter={(v: number) => [v.toFixed(2), "C (μg/mL)"]}
                  labelFormatter={(l: number) => `t = ${l} h`}
                />
                <ReferenceLine
                  y={30}
                  stroke={ACCENT}
                  strokeDasharray="4 3"
                  label={{ value: "EC50", fill: ACCENT, fontSize: 9, position: "insideTopRight" }}
                />
                <Area
                  type="monotone"
                  dataKey="C"
                  stroke={ACCENT}
                  strokeWidth={1.5}
                  fill="url(#pkGradient)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* PD Chart */}
        <Panel>
          <SectionLabel>Concentration–Effect</SectionLabel>
          <div className="mt-4" style={{ height: 220, background: CHART_BG }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pdData} margin={{ top: 8, right: 16, bottom: 20, left: 8 }}>
                <CartesianGrid stroke={GRID_STROKE} />
                <XAxis
                  dataKey="c"
                  label={{
                    value: "Concentration (μg/mL)",
                    position: "insideBottom",
                    offset: -10,
                    fill: TICK_COLOR,
                    fontSize: TICK_FONT_SIZE,
                  }}
                  tick={{ fill: TICK_COLOR, fontSize: TICK_FONT_SIZE }}
                  tickLine={false}
                />
                <YAxis
                  label={{
                    value: "Effect (%)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fill: TICK_COLOR,
                    fontSize: TICK_FONT_SIZE,
                  }}
                  tick={{ fill: TICK_COLOR, fontSize: TICK_FONT_SIZE }}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0d1412",
                    border: "1px solid rgba(168,201,121,0.2)",
                    fontSize: 10,
                    color: "#c8ccc5",
                  }}
                  formatter={(v: number) => [v.toFixed(1), "Effect (%)"]}
                  labelFormatter={(l: number) => `C = ${l} μg/mL`}
                />
                <ReferenceLine
                  x={cmax}
                  stroke={ACCENT}
                  strokeDasharray="4 3"
                  label={{ value: "Cmax", fill: ACCENT, fontSize: 9, position: "insideTopRight" }}
                />
                <Line
                  type="monotone"
                  dataKey="effect"
                  stroke={ACCENT}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Monte Carlo Simulation                                           */}
      {/* ------------------------------------------------------------------ */}
      <Panel>
        <SectionLabel>Monte Carlo Simulation · 2 000 runs</SectionLabel>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <Stat label="P10" value={`${mc.p10}%`} />
          <Stat label="P50" value={`${mc.p50}%`} color={ACCENT} />
          <Stat label="P90" value={`${mc.p90}%`} />
        </div>

        <div className="mt-5" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mc.bins} margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="bin"
                label={{
                  value: "P(Response) bin",
                  position: "insideBottom",
                  offset: -12,
                  fill: TICK_COLOR,
                  fontSize: TICK_FONT_SIZE,
                }}
                tick={{ fill: TICK_COLOR, fontSize: 8 }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                label={{
                  value: "Count",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  fill: TICK_COLOR,
                  fontSize: TICK_FONT_SIZE,
                }}
                tick={{ fill: TICK_COLOR, fontSize: TICK_FONT_SIZE }}
                tickLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: "#0d1412",
                  border: "1px solid rgba(168,201,121,0.2)",
                  fontSize: 10,
                  color: "#c8ccc5",
                }}
              />
              <Bar
                dataKey="count"
                fill="rgba(168,201,121,0.55)"
                stroke={ACCENT}
                strokeWidth={0.5}
                isAnimationActive={false}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* ------------------------------------------------------------------ */}
      {/* 4. 3D Structure                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>
            Target Structure · {candidate.pdbUrl ? `AlphaFold / ${pdbId}` : pdbId}
          </SectionLabel>
          <div className="flex gap-1">
            {(["cartoon", "surface", "both"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`font-mono-pz text-[9px] tracking-[0.18em] uppercase px-2.5 py-1 border transition-colors ${
                  viewMode === m
                    ? "border-pz-accent text-pz-accent"
                    : "pz-border text-pz-muted hover:text-pz-soft"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <ProteinViewer
          pdbUrl={candidate.pdbUrl}
          pdbId={pdbId}
          height={340}
          mode={viewMode}
        />
      </Panel>
    </div>
  );
}

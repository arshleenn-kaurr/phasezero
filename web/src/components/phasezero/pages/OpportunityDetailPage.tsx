import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  FlaskConical,
  TrendingUp,
  ShieldCheck,
  Microscope,
  DollarSign,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";
import AppLayout from "../AppLayout";
import { Panel, SectionLabel, Chip, ScoreBar, ErrorPanel, LoadingPanel, statusHex, ACCENT } from "../primitives";
import { Gauge, Histogram, Stat, Tornado } from "../charts";
import ProteinViewer, { type ProteinViewerMode } from "@/components/ProteinViewer";
import Markdown from "../Markdown";
import ClinicalDevPanel from "../ClinicalDevPanel";
import { useCandidateDetail } from "@/lib/usePhaseZero";
import type { CandidateDetail } from "@/lib/api";

// ---------------------------------------------------------------------------
// Per-candidate demo data for non-clinical areas
// ---------------------------------------------------------------------------

const CANDIDATE_DATA: Record<string, {
  commercial: {
    tam: string; sam: string; pricing: string; peakLow: number; peakHigh: number;
    competitors: { name: string; stage: string; company: string; moa: string }[];
  };
  regulatory: {
    designation: string; pathway: string; riskLevel: "Low" | "Medium" | "High";
    precedents: { name: string; target: string; year: string; path: string }[];
    milestones: { label: string; months: number; done: boolean }[];
  };
  translational: {
    biomarker: string; validationStatus: string;
    expression: { tumor: string; pct: number }[];
    defaultThreshold: number;
  };
  bd: {
    npvBase: number; npvRisk: number;
    comparables: { name: string; year: string; upfront: string; total: string; stage: string }[];
    partnerTypes: { label: string; value: number }[];
  };
}> = {
  "tf-adc": {
    commercial: {
      tam: "$2.8B", sam: "$1.1B", pricing: "$180K–220K/yr",
      peakLow: 420, peakHigh: 780,
      competitors: [
        { name: "Tisotumab vedotin (Tivdak)", stage: "Approved", company: "Pfizer / Seagen", moa: "TF-directed ADC" },
        { name: "MORAb-109", stage: "Phase II", company: "Eisai", moa: "Farletuzumab ecteribulin" },
        { name: "XMT-1592", stage: "Phase I", company: "Mersana", moa: "TF ADC" },
      ],
    },
    regulatory: {
      designation: "Fast Track + Breakthrough Therapy",
      pathway: "Accelerated Approval",
      riskLevel: "Low",
      precedents: [
        { name: "Tivdak (tisotumab vedotin)", target: "TF", year: "2021", path: "Accelerated" },
        { name: "Keytruda (pembrolizumab)", target: "PD-1", year: "2018", path: "Accelerated" },
      ],
      milestones: [
        { label: "IND Filing", months: 0, done: true },
        { label: "Phase I Dose Escalation", months: 6, done: true },
        { label: "Phase II Enrollment Complete", months: 18, done: false },
        { label: "NDA Submission", months: 30, done: false },
        { label: "FDA Decision", months: 36, done: false },
      ],
    },
    translational: {
      biomarker: "Tissue Factor (TF/CD142)", validationStatus: "Clinically Validated",
      defaultThreshold: 25,
      expression: [
        { tumor: "Cervical", pct: 92 }, { tumor: "Endometrial", pct: 78 },
        { tumor: "Bladder", pct: 61 }, { tumor: "HNSCC", pct: 58 },
        { tumor: "NSCLC", pct: 44 }, { tumor: "Ovarian", pct: 39 },
      ],
    },
    bd: {
      npvBase: 650, npvRisk: 310,
      comparables: [
        { name: "Seagen / Pfizer (Tivdak rights)", year: "2020", upfront: "$125M", total: "$850M", stage: "Phase II" },
        { name: "AstraZeneca / Daiichi (Enhertu)", year: "2019", upfront: "$1.35B", total: "$6.9B", stage: "Phase II" },
        { name: "MSD / Immunomedics", year: "2019", upfront: "$300M", total: "$1.65B", stage: "Phase I" },
      ],
      partnerTypes: [
        { label: "Large Pharma", value: 55 }, { label: "Specialty Oncology", value: 25 },
        { label: "ADC Platform Co.", value: 12 }, { label: "Strategic Regional", value: 8 },
      ],
    },
  },
  "cldn18-adc": {
    commercial: {
      tam: "$3.4B", sam: "$1.3B", pricing: "$195K–240K/yr",
      peakLow: 380, peakHigh: 720,
      competitors: [
        { name: "Zolbetuximab (Vyloy)", stage: "Approved", company: "Astellas", moa: "CLDN18.2 mAb" },
        { name: "CMG901", stage: "Phase III", company: "Keymed/AstraZeneca", moa: "CLDN18.2 ADC" },
        { name: "SYSA1801", stage: "Phase II", company: "Sorrento/SYS", moa: "CLDN18.2 ADC" },
      ],
    },
    regulatory: {
      designation: "Fast Track",
      pathway: "Standard Review",
      riskLevel: "Medium",
      precedents: [
        { name: "Vyloy (zolbetuximab)", target: "CLDN18.2", year: "2024", path: "Standard" },
        { name: "Opdivo (nivolumab) GC", target: "PD-1", year: "2021", path: "Standard" },
      ],
      milestones: [
        { label: "IND Filing", months: 0, done: true },
        { label: "Phase I Completion", months: 8, done: true },
        { label: "Phase II Primary Endpoint", months: 22, done: false },
        { label: "BLA Submission", months: 36, done: false },
        { label: "FDA Decision", months: 48, done: false },
      ],
    },
    translational: {
      biomarker: "Claudin 18.2 (CLDN18.2)", validationStatus: "Validated — IHC ≥1+ in ≥75% cells",
      defaultThreshold: 40,
      expression: [
        { tumor: "Gastric", pct: 42 }, { tumor: "Pancreatic", pct: 31 },
        { tumor: "Esophageal", pct: 28 }, { tumor: "Cholangiocarcinoma", pct: 19 },
        { tumor: "Ovarian (mucinous)", pct: 16 }, { tumor: "Lung (adeno)", pct: 8 },
      ],
    },
    bd: {
      npvBase: 480, npvRisk: 215,
      comparables: [
        { name: "AstraZeneca / Keymed (CMG901)", year: "2021", upfront: "$63M", total: "$2.8B", stage: "Phase I" },
        { name: "Amgen / BioAtla (BA3021)", year: "2020", upfront: "$75M", total: "$1.6B", stage: "Phase I" },
        { name: "Pfizer / Arvinas GC", year: "2021", upfront: "$650M", total: "$1.4B", stage: "Phase II" },
      ],
      partnerTypes: [
        { label: "Large Pharma", value: 60 }, { label: "ADC Platform Co.", value: 20 },
        { label: "Specialty Oncology", value: 15 }, { label: "Regional Biotech", value: 5 },
      ],
    },
  },
  "nectin4-adc": {
    commercial: {
      tam: "$3.3B", sam: "$2.1B", pricing: "$225K–270K/yr",
      peakLow: 510, peakHigh: 940,
      competitors: [
        { name: "Padcev (enfortumab vedotin)", stage: "Approved", company: "Pfizer / Astellas", moa: "Nectin-4 ADC" },
        { name: "Dato-DXd", stage: "Phase III", company: "Daiichi / AstraZeneca", moa: "TROP2 ADC (overlap)" },
        { name: "Teliso-V", stage: "Phase II", company: "AbbVie", moa: "cMet ADC" },
      ],
    },
    regulatory: {
      designation: "Breakthrough Therapy (Urothelial) + Fast Track (expansion)",
      pathway: "Accelerated Approval",
      riskLevel: "Low",
      precedents: [
        { name: "Padcev (enfortumab vedotin)", target: "Nectin-4", year: "2019", path: "Accelerated" },
        { name: "Trodelvy (sacituzumab)", target: "TROP2", year: "2021", path: "Accelerated (TNBC)" },
      ],
      milestones: [
        { label: "Phase I — Urothelial", months: 0, done: true },
        { label: "Phase II — Solid Tumors Basket", months: 10, done: true },
        { label: "Phase III Initiation", months: 20, done: false },
        { label: "sNDA for Expansion Indication", months: 32, done: false },
        { label: "FDA Decision", months: 38, done: false },
      ],
    },
    translational: {
      biomarker: "Nectin-4 (PVRL4)", validationStatus: "Validated — IHC H-score ≥150",
      defaultThreshold: 30,
      expression: [
        { tumor: "Urothelial", pct: 88 }, { tumor: "NSCLC", pct: 74 },
        { tumor: "TNBC", pct: 69 }, { tumor: "HNSCC", pct: 61 },
        { tumor: "Bladder", pct: 56 }, { tumor: "Ovarian", pct: 48 },
      ],
    },
    bd: {
      npvBase: 820, npvRisk: 490,
      comparables: [
        { name: "Pfizer / Astellas (Padcev global)", year: "2020", upfront: "$4.5B", total: "$4.5B", stage: "Approved" },
        { name: "MSD / Seagen (collaboration)", year: "2020", upfront: "$650M", total: "$3.85B", stage: "Phase III" },
        { name: "Genentech / Roche (TNBC ADC)", year: "2021", upfront: "$300M", total: "$1.8B", stage: "Phase II" },
      ],
      partnerTypes: [
        { label: "Large Pharma", value: 70 }, { label: "Specialty Oncology", value: 15 },
        { label: "ADC Platform Co.", value: 10 }, { label: "Regional Biotech", value: 5 },
      ],
    },
  },
  "b7h4-adc": {
    commercial: {
      tam: "$4.2B", sam: "$1.8B", pricing: "$210K–260K/yr",
      peakLow: 290, peakHigh: 650,
      competitors: [
        { name: "AZD8205 (VTCN1-ADC)", stage: "Phase II", company: "AstraZeneca", moa: "B7-H4 ADC" },
        { name: "Vobra duo (ifinatamab)", stage: "Phase II", company: "Synaffix/Jazz", moa: "B7-H4 ADC" },
        { name: "DS-7300a", stage: "Phase II", company: "Daiichi", moa: "B7-H3 ADC (related)" },
      ],
    },
    regulatory: {
      designation: "Fast Track (TNBC)",
      pathway: "Accelerated Approval",
      riskLevel: "High",
      precedents: [
        { name: "Trodelvy (sacituzumab)", target: "TROP2", year: "2020", path: "Accelerated (TNBC)" },
        { name: "Enhertu (T-DXd)", target: "HER2-low", year: "2022", path: "Priority Review" },
      ],
      milestones: [
        { label: "Preclinical Package", months: 0, done: true },
        { label: "IND Filing", months: 4, done: true },
        { label: "Phase I Dose Escalation", months: 12, done: false },
        { label: "Phase II Enrollment", months: 24, done: false },
        { label: "NDA/BLA Decision", months: 42, done: false },
      ],
    },
    translational: {
      biomarker: "B7-H4 (VTCN1)", validationStatus: "Emerging — IHC cutoff not standardized",
      defaultThreshold: 20,
      expression: [
        { tumor: "TNBC", pct: 42 }, { tumor: "Ovarian", pct: 38 },
        { tumor: "Endometrial", pct: 29 }, { tumor: "Lung (adeno)", pct: 22 },
        { tumor: "Cervical", pct: 18 }, { tumor: "Bladder", pct: 14 },
      ],
    },
    bd: {
      npvBase: 390, npvRisk: 145,
      comparables: [
        { name: "AZ / Synaffix (B7-H4 licensing)", year: "2022", upfront: "$45M", total: "$1.1B", stage: "Phase I" },
        { name: "Gilead / Immunomedics (TNBC)", year: "2020", upfront: "$2.1B", total: "$4.9B", stage: "Approved" },
        { name: "Pfizer / Arvinas (TNBC)", year: "2021", upfront: "$650M", total: "$1.4B", stage: "Phase I" },
      ],
      partnerTypes: [
        { label: "Large Pharma", value: 45 }, { label: "Specialty Oncology", value: 30 },
        { label: "ADC Platform Co.", value: 15 }, { label: "Regional Biotech", value: 10 },
      ],
    },
  },
};

function getOppData(id: string) {
  return CANDIDATE_DATA[id] ?? CANDIDATE_DATA["tf-adc"];
}

// ---------------------------------------------------------------------------
// Shared chart tooltip style
// ---------------------------------------------------------------------------

const TT_STYLE = {
  contentStyle: { background: "#111511", border: "1px solid rgba(168,201,121,0.2)", borderRadius: 2, fontSize: 11 },
  labelStyle: { color: "#8B9288", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const },
  itemStyle: { color: "#A8C979" },
  cursor: { fill: "rgba(168,201,121,0.06)" },
};

// ---------------------------------------------------------------------------
// Commercial Panel
// ---------------------------------------------------------------------------

function CommercialPanel({ candidateId }: { candidateId: string }) {
  const data = getOppData(candidateId).commercial;
  const [shareSlider, setShareSlider] = useState(20);

  const peakProjection = useMemo(() => {
    const fraction = shareSlider / 100;
    const low = Math.round(data.peakLow * (fraction / 0.2) * 0.7);
    const high = Math.round(data.peakHigh * (fraction / 0.2) * 0.7);
    return { low: Math.min(low, data.peakHigh * 2.5), high: Math.min(high, data.peakHigh * 2.5) };
  }, [shareSlider, data]);

  const stageColors: Record<string, string> = {
    Approved: "#A8C979", "Phase III": "#D6B25A", "Phase II": "#7FA8B8", "Phase I": "#B8BAB2",
  };

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Addressable Market", value: data.tam },
          { label: "Serviceable Market (target+)", value: data.sam },
          { label: "Pricing Benchmark", value: data.pricing },
        ].map((s) => (
          <Panel key={s.label}>
            <div className="font-mono-pz text-[9px] tracking-[0.2em] uppercase text-pz-muted">{s.label}</div>
            <div className="mt-2 font-serif-display text-[32px] leading-none text-pz-text">{s.value}</div>
          </Panel>
        ))}
      </div>

      <Panel>
        <SectionLabel>Peak Revenue Scenario</SectionLabel>
        <div className="mt-3 flex items-center gap-4">
          <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted w-28 shrink-0">
            Market Share: {shareSlider}%
          </span>
          <input
            type="range" min={5} max={60} step={5}
            value={shareSlider} onChange={(e) => setShareSlider(+e.target.value)}
            className="flex-1 accent-[#A8C979] cursor-pointer"
          />
        </div>
        <div className="mt-4 flex items-center gap-8">
          <div>
            <div className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted">Peak Low</div>
            <div className="font-serif-display text-[28px] text-pz-text">${peakProjection.low}M</div>
          </div>
          <span className="text-pz-muted text-lg">–</span>
          <div>
            <div className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-muted">Peak High</div>
            <div className="font-serif-display text-[28px] text-pz-accent">${peakProjection.high}M</div>
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionLabel>Competitive Landscape</SectionLabel>
        <div className="mt-4 flex flex-col gap-3">
          {data.competitors.map((c) => (
            <div key={c.name} className="flex items-start justify-between gap-4 border-t pz-border pt-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-pz-text font-medium truncate">{c.name}</div>
                <div className="font-mono-pz text-[9.5px] tracking-[0.12em] text-pz-muted mt-0.5">{c.company} · {c.moa}</div>
              </div>
              <span
                className="shrink-0 rounded-sm px-2 py-0.5 font-mono-pz text-[8px] tracking-[0.12em] uppercase"
                style={{ background: `${stageColors[c.stage] ?? "#B8BAB2"}18`, color: stageColors[c.stage] ?? "#B8BAB2" }}
              >
                {c.stage}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regulatory Panel
// ---------------------------------------------------------------------------

function RegulatoryPanel({ candidateId }: { candidateId: string }) {
  const data = getOppData(candidateId).regulatory;
  const [pathwayToggle, setPathwayToggle] = useState<"accelerated" | "standard">(
    data.pathway.toLowerCase().includes("accelerated") ? "accelerated" : "standard"
  );

  const riskColors = { Low: "#A8C979", Medium: "#D6B25A", High: "#C98A8A" };
  const riskColor = riskColors[data.riskLevel];

  const timelineMonths = pathwayToggle === "accelerated"
    ? data.milestones.map((m) => ({ ...m, months: Math.round(m.months * 0.78) }))
    : data.milestones.map((m) => ({ ...m, months: Math.round(m.months * 1.25) }));

  const totalMonths = Math.max(...timelineMonths.map((m) => m.months)) + 6;

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Panel>
          <div className="font-mono-pz text-[9px] tracking-[0.2em] uppercase text-pz-muted">FDA Designation</div>
          <div className="mt-2 text-[14px] text-pz-text font-medium leading-snug">{data.designation}</div>
        </Panel>
        <Panel>
          <div className="font-mono-pz text-[9px] tracking-[0.2em] uppercase text-pz-muted">Regulatory Risk</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: riskColor }} />
            <div className="font-serif-display text-[24px] leading-none" style={{ color: riskColor }}>
              {data.riskLevel}
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="font-mono-pz text-[9px] tracking-[0.2em] uppercase text-pz-muted">Recommended Pathway</div>
          <div className="mt-2 text-[14px] text-pz-text font-medium">{data.pathway}</div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Development Timeline</SectionLabel>
          <div className="flex rounded-sm overflow-hidden border pz-border text-[9px]">
            {(["accelerated", "standard"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setPathwayToggle(opt)}
                className="px-3 py-1.5 font-mono-pz tracking-[0.14em] uppercase transition-colors"
                style={{
                  background: pathwayToggle === opt ? "#A8C97918" : "transparent",
                  color: pathwayToggle === opt ? "#A8C979" : "#8B9288",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[rgba(168,201,121,0.15)]" />
          <div className="flex flex-col gap-5 pl-10">
            {timelineMonths.map((m, i) => (
              <div key={i} className="relative">
                <div
                  className="absolute -left-[34px] top-0.5 h-5 w-5 rounded-full flex items-center justify-center"
                  style={{ background: m.done ? "#A8C97920" : "#11151180", border: `1px solid ${m.done ? "#A8C979" : "rgba(168,201,121,0.2)"}` }}
                >
                  {m.done
                    ? <CheckCircle2 size={11} color="#A8C979" />
                    : <Clock size={10} color="#8B9288" />}
                </div>
                <div className="font-mono-pz text-[9px] tracking-[0.12em] uppercase" style={{ color: m.done ? "#A8C979" : "#8B9288" }}>
                  Month {m.months} · {m.done ? "Complete" : "Projected"}
                </div>
                <div className="text-[13px] text-pz-text mt-0.5">{m.label}</div>
                <div className="mt-1.5 h-1 rounded-full bg-pz-panel overflow-hidden" style={{ width: "100%" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.round((m.months / totalMonths) * 100)}%`,
                    background: m.done ? "#A8C979" : "rgba(168,201,121,0.25)",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionLabel>Approved Precedents</SectionLabel>
        <div className="mt-4 flex flex-col gap-3">
          {data.precedents.map((p) => (
            <div key={p.name} className="flex items-start justify-between gap-4 border-t pz-border pt-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-pz-text font-medium">{p.name}</div>
                <div className="font-mono-pz text-[9.5px] tracking-[0.12em] text-pz-muted mt-0.5">Target: {p.target}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono-pz text-[9px] tracking-[0.12em] text-pz-accent uppercase">{p.path}</div>
                <div className="font-mono-pz text-[9px] text-pz-muted">{p.year}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Translational Panel
// ---------------------------------------------------------------------------

function TranslationalPanel({ candidateId }: { candidateId: string }) {
  const data = getOppData(candidateId).translational;
  const [threshold, setThreshold] = useState(data.defaultThreshold);

  const eligible = useMemo(() => {
    return data.expression.reduce((acc, t) => {
      const eligible = t.pct >= threshold ? t.pct / 100 : 0;
      return acc + eligible / data.expression.length;
    }, 0) * 100;
  }, [threshold, data]);

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <div className="font-mono-pz text-[9px] tracking-[0.2em] uppercase text-pz-muted">Biomarker</div>
          <div className="mt-2 text-[14px] text-pz-text font-medium">{data.biomarker}</div>
        </Panel>
        <Panel>
          <div className="font-mono-pz text-[9px] tracking-[0.2em] uppercase text-pz-muted">Validation Status</div>
          <div className="mt-2 flex items-center gap-2">
            <CheckCircle2 size={14} color="#A8C979" />
            <div className="text-[13px] text-pz-text">{data.validationStatus}</div>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionLabel>Target Expression by Tumor Type</SectionLabel>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.expression} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="rgba(168,201,121,0.08)" />
              <XAxis dataKey="tumor" tick={{ fill: "#8B9288", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#8B9288", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Expression"]} {...TT_STYLE} />
              <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
                {data.expression.map((entry, i) => (
                  <Cell key={i} fill={entry.pct >= threshold ? "#A8C979" : "#A8C97930"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Patient Eligibility Simulator</SectionLabel>
          <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase text-pz-accent">
            {eligible.toFixed(0)}% indicatively eligible
          </span>
        </div>
        <p className="text-[12.5px] text-pz-muted font-light mb-4">
          Drag the IHC expression threshold to model patient eligibility across tumor types above.
        </p>
        <div className="flex items-center gap-4">
          <span className="font-mono-pz text-[9px] tracking-[0.14em] uppercase text-pz-muted w-36 shrink-0">
            IHC threshold: ≥{threshold}%
          </span>
          <input
            type="range" min={5} max={80} step={5}
            value={threshold} onChange={(e) => setThreshold(+e.target.value)}
            className="flex-1 accent-[#A8C979] cursor-pointer"
          />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {data.expression.map((e) => (
            <div key={e.tumor} className="flex items-center gap-3">
              <span className="font-mono-pz text-[9px] tracking-[0.1em] text-pz-muted w-28 shrink-0">{e.tumor}</span>
              <div className="flex-1 h-1.5 rounded-full bg-pz-panel">
                <div className="h-full rounded-full transition-all duration-200"
                  style={{ width: `${e.pct}%`, background: e.pct >= threshold ? "#A8C979" : "rgba(168,201,121,0.2)" }} />
              </div>
              <span className="font-mono-pz text-[9px] text-pz-muted w-8 text-right">{e.pct}%</span>
              {e.pct >= threshold && (
                <span className="font-mono-pz text-[8px] tracking-[0.1em] text-pz-accent uppercase">eligible</span>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BD Panel
// ---------------------------------------------------------------------------

function BDPanel({ candidateId }: { candidateId: string }) {
  const data = getOppData(candidateId).bd;
  const [discountRate, setDiscountRate] = useState(12);

  const adjustedNpv = useMemo(() => {
    const factor = (1 - (discountRate - 8) * 0.04);
    return Math.round(data.npvRisk * factor);
  }, [discountRate, data.npvRisk]);

  const npvScenarios = [
    { name: "Base NPV", value: data.npvBase },
    { name: "Risk-Adj NPV", value: data.npvRisk },
    { name: "Disc-Adj NPV", value: adjustedNpv },
  ];

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel>
          <SectionLabel>NPV Model</SectionLabel>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={npvScenarios} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke="rgba(168,201,121,0.08)" />
                <XAxis dataKey="name" tick={{ fill: "#8B9288", fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#8B9288", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}M`} />
                <Tooltip formatter={(v: number) => [`$${v}M`, "NPV"]} {...TT_STYLE} />
                <Bar dataKey="value" fill="#A8C97960" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="font-mono-pz text-[9px] tracking-[0.14em] uppercase text-pz-muted w-36 shrink-0">
              Discount rate: {discountRate}%
            </span>
            <input
              type="range" min={8} max={25} step={1}
              value={discountRate} onChange={(e) => setDiscountRate(+e.target.value)}
              className="flex-1 accent-[#A8C979] cursor-pointer"
            />
          </div>
          <div className="mt-3">
            <span className="font-mono-pz text-[9px] tracking-[0.12em] text-pz-muted">Discount-Adjusted NPV → </span>
            <span className="font-serif-display text-[22px] text-pz-accent">${adjustedNpv}M</span>
          </div>
        </Panel>

        <Panel>
          <SectionLabel>Partnership Target Mix</SectionLabel>
          <div className="mt-4 flex flex-col gap-3">
            {data.partnerTypes.map((p) => (
              <div key={p.label}>
                <div className="flex justify-between font-mono-pz text-[9px] tracking-[0.1em] uppercase mb-1">
                  <span className="text-pz-muted">{p.label}</span>
                  <span className="text-pz-accent">{p.value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-pz-panel">
                  <div className="h-full rounded-full bg-pz-accent transition-all" style={{ width: `${p.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionLabel>Deal Comparables</SectionLabel>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b pz-border">
                {["Deal", "Year", "Upfront", "Total Value", "Stage at Deal"].map((h) => (
                  <th key={h} className="font-mono-pz text-[9px] tracking-[0.14em] uppercase text-pz-muted text-left pb-2 pr-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.comparables.map((c, i) => (
                <tr key={i} className="border-b pz-border">
                  <td className="py-3 pr-4 text-pz-text font-medium">{c.name}</td>
                  <td className="py-3 pr-4 font-mono-pz text-pz-muted">{c.year}</td>
                  <td className="py-3 pr-4 text-pz-accent font-mono-pz">{c.upfront}</td>
                  <td className="py-3 pr-4 text-pz-text font-mono-pz">{c.total}</td>
                  <td className="py-3">
                    <span className="rounded-sm px-2 py-0.5 font-mono-pz text-[8px] tracking-[0.1em] uppercase bg-[rgba(168,201,121,0.1)] text-pz-accent">
                      {c.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Functional area definitions
// ---------------------------------------------------------------------------

const AREAS = [
  {
    id: "clinical",
    label: "Clinical Development",
    icon: FlaskConical,
    description: "MoA, AUC simulation, Monte Carlo, PK/PD graphs, 3D structure",
    color: "#A8C979",
  },
  {
    id: "commercial",
    label: "Commercial & Market Access",
    icon: TrendingUp,
    description: "Market sizing, competitive landscape, pricing dynamics",
    color: "#7FA8B8",
  },
  {
    id: "regulatory",
    label: "Regulatory Affairs",
    icon: ShieldCheck,
    description: "Filing pathway, precedent analysis, risk classification",
    color: "#D6B25A",
  },
  {
    id: "translational",
    label: "Translational Science",
    icon: Microscope,
    description: "Biomarker expression, target validation, patient stratification",
    color: "#B8BAB2",
  },
  {
    id: "bd",
    label: "Business Development",
    icon: DollarSign,
    description: "Deal comparables, NPV model, partnership landscape",
    color: "#C98A8A",
  },
] as const;

type AreaId = (typeof AREAS)[number]["id"];

// ---------------------------------------------------------------------------
// Area selector
// ---------------------------------------------------------------------------

function AreaSelector({
  onSelect,
  candidateName,
}: {
  onSelect: (id: AreaId) => void;
  candidateName: string;
}) {
  return (
    <div className="mt-8">
      <div className="font-mono-pz text-[9.5px] tracking-[0.34em] uppercase text-pz-accent mb-2">
        Select Your Functional Area
      </div>
      <h2 className="font-serif-display text-[28px] leading-tight text-pz-text mb-1">
        What lens are you reviewing{" "}
        <em className="italic text-pz-accent font-normal">{candidateName}</em> through?
      </h2>
      <p className="text-[13px] text-pz-soft font-light mb-8">
        Choose your function to see the data and analyses most relevant to your decision.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <button
              key={area.id}
              onClick={() => onSelect(area.id)}
              className="group flex items-start gap-4 rounded-sm border pz-border p-5 text-left hover:border-[color:var(--pz-border-strong)] hover:bg-[color:var(--pz-panel-alt)] transition-all"
            >
              <span
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-sm"
                style={{ background: `${area.color}18`, color: area.color }}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-medium text-pz-text group-hover:text-pz-accent transition-colors">
                    {area.label}
                  </span>
                  <ChevronRight size={14} className="text-pz-muted group-hover:text-pz-accent shrink-0 transition-colors" />
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-pz-muted font-light">
                  {area.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Non-clinical area router
// ---------------------------------------------------------------------------

function AreaContent({ area, candidateId }: { area: (typeof AREAS)[number]; candidateId: string }) {
  if (area.id === "commercial") return <CommercialPanel candidateId={candidateId} />;
  if (area.id === "regulatory") return <RegulatoryPanel candidateId={candidateId} />;
  if (area.id === "translational") return <TranslationalPanel candidateId={candidateId} />;
  if (area.id === "bd") return <BDPanel candidateId={candidateId} />;
  return null;
}

// ---------------------------------------------------------------------------
// Full diligence view (original, shown under "all areas" fallback)
// ---------------------------------------------------------------------------

const MODES: ProteinViewerMode[] = ["cartoon", "surface", "both"];

function FullDiligence({ d }: { d: CandidateDetail }) {
  const color = statusHex(d.status_color);
  const [viewMode, setViewMode] = useState<ProteinViewerMode>("cartoon");

  return (
    <div className="mt-5 flex flex-col gap-5">
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
          <div className="w-full max-w-[360px] mx-auto flex flex-col gap-2">
            <ProteinViewer
              pdbUrl={d.bionemo.pdb_url || undefined}
              pdbId={d.target}
              height={300}
              mode={viewMode}
            />
            <div className="flex gap-1 justify-center">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={`font-mono-pz text-[9px] tracking-[0.18em] uppercase px-2.5 py-1 border transition-colors ${
                    viewMode === m
                      ? "border-pz-accent text-pz-accent"
                      : "border-pz-border text-pz-muted hover:text-pz-soft hover:border-pz-soft"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="text-center font-mono-pz text-[8.5px] tracking-[0.16em] uppercase text-pz-muted">
              AlphaFold v6 · UniProt {d.target}
            </div>
          </div>
        </div>
      </Panel>

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
          <p className="mt-4 text-[12px] leading-relaxed text-pz-soft font-light">{d.hmm.explanation}</p>
        </Panel>
      </div>

      <Panel>
        <SectionLabel>BioNeMo Plausibility</SectionLabel>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Gauge label="Overall" value={d.bionemo.overall_plausibility} />
          <Gauge label="Pathway Proximity" value={d.bionemo.pathway_proximity} />
          <Gauge label="Druggability" value={d.bionemo.druggability_score} />
          <Gauge label="Internalization" value={d.bionemo.internalization_efficiency} />
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-pz-soft font-light max-w-3xl">{d.bionemo.summary}</p>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel>
          <SectionLabel>Failure Pattern Flags</SectionLabel>
          <ul className="mt-4 flex flex-col gap-3">
            {d.failure_flags.map((f) => (
              <li key={f.flag} className="border-l-2 pl-3" style={{ borderColor: statusHex(f.severity === "high" ? "red" : "amber") }}>
                <div className="flex items-center gap-2">
                  <span className="font-mono-pz text-[9px] tracking-[0.16em] uppercase" style={{ color: statusHex(f.severity === "high" ? "red" : "amber") }}>{f.severity}</span>
                  <span className="text-[12.5px] text-pz-text">{f.flag}</span>
                </div>
                <p className="mt-1 text-[12px] leading-snug text-pz-soft font-light">{f.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <SectionLabel>What Would Need To Be True</SectionLabel>
          <p className="mt-3 text-[12.5px] leading-relaxed text-pz-soft font-light">{d.what_would_need_to_be_true}</p>
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

      <Panel>
        <SectionLabel>Diligence Memo</SectionLabel>
        <div className="mt-3 max-h-[520px] overflow-y-auto pr-2">
          <Markdown source={d.memo} />
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root page
// ---------------------------------------------------------------------------

// Static candidate data for when the API is unavailable
const STATIC_CANDIDATES: Record<string, { name: string; target: string; indication: string; pdbId: string }> = {
  "tf-adc":     { name: "Tissue Factor ADC",       target: "F3 / CD142", indication: "Recurrent / Metastatic Cervical Cancer", pdbId: "1FAK" },
  "cldn18-adc": { name: "CLDN18.2 ADC",            target: "CLDN18",     indication: "Gastric Cancer",                          pdbId: "6O1Y" },
  "nectin4-adc":{ name: "Nectin-4 ADC Expansion",  target: "NECTIN4",    indication: "Non-Urothelial Solid Tumors",             pdbId: "6GTW" },
  "b7h4-adc":   { name: "B7-H4 ADC",               target: "VTCN1",      indication: "Triple-Negative Breast Cancer",           pdbId: "5GKL" },
};

export default function OpportunityDetailPage({ id }: { id: string }) {
  const [selectedArea, setSelectedArea] = useState<AreaId | null>(null);
  const { data, loading, error } = useCandidateDetail(id);

  const staticCandidate = STATIC_CANDIDATES[id] ?? {
    name: id,
    target: "Unknown target",
    indication: "Oncology",
    pdbId: "4ETQ",
  };

  const candidateForPanel = data
    ? { id: data.id, name: data.full_name, target: data.target, indication: data.patient_subgroup ?? "", pdbId: "4ETQ", pdbUrl: data.bionemo?.pdb_url }
    : { id, ...staticCandidate };

  const currentArea = selectedArea ? AREAS.find((a) => a.id === selectedArea) : null;

  return (
    <AppLayout title="Opportunity Diligence" loading={loading}>
      <Link
        to="/"
        className="inline-flex items-center gap-2 font-mono-pz text-[10px] tracking-[0.18em] uppercase text-pz-muted hover:text-pz-accent transition-colors"
      >
        <ArrowLeft size={12} /> Back to Search
      </Link>

      {/* Candidate header — always visible */}
      <div className="mt-5 mb-2">
        <div className="font-mono-pz text-[9.5px] tracking-[0.3em] uppercase text-pz-accent">
          {candidateForPanel.target} · ADC
        </div>
        <h1 className="mt-1 font-serif-display text-[36px] leading-tight text-pz-text">
          {candidateForPanel.name}
        </h1>
        <p className="mt-1 text-[13px] text-pz-soft font-light">{candidateForPanel.indication}</p>
      </div>

      {/* Breadcrumb if area selected */}
      {selectedArea && (
        <div className="flex items-center gap-2 mt-3 mb-1">
          <button
            onClick={() => setSelectedArea(null)}
            className="font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted hover:text-pz-accent transition-colors"
          >
            ← Change area
          </button>
          <span className="text-pz-muted/40">·</span>
          <span className="font-mono-pz text-[9px] tracking-[0.18em] uppercase" style={{ color: currentArea?.color }}>
            {currentArea?.label}
          </span>
        </div>
      )}

      {/* Area selector or area content */}
      {!selectedArea ? (
        <AreaSelector
          onSelect={setSelectedArea}
          candidateName={candidateForPanel.name}
        />
      ) : selectedArea === "clinical" ? (
        <div className="mt-6">
          <ClinicalDevPanel candidate={candidateForPanel} />
        </div>
      ) : (
        <AreaContent area={currentArea!} candidateId={id} />
      )}

      {/* Full diligence data (if API returned data and no area selected) */}
      {!selectedArea && data && !loading && (
        <div className="mt-12 border-t pz-border pt-8">
          <div className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-muted mb-4">
            Full Diligence Report
          </div>
          <FullDiligence d={data} />
        </div>
      )}

      {loading && !selectedArea && <LoadingPanel label="Running diligence pipeline" />}
      {error && !loading && !selectedArea && (
        <div className="mt-6">
          <ErrorPanel label={`Could not load diligence for ${id}.`} />
        </div>
      )}
    </AppLayout>
  );
}

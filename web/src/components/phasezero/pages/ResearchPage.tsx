import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import AppLayout from "../AppLayout";
import ProteinViewer from "@/components/ProteinViewer";
import {
  Chip,
  ErrorPanel,
  LoadingPanel,
  Panel,
  ScoreBar,
  SectionLabel,
  statusHex,
} from "../primitives";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface ResearchResult {
  query: string;
  normalized: {
    target_name: string;
    gene_symbol: string;
    uniprot_accession: string | null;
    modality: string;
    indication: string;
    matched_from: string;
  };
  structure: {
    source: "rcsb_pdb" | "alphafold" | "fallback";
    pdbId?: string | null;
    pdbUrl?: string;
    alphafoldUrl?: string;
    status: "experimental" | "predicted" | "unavailable";
    resolution?: number | null;
    method?: string;
    coverage?: number;
  };
  sources: {
    uniprot: Record<string, unknown>;
    openTargets: Record<string, unknown>;
    chembl: Record<string, unknown>;
    clinicalTrials: TrialEntry[];
  };
  signals: string[];
  risks: string[];
  recommendation: {
    score: number;
    label: string;
    confidence: string;
    rationale: string[];
  };
}

interface TrialEntry {
  nct_id: string;
  title: string;
  phase: string;
  status: string;
  conditions: string[];
  sponsor: string;
}

function statusColor(s: string) {
  if (s === "RECRUITING") return "#A8C979";
  if (s === "COMPLETED") return "#7FA8B8";
  if (s === "ACTIVE_NOT_RECRUITING") return "#D6B25A";
  return "#8A8F86";
}

export default function ResearchPage({ query }: { query: string }) {
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setPhase("error");
      setErrMsg("No query provided.");
      return;
    }
    setPhase("loading");
    fetch(`${API_BASE}/api/research?q=${encodeURIComponent(query)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`API error ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
        setPhase("done");
      })
      .catch((e) => {
        setErrMsg(e.message);
        setPhase("error");
      });
  }, [query]);

  const backLink = (
    <Link
      to="/"
      search={{ q: query }}
      className="inline-flex items-center gap-2 font-mono-pz text-[10px] tracking-[0.18em] uppercase text-pz-muted hover:text-pz-accent transition-colors"
    >
      <ArrowLeft size={12} /> Back to Search
    </Link>
  );

  if (phase === "loading") {
    return (
      <AppLayout title="Research" loading>
        {backLink}
        <div className="mt-16 flex flex-col items-center gap-5">
          <span className="h-8 w-8 rounded-full border border-[rgba(168,201,121,0.35)] border-t-pz-accent animate-spin" />
          <div className="text-center">
            <p className="font-mono-pz text-[10px] tracking-[0.28em] uppercase text-pz-accent">
              Research agents parsing evidence…
            </p>
            <p className="mt-2 font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">
              UniProt · Open Targets · ChEMBL · ClinicalTrials · RCSB PDB
            </p>
          </div>
          <p className="font-mono-pz text-[9px] tracking-[0.14em] text-pz-muted/60 mt-2">
            "{query}"
          </p>
        </div>
      </AppLayout>
    );
  }

  if (phase === "error" || !result) {
    return (
      <AppLayout title="Research" loading={false}>
        {backLink}
        <div className="mt-6">
          <ErrorPanel label={errMsg || "Research query failed."} />
        </div>
      </AppLayout>
    );
  }

  const { normalized, structure, sources, signals, risks, recommendation } = result;
  const ot = sources.openTargets as Record<string, unknown>;
  const uniprot = sources.uniprot as Record<string, unknown>;
  const trials = sources.clinicalTrials;
  const recColor = recommendation.score >= 65 ? "#A8C979" : recommendation.score >= 45 ? "#D6B25A" : "#C98A8A";

  const pdbId = structure.pdbId || undefined;
  const pdbUrl = structure.pdbUrl || structure.alphafoldUrl || undefined;

  return (
    <AppLayout title="Research" loading={false}>
      {backLink}

      <div className="mt-5 flex flex-col gap-5">
        {/* Header */}
        <Panel>
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
            <div>
              <div className="font-mono-pz text-[10px] tracking-[0.22em] uppercase text-pz-accent">
                {normalized.gene_symbol}
                {normalized.uniprot_accession && (
                  <span className="text-pz-muted"> · {normalized.uniprot_accession}</span>
                )}
              </div>
              <h1 className="mt-2 font-serif-display text-[38px] leading-none text-pz-text font-normal">
                {normalized.target_name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip label={normalized.modality} color="#A8C979" />
                {normalized.indication && (
                  <Chip label={normalized.indication} color="#7FA8B8" />
                )}
                <Chip label={recommendation.label} color={recColor} />
              </div>
              {uniprot.function && (
                <p className="mt-4 text-[12.5px] leading-relaxed text-pz-soft font-light max-w-xl">
                  {String(uniprot.function).slice(0, 280)}
                  {String(uniprot.function).length > 280 ? "…" : ""}
                </p>
              )}
              <div className="mt-5 grid grid-cols-3 gap-4 border-t pz-border pt-4">
                <Stat label="Rec. Score" value={`${recommendation.score}/100`} />
                <Stat label="Confidence" value={recommendation.confidence} />
                <Stat
                  label="Structure"
                  value={
                    structure.status === "experimental"
                      ? `PDB · ${pdbId}`
                      : structure.status === "predicted"
                        ? "AlphaFold"
                        : "Fallback"
                  }
                />
              </div>
            </div>

            {/* Protein viewer */}
            <div className="w-full max-w-[400px] mx-auto">
              <ProteinViewer
                pdbId={pdbId}
                pdbUrl={pdbUrl}
                height={300}
                mode="cartoon"
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono-pz text-[8.5px] tracking-[0.18em] uppercase text-pz-muted">
                  {structure.status === "experimental"
                    ? `Experimental · ${structure.method ?? "X-ray"} · ${structure.resolution ? `${structure.resolution}Å` : ""}`
                    : structure.status === "predicted"
                      ? "AlphaFold · Predicted Structure"
                      : "Structure preview unavailable"}
                </span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Signals + Risks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Panel>
            <SectionLabel>Evidence Signals</SectionLabel>
            <ul className="mt-4 flex flex-col gap-2.5">
              {signals.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug text-pz-soft font-light">
                  <span className="text-pz-accent text-[7px] pt-1.5 shrink-0">●</span>
                  <span>{s}</span>
                </li>
              ))}
              {signals.length === 0 && (
                <li className="text-pz-muted font-mono-pz text-[9.5px] tracking-[0.14em] uppercase">
                  No signals extracted
                </li>
              )}
            </ul>
          </Panel>

          <Panel>
            <SectionLabel>Risk Flags</SectionLabel>
            <ul className="mt-4 flex flex-col gap-2.5">
              {risks.map((r, i) => (
                <li key={i} className="flex gap-2.5 text-[12.5px] leading-snug text-pz-soft font-light">
                  <span className="text-[#D6B25A] text-[7px] pt-1.5 shrink-0">▲</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t pz-border pt-4">
              <SectionLabel>Recommendation</SectionLabel>
              <div className="mt-3 flex flex-col gap-2">
                <ScoreBar label="Conviction Score" value={recommendation.score} color={recColor} />
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {recommendation.rationale.map((r, i) => (
                  <li key={i} className="text-[12px] leading-snug text-pz-soft font-light">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>

        {/* Open Targets disease associations */}
        {ot && !ot.error && Array.isArray(ot.top_diseases) && (ot.top_diseases as unknown[]).length > 0 && (
          <Panel>
            <SectionLabel>
              Open Targets · Disease Associations
              {ot.association_count ? ` (${ot.association_count} total)` : ""}
            </SectionLabel>
            <div className="mt-4 flex flex-col gap-3">
              {(ot.top_diseases as { name: string; score: number }[]).map((d) => (
                <ScoreBar
                  key={d.name}
                  label={d.name}
                  value={d.score * 100}
                  max={100}
                />
              ))}
            </div>
          </Panel>
        )}

        {/* Clinical trials */}
        {trials && trials.length > 0 && (
          <Panel>
            <SectionLabel>ClinicalTrials.gov · Trial Landscape</SectionLabel>
            <ul className="mt-4 flex flex-col">
              {trials.map((t) => (
                <li key={t.nct_id} className="border-t pz-border py-3 first:border-t-0">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: statusColor(t.status) }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] leading-snug text-pz-soft font-light">
                        {t.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 font-mono-pz text-[9px] tracking-[0.12em] uppercase text-pz-muted">
                        <span>{t.nct_id}</span>
                        <span>{t.phase}</span>
                        <span style={{ color: statusColor(t.status) }}>{t.status}</span>
                        {t.sponsor && <span>{t.sponsor}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono-pz text-[9px] tracking-[0.18em] uppercase text-pz-muted">{label}</div>
      <div className="mt-1 text-[13px] text-pz-text font-light">{value}</div>
    </div>
  );
}

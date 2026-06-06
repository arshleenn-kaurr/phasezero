// Lightweight client for the PhaseZero FastAPI backend.
// The base URL can be overridden with VITE_API_BASE_URL; it defaults to the
// local FastAPI dev server.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface CommandCenterStatus {
  system_status: string;
  signals_monitored: number;
  models_active: number;
  opportunities_tracked: number;
  last_update: string;
}

export interface FeaturedOpportunity {
  id: string;
  name: string;
  indication: string;
  modality: string;
  stage: string;
  score: number;
  recommendation: string;
  confidence: string;
}

export interface DecisionMemo {
  key_reasons: string[];
  key_risks: string[];
}

export interface CommandCenterData {
  status: CommandCenterStatus;
  featured_opportunity: FeaturedOpportunity;
  decision_memo: DecisionMemo;
}

// Fallback data mirrors the original hardcoded UI values so the page renders
// fully even when the backend is unavailable.
export const MOCK_COMMAND_CENTER: CommandCenterData = {
  status: {
    system_status: "All Systems Operational",
    signals_monitored: 12842,
    models_active: 37,
    opportunities_tracked: 184,
    last_update: "2m ago",
  },
  featured_opportunity: {
    id: "PZ-1092",
    name: "Tissue Factor ADC",
    indication: "Cervical Cancer",
    modality: "ADC",
    stage: "IND-Enabling",
    score: 86,
    recommendation: "Advance",
    confidence: "High Conviction",
  },
  decision_memo: {
    key_reasons: [
      "Best-in-class payload differentiation",
      "Validated internalization mechanism",
      "Strong translational evidence in cervical",
      "Large 2L+ addressable population",
    ],
    key_risks: [
      "Potential hematologic toxicity",
      "Manufacturing complexity at scale",
      "Competitive landscape evolving",
    ],
  },
};

// Fetches the Command Center payload. Throws on network/HTTP errors so callers
// can decide how to fall back.
export async function fetchCommandCenter(
  signal?: AbortSignal,
): Promise<CommandCenterData> {
  return getJson<CommandCenterData>("/api/command-center", signal);
}

// ---------------------------------------------------------------------------
// Candidate engine types (mirror the FastAPI diligence pipeline output)
// ---------------------------------------------------------------------------

export interface CandidateScores {
  readiness: number;
  commercial_alpha: number;
  evidence_quality: number;
  failure_similarity: number;
  diligence_priority: number;
  bionemo_plausibility: number;
}

export interface CandidateSummary {
  id: string;
  raw_id: string;
  name: string;
  full_name: string;
  indication: string;
  target: string;
  modality: string;
  stage: string;
  status_color: string;
  score: number;
  scores: CandidateScores;
  recommendation: string;
  confidence: string;
  headline: string;
}

export interface FailureFlag {
  flag: string;
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface Simulation {
  mean: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  threshold: number;
  p_threshold: number;
  tornado: Record<string, number>;
  scenarios: Record<string, { label?: string; value?: number; [k: string]: unknown }>;
  histogram: { counts: number[]; min: number; max: number };
  n: number;
}

export interface HmmState {
  current_state: string;
  next_state: string;
  regime_shift: boolean;
  explanation: string;
  state_probs: Record<string, number>;
  state_colors: Record<string, string>;
}

export interface BioNemo {
  overall_plausibility?: number;
  pathway_proximity?: number;
  druggability_score?: number;
  internalization_efficiency?: number;
  summary: string;
  cross_reactivity_risk: string;
  payload_compatibility: string;
  pdb_url?: string;
}

export interface AgentView {
  name: string;
  status: string;
  confidence: number;
  findings: string[];
  flags: string[];
}

export interface EvidenceGraph {
  candidate_id: string;
  node_count: number;
  edge_count: number;
  quality_counts: Record<string, number>;
  domain_counts: Record<string, number>;
  top_signals: { signal: string; source: string; quality: string; centrality: number }[];
}

export interface MomentumMetric {
  label: string;
  velocity: number;
  baseline: number;
  acceleration: number;
  direction: "increasing" | "declining" | "flat" | "warning" | "supportive" | "mixed";
  interpretation: string;
}

export interface SignalEvent {
  id: string;
  source_type: string;
  agent_name: string;
  quarter: string;
  entity_type: string;
  entity: string;
  claim: string;
  polarity: "positive" | "neutral" | "negative";
  evidence_tier: string;
  weighted_signal: number;
  extracted_signal: string;
  diligence_question: string;
}

export interface SignalIntelligence {
  signal_regime: string;
  momentum_score: number;
  consensus_attention: number;
  momentum: Record<string, MomentumMetric>;
  contradiction_burden: number;
  evidence_agreement: number;
  most_disputed_claim: string;
  most_disputed_detail: string;
  missing_data_burden: number;
  missing_fields: string[];
  top_positive_signals: SignalEvent[];
  top_negative_signals: SignalEvent[];
  events: SignalEvent[];
  diligence_questions: string[];
  alpha_supporting: string[];
  warning_signals: string[];
}

export interface CandidateDetail extends CandidateSummary {
  patient_subgroup: string;
  adc_design_thesis: string;
  why_now: string;
  what_phasezero_found: string;
  main_risk: string;
  what_would_need_to_be_true: string;
  recommended_next_actions: string[];
  failure_flags: FailureFlag[];
  score_components: Record<string, number>;
  simulation: Simulation;
  hmm: HmmState;
  bionemo: BioNemo;
  agents: AgentView[];
  signal_intelligence: SignalIntelligence;
  evidence_graph: EvidenceGraph;
  memo: string;
}

export interface AgentActivity {
  scan_sequence: {
    agent: string;
    action: string;
    duration_ms: number;
    status: string;
  }[];
  total_signals_parsed: number;
  candidates_evaluated: number;
  failure_flags_raised: number;
  missing_data_items: number;
  scan_timestamp: string | null;
}

export async function fetchCandidates(
  signal?: AbortSignal,
): Promise<CandidateSummary[]> {
  const data = await getJson<{ candidates: CandidateSummary[] }>(
    "/api/candidates",
    signal,
  );
  return data.candidates;
}

export async function fetchCandidateDetail(
  id: string,
  signal?: AbortSignal,
): Promise<CandidateDetail> {
  const data = await getJson<CandidateDetail & { error?: boolean }>(
    `/api/candidates/${encodeURIComponent(id)}`,
    signal,
  );
  if ((data as { error?: boolean }).error) {
    throw new Error(`Candidate ${id} not found`);
  }
  return data;
}

export async function fetchAgentActivity(
  signal?: AbortSignal,
): Promise<AgentActivity> {
  return getJson<AgentActivity>("/api/agent-activity", signal);
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Request ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

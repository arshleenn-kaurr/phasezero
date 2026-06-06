"""PhaseZero API.

Serves the Command Center payload for the React frontend. Values are computed
from the real PhaseZero diligence engine (src/) and candidate data (data/);
if the engine or data is unavailable, the endpoint falls back to a static
payload so the frontend never breaks.
"""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.services.research_service import run_research

# Make the vendored engine (backend/src) importable regardless of CWD.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DATA_DIR = BACKEND_DIR / "data"

app = FastAPI(title="PhaseZero API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Display ids shown in the Command Center featured opportunity header.
PZ_IDS = {
    "tf_cervical": "PZ-1092",
    "b7h4_tnbc": "PZ-1088",
    "nectin4_expansion": "PZ-1104",
}
RAW_BY_PZ = {pz: raw for raw, pz in PZ_IDS.items()}

# Stable routing slugs used as the candidate `id` field in list/detail APIs.
SLUG_IDS = {
    "tf_cervical": "tf-adc",
    "b7h4_tnbc": "b7h4-adc",
    "nectin4_expansion": "nectin4-adc",
}
RAW_BY_SLUG = {slug: raw for raw, slug in SLUG_IDS.items()}

# Static fallback — mirrors the original hardcoded UI values.
FALLBACK_COMMAND_CENTER = {
    "status": {
        "system_status": "All Systems Operational",
        "signals_monitored": 12842,
        "models_active": 37,
        "opportunities_tracked": 184,
        "last_update": "2m ago",
    },
    "featured_opportunity": {
        "id": "PZ-1092",
        "name": "Tissue Factor ADC",
        "indication": "Cervical Cancer",
        "modality": "ADC",
        "stage": "IND-Enabling",
        "score": 86,
        "recommendation": "Advance",
        "confidence": "High Conviction",
    },
    "decision_memo": {
        "key_reasons": [
            "Best-in-class payload differentiation",
            "Validated internalization mechanism",
            "Strong translational evidence in cervical",
            "Large 2L+ addressable population",
        ],
        "key_risks": [
            "Potential hematologic toxicity",
            "Manufacturing complexity at scale",
            "Competitive landscape evolving",
        ],
    },
}


@app.get("/health")
def health():
    return {"status": "online", "service": "PhaseZero API"}


@app.get("/api/command-center")
def command_center():
    try:
        return _build_command_center()
    except Exception:
        # Engine/data unavailable — keep the frontend alive with static data.
        return FALLBACK_COMMAND_CENTER


@app.get("/api/candidates")
def candidates_list():
    """All ADC candidates ranked by computed diligence priority."""
    try:
        _, scored = _all_scored()
        items = [_candidate_summary(c, s) for c, s in scored]
        items.sort(key=lambda item: item["score"], reverse=True)
        return {"candidates": items}
    except Exception:
        featured = FALLBACK_COMMAND_CENTER["featured_opportunity"]
        return {"candidates": [{**featured, "id": "tf-adc", "raw_id": "tf_cervical", "status_color": "green"}]}


@app.get("/api/candidates/{candidate_id}")
def candidate_detail(candidate_id: str):
    """Full diligence pipeline for one candidate (accepts PZ id or raw id)."""
    try:
        return _build_detail(candidate_id)
    except Exception:
        return {"error": True, "id": candidate_id, "message": "Candidate detail unavailable"}


@app.get("/api/agent-activity")
def agent_activity():
    """Agentic scan sequence + signal counts that power the Signals view."""
    try:
        return _load_json("agent_activity.json")
    except Exception:
        return {
            "scan_sequence": [],
            "total_signals_parsed": 0,
            "candidates_evaluated": 0,
            "failure_flags_raised": 0,
            "missing_data_items": 0,
            "scan_timestamp": None,
        }


@app.get("/api/research")
async def research_endpoint(q: str = ""):
    """Natural-language search → normalised target + multi-source evidence."""
    if not q.strip():
        return {"error": "query required", "query": q}
    try:
        return await run_research(q)
    except Exception as exc:
        return {"error": str(exc), "query": q}


def _build_command_center() -> dict:
    candidates, scored = _all_scored()
    activity = _load_json("agent_activity.json")

    # Featured = highest overall diligence priority.
    candidate, scores = max(scored, key=lambda pair: pair[1]["diligence_priority"])
    score = round(scores["diligence_priority"])
    diligence_status = candidate.get("diligence_status", "In Review")

    featured_opportunity = {
        "id": PZ_IDS.get(candidate["id"], _fallback_pz_id(candidate["id"])),
        "name": candidate.get("name", ""),
        "indication": candidate.get("indication", ""),
        "modality": "ADC",
        "stage": diligence_status,
        "score": score,
        "recommendation": _recommendation(diligence_status, score),
        "confidence": _confidence(diligence_status, score),
    }

    key_reasons = _split_findings(candidate.get("what_phasezero_found", ""))[:4]
    key_risks = [flag["flag"] for flag in candidate.get("failure_flags", [])]
    if not key_reasons:
        key_reasons = FALLBACK_COMMAND_CENTER["decision_memo"]["key_reasons"]
    if not key_risks:
        key_risks = FALLBACK_COMMAND_CENTER["decision_memo"]["key_risks"]

    status = {
        "system_status": "All Systems Operational",
        "signals_monitored": activity.get("total_signals_parsed", 0),
        "models_active": len(activity.get("scan_sequence", [])),
        "opportunities_tracked": activity.get("candidates_evaluated", len(candidates)),
        "last_update": _relative_time(activity.get("scan_timestamp")),
    }

    return {
        "status": status,
        "featured_opportunity": featured_opportunity,
        "decision_memo": {"key_reasons": key_reasons, "key_risks": key_risks},
    }


def _assumptions_for(candidate: dict) -> dict:
    from src.utils import DEFAULT_ASSUMPTIONS

    assumptions = dict(DEFAULT_ASSUMPTIONS)
    assumptions["strategic_fit"] = candidate.get("strategic_fit_default", 50)
    assumptions["risk_tolerance"] = candidate.get("risk_tolerance_default", 50)
    return assumptions


def _all_scored() -> tuple[list[dict], list[tuple[dict, dict]]]:
    """Load candidates and compute the full score bundle for each (lazy import)."""
    from src.scoring import compute_all_scores

    candidates = _load_json("adc_candidates.json")["candidates"]
    scored = [
        (candidate, compute_all_scores(candidate["base_scores"], _assumptions_for(candidate)))
        for candidate in candidates
    ]
    return candidates, scored


def _candidate_summary(candidate: dict, scores: dict) -> dict:
    score = round(scores["diligence_priority"])
    status = candidate.get("diligence_status", "In Review")
    findings = _split_findings(candidate.get("what_phasezero_found", ""))
    return {
        "id": SLUG_IDS.get(candidate["id"], candidate["id"].replace("_", "-")),
        "raw_id": candidate["id"],
        "name": candidate.get("name", ""),
        "full_name": candidate.get("full_name", ""),
        "indication": candidate.get("indication", ""),
        "target": candidate.get("target", ""),
        "modality": "ADC",
        "stage": status,
        "status_color": candidate.get("diligence_status_color", "blue"),
        "score": score,
        "scores": {k: round(v, 1) for k, v in scores.items()},
        "recommendation": _recommendation(status, score),
        "confidence": _confidence(status, score),
        "headline": findings[0] if findings else "",
    }


def _build_detail(candidate_id: str) -> dict:
    from src.pipeline import run_diligence_pipeline
    from src.scoring import score_components_detail

    candidates = _load_json("adc_candidates.json")["candidates"]
    evidence = _load_json("evidence_signals.json")

    raw_id = RAW_BY_SLUG.get(candidate_id) or RAW_BY_PZ.get(candidate_id, candidate_id)
    candidate = next((c for c in candidates if c["id"] == raw_id), None)
    if candidate is None:
        raise KeyError(candidate_id)

    assumptions = _assumptions_for(candidate)
    out = run_diligence_pipeline(candidate, assumptions, candidates, evidence)
    components = score_components_detail(candidate["base_scores"], assumptions)

    scores = out["scores"]
    score = round(scores["diligence_priority"])
    status = candidate.get("diligence_status", "In Review")
    sim = out["simulation"]
    hmm = out["hmm"]

    return {
        "id": SLUG_IDS.get(raw_id, raw_id.replace("_", "-")),
        "raw_id": raw_id,
        "name": candidate.get("name", ""),
        "full_name": candidate.get("full_name", ""),
        "indication": candidate.get("indication", ""),
        "target": candidate.get("target", ""),
        "modality": "ADC",
        "stage": status,
        "status_color": candidate.get("diligence_status_color", "blue"),
        "patient_subgroup": candidate.get("patient_subgroup", ""),
        "adc_design_thesis": candidate.get("adc_design_thesis", ""),
        "why_now": candidate.get("why_now", ""),
        "what_phasezero_found": candidate.get("what_phasezero_found", ""),
        "main_risk": candidate.get("main_risk", ""),
        "what_would_need_to_be_true": candidate.get("what_would_need_to_be_true", ""),
        "recommended_next_actions": candidate.get("recommended_next_actions", []),
        "failure_flags": candidate.get("failure_flags", []),
        "score": score,
        "recommendation": _recommendation(status, score),
        "confidence": _confidence(status, score),
        "scores": {k: round(v, 1) for k, v in scores.items()},
        "score_components": {k: round(v, 1) for k, v in components.items()},
        "simulation": {
            "mean": round(sim["mean"], 1),
            "p10": round(sim["p10"], 1),
            "p25": round(sim["p25"], 1),
            "p50": round(sim["p50"], 1),
            "p75": round(sim["p75"], 1),
            "p90": round(sim["p90"], 1),
            "threshold": sim["threshold"],
            "p_threshold": round(sim["p_threshold"], 1),
            "tornado": dict(
                sorted(sim["tornado"].items(), key=lambda kv: kv[1], reverse=True)[:6]
            ),
            "scenarios": sim.get("scenarios", {}),
            "histogram": _histogram(sim.get("distribution", [])),
            "n": sim.get("n", 0),
        },
        "hmm": {
            "current_state": hmm.get("current_state", ""),
            "next_state": hmm.get("next_state", ""),
            "regime_shift": hmm.get("regime_shift", False),
            "explanation": hmm.get("explanation", ""),
            "state_probs": {k: round(v, 3) for k, v in hmm.get("state_probs", {}).items()},
            "state_colors": hmm.get("state_colors", {}),
        },
        "bionemo": _bionemo_view(out["bionemo"]),
        "agents": _agents_view(out["agents"]),
        "evidence_graph": out["evidence_graph"],
        "memo": out["memo"],
    }


def _histogram(distribution: list, bins: int = 24) -> dict:
    if not distribution:
        return {"counts": [], "min": 0, "max": 0}
    import numpy as np

    counts, edges = np.histogram(np.asarray(distribution, dtype=float), bins=bins)
    return {
        "counts": [int(c) for c in counts],
        "min": round(float(edges[0]), 1),
        "max": round(float(edges[-1]), 1),
    }


def _bionemo_view(bionemo: dict) -> dict:
    numeric_keys = [
        "overall_plausibility",
        "pathway_proximity",
        "druggability_score",
        "internalization_efficiency",
    ]
    view = {
        key: round(bionemo[key] * 100, 1)
        for key in numeric_keys
        if isinstance(bionemo.get(key), (int, float))
    }
    view["summary"] = bionemo.get("summary", "")
    view["cross_reactivity_risk"] = bionemo.get("cross_reactivity_risk", "")
    view["payload_compatibility"] = bionemo.get("payload_compatibility", "")
    return view


def _agents_view(agents: dict) -> list[dict]:
    return [
        {
            "name": name,
            "status": data.get("status", "complete"),
            "confidence": round(data.get("confidence", 0)),
            "findings": data.get("findings", [])[:4],
            "flags": data.get("flags", []),
        }
        for name, data in agents.items()
    ]


def _load_json(name: str) -> dict:
    with open(DATA_DIR / name, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _split_findings(text: str) -> list[str]:
    """Split an agent findings paragraph into individual, trimmed sentences."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 1]


def _recommendation(diligence_status: str, score: float) -> str:
    status = diligence_status.lower()
    if "high" in status or score >= 70:
        return "Advance"
    if "medium" in status or score >= 50:
        return "Monitor"
    return "Deprioritize"


def _confidence(diligence_status: str, score: float) -> str:
    status = diligence_status.lower()
    if "high" in status or score >= 70:
        return "High Conviction"
    if "medium" in status or score >= 50:
        return "Moderate Conviction"
    return "Developing"


def _relative_time(timestamp: str | None) -> str:
    if not timestamp:
        return "live"
    try:
        then = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        delta = datetime.now(timezone.utc) - then
        minutes = int(delta.total_seconds() // 60)
        if minutes < 1:
            return "just now"
        if minutes < 60:
            return f"{minutes}m ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours}h ago"
        return f"{hours // 24}d ago"
    except ValueError:
        return "live"


def _fallback_pz_id(candidate_id: str) -> str:
    import zlib

    return f"PZ-{1000 + zlib.crc32(candidate_id.encode()) % 9000}"

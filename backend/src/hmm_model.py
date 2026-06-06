import numpy as np
from src.scoring import compute_readiness_score, compute_commercial_alpha, compute_evidence_quality

STATES = [
    "Speculative Opportunity",
    "Biologically Plausible",
    "Translationally Supported",
    "Commercially Validated",
    "Commercially Actionable",
]

STATE_COLORS = {
    "Speculative Opportunity":    "#6b7280",
    "Biologically Plausible":     "#3b82f6",
    "Translationally Supported":  "#8b5cf6",
    "Commercially Validated":     "#f59e0b",
    "Commercially Actionable":    "#22c55e",
}

CANDIDATE_SEEDS = {"b7h4_tnbc": 0, "tf_cervical": 1, "nectin4_expansion": 2}

_OBSERVATION_FEATURES = [
    "readiness", "commercial_alpha", "evidence_quality",
    "biomarker_evidence", "trial_activity", "regulatory_clarity",
]


def _observation_vector(base_scores: dict, assumptions: dict) -> np.ndarray:
    readiness  = compute_readiness_score(base_scores, assumptions)
    comm_alpha = compute_commercial_alpha(base_scores, assumptions)
    ev_quality = compute_evidence_quality(base_scores, assumptions)
    biomarker  = assumptions.get("biomarker_confidence", 50)
    trial      = base_scores.get("evidence_quality", 60)
    regulatory = blend_local(base_scores.get("regulatory_path_clarity", 50),
                             assumptions.get("approval_precedent", 50), 0.3)
    return np.array([readiness, comm_alpha, ev_quality, biomarker, trial, regulatory]) / 100.0


def blend_local(base, adj, w):
    return base * (1 - w) + adj * w


def _emission_means() -> np.ndarray:
    """Mean observation vectors for each hidden state (5 states x 6 features)."""
    return np.array([
        [0.28, 0.22, 0.30, 0.20, 0.25, 0.25],  # Speculative
        [0.48, 0.42, 0.52, 0.45, 0.48, 0.42],  # Biologically Plausible
        [0.63, 0.58, 0.65, 0.62, 0.65, 0.62],  # Translationally Supported
        [0.75, 0.72, 0.73, 0.72, 0.74, 0.76],  # Commercially Validated
        [0.85, 0.83, 0.82, 0.80, 0.82, 0.84],  # Commercially Actionable
    ])


def _log_likelihood(obs: np.ndarray, means: np.ndarray, sigma: float = 0.12) -> np.ndarray:
    diff = obs[np.newaxis, :] - means
    return -0.5 * np.sum(diff ** 2, axis=1) / (sigma ** 2)


def run_hmm(candidate_id: str, base_scores: dict, assumptions: dict) -> dict:
    obs = _observation_vector(base_scores, assumptions)
    means = _emission_means()
    log_liks = _log_likelihood(obs, means)

    prior_weights = np.array([0.05, 0.15, 0.30, 0.30, 0.20])
    log_posterior = log_liks + np.log(prior_weights)
    log_posterior -= np.max(log_posterior)
    probs = np.exp(log_posterior)
    probs /= probs.sum()

    current_idx = int(np.argmax(probs))
    current_state = STATES[current_idx]

    next_idx = min(current_idx + 1, len(STATES) - 1)
    next_state = STATES[next_idx]

    regime_shift = bool(probs[current_idx] < 0.45 or
                        (current_idx < len(STATES) - 1 and probs[next_idx] > 0.25))

    explanations = {
        "b7h4_tnbc": (
            "B7-H4 ADC in TNBC has moderate biological evidence but weak clinical differentiation "
            "signals. High competitive saturation and unvalidated biomarker strategy keep it below "
            "Commercially Validated. Expert improvements in biomarker confidence would shift state probability."
        ),
        "tf_cervical": (
            "The Tissue Factor ADC opportunity is in Commercially Actionable state: TV approval "
            "de-risks the target, clinical development logic is clear, and high unmet need drives "
            "commercial evidence. Next-gen differentiation from TV toxicity profile is the key catalyst."
        ),
        "nectin4_expansion": (
            "Nectin-4 ADC expansion sits in Translationally Supported state. Strong urothelial precedent "
            "and cross-tumor expression data support biological plausibility. Clinical benefit outside "
            "urothelial context remains unconfirmed — expansion signals would push toward Commercially Validated."
        ),
    }

    return {
        "state_probs":     {s: float(p) for s, p in zip(STATES, probs)},
        "current_state":   current_state,
        "next_state":      next_state,
        "regime_shift":    regime_shift,
        "explanation":     explanations.get(candidate_id, "Model inference based on current evidence signals."),
        "state_colors":    STATE_COLORS,
        "observation":     obs.tolist(),
    }

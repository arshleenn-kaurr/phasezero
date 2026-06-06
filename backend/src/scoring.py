import numpy as np
from typing import Optional
from sklearn.metrics.pairwise import cosine_similarity
from src.utils import blend, clamp


def _therapeutic_index(base_scores: dict, assumptions: dict) -> float:
    base_ti = base_scores.get("therapeutic_index", 50)
    expert_ti = (
        0.45 * assumptions.get("internalization_confidence", 50)
        + 0.30 * assumptions.get("safety_mitigation", 50)
        + 0.25 * (100 - assumptions.get("normal_tissue_liability", 50))
    )
    return clamp(blend(base_ti, expert_ti, 0.35))


def _clinical_differentiation(base_scores: dict, assumptions: dict) -> float:
    expert_cd = (
        0.45 * assumptions.get("expected_clinical_delta", 50)
        + 0.25 * assumptions.get("endpoint_clarity", 50)
        + 0.20 * assumptions.get("label_differentiation_clarity", 50)
        + 0.10 * (100 - assumptions.get("comparator_difficulty", 50))
    )
    return clamp(blend(base_scores.get("clinical_differentiation", 50), expert_cd, 0.35))


def _regulatory_clarity(base_scores: dict, assumptions: dict) -> float:
    expert_reg = (
        0.40 * assumptions.get("approval_precedent", 50)
        + 0.25 * assumptions.get("accelerated_approval_feasibility", 50)
        + 0.20 * assumptions.get("label_differentiation_clarity", 50)
        + 0.15 * (100 - assumptions.get("confirmatory_trial_risk", 50))
    )
    return clamp(blend(base_scores.get("regulatory_path_clarity", 50), expert_reg, 0.30))


def _evidence_quality_adjusted(base_scores: dict, assumptions: dict) -> float:
    base_eq = base_scores.get("evidence_quality", 60)
    expert_eq = (
        0.30 * assumptions.get("biomarker_confidence", 50)
        + 0.25 * assumptions.get("endpoint_clarity", 50)
        + 0.20 * assumptions.get("enrollment_feasibility", 50)
        + 0.15 * assumptions.get("approval_precedent", 50)
        + 0.10 * assumptions.get("patient_identification_ease", 50)
    )
    return clamp(blend(base_eq, expert_eq, 0.22))


def compute_bionemo_plausibility(base_scores: dict, assumptions: dict) -> float:
    """BioNeMo-style plausibility — mocked layer adjusted by expert biology assumptions."""
    base_bio = base_scores.get("bionemo_plausibility", 60)
    expert_bio = (
        0.30 * assumptions.get("target_selectivity", 50)
        + 0.25 * assumptions.get("internalization_confidence", 50)
        + 0.20 * assumptions.get("tumor_expression_uniformity", 50)
        + 0.15 * assumptions.get("biomarker_confidence", 50)
        + 0.10 * (100 - assumptions.get("normal_tissue_liability", 50))
    )
    return clamp(blend(base_bio, expert_bio, 0.30))


def compute_readiness_score(base_scores: dict, assumptions: dict) -> float:
    """ADC Opportunity Readiness — weighted blend of biology, clinical, and regulatory signals."""
    target_selectivity = blend(base_scores.get("target_selectivity", 50), assumptions.get("target_selectivity", 50), 0.35)
    tumor_uniformity = assumptions.get("tumor_expression_uniformity", base_scores.get("biomarker_strategy", 50))
    therapeutic_index = _therapeutic_index(base_scores, assumptions)
    biomarker_confidence = blend(base_scores.get("biomarker_strategy", 50), assumptions.get("biomarker_confidence", 50), 0.40)
    clinical_delta = _clinical_differentiation(base_scores, assumptions)
    regulatory_clarity = _regulatory_clarity(base_scores, assumptions)
    evidence_quality = _evidence_quality_adjusted(base_scores, assumptions)

    readiness = (
        0.20 * target_selectivity +
        0.15 * tumor_uniformity +
        0.15 * therapeutic_index +
        0.15 * biomarker_confidence +
        0.15 * clinical_delta +
        0.10 * regulatory_clarity +
        0.10 * evidence_quality
    )
    return clamp(readiness)


def compute_commercial_alpha(base_scores: dict, assumptions: dict) -> float:
    """Commercial Alpha — stress-tested market opportunity signal."""
    unmet_need = blend(base_scores.get("unmet_need", 60), assumptions.get("unmet_need", 50), 0.25)
    whitespace = blend(base_scores.get("commercial_whitespace", 50), assumptions.get("market_whitespace", 50), 0.35)
    clinical_delta = _clinical_differentiation(base_scores, assumptions)
    franchise_fit = assumptions.get("franchise_fit", assumptions.get("strategic_fit", 50))
    evidence_momentum = _evidence_quality_adjusted(base_scores, assumptions)
    strategic_fit = assumptions.get("investment_appetite", assumptions.get("strategic_fit", 50))
    competitive_saturation = blend(
        base_scores.get("competitive_saturation", 60),
        assumptions.get("competitive_saturation_adj", 50),
        0.35,
    )
    consensus_attention = 0.65 * base_scores.get("competitive_saturation", 60) + 0.35 * assumptions.get("competitive_saturation_adj", 50)

    alpha = (
        0.25 * unmet_need +
        0.20 * whitespace +
        0.15 * clinical_delta +
        0.15 * franchise_fit +
        0.10 * evidence_momentum +
        0.10 * strategic_fit
        - 0.15 * competitive_saturation
        - 0.05 * consensus_attention
    )
    return clamp(alpha)


def compute_evidence_quality(base_scores: dict, assumptions: Optional[dict] = None) -> float:
    """Evidence Quality — coverage across literature, trials, regulatory, and commercial signals."""
    assumptions = assumptions or {}
    eq = _evidence_quality_adjusted(base_scores, assumptions)
    bp = compute_bionemo_plausibility(base_scores, assumptions)
    return clamp(0.65 * eq + 0.35 * bp)


def compute_failure_similarity(base_scores: dict, assumptions: dict) -> float:
    """Failure Similarity Penalty — how much this candidate resembles prior failure archetypes."""
    target_liability = assumptions.get("normal_tissue_liability", 50)
    weak_biomarker = 100 - assumptions.get("biomarker_confidence", 50)
    toxicity_limited = (
        0.45 * assumptions.get("normal_tissue_liability", 50)
        + 0.35 * assumptions.get("safety_warning_risk", 50)
        + 0.20 * (100 - assumptions.get("safety_mitigation", 50))
    )
    weak_clinical_delta = 100 - assumptions.get("expected_clinical_delta", 50)
    crowded_market = blend(
        base_scores.get("competitive_saturation", 60),
        assumptions.get("competitive_saturation_adj", 50),
        0.35,
    )
    regulatory_path = (
        0.55 * assumptions.get("confirmatory_trial_risk", 50)
        + 0.45 * (100 - assumptions.get("approval_precedent", 50))
    )

    failure_vector = np.array([
        target_liability,
        weak_biomarker,
        toxicity_limited,
        weak_clinical_delta,
        crowded_market,
        regulatory_path,
    ], dtype=float)
    archetype_vector = np.array([70, 75, 72, 78, 74, 62], dtype=float)
    weights = np.array([0.20, 0.20, 0.20, 0.15, 0.15, 0.10], dtype=float)

    weighted_failure = failure_vector * weights
    weighted_archetype = archetype_vector * weights
    cosine_match = cosine_similarity([weighted_failure], [weighted_archetype])[0][0]
    severity = float(np.dot(failure_vector, weights))
    expert_failure = 0.65 * severity + 0.35 * (cosine_match * 100)
    risk_tolerance_offset = (50 - assumptions.get("risk_tolerance", 50)) * 0.15
    adjusted = blend(base_scores.get("failure_similarity", 50), expert_failure, 0.35) + risk_tolerance_offset
    return clamp(adjusted)


def compute_diligence_priority(base_scores: dict, assumptions: dict) -> float:
    """Overall Diligence Priority — composite signal for opportunity ranking."""
    readiness   = compute_readiness_score(base_scores, assumptions)
    comm_alpha  = compute_commercial_alpha(base_scores, assumptions)
    ev_quality  = compute_evidence_quality(base_scores, assumptions)
    fail_sim    = compute_failure_similarity(base_scores, assumptions)
    bionemo     = compute_bionemo_plausibility(base_scores, assumptions)
    strategic_fit = assumptions.get("strategic_fit", 50)

    priority = (
        0.30 * readiness +
        0.25 * comm_alpha +
        0.20 * bionemo +
        0.15 * ev_quality +
        0.10 * strategic_fit -
        0.25 * fail_sim
    )
    return clamp(priority)


def compute_all_scores(base_scores: dict, assumptions: dict) -> dict:
    return {
        "readiness":         compute_readiness_score(base_scores, assumptions),
        "commercial_alpha":  compute_commercial_alpha(base_scores, assumptions),
        "evidence_quality":  compute_evidence_quality(base_scores, assumptions),
        "failure_similarity":compute_failure_similarity(base_scores, assumptions),
        "diligence_priority":compute_diligence_priority(base_scores, assumptions),
        "bionemo_plausibility": compute_bionemo_plausibility(base_scores, assumptions),
    }


def score_components_detail(base_scores: dict, assumptions: dict) -> dict:
    """Return per-dimension scores for the scorecard breakdown."""
    return {
        "Target Selectivity":       clamp(blend(base_scores.get("target_selectivity", 50), assumptions.get("target_selectivity", 50), 0.30)),
        "Therapeutic Index":        _therapeutic_index(base_scores, assumptions),
        "Biomarker Strategy":       clamp(blend(base_scores.get("biomarker_strategy", 50), assumptions.get("biomarker_confidence", 50), 0.40)),
        "Clinical Differentiation": _clinical_differentiation(base_scores, assumptions),
        "Commercial Whitespace":    clamp(blend(base_scores.get("commercial_whitespace", 50), 100 - assumptions.get("competitive_saturation_adj", 50), 0.25)),
        "Regulatory Path Clarity":  _regulatory_clarity(base_scores, assumptions),
        "Evidence Quality":         compute_evidence_quality(base_scores, assumptions),
    }

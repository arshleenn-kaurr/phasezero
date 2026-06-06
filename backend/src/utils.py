import numpy as np


def blend(base: float, expert: float, expert_weight: float) -> float:
    """Blend a base score with an expert-adjusted value."""
    return base * (1 - expert_weight) + expert * expert_weight


def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return float(np.clip(value, lo, hi))


def score_to_label(score: float) -> str:
    if score >= 75:
        return "Strong"
    elif score >= 60:
        return "Moderate"
    elif score >= 45:
        return "Weak"
    else:
        return "Low"


def score_to_color(score: float) -> str:
    if score >= 75:
        return "#22c55e"
    elif score >= 60:
        return "#3b82f6"
    elif score >= 45:
        return "#f59e0b"
    else:
        return "#ef4444"


def severity_color(severity: str) -> str:
    mapping = {"high": "#ef4444", "medium": "#f59e0b", "low": "#6b7280"}
    return mapping.get(severity, "#6b7280")


def status_color(color_key: str) -> str:
    mapping = {
        "green": "#22c55e",
        "amber": "#f59e0b",
        "blue": "#3b82f6",
        "red": "#ef4444",
    }
    return mapping.get(color_key, "#6b7280")


DEFAULT_ASSUMPTIONS = {
    "target_selectivity": 50,
    "tumor_expression_uniformity": 50,
    "normal_tissue_liability": 50,
    "internalization_confidence": 50,
    "biomarker_confidence": 50,
    "comparator_difficulty": 50,
    "endpoint_clarity": 50,
    "expected_clinical_delta": 50,
    "enrollment_feasibility": 50,
    "safety_mitigation": 50,
    "unmet_need": 50,
    "market_whitespace": 50,
    "franchise_fit": 50,
    "competitive_saturation_adj": 50,
    "market_access_confidence": 50,
    "pricing_power": 50,
    "patient_identification_ease": 50,
    "kol_support": 50,
    "approval_precedent": 50,
    "accelerated_approval_feasibility": 50,
    "confirmatory_trial_risk": 50,
    "label_differentiation_clarity": 50,
    "safety_warning_risk": 50,
    "strategic_fit": 50,
    "investment_appetite": 50,
    "risk_tolerance": 50,
    "time_to_value_priority": 50,
    "partnering_attractiveness": 50,
}

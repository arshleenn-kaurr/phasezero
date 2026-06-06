import numpy as np
from scipy import stats
from src.scoring import compute_diligence_priority, compute_readiness_score, compute_commercial_alpha

SEEDS = {"b7h4_tnbc": 42, "tf_cervical": 137, "nectin4_expansion": 91}

VARIABLE_LABELS = {
    "clinical_delta_sigma":    "Clinical differentiation uncertainty",
    "market_access_sigma":     "Market access / reimbursement",
    "competitor_entry_sigma":  "Competitor entry timing",
    "biomarker_sigma":         "Biomarker assay success",
    "regulatory_path_sigma":   "Regulatory path clarity",
    "commercial_adoption_sigma":"Commercial adoption rate",
}


def _make_seed(candidate_id: str, assumptions: dict) -> int:
    assumption_hash = sum((idx + 1) * int(value) for idx, value in enumerate(sorted(assumptions.values())))
    return SEEDS.get(candidate_id, 7) + assumption_hash


def _beta_samples(rng, mean: float, concentration: float, n: int) -> np.ndarray:
    mean = np.clip(mean / 100.0, 0.02, 0.98)
    alpha = mean * concentration
    beta = (1 - mean) * concentration
    return stats.beta.rvs(alpha, beta, size=n, random_state=rng) * 100


def run_monte_carlo(candidate_id: str, base_scores: dict, assumptions: dict, n: int = 10_000) -> dict:
    rng = np.random.default_rng(_make_seed(candidate_id, assumptions))

    base_priority = compute_diligence_priority(base_scores, assumptions)
    base_readiness = compute_readiness_score(base_scores, assumptions)
    base_commercial = compute_commercial_alpha(base_scores, assumptions)

    concentration = 18 if base_priority < 55 else 28

    response_rate = _beta_samples(rng, assumptions.get("expected_clinical_delta", base_readiness), concentration, n)
    toxicity_discontinuation = _beta_samples(
        rng,
        100 - assumptions.get("safety_mitigation", 50) + assumptions.get("normal_tissue_liability", 50) * 0.35,
        concentration,
        n,
    )
    commercial_adoption = _beta_samples(rng, base_commercial, concentration, n)
    target_positive_population = _beta_samples(
        rng,
        0.55 * assumptions.get("tumor_expression_uniformity", 50) + 0.45 * assumptions.get("patient_identification_ease", 50),
        concentration,
        n,
    )
    competitor_entry = _beta_samples(
        rng,
        assumptions.get("competitive_saturation_adj", base_scores.get("competitive_saturation", 50)),
        concentration,
        n,
    )
    biomarker_success = _beta_samples(rng, assumptions.get("biomarker_confidence", 50), concentration, n)
    regulatory_clarity = _beta_samples(rng, assumptions.get("approval_precedent", 50), concentration, n)
    trial_execution = _beta_samples(
        rng,
        0.55 * assumptions.get("enrollment_feasibility", 50) + 0.45 * assumptions.get("endpoint_clarity", 50),
        concentration,
        n,
    )

    clinical_noise = response_rate - np.mean(response_rate)
    market_noise = commercial_adoption - np.mean(commercial_adoption)
    competitor_noise = np.mean(competitor_entry) - competitor_entry
    biomarker_noise = biomarker_success - np.mean(biomarker_success)
    regulatory_noise = regulatory_clarity - np.mean(regulatory_clarity)
    adoption_noise = target_positive_population - np.mean(target_positive_population)
    toxicity_noise = np.mean(toxicity_discontinuation) - toxicity_discontinuation
    trial_noise = trial_execution - np.mean(trial_execution)

    total_noise = (
        0.24 * clinical_noise +
        0.16 * market_noise +
        0.18 * competitor_noise +
        0.14 * biomarker_noise +
        0.09 * regulatory_noise +
        0.07 * adoption_noise +
        0.07 * toxicity_noise +
        0.05 * trial_noise
    )

    simulated = np.clip(base_priority + total_noise, 0, 100)

    p10, p25, p50, p75, p90 = np.percentile(simulated, [10, 25, 50, 75, 90])
    threshold = 60.0
    p_threshold = float(np.mean(simulated >= threshold) * 100)

    # Tornado: sensitivity of output to each individual variable (std of contribution)
    tornado = {
        "Clinical differentiation uncertainty":  float(np.std(0.24 * clinical_noise)),
        "Competitor entry timing":               float(np.std(0.18 * competitor_noise)),
        "Market access / reimbursement":         float(np.std(0.16 * market_noise)),
        "Biomarker assay success":               float(np.std(0.14 * biomarker_noise)),
        "Regulatory path clarity":               float(np.std(0.09 * regulatory_noise)),
        "Target-positive population":            float(np.std(0.07 * adoption_noise)),
        "Toxicity discontinuation":              float(np.std(0.07 * toxicity_noise)),
        "Trial execution":                       float(np.std(0.05 * trial_noise)),
    }

    scenarios = {
        "downside": {
            "label": "Downside",
            "value": round(p10, 1),
            "description": "Biomarker fails validation, strong competitor entry, weak clinical signal",
        },
        "base": {
            "label": "Base Case",
            "value": round(p50, 1),
            "description": "Assumptions hold; market entry as modeled with moderate competition",
        },
        "upside": {
            "label": "Upside",
            "value": round(p90, 1),
            "description": "Strong clinical delta, biomarker validated early, delayed competitor entry",
        },
    }

    return {
        "distribution": simulated.tolist(),
        "mean":         float(np.mean(simulated)),
        "p10":          float(p10),
        "p25":          float(p25),
        "p50":          float(p50),
        "p75":          float(p75),
        "p90":          float(p90),
        "p_threshold":  p_threshold,
        "threshold":    threshold,
        "tornado":      tornado,
        "scenarios":    scenarios,
        "variables": {
            "response_rate": response_rate.tolist(),
            "toxicity_discontinuation": toxicity_discontinuation.tolist(),
            "commercial_adoption": commercial_adoption.tolist(),
            "target_positive_population": target_positive_population.tolist(),
            "competitor_entry": competitor_entry.tolist(),
            "biomarker_success": biomarker_success.tolist(),
            "regulatory_clarity": regulatory_clarity.tolist(),
            "trial_execution": trial_execution.tolist(),
        },
        "n":            n,
    }

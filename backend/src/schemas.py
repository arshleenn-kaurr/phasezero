from typing import Dict, List, Literal

from pydantic import BaseModel, Field, field_validator


Score = float


class FailureFlag(BaseModel):
    flag: str
    severity: Literal["low", "medium", "high"]
    detail: str


class Candidate(BaseModel):
    id: str
    name: str
    indication: str
    target: str
    full_name: str
    patient_subgroup: str
    adc_design_thesis: str
    why_now: str
    what_phasezero_found: str
    main_risk: str
    what_would_need_to_be_true: str
    recommended_next_actions: List[str]
    base_scores: Dict[str, Score]
    failure_flags: List[FailureFlag]
    diligence_status: str
    diligence_status_color: str
    strategic_fit_default: Score = 50
    risk_tolerance_default: Score = 50

    @field_validator("base_scores")
    @classmethod
    def base_scores_are_bounded(cls, scores: Dict[str, Score]) -> Dict[str, Score]:
        for key, value in scores.items():
            if value < 0 or value > 100:
                raise ValueError(f"{key} must be between 0 and 100")
        return scores


class AgentOutput(BaseModel):
    status: str
    input_sources: List[str] = Field(default_factory=list)
    findings: List[str] = Field(default_factory=list)
    confidence: Score = 50
    flags: List[str] = Field(default_factory=list)
    latency_ms: int = 0

    @field_validator("confidence")
    @classmethod
    def confidence_is_bounded(cls, value: Score) -> Score:
        if value < 0 or value > 100:
            raise ValueError("confidence must be between 0 and 100")
        return value


class ScoreBundle(BaseModel):
    readiness: Score
    commercial_alpha: Score
    evidence_quality: Score
    failure_similarity: Score
    diligence_priority: Score
    bionemo_plausibility: Score

    @field_validator("*")
    @classmethod
    def scores_are_bounded(cls, value: Score) -> Score:
        if value < 0 or value > 100:
            raise ValueError("score must be between 0 and 100")
        return value


class MonteCarloResult(BaseModel):
    distribution: List[float]
    mean: float
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    p_threshold: float
    threshold: float
    tornado: Dict[str, float]
    scenarios: Dict[str, dict]
    variables: Dict[str, List[float]] = Field(default_factory=dict)
    n: int


class HMMResult(BaseModel):
    state_probs: Dict[str, float]
    current_state: str
    next_state: str
    regime_shift: bool
    explanation: str
    state_colors: Dict[str, str]
    observation: List[float]

    @field_validator("state_probs")
    @classmethod
    def probabilities_sum_to_one(cls, probs: Dict[str, float]) -> Dict[str, float]:
        total = sum(probs.values())
        if abs(total - 1.0) > 1e-6:
            raise ValueError("HMM state probabilities must sum to 1")
        return probs


def validate_candidates(raw_candidates: List[dict]) -> List[Candidate]:
    return [Candidate.model_validate(candidate) for candidate in raw_candidates]

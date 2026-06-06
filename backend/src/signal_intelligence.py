import json
from collections import defaultdict


EVIDENCE_TIER_WEIGHTS = {
    "regulatory": 1.25,
    "clinical": 1.20,
    "human tissue": 1.10,
    "commercial": 1.00,
    "computational": 0.90,
    "preclinical": 0.80,
}

POSITIVE_POLARITY = {"positive": 1, "neutral": 0.25, "negative": -1}

REQUIRED_DILIGENCE_FIELDS = [
    ("human normal tissue expression", ["normal tissue", "tissue liability"]),
    ("subgroup-specific ADC response", ["subgroup", "response", "orr"]),
    ("biomarker cutoff", ["biomarker", "cutoff", "enrichment"]),
    ("internalization evidence", ["internalization"]),
    ("payload/linker therapeutic index", ["payload", "linker", "therapeutic-index", "therapeutic index"]),
    ("comparator delta", ["comparator", "clinical delta", "benchmark"]),
    ("regulatory precedent", ["regulatory", "approval", "label"]),
    ("commercial differentiation", ["commercial", "competitive", "differentiation", "whitespace"]),
]


def load_signal_events(path: str) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)["events"]


def filter_events_for_candidate(events: list[dict], candidate_id: str) -> list[dict]:
    return [event for event in events if event["candidate_id"] == candidate_id]


def compute_quality_weighted_signal(event: dict) -> float:
    tier_weight = EVIDENCE_TIER_WEIGHTS.get(event.get("evidence_tier", "preclinical"), 0.8)
    polarity = POSITIVE_POLARITY.get(event.get("polarity", "neutral"), 0.25)
    weighted = (
        event.get("strength", 0)
        * event.get("reliability", 0) / 100
        * event.get("recency_weight", 0) / 100
        * event.get("independence_weight", 0) / 100
        * tier_weight
    )
    return round(weighted * polarity, 2)


def compute_publication_momentum(events: list[dict]) -> dict:
    return _momentum_for_sources(events, {"PubMed", "PMC"}, "Publication Momentum")


def compute_trial_momentum(events: list[dict]) -> dict:
    return _momentum_for_sources(events, {"ClinicalTrials.gov"}, "Trial Momentum")


def compute_regulatory_momentum(events: list[dict]) -> dict:
    return _momentum_for_sources(events, {"FDA Label"}, "Regulatory Momentum")


def compute_patent_conference_momentum(events: list[dict]) -> dict:
    return _momentum_for_sources(events, {"Patent", "Conference"}, "Patent / Conference Momentum")


def compute_pipeline_behavior_signal(events: list[dict]) -> dict:
    pipeline_events = [event for event in events if event.get("source_type") == "Pipeline"]
    if not pipeline_events:
        commercial_events = [event for event in events if event.get("evidence_tier") == "commercial"]
        pipeline_events = commercial_events
    signal = sum(compute_quality_weighted_signal(event) for event in pipeline_events)
    direction = "warning" if signal < -10 else "supportive" if signal > 10 else "mixed"
    return {
        "label": "Pipeline Behavior Signal",
        "velocity": round(abs(signal), 1),
        "baseline": 0.0,
        "acceleration": round(signal, 1),
        "direction": direction,
        "interpretation": _interpret_direction(direction, "Pipeline behavior"),
    }


def compute_contradiction_burden(events: list[dict]) -> dict:
    groups = defaultdict(lambda: {"positive": 0.0, "negative": 0.0, "claims": []})
    for event in events:
        group = event.get("contradiction_group") or "ungrouped"
        weighted = abs(compute_quality_weighted_signal(event))
        if event.get("polarity") == "positive":
            groups[group]["positive"] += weighted
        elif event.get("polarity") == "negative":
            groups[group]["negative"] += weighted
        else:
            groups[group]["positive"] += weighted * 0.35
            groups[group]["negative"] += weighted * 0.35
        groups[group]["claims"].append(event.get("claim", ""))

    group_rows = []
    burden_parts = []
    for group, values in groups.items():
        positive = values["positive"]
        negative = values["negative"]
        overlap = min(positive, negative)
        total = positive + negative
        burden = 0 if total == 0 else (2 * overlap / total) * 100
        burden_parts.append(burden)
        group_rows.append(
            {
                "group": group,
                "positive_weight": round(positive, 1),
                "negative_weight": round(negative, 1),
                "burden": round(burden, 1),
                "claims": values["claims"],
            }
        )

    most_disputed = max(group_rows, key=lambda row: row["burden"], default={"group": "None", "burden": 0, "claims": []})
    total_burden = sum(burden_parts) / len(burden_parts) if burden_parts else 0
    return {
        "contradiction_burden": round(total_burden, 1),
        "most_disputed_claim": most_disputed["group"],
        "most_disputed_detail": most_disputed["claims"][0] if most_disputed["claims"] else "No disputed claim detected.",
        "groups": sorted(group_rows, key=lambda row: row["burden"], reverse=True),
    }


def compute_evidence_agreement(events: list[dict]) -> float:
    return round(max(0, 100 - compute_contradiction_burden(events)["contradiction_burden"]), 1)


def compute_missing_data_burden(events: list[dict], candidate: dict) -> dict:
    text = " ".join(
        [candidate.get("what_would_need_to_be_true", ""), candidate.get("main_risk", "")]
        + [event.get("claim", "") + " " + event.get("diligence_question", "") for event in events]
    ).lower()
    missing = []
    covered = []
    for field, keywords in REQUIRED_DILIGENCE_FIELDS:
        if any(keyword in text for keyword in keywords):
            covered.append(field)
        else:
            missing.append(field)
    burden = (len(missing) / len(REQUIRED_DILIGENCE_FIELDS)) * 100
    return {"missing_data_burden": round(burden, 1), "missing_fields": missing, "covered_fields": covered}


def infer_signal_regime(events: list[dict], candidate: dict) -> dict:
    publication = compute_publication_momentum(events)
    trial = compute_trial_momentum(events)
    regulatory = compute_regulatory_momentum(events)
    patent_conf = compute_patent_conference_momentum(events)
    pipeline = compute_pipeline_behavior_signal(events)
    contradiction = compute_contradiction_burden(events)
    missing = compute_missing_data_burden(events, candidate)

    total_positive = sum(max(0, compute_quality_weighted_signal(event)) for event in events)
    total_negative = abs(sum(min(0, compute_quality_weighted_signal(event)) for event in events))
    momentum = publication["velocity"] + trial["velocity"] + regulatory["velocity"] + patent_conf["velocity"]
    consensus_attention = sum(
        abs(compute_quality_weighted_signal(event))
        for event in events
        if event.get("entity_type") == "commercial" or event.get("contradiction_group") in {"competitive saturation", "consensus attention"}
    )

    if total_negative > total_positive and (trial["acceleration"] < 0 or regulatory["acceleration"] < 0 or pipeline["acceleration"] < 0):
        regime = "Failure-Risk Drift"
    elif momentum >= 70 and contradiction["contradiction_burden"] >= 35:
        regime = "Noisy Signal"
    elif momentum >= 70 and consensus_attention >= 25:
        regime = "Crowded Consensus"
    elif momentum >= 45 and total_positive > total_negative and consensus_attention < 25:
        regime = "Hidden Alpha"
    elif momentum < 25 and total_positive < 35:
        regime = "Weak Signal"
    elif missing["missing_data_burden"] >= 35:
        regime = "Needs Diligence"
    else:
        regime = "Needs Diligence"

    return {
        "signal_regime": regime,
        "momentum_score": round(momentum, 1),
        "consensus_attention": round(consensus_attention, 1),
        "total_positive_signal": round(total_positive, 1),
        "total_negative_signal": round(total_negative, 1),
    }


def summarize_signal_intelligence(events: list[dict], candidate: dict) -> dict:
    candidate_events = filter_events_for_candidate(events, candidate["id"])
    weighted_events = []
    for event in candidate_events:
        row = dict(event)
        row["weighted_signal"] = compute_quality_weighted_signal(event)
        weighted_events.append(row)

    contradiction = compute_contradiction_burden(weighted_events)
    missing = compute_missing_data_burden(weighted_events, candidate)
    regime = infer_signal_regime(weighted_events, candidate)
    positive = sorted([event for event in weighted_events if event["weighted_signal"] > 0], key=lambda row: row["weighted_signal"], reverse=True)
    negative = sorted([event for event in weighted_events if event["weighted_signal"] < 0], key=lambda row: abs(row["weighted_signal"]), reverse=True)

    return {
        "signal_regime": regime["signal_regime"],
        "momentum_score": regime["momentum_score"],
        "consensus_attention": regime["consensus_attention"],
        "momentum": {
            "publication": compute_publication_momentum(weighted_events),
            "trial": compute_trial_momentum(weighted_events),
            "regulatory": compute_regulatory_momentum(weighted_events),
            "patent_conference": compute_patent_conference_momentum(weighted_events),
            "pipeline": compute_pipeline_behavior_signal(weighted_events),
        },
        "contradiction_burden": contradiction["contradiction_burden"],
        "evidence_agreement": compute_evidence_agreement(weighted_events),
        "most_disputed_claim": contradiction["most_disputed_claim"],
        "most_disputed_detail": contradiction["most_disputed_detail"],
        "missing_data_burden": missing["missing_data_burden"],
        "missing_fields": missing["missing_fields"],
        "top_positive_signals": positive[:4],
        "top_negative_signals": negative[:4],
        "events": sorted(weighted_events, key=lambda row: abs(row["weighted_signal"]), reverse=True),
        "diligence_questions": list(dict.fromkeys(event["diligence_question"] for event in weighted_events))[:5],
        "alpha_supporting": [event["extracted_signal"] for event in positive[:4]],
        "warning_signals": [event["extracted_signal"] for event in negative[:4]],
    }


def _momentum_for_sources(events: list[dict], source_types: set[str], label: str) -> dict:
    scoped = [event for event in events if event.get("source_type") in source_types]
    if not scoped:
        return {
            "label": label,
            "velocity": 0.0,
            "baseline": 0.0,
            "acceleration": 0.0,
            "direction": "flat",
            "interpretation": f"{label} is not yet a visible signal for this candidate.",
        }

    by_quarter = defaultdict(float)
    for event in scoped:
        by_quarter[event.get("quarter", "unknown")] += abs(compute_quality_weighted_signal(event))
    ordered = sorted(by_quarter.items())
    recent = ordered[-2:] if len(ordered) > 1 else ordered
    older = ordered[:-2] if len(ordered) > 2 else ordered[:1]
    velocity = sum(value for _, value in recent)
    baseline = sum(value for _, value in older) / max(1, len(older))
    acceleration = velocity - baseline
    direction = "increasing" if acceleration > 8 else "declining" if acceleration < -8 else "flat"
    return {
        "label": label,
        "velocity": round(velocity, 1),
        "baseline": round(baseline, 1),
        "acceleration": round(acceleration, 1),
        "direction": direction,
        "interpretation": _interpret_direction(direction, label),
    }


def _interpret_direction(direction: str, label: str) -> str:
    if direction == "increasing":
        return f"{label} is gaining signal velocity."
    if direction == "declining":
        return f"{label} is losing signal velocity or drifting negative."
    if direction == "warning":
        return f"{label} is producing warning signals."
    if direction == "supportive":
        return f"{label} supports the opportunity thesis."
    if direction == "mixed":
        return f"{label} is mixed and needs targeted diligence."
    return f"{label} is stable."

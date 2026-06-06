"""
Diligence memo generator — produces a structured markdown diligence memo.
Nemotron (NVIDIA) writes the narrative sections when NVIDIA_API_KEY is set;
falls back to static template strings otherwise.
"""

import json
from datetime import date
from typing import Optional

try:
    from src import nvidia_client as _nvidia_client
except ImportError:
    _nvidia_client = None


def _nemotron_sections(
    candidate: dict,
    scores: dict,
    simulation: dict,
    hmm: dict,
    bionemo: dict,
    agents: dict,
) -> dict | None:
    """Ask Nemotron to write three narrative blocks. Returns dict or None."""
    if _nvidia_client is None or not _nvidia_client.api_available():
        return None

    context = {
        "candidate": {
            "name": candidate.get("full_name", ""),
            "indication": candidate.get("indication", ""),
            "target": candidate.get("target", ""),
            "adc_thesis": candidate.get("adc_design_thesis", ""),
            "why_now": candidate.get("why_now", ""),
            "main_risk": candidate.get("main_risk", ""),
        },
        "scores": {k: round(v, 1) for k, v in scores.items()},
        "simulation": {
            "p10": round(simulation.get("p10", 0), 1),
            "p50": round(simulation.get("p50", 0), 1),
            "p90": round(simulation.get("p90", 0), 1),
            "p_threshold_pct": round(simulation.get("p_threshold", 0), 1),
        },
        "hmm": {
            "current_state": hmm.get("current_state", ""),
            "next_state": hmm.get("next_state", ""),
        },
        "bionemo": {
            "overall_plausibility_pct": round(bionemo.get("overall_plausibility", 0) * 100, 1),
            "druggability_score_pct": round(bionemo.get("druggability_score", 0) * 100, 1),
            "pathway_proximity_pct": round(bionemo.get("pathway_proximity", 0) * 100, 1),
            "cross_reactivity_risk": bionemo.get("cross_reactivity_risk", ""),
        },
        "agent_findings": {
            name: data.get("findings", [])[:3]
            for name, data in agents.items()
        },
    }

    system_prompt = (
        "You are a pharma commercial-development diligence analyst. "
        "Be precise, hedged, and evidence-grounded. "
        "Do NOT invent data — only use the numbers and findings provided. "
        "Make no go/no-go calls."
    )
    user_prompt = (
        "Based on this structured ADC diligence data, write three narrative sections. "
        "Return ONLY valid JSON with exactly these three string keys:\n"
        "- executive_narrative: one concise paragraph summarising the opportunity and key uncertainties\n"
        "- what_would_need_to_be_true: markdown bullet list (3-5 bullets, each starting with '- ') "
        "of the conditions that would need to hold for this opportunity to succeed\n"
        "- strategy_synthesis: markdown bullet list (3-5 bullets, each starting with '- ') "
        "of strategic recommendations grounded in the data\n\n"
        f"Data:\n{json.dumps(context, indent=2)}"
    )

    raw = _nvidia_client.nemotron_complete(system_prompt, user_prompt, max_tokens=900)
    if not raw:
        return None
    try:
        text = raw.strip()
        # Strip markdown code fences if the model wrapped the JSON
        if text.startswith("```"):
            parts = text.split("```")
            text = parts[1] if len(parts) > 1 else text
            if text.startswith("json"):
                text = text[4:]
        parsed = json.loads(text.strip())
        required = ("executive_narrative", "what_would_need_to_be_true", "strategy_synthesis")
        if all(k in parsed for k in required):
            return parsed
        return None
    except (json.JSONDecodeError, KeyError, IndexError):
        return None


def generate_memo(
    candidate: dict,
    assumptions: dict,
    scores: dict,
    simulation: dict,
    hmm: dict,
    bionemo: dict,
    agents: dict,
    signal_intelligence: Optional[dict] = None,
) -> str:
    today = date.today().strftime("%B %d, %Y")
    cid = candidate["id"]
    name = candidate["full_name"]

    # Attempt Nemotron narrative generation — falls back to template strings if None.
    nem = _nemotron_sections(candidate, scores, simulation, hmm, bionemo, agents)

    readiness  = scores.get("readiness", 0)
    comm_alpha = scores.get("commercial_alpha", 0)
    ev_quality = scores.get("evidence_quality", 0)
    fail_sim   = scores.get("failure_similarity", 0)
    priority   = scores.get("diligence_priority", 0)

    flags = candidate.get("failure_flags", [])
    flag_lines = "\n".join(
        f"- **{f['flag']}** ({f['severity'].upper()}): {f['detail']}"
        for f in flags
    )

    actions = candidate.get("recommended_next_actions", [])
    action_lines = "\n".join(f"{i+1}. {a}" for i, a in enumerate(actions))

    bio_summary = bionemo.get("summary", "")
    plausibility_pct = round(bionemo.get("overall_plausibility", 0) * 100, 1)
    druggability_pct = round(bionemo.get("druggability_score", 0) * 100, 1)
    pathway_pct = round(bionemo.get("pathway_proximity", 0) * 100, 1)

    hmm_state = hmm.get("current_state", "Unknown")
    hmm_next  = hmm.get("next_state", "Unknown")
    hmm_explain = hmm.get("explanation", "")

    p50 = simulation.get("p50", 0)
    p10 = simulation.get("p10", 0)
    p90 = simulation.get("p90", 0)
    p_thresh = simulation.get("p_threshold", 0)

    lit_findings = agents.get("Literature Agent", {}).get("findings", [])[:3]
    lit_lines = "\n".join(f"- {f}" for f in lit_findings)

    trial_findings = agents.get("Trial Agent", {}).get("findings", [])[:3]
    trial_lines = "\n".join(f"- {f}" for f in trial_findings)

    reg_findings = agents.get("Regulatory Agent", {}).get("findings", [])[:2]
    reg_lines = "\n".join(f"- {f}" for f in reg_findings)

    commercial_findings = agents.get("Commercial Agent", {}).get("findings", [])[:3]
    commercial_lines = "\n".join(f"- {f}" for f in commercial_findings)

    what_true = (
        nem["what_would_need_to_be_true"]
        if nem
        else candidate.get("what_would_need_to_be_true", "See candidate profile.")
    )
    main_risk = candidate.get("main_risk", "See candidate profile.")

    strategy_lines = (
        nem["strategy_synthesis"]
        if nem
        else "\n".join(f"- {f}" for f in agents.get("Strategy Agent", {}).get("findings", []))
    )

    # Executive narrative paragraph — only present when Nemotron succeeded.
    executive_narrative_block = f"\n\n{nem['executive_narrative']}" if nem else ""

    # BioNeMo section label — show real accession when ESM-2 was actually called.
    is_real = bionemo.get("_real_esm2", False)
    accession = bionemo.get("_accession", "")
    bionemo_label = (
        f"*Live BioNeMo (ESM-2) — {accession}*"
        if is_real
        else "*Mocked for demo — API-ready for live BioNeMo integration.*"
    )

    changed_lines = _format_assumption_changes(assumptions)
    signal_intelligence = signal_intelligence or {}
    signal_lines = _format_signal_intelligence(signal_intelligence)

    memo = f"""# PHASEZERO ADC DILIGENCE MEMO
**Generated:** {today}
**Candidate:** {name}
**Status:** {candidate.get('diligence_status', 'In Review')}
**Indication:** {candidate.get('indication', '')}
**Target:** {candidate.get('target', '')}

---

## 1. Opportunity Summary

**Patient Subgroup:** {candidate.get('patient_subgroup', '')}

**ADC Design Thesis:** {candidate.get('adc_design_thesis', '')}

**Why Now:** {candidate.get('why_now', '')}

---

## 2. Executive Summary

| Score | Value |
|-------|-------|
| ADC Opportunity Readiness | {readiness:.1f} / 100 |
| Commercial Alpha | {comm_alpha:.1f} / 100 |
| Evidence Quality | {ev_quality:.1f} / 100 |
| Failure Similarity | {fail_sim:.1f} / 100 |
| **Diligence Priority** | **{priority:.1f} / 100** |

**Main Risk:** {main_risk}

**Overall Assessment:** {candidate.get('diligence_status', 'In Review')}{executive_narrative_block}

---

## 3. Agentic Evidence Summary

### Literature Signals
{lit_lines}

### Trial Landscape
{trial_lines}

### Regulatory Signals
{reg_lines}

### Commercial Signals
{commercial_lines}

---

## 4. Expert Assumptions Used

The following assumptions were active at memo generation time (non-default values noted):

{changed_lines}

---

## 5. Quant Model Inference

- **Readiness Score ({readiness:.1f}):** Reflects target selectivity, therapeutic index, biomarker strategy, clinical differentiation, commercial whitespace, and regulatory path clarity.
- **Commercial Alpha ({comm_alpha:.1f}):** Stress-tested for competitive saturation, market access, and clinical differentiation assumptions.
- **Evidence Quality ({ev_quality:.1f}):** Coverage across literature, trial, regulatory, and BioNeMo signals.
- **Failure Similarity ({fail_sim:.1f}):** Cross-referenced against 23 prior ADC failure archetypes.

---

## 6. Monte Carlo Stress Test

*This is not a prediction of approval. It is a stress test of the opportunity thesis under uncertainty.*

- **Base Case (P50):** {p50:.1f}
- **Downside (P10):** {p10:.1f}
- **Upside (P90):** {p90:.1f}
- **% above diligence threshold (60):** {p_thresh:.1f}%

Key uncertainty drivers: clinical differentiation variance, competitor entry timing, biomarker assay success rate.

---

## 7. HMM Development-State Readout

- **Current Most Probable State:** {hmm_state}
- **Likely Next State:** {hmm_next}

{hmm_explain}

---

## 8. BioNeMo Plausibility

{bionemo_label}

- **Overall Plausibility:** {plausibility_pct}%
- **Pathway Proximity:** {pathway_pct}%
- **Druggability Score:** {druggability_pct}%
- **Cross-Reactivity Risk:** {bionemo.get('cross_reactivity_risk', 'N/A')}
- **Payload Compatibility:** {bionemo.get('payload_compatibility', 'N/A')}

**Summary:** {bio_summary}

---

## 9. Failure Pattern Flags

{flag_lines}

---

## 10. Signal Intelligence Readout

{signal_lines}

---

## 11. Missing Data Map

Key evidence gaps that increase model uncertainty:

{_missing_data(cid)}

---

## 12. What Would Need To Be True

{what_true}

---

## 13. Recommended Next Diligence Actions

{action_lines}

---

## 14. Strategy Synthesis

{strategy_lines}

---

*PhaseZero does not generate go/no-go decisions. This memo is a structured diligence input for human expert review.*
*All data is demo/mock. Not for investment decisions.*
"""
    return memo


def _format_signal_intelligence(signal: dict) -> str:
    if not signal:
        return "- Signal intelligence layer not available for this candidate."

    momentum = signal.get("momentum", {})
    alpha = "\n".join(f"- {item}" for item in signal.get("alpha_supporting", [])[:3]) or "- No dominant alpha-supporting signal."
    warnings = "\n".join(f"- {item}" for item in signal.get("warning_signals", [])[:3]) or "- No dominant warning signal."
    questions = "\n".join(f"- {item}" for item in signal.get("diligence_questions", [])[:4]) or "- No additional diligence question."

    return f"""**Signal Regime:** {signal.get('signal_regime', 'Needs Diligence')}

| Signal | Velocity | Acceleration | Direction |
|--------|----------|--------------|-----------|
| Publication | {momentum.get('publication', {}).get('velocity', 0):.1f} | {momentum.get('publication', {}).get('acceleration', 0):.1f} | {momentum.get('publication', {}).get('direction', 'flat')} |
| Trial | {momentum.get('trial', {}).get('velocity', 0):.1f} | {momentum.get('trial', {}).get('acceleration', 0):.1f} | {momentum.get('trial', {}).get('direction', 'flat')} |
| Regulatory | {momentum.get('regulatory', {}).get('velocity', 0):.1f} | {momentum.get('regulatory', {}).get('acceleration', 0):.1f} | {momentum.get('regulatory', {}).get('direction', 'flat')} |
| Patent / Conference | {momentum.get('patent_conference', {}).get('velocity', 0):.1f} | {momentum.get('patent_conference', {}).get('acceleration', 0):.1f} | {momentum.get('patent_conference', {}).get('direction', 'flat')} |

- **Evidence Agreement:** {signal.get('evidence_agreement', 0):.1f}%
- **Contradiction Burden:** {signal.get('contradiction_burden', 0):.1f}%
- **Missing Data Burden:** {signal.get('missing_data_burden', 0):.1f}%
- **Most Disputed Claim:** {signal.get('most_disputed_claim', 'N/A')}

**Signals supporting alpha**
{alpha}

**Signals warning against pursuit**
{warnings}

**Next diligence questions**
{questions}"""


def _format_assumption_changes(assumptions: dict) -> str:
    non_default = {k: v for k, v in assumptions.items() if abs(v - 50) > 5}
    if not non_default:
        return "- All assumptions at default (50/100). No expert adjustments active."
    lines = []
    for k, v in non_default.items():
        direction = "above" if v > 50 else "below"
        label = k.replace("_", " ").title()
        lines.append(f"- **{label}:** {v}/100 ({direction} default)")
    return "\n".join(lines)


def _missing_data(candidate_id: str) -> str:
    gaps = {
        "b7h4_tnbc": """- B7-H4 IHC companion diagnostic assay (analytical validation not published)
- Prospective biomarker cutoff study in TNBC population
- Phase I clinical safety signal (B7-H4 ADC programs early stage)
- B7-H4-high subgroup clinical benefit data vs sacituzumab govitecan
- Normal tissue B7-H4 expression systematic assessment (kidney/uterus dose-limiting?)""",
        "tf_cervical": """- Next-generation TF ADC preclinical data vs tisotumab vedotin (TI comparison)
- Post-TV biopsy TF expression data (does expression change post-TV treatment?)
- 2030+ cervical cancer treatment algorithm (post-TV + pembro combination era)
- Payload class clinical comparison (MMAE vs topoisomerase-I in TF context)
- Definitive commercial sizing: TV market share at next-gen NDA timing""",
        "nectin4_expansion": """- EV basket trial full interim data (NSCLC, TNBC, gastric cohorts)
- Prospective Nectin-4 IHC cutoff validation in non-urothelial tumor types
- Competitor filing timeline map (who is furthest in which tumor types?)
- Non-urothelial tumor internalization kinetics data (is it equivalent to urothelial?)
- Biomarker-high vs biomarker-low clinical benefit analysis from expansion cohorts""",
    }
    return gaps.get(candidate_id, "- Evidence gap analysis not available for this candidate.")

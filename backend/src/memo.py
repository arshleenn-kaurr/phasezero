"""
Diligence memo generator — produces a structured markdown diligence memo.
"""

from datetime import date


def generate_memo(
    candidate: dict,
    assumptions: dict,
    scores: dict,
    simulation: dict,
    hmm: dict,
    bionemo: dict,
    agents: dict,
) -> str:
    today = date.today().strftime("%B %d, %Y")
    cid = candidate["id"]
    name = candidate["full_name"]

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

    strategy_findings = agents.get("Strategy Agent", {}).get("findings", [])
    strategy_lines = "\n".join(f"- {f}" for f in strategy_findings)

    lit_findings = agents.get("Literature Agent", {}).get("findings", [])[:3]
    lit_lines = "\n".join(f"- {f}" for f in lit_findings)

    trial_findings = agents.get("Trial Agent", {}).get("findings", [])[:3]
    trial_lines = "\n".join(f"- {f}" for f in trial_findings)

    reg_findings = agents.get("Regulatory Agent", {}).get("findings", [])[:2]
    reg_lines = "\n".join(f"- {f}" for f in reg_findings)

    commercial_findings = agents.get("Commercial Agent", {}).get("findings", [])[:3]
    commercial_lines = "\n".join(f"- {f}" for f in commercial_findings)

    what_true = candidate.get("what_would_need_to_be_true", "See candidate profile.")
    main_risk = candidate.get("main_risk", "See candidate profile.")

    changed_lines = _format_assumption_changes(assumptions)

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

**Overall Assessment:** {candidate.get('diligence_status', 'In Review')}

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

*Mocked for demo — API-ready for live BioNeMo integration.*

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

## 10. Missing Data Map

Key evidence gaps that increase model uncertainty:

{_missing_data(cid)}

---

## 11. What Would Need To Be True

{what_true}

---

## 12. Recommended Next Diligence Actions

{action_lines}

---

## 13. Strategy Synthesis

{strategy_lines}

---

*PhaseZero does not generate go/no-go decisions. This memo is a structured diligence input for human expert review.*
*All data is demo/mock. Not for investment decisions.*
"""
    return memo


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

"""
Cached SEER-style US incidence lookup for the Commercial Agent.

This is a curated stand-in for a live epidemiology API. Figures are
approximate annual US incidence and target-positive addressable subgroup
estimates used for commercial sizing in the diligence pipeline.

TODO(team): replace with the NCI Cancer Statistics API (api.cancer.gov) keyed
by SEER site recode once an API key is provisioned.

Keys are matched case-insensitively against candidate["indication"]; see
lookup_incidence() for the matching logic (exact key, then substring).
"""

from typing import Optional

SEER_INCIDENCE: dict[str, dict] = {
    "triple-negative breast cancer (tnbc)": {
        "annual_us_incidence": 45000,
        "subgroup_estimate": "13,500–18,000 biomarker-high patients (~30–40% of TNBC)",
        "commercial_note": (
            "Sacituzumab govitecan 2L+ TNBC sets the pricing floor and payer "
            "reference point; biomarker-defined label needed for premium access."
        ),
    },
    "recurrent / metastatic cervical cancer": {
        "annual_us_incidence": 13000,
        "subgroup_estimate": "~13,000 eligible patients/year at target treatment line",
        "commercial_note": (
            "Tivdak (tisotumab vedotin) validates the opportunity size; high "
            "unmet need post-platinum + pembrolizumab supports premium ADC pricing."
        ),
    },
    "non-urothelial solid tumors": {
        "annual_us_incidence": 54000,
        "subgroup_estimate": (
            "Nectin-4+ addressable ~30,000 NSCLC + ~14,000 TNBC + ~10,000 gastric/year"
        ),
        "commercial_note": (
            "Enfortumab vedotin urothelial revenue anchors TAM; expansion alpha "
            "is partly priced in given consensus pursuit of the same strategy."
        ),
    },
    # --- Additional common ADC indications for forward compatibility ---
    "breast cancer": {
        "annual_us_incidence": 300000,
        "subgroup_estimate": "Subtype- and biomarker-dependent addressable population",
        "commercial_note": "Large, well-served market; differentiation is essential.",
    },
    "non-small cell lung cancer": {
        "annual_us_incidence": 200000,
        "subgroup_estimate": "Biomarker-defined subgroups vary widely by target",
        "commercial_note": "Largest oncology TAM; crowded with ADC and IO entrants.",
    },
    "gastric cancer": {
        "annual_us_incidence": 26000,
        "subgroup_estimate": "Target-positive subgroup typically 20–30% by IHC",
        "commercial_note": "Smaller US market; global incidence skews much higher.",
    },
    "urothelial cancer": {
        "annual_us_incidence": 83000,
        "subgroup_estimate": "Nectin-4 broadly expressed; high addressable fraction",
        "commercial_note": "Enfortumab vedotin franchise sets the competitive bar.",
    },
    "ovarian cancer": {
        "annual_us_incidence": 20000,
        "subgroup_estimate": "FRα-high subgroup ~35–40% (mirvetuximab precedent)",
        "commercial_note": "Biomarker-selected ADC approvals establish the path.",
    },
}


def lookup_incidence(indication: str) -> Optional[dict]:
    """Return the incidence record for an indication, or None.

    Matches exact (case-insensitive) first, then falls back to substring
    matching in either direction so minor label variations still resolve.
    """
    if not indication:
        return None
    key = indication.strip().lower()
    if key in SEER_INCIDENCE:
        return SEER_INCIDENCE[key]
    for table_key, record in SEER_INCIDENCE.items():
        if table_key in key or key in table_key:
            return record
    return None

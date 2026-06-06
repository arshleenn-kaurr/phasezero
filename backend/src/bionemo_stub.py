"""
BioNeMo plausibility stub — deterministic mock of NVIDIA BioNeMo biological validation.
API-ready: replace _stub_outputs with real BioNeMo API calls when credentials are available.
"""

from src.utils import blend, clamp

_ALPHAFOLD_URLS = {
    "b7h4_tnbc":          "https://alphafold.ebi.ac.uk/files/AF-Q7Z7D3-F1-model_v6.pdb",
    "tf_cervical":        "https://alphafold.ebi.ac.uk/files/AF-P13726-F1-model_v6.pdb",
    "nectin4_expansion":  "https://alphafold.ebi.ac.uk/files/AF-Q96NY8-F1-model_v6.pdb",
}

_STUB_DATA = {
    "b7h4_tnbc": {
        "pathway_proximity":         0.71,
        "target_representation":     "Available — B7-H4 protein structure deposited (PDB 7T0V); scRNA expression atlas coverage moderate",
        "structure_availability":    "Partial — antibody-antigen complex modeled; payload binding site unresolved",
        "druggability_score":        0.68,
        "cross_reactivity_risk":     "Low-Moderate — B7-H4 normal tissue restricted to uterus/kidney epithelium; monitor renal signal",
        "internalization_efficiency":0.72,
        "payload_compatibility":     "Compatible — MMAE and topoisomerase-I payloads both mechanistically plausible",
        "genomic_context":           "B7-H4 / VTCN1 located at 1p13.1; copy number gain in ~15% TNBC; no frequent activating mutations",
        "overall_plausibility":      0.70,
        "summary": (
            "B7-H4 is a biologically plausible ADC target in TNBC. Expression data supports tumor selectivity, "
            "and internalization has been confirmed in preclinical models. The primary biological uncertainty "
            "is normal tissue expression on uterine/renal epithelium, which may limit the therapeutic index "
            "depending on payload choice. Payload selection and DAR optimization are the key biological levers."
        ),
        "future_integrations": [
            "Protein language model embedding for B7-H4 cross-reactivity panel",
            "AlphaFold2 antibody-antigen docking for ADC linker attachment site optimization",
            "Virtual screening of MMAE vs topoisomerase-I payload ADC designs",
            "scRNA-seq tumor microenvironment modeling for TNBC B7-H4 expression heterogeneity",
        ],
    },
    "tf_cervical": {
        "pathway_proximity":         0.87,
        "target_representation":     "Strong — Tissue Factor structure fully resolved (PDB 2HFT); expression atlas comprehensive; TV pharmacology characterized",
        "structure_availability":    "Strong — Full ADC-TF complex modeled from TV crystal structure; MMAE binding site characterized",
        "druggability_score":        0.85,
        "cross_reactivity_risk":     "Moderate — TF expression on normal vascular endothelium is the established mechanism of TV ocular/bleeding toxicity; next-gen must address",
        "internalization_efficiency":0.88,
        "payload_compatibility":     "Validated — MMAE payload confirmed via TV clinical data; topoisomerase-I payload mechanistically plausible with potentially improved TI",
        "genomic_context":           "F3 (TF) at 1p21.3; constitutive expression in cervical cancer; not a driver mutation — expression-based target",
        "overall_plausibility":      0.85,
        "summary": (
            "Tissue Factor ADC in cervical cancer has the highest biological plausibility of the three candidates. "
            "TV (Tivdak) approval provides full mechanistic validation of the TF ADC concept. The biological "
            "challenge is the normal vascular endothelium TF expression that drives TV's ocular/bleeding toxicity. "
            "Next-gen opportunity lies in payload/linker modifications that reduce vascular endothelium payload "
            "exposure while maintaining tumor cell killing. BioNeMo pathway proximity confirms TF is central to "
            "cervical cancer biology, not a passenger target."
        ),
        "future_integrations": [
            "Protein-ligand interaction modeling: MMAE vs topoisomerase-I payload TF-ADC binding comparison",
            "Vascular endothelium vs tumor cell TF internalization rate modeling using transcriptomic data",
            "Molecule generation for TF-targeting antibody fragments with reduced vascular binding",
            "Genomic foundation model analysis of TF pathway in post-treatment cervical cancer biopsies",
        ],
    },
    "nectin4_expansion": {
        "pathway_proximity":         0.79,
        "target_representation":     "Good — Nectin-4 structure resolved; EV pharmacology characterized in urothelial context; cross-tumor expression data available but variable",
        "structure_availability":    "Good — EV antibody-antigen complex modeled; MMAE payload binding characterized",
        "druggability_score":        0.77,
        "cross_reactivity_risk":     "Low-Moderate — Nectin-4 normal tissue expression in skin/GI tract; EV dermatitis/GI signals are known; peripheral neuropathy from MMAE",
        "internalization_efficiency":0.75,
        "payload_compatibility":     "Validated in urothelial — MMAE payload confirmed by EV approval; cross-tumor internalization efficiency uncertain and context-dependent",
        "genomic_context":           "PVRL4 at 1q23.3; amplification in ~10% breast cancer; expression driven by lineage programs across tumor types",
        "overall_plausibility":      0.77,
        "summary": (
            "Nectin-4 ADC expansion into non-urothelial solid tumors is biologically plausible, anchored by EV's "
            "strong urothelial validation. The key biological uncertainty is whether Nectin-4 internalization "
            "kinetics and tumor microenvironment context in NSCLC/TNBC/gastric are equivalent to urothelial cancer. "
            "Early expansion data suggesting lower ORR (~18% in NSCLC vs 44% in urothelial) may reflect this "
            "context dependence. BioNeMo analysis supports expression-based patient selection as the primary "
            "biological lever to improve signal in non-urothelial tumors."
        ),
        "future_integrations": [
            "scRNA-seq analysis of Nectin-4 expression heterogeneity across NSCLC, TNBC, and gastric TME",
            "Internalization rate modeling: urothelial vs non-urothelial Nectin-4 endosomal trafficking",
            "Protein language model: Nectin-4 epitope conservation and antibody cross-reactivity panel",
            "Virtual screening: alternative payloads for improved activity in non-urothelial context",
        ],
    },
}


def run_bionemo_plausibility(candidate_id: str, base_scores: dict, assumptions: dict) -> dict:
    data = dict(_STUB_DATA.get(candidate_id, _STUB_DATA["tf_cervical"]))
    data["pdb_url"] = _ALPHAFOLD_URLS.get(candidate_id, _ALPHAFOLD_URLS["tf_cervical"])

    ts_adj = assumptions.get("target_selectivity", 50) / 100.0
    bc_adj = assumptions.get("biomarker_confidence", 50) / 100.0
    ic_adj = assumptions.get("internalization_confidence", 50) / 100.0

    original_plausibility = data["overall_plausibility"]
    adjusted_plausibility = clamp(
        original_plausibility * 100 * 0.70 +
        ts_adj * 10 +
        bc_adj * 10 +
        ic_adj * 10
    ) / 100.0

    data["overall_plausibility"] = round(adjusted_plausibility, 3)
    data["pathway_proximity"] = round(
        clamp(data["pathway_proximity"] * 100 + (ts_adj - 0.5) * 5) / 100, 3
    )
    return data

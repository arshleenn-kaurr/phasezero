"""
Agentic parsing layer — deterministic mock agents.
Each agent returns: status, input_sources, findings, confidence, flags, latency_ms.
"""

import time

from src.schemas import AgentOutput

_AGENT_DATA = {
    "b7h4_tnbc": {
        "Literature Agent": {
            "status": "complete",
            "input_sources": ["PubMed (847 papers)", "Human Protein Atlas", "TCGA BRCA dataset", "BioRxiv preprints"],
            "findings": [
                "B7-H4 protein expression confirmed in 30–45% TNBC tumor samples by IHC (PMID:32918890)",
                "mRNA overexpression correlated with basal-like subtype in TCGA dataset (n=1,084)",
                "Normal tissue expression restricted: uterus and kidney epithelium only (HPA)",
                "Internalization confirmed upon antibody binding in 3 TNBC cell lines (in vitro)",
                "No validated IHC companion diagnostic or prospective biomarker cutoff published",
            ],
            "confidence": 68,
            "flags": ["No validated CDx assay", "Limited clinical-grade expression data"],
            "latency_ms": 1240,
        },
        "Trial Agent": {
            "status": "complete",
            "input_sources": ["ClinicalTrials.gov", "WHO ICTRP", "ASCO/ESMO abstracts 2022–2024"],
            "findings": [
                "AZD9401 (AZ/FirstBio) Phase I dose escalation ongoing — TNBC cohort active (NCT05489419)",
                "SGN-B7H4V (Seagen/Pfizer) Phase I in B7-H4+ tumors including TNBC (NCT05103462)",
                "2 additional B7-H4 ADC programs advancing toward IND (conference abstracts 2023)",
                "Sacituzumab govitecan approved TNBC 2L+ — sets clinical efficacy bar (ORR 35%)",
                "TDXd DESTINY-Breast04/06 approved HER2-low/ultralow BC — narrows unselected TNBC population",
            ],
            "confidence": 74,
            "flags": ["High competitive saturation", "Clinical bar elevated by SG and TDXd approvals"],
            "latency_ms": 890,
        },
        "Regulatory Agent": {
            "status": "complete",
            "input_sources": ["FDA drug labels", "FDA oncology guidance documents", "EMA EPAR database"],
            "findings": [
                "TNBC accelerated approval via ORR endpoint is established precedent (SG, olaparib, pembrolizumab)",
                "Biomarker-defined subgroup adds companion diagnostic requirement (18–24 month CDx development)",
                "No B7-H4 IHC assay cleared by FDA; assay development on critical path",
                "TNBC FDA oncology division has well-established regulatory relationship",
            ],
            "confidence": 62,
            "flags": ["CDx development adds timeline and complexity", "No regulatory precedent for B7-H4 as biomarker"],
            "latency_ms": 720,
        },
        "Commercial Agent": {
            "status": "complete",
            "input_sources": ["SEER database", "Company earnings reports", "Market access analyses", "Payer coverage data"],
            "findings": [
                "TNBC US incidence ~45,000/year; B7-H4+ subgroup est. 13,500–18,000 patients",
                "SG 2L+ TNBC US revenue ~$800M (2023) — sets pricing floor and payer reference point",
                "Competitive saturation: 2 approved ADCs + 4 B7-H4 programs + multiple other TNBC ADC entrants",
                "Payer differentiation requires biomarker-defined label for premium access",
                "Commercial window estimated 2030–2035 if Phase II started 2025",
            ],
            "confidence": 65,
            "flags": ["High competitive saturation (score 78/100)", "Biomarker label required for pricing power"],
            "latency_ms": 1080,
        },
        "ADC Design Agent": {
            "status": "complete",
            "input_sources": ["ADC design literature", "Payload pharmacology database", "Internalization kinetics data"],
            "findings": [
                "MMAE payload: proven in breast cancer ADCs (SG uses SN-38); DAR 4 likely optimal",
                "Topoisomerase-I payload (DXd-class): potentially differentiated profile for TNBC",
                "B7-H4 internalization kinetics: moderate (T1/2 ~4–6 hours) — DAR optimization critical",
                "Bystander effect important for heterogeneous B7-H4 expression in TNBC tumors",
                "Key design risk: normal tissue TF expression may narrow therapeutic window below that of SG",
            ],
            "confidence": 60,
            "flags": ["Therapeutic window optimization needed", "Bystander effect design trade-off"],
            "latency_ms": 640,
        },
        "Failure Memory Agent": {
            "status": "complete",
            "input_sources": ["Prior ADC failure database (23 archetypes)", "TNBC clinical failure analysis"],
            "findings": [
                "FAILURE PATTERN: 2 prior TNBC ADC broad-trial failures linked to weak biomarker enrichment strategy",
                "FAILURE PATTERN: 3 prior ADC programs with similar target expression profile showed weak clinical delta vs SG",
                "Crowded-market failure archetype: 6 of 8 late entrants in established ADC market achieved <30% of leader revenue",
                "Success-similarity to SG TNBC trial: moderate (expression-selected trial design improved outcome)",
            ],
            "confidence": 72,
            "flags": [
                "Weak clinical delta risk — HIGH",
                "Crowded market risk — HIGH",
                "Broad trial / weak enrichment risk — MEDIUM",
            ],
            "latency_ms": 950,
        },
        "BioNeMo Agent": {
            "status": "complete",
            "input_sources": ["BioNeMo pathway models (mock)", "Protein structure DB", "scRNA-seq atlas"],
            "findings": [
                "B7-H4 pathway proximity score: 0.71 — moderate plausibility",
                "Target representation in structure databases: partial (antibody-antigen complex modeled)",
                "Druggability score: 0.68 — accessible surface epitope confirmed",
                "Cross-reactivity risk: low-moderate (uterus/kidney epithelium signal)",
            ],
            "confidence": 70,
            "flags": ["No clinical-grade structure data", "Normal tissue cross-reactivity requires monitoring"],
            "latency_ms": 1340,
        },
        "Strategy Agent": {
            "status": "complete",
            "input_sources": ["All agent outputs", "Commercial model", "Portfolio strategy inputs"],
            "findings": [
                "Diligence Priority: LOWER — biomarker differentiation is prerequisite for investment thesis",
                "Core thesis: B7-H4 ADC in TNBC is commercially tempting but crowded. Credible only with validated biomarker and clear clinical delta vs SG.",
                "Key missing data: B7-H4 IHC CDx assay, Phase I safety signal, biomarker-high subgroup size",
                "Recommended next diligence: CDx assay development, SG-excluded population mapping, ADC design workshop",
            ],
            "confidence": 65,
            "flags": ["Conditional investment thesis", "Biomarker strategy is prerequisite"],
            "latency_ms": 1120,
        },
    },
    "tf_cervical": {
        "Literature Agent": {
            "status": "complete",
            "input_sources": ["PubMed (634 papers)", "TV clinical trial publications", "Human Protein Atlas", "Cervical cancer genomics"],
            "findings": [
                "TF expression confirmed in 70–80% cervical cancer tumors by IHC — high expression, low cutoff needed",
                "TV (Tivdak) validation: mechanistic confirmation that TF ADC kills cervical cancer cells in vivo",
                "TF surface expression retained in recurrent/platinum-resistant disease (biopsy study n=42)",
                "TF internalization kinetics well-characterized; MMAE payload fully mechanistically validated",
                "Normal tissue TF on vascular endothelium confirmed as mechanism of ocular/bleeding toxicity",
            ],
            "confidence": 82,
            "flags": ["Normal tissue vascular TF expression — therapeutic index constraint"],
            "latency_ms": 980,
        },
        "Trial Agent": {
            "status": "complete",
            "input_sources": ["ClinicalTrials.gov", "ESMO/ASCO publications", "FDA approval records"],
            "findings": [
                "InnovaTV 204: TV ORR 24%, mDOR 8.3 months in 3L+ cervical cancer (JCO 2022)",
                "InnovaTV 301: TV vs chemotherapy OS confirmed (mOS 11.5 vs 9.5 months, ESMO 2023)",
                "FDA approval September 2021 — full regulatory de-risking of TF ADC in cervical cancer",
                "InnovaTV 205: TV+pembrolizumab Phase III in 1L cervical ongoing (NCT03786081)",
                "2 next-generation TF ADC programs (non-MMAE payloads) in IND/Phase I stage",
            ],
            "confidence": 88,
            "flags": ["TV lifecycle management competitive risk"],
            "latency_ms": 760,
        },
        "Regulatory Agent": {
            "status": "complete",
            "input_sources": ["FDA cervical cancer drug labels", "Accelerated approval guidance", "FDA oncology publications"],
            "findings": [
                "Accelerated approval via ORR endpoint fully established in cervical cancer via TV",
                "Confirmatory OS trial feasible and executed (InnovaTV 301) — regulatory path fully validated",
                "No CDx required for TF — expression broadly high across cervical cancer",
                "Differentiated safety profile vs TV (reduced ocular/bleeding) likely accepted as label differentiation",
                "FDA cervical cancer oncology division relationship well-established via TV program",
            ],
            "confidence": 85,
            "flags": ["Confirmatory trial requirement (3–4 years)", "Must show differentiation from TV"],
            "latency_ms": 620,
        },
        "Commercial Agent": {
            "status": "complete",
            "input_sources": ["SEER cervical cancer data", "TV revenue reports", "Treatment algorithm analysis"],
            "findings": [
                "Recurrent/metastatic cervical cancer: ~13,000 eligible US patients/year at target treatment line",
                "TV US revenue ~$400M (2023) and growing rapidly — validates commercial opportunity size",
                "High unmet need: limited options post-platinum + pembrolizumab; no strong 3L+ standard of care",
                "Improved safety profile (reduced ocular/bleeding) is commercially valuable — significant toxicity management burden with TV",
                "Commercial model works at 13k addressable patients with premium ADC pricing",
            ],
            "confidence": 80,
            "flags": ["Smaller indication than TNBC/NSCLC", "TV lifecycle management competitive pressure"],
            "latency_ms": 920,
        },
        "ADC Design Agent": {
            "status": "complete",
            "input_sources": ["TV pharmacology data", "Alternative payload literature", "ADC design reviews"],
            "findings": [
                "MMAE payload: fully validated via TV; basis for next-gen design comparison",
                "Topoisomerase-I (DXd-class) payload: mechanistically plausible, potentially reduced vascular endothelium bystander toxicity",
                "Key design opportunity: linker modifications to reduce ocular/bleeding toxicity while maintaining tumor cell killing",
                "DAR 4 (TV) is likely optimal; next-gen should demonstrate TI improvement in preclinical models",
                "Bispecific or masked ADC approaches could reduce normal tissue payload exposure",
            ],
            "confidence": 78,
            "flags": ["Must demonstrate measurable TI improvement vs TV in preclinical models"],
            "latency_ms": 580,
        },
        "Failure Memory Agent": {
            "status": "complete",
            "input_sources": ["Prior ADC failure database", "TF target precedent", "Lifecycle management competition data"],
            "findings": [
                "SUCCESS PATTERN: TV approval validates target, mechanism, and clinical path — failure similarity is LOW",
                "Risk: lifecycle management competition from TV franchise (Seagen/Pfizer) — 6/8 next-gen ADCs in validated space faced lifecycle pressure",
                "Differentiation axis (TI improvement) is a proven commercial strategy in ADC field (TDXd vs T-DM1)",
                "Indication size risk: 13k patients is commercially viable but leaves limited margin for competition",
            ],
            "confidence": 82,
            "flags": [
                "Target liability risk — LOW (manageable)",
                "Crowded market risk — MEDIUM (TV franchise)",
            ],
            "latency_ms": 880,
        },
        "BioNeMo Agent": {
            "status": "complete",
            "input_sources": ["BioNeMo pathway models (mock)", "TF protein structure", "TV pharmacology models"],
            "findings": [
                "TF pathway proximity score: 0.87 — high plausibility; TF central to cervical cancer biology",
                "Full ADC-TF complex modeled from TV crystal structure (PDB 2HFT available)",
                "Druggability score: 0.85 — surface expression, strong internalization, payload compatibility confirmed",
                "Cross-reactivity: vascular endothelium TF expression is the key normal tissue signal — addressable with design",
            ],
            "confidence": 85,
            "flags": ["Vascular TF expression requires next-gen ADC design solution"],
            "latency_ms": 1100,
        },
        "Strategy Agent": {
            "status": "complete",
            "input_sources": ["All agent outputs", "Commercial model", "Portfolio strategy inputs"],
            "findings": [
                "Diligence Priority: HIGH — TV approval fully de-risks target. Next-gen TF ADC is a clear, bounded opportunity.",
                "Core thesis: TF ADC in cervical cancer combines validated biology, high unmet need, clear regulatory path, and measurable differentiation axis (TI vs TV).",
                "Key missing data: next-gen TF ADC preclinical TI comparison vs TV; post-TV patient biopsy TF expression",
                "Recommended next: payload/linker screen vs MMAE; TV deep-dive; commercial post-TV population sizing",
            ],
            "confidence": 83,
            "flags": ["Strong thesis — proceed to phase 2 diligence"],
            "latency_ms": 1050,
        },
    },
    "nectin4_expansion": {
        "Literature Agent": {
            "status": "complete",
            "input_sources": ["PubMed (712 papers)", "EV pharmacology publications", "Tumor expression atlases"],
            "findings": [
                "Nectin-4 expression: NSCLC 28%, TNBC 32%, gastric 25% by IHC 2+/3+ (multiple studies)",
                "EV (enfortumab vedotin) mechanism fully characterized: MMAE payload, high internalization in urothelial",
                "Cross-tumor expression confirmed but variable; IHC scoring normalization not standardized",
                "No prospective validation of Nectin-4 IHC as predictive biomarker outside urothelial context",
                "Expression levels in non-urothelial tumors are lower than urothelial (H-score difference ~40–60 points)",
            ],
            "confidence": 74,
            "flags": ["No validated cross-tumor biomarker cutoff", "Expression level lower than urothelial"],
            "latency_ms": 1050,
        },
        "Trial Agent": {
            "status": "complete",
            "input_sources": ["ClinicalTrials.gov", "ASCO 2024 abstracts", "Astellas/Pfizer pipeline"],
            "findings": [
                "EV approval in urothelial: ORR 44%, OS benefit confirmed in EV-301 (NEJM 2021)",
                "EV basket Phase II in Nectin-4+ solid tumors enrolling: NSCLC, TNBC, gastric cohorts (NCT04640477)",
                "NSCLC EV single-arm Phase II interim ORR ~18% — lower than urothelial (ASCO 2024)",
                "EV+pembro EV-302/KEYNOTE-869 approved 1L urothelial — combination bar set",
                "Multiple biosimilar/biobetter programs advancing toward urothelial; expansion race active",
            ],
            "confidence": 76,
            "flags": ["NSCLC ORR signal weaker than urothelial", "High consensus — first-mover advantage eroding"],
            "latency_ms": 840,
        },
        "Regulatory Agent": {
            "status": "complete",
            "input_sources": ["FDA basket trial guidance", "Tumor-agnostic approval precedents", "EV label"],
            "findings": [
                "Tumor-agnostic approval via basket trial is feasible but requires strong ORR + validated CDx (entrectinib/larotrectinib precedent)",
                "Indication-specific Phase III likely required for each tumor type given current signal strength",
                "Nectin-4 IHC CDx would need prospective validation — adds 18–24 months to timeline",
                "EV peripheral neuropathy and hyperglycemia safety monitoring requirements well-established",
            ],
            "confidence": 68,
            "flags": ["CDx validation required", "Per-tumor-type Phase III likely vs basket approval"],
            "latency_ms": 660,
        },
        "Commercial Agent": {
            "status": "complete",
            "input_sources": ["Epidemiology estimates", "EV revenue data", "Competitive landscape"],
            "findings": [
                "NSCLC Nectin-4+ addressable: ~30,000 US/year; TNBC ~14,000; gastric ~10,000",
                "EV US revenue ~$1.2B (2023) and growing — expansion would significantly increase TAM",
                "High consensus attention: multiple companies pursuing identical expansion strategy",
                "Alpha partially priced in: this is no longer a contrarian opportunity",
                "Window for Phase III design with competitive advantage: 2025–2028",
            ],
            "confidence": 70,
            "flags": ["High competitive saturation (score 68/100)", "Alpha reduction from consensus attention"],
            "latency_ms": 960,
        },
        "ADC Design Agent": {
            "status": "complete",
            "input_sources": ["EV pharmacology", "MMAE payload data", "Internalization studies"],
            "findings": [
                "EV ADC design (MMAE, DAR 4) fully validated in urothelial — use as reference scaffold",
                "Key uncertainty: whether MMAE payload internalization kinetics translate to non-urothelial TME",
                "Alternative payload consideration for non-urothelial: topoisomerase-I class may provide better bystander effect",
                "Dermatitis (skin Nectin-4 expression) and GI toxicity (GI Nectin-4 expression) safety monitoring required",
            ],
            "confidence": 71,
            "flags": ["Non-urothelial internalization kinetics uncertain", "Skin/GI toxicity monitoring requirement"],
            "latency_ms": 590,
        },
        "Failure Memory Agent": {
            "status": "complete",
            "input_sources": ["Prior ADC failure database", "Pan-tumor expansion history", "TNBC/NSCLC ADC failures"],
            "findings": [
                "FAILURE PATTERN: 4/6 prior pan-tumor ADC expansions without prospective biomarker cutoff validation showed enrichment failures",
                "FAILURE PATTERN: expression-guided expansions where non-primary tumor type ORR was <50% of primary — seen in 3 programs",
                "Success-similarity to urothelial EV: moderate — biology partially translates but context matters",
                "Enrichment biomarker validated prospectively is prerequisite for Phase III design",
            ],
            "confidence": 70,
            "flags": [
                "Broad trial / weak enrichment risk — MEDIUM",
                "Crowded market risk — MEDIUM",
                "Weak clinical delta risk — MEDIUM",
            ],
            "latency_ms": 910,
        },
        "BioNeMo Agent": {
            "status": "complete",
            "input_sources": ["BioNeMo pathway models (mock)", "Nectin-4 structure database", "scRNA-seq atlas"],
            "findings": [
                "Nectin-4 pathway proximity score: 0.79 — good plausibility; expression supported by lineage biology",
                "Structure availability: good — EV antibody-antigen complex modeled from urothelial context",
                "Druggability score: 0.77 — surface expression, internalization confirmed in urothelial; cross-tumor validation needed",
                "Cross-reactivity: skin (dermatitis) and GI tract expression are known safety signals from EV label",
            ],
            "confidence": 77,
            "flags": ["Cross-tumor internalization uncertainty", "Biomarker cutoff validation required"],
            "latency_ms": 1240,
        },
        "Strategy Agent": {
            "status": "complete",
            "input_sources": ["All agent outputs", "Commercial model", "Portfolio strategy inputs"],
            "findings": [
                "Diligence Priority: SELECTIVE — strong biology but reduced hidden alpha; subgroup-specific strategy required",
                "Core thesis: Nectin-4 expansion is a credible but consensus opportunity. Alpha depends on subgroup specificity and timing advantage.",
                "Key missing data: EV basket trial full interim data; prospective Nectin-4 IHC cutoff validation; per-tumor competitive filing status",
                "Recommended: wait for EV basket trial interim data before committing Phase III resources; map competitor filing timelines",
            ],
            "confidence": 72,
            "flags": ["Selective diligence — subgroup data gating decision"],
            "latency_ms": 1070,
        },
    },
}


def run_agent(candidate_id: str, agent_name: str) -> dict:
    data = _AGENT_DATA.get(candidate_id, {}).get(agent_name, {})
    payload = dict(data) if data else {
        "status": "complete",
        "input_sources": ["Mock data"],
        "findings": ["No specific data for this candidate-agent combination."],
        "confidence": 50,
        "flags": [],
        "latency_ms": 500,
    }
    return AgentOutput.model_validate(payload).model_dump()


def run_all_agents(candidate_id: str) -> dict:
    agent_names = [
        "Literature Agent", "Trial Agent", "Regulatory Agent", "Commercial Agent",
        "ADC Design Agent", "Failure Memory Agent", "BioNeMo Agent", "Strategy Agent",
    ]
    return {name: run_agent(candidate_id, name) for name in agent_names}

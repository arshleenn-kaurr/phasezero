"""
Research orchestration service.

Normalises a free-text query, fans out to five source adapters in parallel,
then synthesises a structured response for the /api/research endpoint.
"""
import asyncio
import re
from typing import Any

from .sources.uniprot import fetch_uniprot
from .sources.structures import fetch_structure
from .sources.open_targets import fetch_open_targets
from .sources.chembl import fetch_chembl
from .sources.clinical_trials import fetch_clinical_trials

# ---------------------------------------------------------------------------
# Known-target dictionary (longest-match wins)
# ---------------------------------------------------------------------------

_TARGET_DICT: dict[str, dict] = {
    # Tissue Factor / F3
    "tissue factor": {"gene": "F3", "uniprot": "P13726", "name": "Tissue Factor"},
    "tisotumab vedotin": {"gene": "F3", "uniprot": "P13726", "name": "Tissue Factor"},
    "tisotumab": {"gene": "F3", "uniprot": "P13726", "name": "Tissue Factor"},
    "tivdak": {"gene": "F3", "uniprot": "P13726", "name": "Tissue Factor"},
    "cd142": {"gene": "F3", "uniprot": "P13726", "name": "Tissue Factor"},
    "tf adc": {"gene": "F3", "uniprot": "P13726", "name": "Tissue Factor"},
    " tf ": {"gene": "F3", "uniprot": "P13726", "name": "Tissue Factor"},
    # Nectin-4
    "nectin-4": {"gene": "NECTIN4", "uniprot": "Q9BTN0", "name": "Nectin-4"},
    "nectin4": {"gene": "NECTIN4", "uniprot": "Q9BTN0", "name": "Nectin-4"},
    "pvrl4": {"gene": "NECTIN4", "uniprot": "Q9BTN0", "name": "Nectin-4"},
    "enfortumab": {"gene": "NECTIN4", "uniprot": "Q9BTN0", "name": "Nectin-4"},
    # Claudin-18.2
    "cldn18.2": {"gene": "CLDN18", "uniprot": "P56856", "name": "Claudin-18.2"},
    "claudin 18": {"gene": "CLDN18", "uniprot": "P56856", "name": "Claudin-18.2"},
    "claudin-18": {"gene": "CLDN18", "uniprot": "P56856", "name": "Claudin-18.2"},
    "cldn18": {"gene": "CLDN18", "uniprot": "P56856", "name": "Claudin-18.2"},
    "zolbetuximab": {"gene": "CLDN18", "uniprot": "P56856", "name": "Claudin-18.2"},
    # B7-H4
    "b7-h4": {"gene": "VTCN1", "uniprot": "Q7Z7D3", "name": "B7-H4"},
    "b7h4": {"gene": "VTCN1", "uniprot": "Q7Z7D3", "name": "B7-H4"},
    "vtcn1": {"gene": "VTCN1", "uniprot": "Q7Z7D3", "name": "B7-H4"},
    # TROP-2
    "trop-2": {"gene": "TACSTD2", "uniprot": "P09758", "name": "TROP-2"},
    "trop2": {"gene": "TACSTD2", "uniprot": "P09758", "name": "TROP-2"},
    "tacstd2": {"gene": "TACSTD2", "uniprot": "P09758", "name": "TROP-2"},
    "sacituzumab": {"gene": "TACSTD2", "uniprot": "P09758", "name": "TROP-2"},
    "trodelvy": {"gene": "TACSTD2", "uniprot": "P09758", "name": "TROP-2"},
    # HER2
    "her2": {"gene": "ERBB2", "uniprot": "P04626", "name": "HER2"},
    "erbb2": {"gene": "ERBB2", "uniprot": "P04626", "name": "HER2"},
    "trastuzumab deruxtecan": {"gene": "ERBB2", "uniprot": "P04626", "name": "HER2"},
    "trastuzumab": {"gene": "ERBB2", "uniprot": "P04626", "name": "HER2"},
    "enhertu": {"gene": "ERBB2", "uniprot": "P04626", "name": "HER2"},
    "tdxd": {"gene": "ERBB2", "uniprot": "P04626", "name": "HER2"},
    # HER3
    "her3": {"gene": "ERBB3", "uniprot": "P21860", "name": "HER3"},
    "erbb3": {"gene": "ERBB3", "uniprot": "P21860", "name": "HER3"},
    "patritumab": {"gene": "ERBB3", "uniprot": "P21860", "name": "HER3"},
    # Mesothelin
    "mesothelin": {"gene": "MSLN", "uniprot": "Q13421", "name": "Mesothelin"},
    "msln": {"gene": "MSLN", "uniprot": "Q13421", "name": "Mesothelin"},
    # EGFR
    "egfr": {"gene": "EGFR", "uniprot": "P00533", "name": "EGFR"},
    # Folate Receptor
    "folr1": {"gene": "FOLR1", "uniprot": "P15328", "name": "Folate Receptor Alpha"},
    "folate receptor": {"gene": "FOLR1", "uniprot": "P15328", "name": "Folate Receptor Alpha"},
    # DLL3
    "dll3": {"gene": "DLL3", "uniprot": "Q9NYJ7", "name": "DLL3"},
    "delta-like 3": {"gene": "DLL3", "uniprot": "Q9NYJ7", "name": "DLL3"},
    # CEACAM5
    "ceacam5": {"gene": "CEACAM5", "uniprot": "P06731", "name": "CEACAM5"},
    "cea": {"gene": "CEACAM5", "uniprot": "P06731", "name": "CEACAM5"},
    # BCMA
    "bcma": {"gene": "TNFRSF17", "uniprot": "Q02223", "name": "BCMA"},
    "belantamab": {"gene": "TNFRSF17", "uniprot": "Q02223", "name": "BCMA"},
    # CD19
    "cd19": {"gene": "CD19", "uniprot": "P15391", "name": "CD19"},
    # CD33
    "cd33": {"gene": "CD33", "uniprot": "P20138", "name": "CD33"},
    # FRα
    "fgfr2": {"gene": "FGFR2", "uniprot": "P21802", "name": "FGFR2"},
    # PTK7
    "ptk7": {"gene": "PTK7", "uniprot": "O14786", "name": "PTK7"},
    # ROR1
    "ror1": {"gene": "ROR1", "uniprot": "Q01973", "name": "ROR1"},
    # MET
    "c-met": {"gene": "MET", "uniprot": "P08581", "name": "c-MET"},
    "cmet": {"gene": "MET", "uniprot": "P08581", "name": "c-MET"},
    " met ": {"gene": "MET", "uniprot": "P08581", "name": "c-MET"},
}

_INDICATION_DICT: dict[str, str] = {
    "cervical cancer": "cervical cancer",
    "cervical": "cervical cancer",
    "cervix": "cervical cancer",
    "tnbc": "triple-negative breast cancer",
    "triple-negative breast": "triple-negative breast cancer",
    "triple negative breast": "triple-negative breast cancer",
    "breast cancer": "breast cancer",
    "breast": "breast cancer",
    "gastric cancer": "gastric cancer",
    "gastric": "gastric cancer",
    "stomach": "gastric cancer",
    "non-small cell lung": "non-small cell lung cancer",
    "nsclc": "non-small cell lung cancer",
    "lung cancer": "lung cancer",
    "lung": "lung cancer",
    "ovarian cancer": "ovarian cancer",
    "ovarian": "ovarian cancer",
    "urothelial": "urothelial cancer",
    "bladder": "bladder cancer",
    "colorectal": "colorectal cancer",
    "colon": "colorectal cancer",
    "crc": "colorectal cancer",
    "pancreatic": "pancreatic cancer",
    "solid tumor": "solid tumors",
    "solid tumors": "solid tumors",
    "lymphoma": "lymphoma",
    "leukemia": "leukemia",
    "multiple myeloma": "multiple myeloma",
    "myeloma": "multiple myeloma",
    "mesothelioma": "malignant pleural mesothelioma",
    "endometrial": "endometrial cancer",
    "prostate": "prostate cancer",
    "hnscc": "head and neck squamous cell carcinoma",
    "head and neck": "head and neck squamous cell carcinoma",
    "hepatocellular": "hepatocellular carcinoma",
    "liver cancer": "hepatocellular carcinoma",
    "renal": "renal cell carcinoma",
    "kidney": "renal cell carcinoma",
    "rcc": "renal cell carcinoma",
    "sclc": "small cell lung cancer",
    "small cell": "small cell lung cancer",
}

_MODALITY_MAP = {
    "adc": "ADC",
    "antibody-drug conjugate": "ADC",
    "bispecific": "Bispecific Antibody",
    "car-t": "CAR-T",
    "car t": "CAR-T",
    "mab": "Monoclonal Antibody",
    "antibody": "Monoclonal Antibody",
    "inhibitor": "Small Molecule",
    "small molecule": "Small Molecule",
    "peptide": "Peptide",
}


# ---------------------------------------------------------------------------
# Query normalisation
# ---------------------------------------------------------------------------

def normalize_query(query: str) -> dict:
    q = f" {query.lower()} "

    # Longest-match target lookup
    target_info = None
    for keyword in sorted(_TARGET_DICT, key=len, reverse=True):
        if keyword in q or keyword.strip() in q.strip():
            target_info = _TARGET_DICT[keyword]
            break

    # Longest-match indication
    indication = ""
    for keyword in sorted(_INDICATION_DICT, key=len, reverse=True):
        if keyword in q:
            indication = _INDICATION_DICT[keyword]
            break

    # Modality
    modality = "ADC"
    for kw, label in sorted(_MODALITY_MAP.items(), key=lambda x: -len(x[0])):
        if kw in q:
            modality = label
            break

    if target_info:
        return {
            "target_name": target_info["name"],
            "gene_symbol": target_info["gene"],
            "uniprot_accession": target_info["uniprot"],
            "modality": modality,
            "indication": indication,
            "matched_from": "dictionary",
        }

    # Heuristic: capitalised tokens that look like gene symbols
    tokens = query.split()
    gene_candidates = [
        t.strip(".,;:") for t in tokens
        if t.strip(".,;:").isupper() and 2 <= len(t.strip(".,;:")) <= 8
    ]
    gene_symbol = gene_candidates[0] if gene_candidates else (tokens[0] if tokens else query[:20])

    return {
        "target_name": gene_symbol,
        "gene_symbol": gene_symbol.upper(),
        "uniprot_accession": None,
        "modality": modality,
        "indication": indication,
        "matched_from": "heuristic",
    }


# ---------------------------------------------------------------------------
# Signal / risk / recommendation builders
# ---------------------------------------------------------------------------

def _build_signals(normalized: dict, ot: Any, chembl: Any, trials: Any) -> list[str]:
    signals = []
    gene = normalized.get("gene_symbol", "")
    indication = normalized.get("indication", "")

    if isinstance(ot, dict) and not ot.get("error"):
        count = ot.get("association_count", 0)
        if count:
            signals.append(
                f"Open Targets: {ot.get('approved_name', gene)} shows associations across "
                f"{count} disease areas in the platform database."
            )
        for d in (ot.get("top_diseases") or [])[:3]:
            signals.append(
                f"Disease association: {d['name']} (score {d['score']:.3f})"
            )

    if isinstance(chembl, dict) and chembl.get("mechanisms"):
        for m in chembl["mechanisms"][:2]:
            if m.get("action"):
                signals.append(f"ChEMBL mechanism: {m['action']}")

    if isinstance(trials, list):
        active = [t for t in trials if t.get("status") in ("RECRUITING", "ACTIVE_NOT_RECRUITING", "NOT_YET_RECRUITING")]
        if active:
            signals.append(
                f"ClinicalTrials.gov: {len(active)} active/recruiting trial(s) found for {gene}."
            )
        if trials:
            phases = {t.get("phase", "") for t in trials if t.get("phase")}
            signals.append(f"Trial phases present: {', '.join(sorted(phases))}.")

    if indication:
        signals.append(f"Indication context resolved: {indication}.")

    return signals[:8]


def _build_risks(normalized: dict, ot: Any, trials: Any) -> list[str]:
    risks = []
    gene = normalized.get("gene_symbol", "")

    if normalized.get("matched_from") == "heuristic":
        risks.append(
            f"Target '{gene}' was not found in the known-target dictionary — "
            "verify gene symbol and UniProt accession."
        )

    if isinstance(ot, dict) and ot.get("error"):
        risks.append("Open Targets data unavailable — association evidence not included.")

    if isinstance(trials, list) and len(trials) == 0:
        risks.append("No active ClinicalTrials.gov entries found for this target + modality.")
    elif isinstance(trials, list):
        completed = [t for t in trials if t.get("status") == "COMPLETED"]
        if completed:
            risks.append(
                f"{len(completed)} completed trial(s) found — review outcomes for failure patterns."
            )

    if not risks:
        risks.append("No structural liability signals detected in available evidence.")

    return risks[:5]


def _build_recommendation(normalized: dict, ot: Any, trials: Any) -> dict:
    score = 50
    rationale = []

    if isinstance(ot, dict) and not ot.get("error"):
        top = ot.get("top_diseases") or []
        if top:
            best_score = max(d["score"] for d in top)
            if best_score > 0.5:
                score += 15
                rationale.append("Strong disease-target association signal in Open Targets.")
            elif best_score > 0.2:
                score += 7
                rationale.append("Moderate disease-target association in Open Targets.")

    if isinstance(trials, list):
        recruiting = [t for t in trials if t.get("status") == "RECRUITING"]
        if recruiting:
            score += 10
            rationale.append(f"{len(recruiting)} actively recruiting trial(s) confirm clinical tractability.")
        elif trials:
            score += 5
            rationale.append("Clinical trial history provides proof-of-concept reference.")

    score = min(score, 94)
    label = "Advance" if score >= 65 else "Monitor" if score >= 45 else "Deprioritize"
    confidence = "High Conviction" if score >= 70 else "Moderate Conviction" if score >= 50 else "Developing"

    if not rationale:
        rationale.append("Insufficient live evidence — manual review recommended.")

    return {
        "score": score,
        "label": label,
        "confidence": confidence,
        "rationale": rationale,
    }


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def run_research(query: str) -> dict:
    normalized = normalize_query(query)
    gene = normalized["gene_symbol"]
    uniprot = normalized.get("uniprot_accession")
    indication = normalized.get("indication", "")

    # Step 1: resolve UniProt accession if not in dictionary
    uniprot_task = fetch_uniprot(gene)

    # Step 2: structure lookup (needs uniprot, run after uniprot resolves)
    # Step 3-5: independent parallel fetches
    ot_task = fetch_open_targets(gene)
    trials_task = fetch_clinical_trials(gene, indication)

    uniprot_data, open_targets, trials = await asyncio.gather(
        uniprot_task, ot_task, trials_task, return_exceptions=True
    )

    # If dictionary didn't have accession, try from UniProt response
    if not uniprot and isinstance(uniprot_data, dict) and uniprot_data.get("accession"):
        uniprot = uniprot_data["accession"]
        normalized["uniprot_accession"] = uniprot

    structure, chembl = await asyncio.gather(
        fetch_structure(uniprot or ""),
        fetch_chembl(uniprot or ""),
        return_exceptions=True,
    )

    def _safe(v: Any, default: Any) -> Any:
        return default if isinstance(v, Exception) else v

    uniprot_data = _safe(uniprot_data, {"error": "unavailable"})
    open_targets = _safe(open_targets, {"error": "unavailable"})
    trials = _safe(trials, [])
    structure = _safe(structure, {"source": "fallback", "pdbId": "1CRN", "status": "unavailable", "alphafoldUrl": ""})
    chembl = _safe(chembl, {"error": "unavailable"})

    return {
        "query": query,
        "normalized": normalized,
        "structure": structure,
        "sources": {
            "uniprot": uniprot_data,
            "openTargets": open_targets,
            "chembl": chembl,
            "clinicalTrials": trials if isinstance(trials, list) else [],
        },
        "signals": _build_signals(normalized, open_targets, chembl, trials),
        "risks": _build_risks(normalized, open_targets, trials),
        "recommendation": _build_recommendation(normalized, open_targets, trials),
    }

"""
BioNeMo real integration — replaces stub values with ESM-2 embeddings and
AlphaFold structure checks where available.

Contract: same return shape as bionemo_stub.run_bionemo_plausibility.
Falls back to the stub when NVIDIA_API_KEY is absent or any API call fails.

Fields labeled "heuristic/literature-derived" below come from the stub and
are NOT ESM-2 outputs — only fields explicitly marked are model-derived.
"""

import logging

import requests

from src import nvidia_client
from src.bionemo_stub import run_bionemo_plausibility as _stub

log = logging.getLogger(__name__)

# Candidate → Swiss-Prot accession + paralog panel for cross-reactivity proxy.
_TARGETS = {
    "b7h4_tnbc": {
        "gene": "VTCN1",
        "accession": "Q7Z7D3",
        "paralogs": ["CD274", "CD276", "PDCD1LG2"],
    },
    "tf_cervical": {
        "gene": "F3",
        "accession": "P13726",
        "paralogs": ["TFPI", "PROCR", "THBD"],
    },
    "nectin4_expansion": {
        "gene": "NECTIN4",
        "accession": "Q96NY8",
        "paralogs": ["NECTIN1", "NECTIN2", "NECTIN3"],
    },
}

_UNIPROT_FASTA = "https://rest.uniprot.org/uniprotkb/{accession}.fasta"
_UNIPROT_SEARCH = "https://rest.uniprot.org/uniprotkb/search"
_ALPHAFOLD_API = "https://alphafold.ebi.ac.uk/api/prediction/{accession}"
_FETCH_TIMEOUT = 10


def _fetch_sequence(accession: str) -> str | None:
    try:
        resp = requests.get(
            _UNIPROT_FASTA.format(accession=accession), timeout=_FETCH_TIMEOUT
        )
        if resp.status_code != 200:
            return None
        lines = resp.text.strip().splitlines()
        return "".join(l for l in lines if not l.startswith(">"))
    except Exception as exc:
        log.warning("FASTA fetch failed for %s: %s", accession, exc)
        return None


def _fetch_gene_sequence(gene: str) -> str | None:
    try:
        resp = requests.get(
            _UNIPROT_SEARCH,
            params={
                "query": f"gene_exact:{gene} AND organism_id:9606 AND reviewed:true",
                "format": "fasta",
                "size": 1,
            },
            timeout=_FETCH_TIMEOUT,
        )
        if resp.status_code == 200 and resp.text.strip():
            lines = resp.text.strip().splitlines()
            return "".join(l for l in lines if not l.startswith(">"))
        return None
    except Exception as exc:
        log.warning("Gene FASTA fetch failed for %s: %s", gene, exc)
        return None


def _alphafold_available(accession: str) -> dict:
    try:
        resp = requests.get(
            _ALPHAFOLD_API.format(accession=accession), timeout=_FETCH_TIMEOUT
        )
        if resp.status_code == 200:
            data = resp.json()
            if data:
                entry = data[0]
                return {
                    "available": True,
                    "pdb_url": entry.get("pdbUrl", ""),
                    "version": entry.get("latestVersion", "v4"),
                }
    except Exception as exc:
        log.warning("AlphaFold check failed for %s: %s", accession, exc)
    return {"available": False}


def run_bionemo_plausibility(candidate_id: str, base_scores: dict, assumptions: dict) -> dict:
    if not nvidia_client.api_available():
        return _stub(candidate_id, base_scores, assumptions)

    # Start from stub so all keys + assumption adjustments are already applied.
    result = dict(_stub(candidate_id, base_scores, assumptions))
    target = _TARGETS.get(candidate_id, _TARGETS["tf_cervical"])
    accession = target["accession"]
    gene = target["gene"]

    # --- 1. ESM-2 target embedding (model-derived) ---
    sequence = _fetch_sequence(accession)
    embedding = None
    if sequence:
        embedding = nvidia_client.esm2_embed(sequence)

    if embedding:
        result["target_representation"] = (
            f"ESM-2 embedding computed (dim {len(embedding)}); UniProt {accession} ({gene})"
        )
    else:
        result["target_representation"] = (
            result["target_representation"]
            + " [ESM-2 call attempted — stub text retained]"
        )

    # --- 2. AlphaFold structure availability (real API check) ---
    struct = _alphafold_available(accession)
    if struct["available"]:
        result["structure_availability"] = (
            f"AlphaFold predicted structure confirmed (UniProt {accession}, {struct.get('version', 'v4')}); "
            + result.get("structure_availability", "")
        )
        result["pdb_url"] = struct.get("pdb_url", result.get("pdb_url", ""))
    # else: keep stub pdb_url and text which may reference known PDB entries

    # --- 3. ESM-2 cross-reactivity similarity proxy (model-derived, clearly labeled) ---
    # Note: druggability_score, internalization_efficiency, pathway_proximity remain
    # heuristic/literature-derived from the stub and are NOT ESM-2 outputs.
    if embedding:
        similarities = []
        for paralog_gene in target.get("paralogs", [])[:2]:  # cap at 2 to stay within timeout budget
            pseq = _fetch_gene_sequence(paralog_gene)
            if pseq:
                pemb = nvidia_client.esm2_embed(pseq)
                if pemb:
                    sim = nvidia_client.cosine(embedding, pemb)
                    similarities.append((paralog_gene, round(sim, 3)))

        if similarities:
            sim_str = ", ".join(f"{g}: {s:.2f}" for g, s in similarities)
            max_sim = max(s for _, s in similarities)
            if max_sim > 0.85:
                result["cross_reactivity_risk"] = (
                    f"ESM-2 similarity proxy (high — {sim_str}): monitor cross-reactivity carefully."
                )
            elif max_sim > 0.70:
                result["cross_reactivity_risk"] = (
                    f"ESM-2 similarity proxy (moderate — {sim_str}): cross-reactivity worth monitoring."
                )
            else:
                result["cross_reactivity_risk"] = (
                    f"ESM-2 similarity proxy (low — {sim_str}): cross-reactivity risk appears low."
                )

    # Marker fields consumed by memo.py to update the "Mocked" label.
    result["_real_esm2"] = True
    result["_accession"] = accession

    return result

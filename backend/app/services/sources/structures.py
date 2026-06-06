"""Structure adapter — RCSB PDB (experimental) + AlphaFold (predicted)."""
import asyncio
import requests

_TIMEOUT = 8
_PDBE_BEST = "https://www.ebi.ac.uk/pdbe/api/mappings/best_structures"
_ALPHAFOLD = "https://alphafold.ebi.ac.uk/api/prediction"


def _best_experimental_sync(uniprot_id: str) -> dict:
    r = requests.get(f"{_PDBE_BEST}/{uniprot_id}", timeout=_TIMEOUT)
    if r.status_code != 200:
        return {}
    entries = r.json().get(uniprot_id, [])
    if not entries:
        return {}
    best = entries[0]
    return {
        "source": "rcsb_pdb",
        "pdbId": best["pdb_id"].upper(),
        "chainId": best.get("chain_id", "A"),
        "coverage": round(best.get("coverage", 0), 3),
        "resolution": best.get("resolution"),
        "method": best.get("experimental_method", "X-ray"),
        "status": "experimental",
        "alphafoldUrl": "",
    }


def _alphafold_sync(uniprot_id: str) -> dict:
    r = requests.get(f"{_ALPHAFOLD}/{uniprot_id}", timeout=_TIMEOUT)
    if r.status_code != 200:
        return {}
    data = r.json()
    if not data:
        return {}
    entry = data[0]
    return {
        "source": "alphafold",
        "pdbId": None,
        "pdbUrl": entry.get("pdbUrl", ""),
        "cifUrl": entry.get("cifUrl", ""),
        "modelVersion": entry.get("latestVersion", "4"),
        "status": "predicted",
        "alphafoldUrl": entry.get("pdbUrl", ""),
    }


async def fetch_structure(uniprot_id: str) -> dict:
    if not uniprot_id:
        return {"source": "fallback", "pdbId": "1CRN", "status": "unavailable", "alphafoldUrl": ""}
    try:
        exp = await asyncio.to_thread(_best_experimental_sync, uniprot_id)
        if exp:
            # Supplement with AlphaFold URL even when experimental exists
            try:
                af = await asyncio.to_thread(_alphafold_sync, uniprot_id)
                exp["alphafoldUrl"] = af.get("pdbUrl", "")
            except Exception:
                pass
            return exp
    except Exception:
        pass
    # Fallback to AlphaFold predicted structure
    try:
        af = await asyncio.to_thread(_alphafold_sync, uniprot_id)
        if af and af.get("pdbUrl"):
            return af
    except Exception:
        pass
    return {"source": "fallback", "pdbId": "1CRN", "status": "unavailable", "alphafoldUrl": ""}

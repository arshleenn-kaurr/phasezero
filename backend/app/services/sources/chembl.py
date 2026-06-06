"""ChEMBL adapter — drug mechanisms and known compounds for a target."""
import asyncio
import requests

_BASE = "https://www.ebi.ac.uk/chembl/api/data"
_TIMEOUT = 8


def _fetch_sync(uniprot_id: str) -> dict:
    # 1. Resolve UniProt → ChEMBL target ID
    r = requests.get(
        f"{_BASE}/target.json",
        params={"target_components__accession": uniprot_id, "limit": "1"},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    targets = r.json().get("targets", [])
    if not targets:
        return {}
    target = targets[0]
    target_id = target["target_chembl_id"]

    # 2. Get mechanisms of action
    r2 = requests.get(
        f"{_BASE}/mechanism.json",
        params={"target_chembl_id": target_id, "limit": "8"},
        timeout=_TIMEOUT,
    )
    r2.raise_for_status()
    mechs = r2.json().get("mechanisms", [])

    return {
        "target_id": target_id,
        "target_name": target.get("pref_name", ""),
        "target_type": target.get("target_type", ""),
        "mechanisms": [
            {
                "molecule_id": m.get("molecule_chembl_id", ""),
                "drug_name": m.get("molecule_chembl_id", ""),
                "action": m.get("mechanism_of_action", ""),
                "action_type": m.get("action_type", ""),
            }
            for m in mechs[:6]
        ],
    }


async def fetch_chembl(uniprot_id: str) -> dict:
    if not uniprot_id:
        return {}
    try:
        return await asyncio.to_thread(_fetch_sync, uniprot_id)
    except Exception as exc:
        return {"error": str(exc)}

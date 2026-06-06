"""ClinicalTrials.gov v2 adapter — trial landscape for a target + indication."""
import asyncio
import requests

_BASE = "https://clinicaltrials.gov/api/v2/studies"
_TIMEOUT = 10


def _fetch_sync(gene_symbol: str, indication: str) -> list:
    term = f"{gene_symbol} ADC"
    if indication:
        term += f" {indication}"
    r = requests.get(
        _BASE,
        params={
            "query.term": term,
            "pageSize": "6",
            "format": "json",
        },
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    studies = r.json().get("studies", [])
    results = []
    for study in studies:
        proto = study.get("protocolSection", {})
        id_mod = proto.get("identificationModule", {})
        status_mod = proto.get("statusModule", {})
        design_mod = proto.get("designModule", {})
        cond_mod = proto.get("conditionsModule", {})
        sponsor_mod = proto.get("sponsorCollaboratorsModule", {})
        results.append(
            {
                "nct_id": id_mod.get("nctId", ""),
                "title": id_mod.get("briefTitle", ""),
                "phase": (design_mod.get("phases") or ["Unknown"])[0],
                "status": status_mod.get("overallStatus", ""),
                "conditions": (cond_mod.get("conditions") or [])[:2],
                "sponsor": sponsor_mod.get("leadSponsor", {}).get("name", ""),
            }
        )
    return results


async def fetch_clinical_trials(gene_symbol: str, indication: str = "") -> list:
    try:
        return await asyncio.to_thread(_fetch_sync, gene_symbol, indication)
    except Exception:
        return []

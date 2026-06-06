"""Open Targets Platform GraphQL adapter — target-disease associations."""
import asyncio
import requests

_GRAPHQL_URL = "https://api.platform.opentargets.org/api/v4/graphql"
_TIMEOUT = 10

_QUERY = """
query Search($q: String!) {
  search(queryString: $q, entityNames: ["target"]) {
    hits {
      id
      score
      object {
        ... on Target {
          id
          approvedSymbol
          approvedName
          biotype
          associatedDiseases(page: { index: 0, size: 8 }, orderByScore: true) {
            count
            rows {
              disease { id name }
              score
            }
          }
        }
      }
    }
  }
}
"""


def _fetch_sync(gene_symbol: str) -> dict:
    payload = {"query": _QUERY, "variables": {"q": gene_symbol}}
    r = requests.post(
        _GRAPHQL_URL,
        json=payload,
        headers={"Content-Type": "application/json"},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    data = r.json()
    hits = data.get("data", {}).get("search", {}).get("hits", [])
    if not hits:
        return {}
    obj = hits[0].get("object", {})
    assoc = obj.get("associatedDiseases", {})
    return {
        "target_id": obj.get("id", ""),
        "approved_symbol": obj.get("approvedSymbol", gene_symbol),
        "approved_name": obj.get("approvedName", ""),
        "biotype": obj.get("biotype", ""),
        "association_count": assoc.get("count", 0),
        "top_diseases": [
            {
                "name": row["disease"]["name"],
                "score": round(row["score"], 3),
            }
            for row in assoc.get("rows", [])
        ],
    }


async def fetch_open_targets(gene_symbol: str) -> dict:
    try:
        return await asyncio.to_thread(_fetch_sync, gene_symbol)
    except Exception as exc:
        return {"error": str(exc)}

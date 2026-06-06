"""UniProt REST adapter — canonical protein identity and function."""
import asyncio
import requests

_BASE = "https://rest.uniprot.org/uniprotkb"
_TIMEOUT = 8


def _search_sync(gene_symbol: str) -> dict:
    params = {
        "query": f"gene_exact:{gene_symbol} AND organism_id:9606",
        "format": "json",
        "fields": "accession,id,gene_names,protein_name,organism_name,cc_function,keyword",
        "size": "1",
    }
    r = requests.get(f"{_BASE}/search", params=params, timeout=_TIMEOUT)
    r.raise_for_status()
    results = r.json().get("results", [])
    if not results:
        return {}
    entry = results[0]
    # Extract function text from cc_function comment block
    function_text = ""
    for comment in entry.get("comments", []):
        if comment.get("commentType") == "FUNCTION":
            texts = comment.get("texts", [])
            if texts:
                function_text = texts[0].get("value", "")[:400]
                break
    protein_desc = entry.get("proteinDescription", {})
    rec_name = protein_desc.get("recommendedName", {})
    full_name = rec_name.get("fullName", {}).get("value", "")
    gene_entry = (entry.get("genes") or [{}])[0]
    gene_name = gene_entry.get("geneName", {}).get("value", gene_symbol)
    return {
        "accession": entry.get("primaryAccession", ""),
        "entry_name": entry.get("uniProtkbId", ""),
        "protein_name": full_name,
        "gene_symbol": gene_name,
        "function": function_text,
        "organism": entry.get("organism", {}).get("scientificName", "Homo sapiens"),
        "length": entry.get("sequence", {}).get("length", 0),
    }


async def fetch_uniprot(gene_symbol: str) -> dict:
    try:
        result = await asyncio.to_thread(_search_sync, gene_symbol)
        return result
    except Exception as exc:
        return {"error": str(exc), "gene_symbol": gene_symbol}

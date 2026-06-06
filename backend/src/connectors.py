from typing import Dict, List

import requests
from bs4 import BeautifulSoup


class LiveConnectorDisabled(RuntimeError):
    pass


def fetch_literature_stub(query: str, *, live: bool = False) -> List[Dict[str, str]]:
    """Future PubMed/literature connector placeholder.

    The demo remains fully offline. Passing live=True documents the integration
    boundary, but still requires explicit implementation before network use.
    """
    if not live:
        return [
            {
                "query": query,
                "title": "Offline demo mode: deterministic evidence signals loaded from data/evidence_signals.json",
                "source": "PhaseZero mock evidence layer",
            }
        ]
    raise LiveConnectorDisabled("Live literature retrieval is intentionally disabled for the hackathon demo.")


def parse_evidence_html(html: str) -> List[str]:
    """Parse simple evidence snippets from HTML for future connector work."""
    soup = BeautifulSoup(html, "html.parser")
    return [text for text in (node.get_text(" ", strip=True) for node in soup.find_all(["p", "li"])) if text]


def requests_session() -> requests.Session:
    """Return a configured session for future API connectors without making a request."""
    session = requests.Session()
    session.headers.update({"User-Agent": "PhaseZero-demo/0.1"})
    return session

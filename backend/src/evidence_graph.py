import re
from collections import Counter
from typing import Dict, Iterable, List

import networkx as nx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


QUALITY_WEIGHT = {"low": 0.35, "medium": 0.65, "high": 1.0}


def build_evidence_graph(candidates: List[dict], evidence: Dict[str, dict]) -> nx.Graph:
    """Build an offline evidence graph connecting candidates, domains, agents, and signals."""
    graph = nx.Graph()

    for candidate in candidates:
        cid = candidate["id"]
        graph.add_node(
            cid,
            kind="candidate",
            label=candidate["full_name"],
            status=candidate.get("diligence_status", "In Review"),
        )

        for flag in candidate.get("failure_flags", []):
            flag_id = f"{cid}:flag:{_slug(flag['flag'])}"
            graph.add_node(flag_id, kind="failure_flag", label=flag["flag"], severity=flag["severity"])
            graph.add_edge(cid, flag_id, relation="has_failure_flag", weight=_severity_weight(flag["severity"]))

        for domain, rows in evidence.get(cid, {}).items():
            domain_id = f"{cid}:domain:{domain}"
            graph.add_node(domain_id, kind="domain", label=domain.title())
            graph.add_edge(cid, domain_id, relation="has_domain_evidence", weight=1.0)

            for idx, row in enumerate(rows):
                agent_id = f"agent:{row.get('agent', domain).lower()}"
                signal_id = f"{cid}:signal:{domain}:{idx}"
                quality = row.get("quality", "medium")

                graph.add_node(agent_id, kind="agent", label=f"{row.get('agent', domain)} Agent")
                graph.add_node(
                    signal_id,
                    kind="signal",
                    label=row["signal"],
                    source=row.get("source", "Mock source"),
                    quality=quality,
                    domain=domain,
                )
                graph.add_edge(domain_id, signal_id, relation="contains_signal", weight=QUALITY_WEIGHT.get(quality, 0.5))
                graph.add_edge(agent_id, signal_id, relation="parsed_signal", weight=QUALITY_WEIGHT.get(quality, 0.5))
                graph.add_edge(cid, signal_id, relation="supports_candidate", weight=QUALITY_WEIGHT.get(quality, 0.5))

    return graph


def summarize_evidence_graph(graph: nx.Graph, candidate_id: str) -> dict:
    candidate_nodes = _candidate_subgraph_nodes(graph, candidate_id)
    subgraph = graph.subgraph(candidate_nodes)
    centrality = nx.degree_centrality(subgraph)
    signals = [
        (node, centrality.get(node, 0), graph.nodes[node])
        for node in subgraph.nodes
        if graph.nodes[node].get("kind") == "signal"
    ]
    top_signals = sorted(signals, key=lambda item: (item[1], QUALITY_WEIGHT.get(item[2].get("quality"), 0)), reverse=True)[:5]

    quality_counts = Counter(
        graph.nodes[node].get("quality")
        for node in subgraph.nodes
        if graph.nodes[node].get("kind") == "signal"
    )
    domain_counts = Counter(
        graph.nodes[node].get("domain")
        for node in subgraph.nodes
        if graph.nodes[node].get("kind") == "signal"
    )

    return {
        "candidate_id": candidate_id,
        "node_count": subgraph.number_of_nodes(),
        "edge_count": subgraph.number_of_edges(),
        "quality_counts": dict(quality_counts),
        "domain_counts": dict(domain_counts),
        "top_signals": [
            {
                "signal": attrs["label"],
                "source": attrs.get("source", "Mock source"),
                "quality": attrs.get("quality", "medium"),
                "centrality": round(score, 4),
            }
            for _, score, attrs in top_signals
        ],
    }


def rank_candidates_by_evidence_similarity(candidates: List[dict], evidence: Dict[str, dict], query: str) -> List[dict]:
    """Rank candidates by TF-IDF cosine similarity against a diligence query."""
    if not query.strip():
        return []

    corpus = [_candidate_evidence_text(candidate["id"], evidence) for candidate in candidates]
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
    matrix = vectorizer.fit_transform(corpus + [query])
    similarities = cosine_similarity(matrix[-1], matrix[:-1]).ravel()

    ranked = []
    for candidate, score in zip(candidates, similarities):
        ranked.append(
            {
                "candidate_id": candidate["id"],
                "candidate": candidate["full_name"],
                "similarity": float(score),
            }
        )
    return sorted(ranked, key=lambda row: row["similarity"], reverse=True)


def _candidate_subgraph_nodes(graph: nx.Graph, candidate_id: str) -> Iterable[str]:
    if candidate_id not in graph:
        return []
    return {candidate_id, *nx.single_source_shortest_path_length(graph, candidate_id, cutoff=2).keys()}


def _candidate_evidence_text(candidate_id: str, evidence: Dict[str, dict]) -> str:
    rows = []
    for signals in evidence.get(candidate_id, {}).values():
        rows.extend(row.get("signal", "") for row in signals)
    return " ".join(rows)


def _severity_weight(severity: str) -> float:
    return {"low": 0.35, "medium": 0.65, "high": 1.0}.get(severity, 0.5)


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")

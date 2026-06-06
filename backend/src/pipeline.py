from src.agents import run_all_agents
from src.bionemo_stub import run_bionemo_plausibility
from src.evidence_graph import build_evidence_graph, rank_candidates_by_evidence_similarity, summarize_evidence_graph
from src.hmm_model import run_hmm
from src.memo import generate_memo
from src.schemas import HMMResult, ScoreBundle
from src.scoring import compute_all_scores
from src.simulations import run_monte_carlo


async def run_diligence_pipeline(candidate: dict, assumptions: dict, all_candidates: list, evidence: dict) -> dict:
    """Run the full backend pipeline for one candidate.

    Async because the research agents fan out to live external APIs via
    asyncio.gather; the remaining (deterministic, CPU-bound) steps run inline.
    """
    cid = candidate["id"]
    scores = ScoreBundle.model_validate(compute_all_scores(candidate["base_scores"], assumptions)).model_dump()
    simulation = run_monte_carlo(cid, candidate["base_scores"], assumptions)
    hmm = HMMResult.model_validate(run_hmm(cid, candidate["base_scores"], assumptions)).model_dump()
    bionemo = run_bionemo_plausibility(cid, candidate["base_scores"], assumptions)
    agents = await run_all_agents(candidate["indication"], candidate["target"])
    graph = build_evidence_graph(all_candidates, evidence)
    graph_summary = summarize_evidence_graph(graph, cid)
    similarity_query = " ".join(
        [
            candidate.get("full_name", ""),
            candidate.get("what_phasezero_found", ""),
            candidate.get("main_risk", ""),
            candidate.get("what_would_need_to_be_true", ""),
        ]
    )
    similarity_rankings = rank_candidates_by_evidence_similarity(
        all_candidates,
        evidence,
        similarity_query,
    )
    memo = generate_memo(candidate, assumptions, scores, simulation, hmm, bionemo, agents)

    return {
        "candidate_id": cid,
        "scores": scores,
        "simulation": simulation,
        "hmm": hmm,
        "bionemo": bionemo,
        "agents": agents,
        "evidence_graph": graph_summary,
        "evidence_similarity_rankings": similarity_rankings,
        "memo": memo,
    }

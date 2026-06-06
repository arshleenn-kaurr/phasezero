"""
Live research agents — async, API-backed parsing layer.

Each agent fetches real data and returns an AgentOutput:
  status, input_sources, findings, confidence, flags, latency_ms

Agents run in parallel via asyncio.gather in run_all_agents(); the Strategy
Agent runs afterwards because it synthesizes the other agents' outputs.

Confidence is a deterministic 0-100 score derived from data quality. Every
agent degrades gracefully: an API failure yields a low-confidence AgentOutput
with an explanatory flag rather than raising, so one slow/failing source never
takes down the whole diligence run.
"""

import asyncio
import math
import os
import re
import time
import xml.etree.ElementTree as ET
from typing import Awaitable, Callable, Optional

import httpx

from src.schemas import AgentOutput
from src.seer_table import lookup_incidence

# ---------------------------------------------------------------------------
# Shared config
# ---------------------------------------------------------------------------

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
_HEADERS = {"User-Agent": "PhaseZero-research/0.1"}

# NCBI politeness params; set NCBI_API_KEY env for higher rate limits.
_NCBI_TOOL = "PhaseZero"
_NCBI_EMAIL = os.environ.get("NCBI_EMAIL", "research@phasezero.bio")
_NCBI_API_KEY = os.environ.get("NCBI_API_KEY")

PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
CTGOV_BASE = "https://clinicaltrials.gov/api/v2/studies"
OPENFDA_LABEL = "https://api.fda.gov/drug/label.json"
CHEMBL_TARGET = "https://www.ebi.ac.uk/chembl/api/data/target/search"
BIONEMO_ENDPOINT = os.environ.get(
    "BIONEMO_ENDPOINT",
    "https://health.api.nvidia.com/v1/biology/nvidia/bionemo",  # TODO(team): confirm NIM URL
)


def _clamp_confidence(value: float) -> int:
    return int(max(0, min(100, round(value))))


def _gene_symbol(target: str) -> str:
    """Extract a clean query token from a target label.

    "B7-H4 (VTCN1)" -> "VTCN1"; "Tissue Factor (TF / CD142 / F3)" -> "TF";
    falls back to the raw target string when no parenthetical is present.
    """
    match = re.search(r"\(([^)]+)\)", target or "")
    if match:
        first = re.split(r"[/,]", match.group(1))[0].strip()
        if first:
            return first
    return (target or "").strip()


def _target_name(target: str) -> str:
    """Human-readable target name with any parenthetical stripped.

    "B7-H4 (VTCN1)" -> "B7-H4"; "Tissue Factor (TF / CD142 / F3)" -> "Tissue Factor".
    Used for free-text APIs (e.g. ChEMBL) that reject terse gene abbreviations.
    """
    name = re.sub(r"\([^)]*\)", "", target or "").strip()
    return name or (target or "").strip()


def _ncbi_params(**extra) -> dict:
    params = {"tool": _NCBI_TOOL, "email": _NCBI_EMAIL, **extra}
    if _NCBI_API_KEY:
        params["api_key"] = _NCBI_API_KEY
    return params


# --- Abstract parsing / signal extraction (Literature Agent) ----------------

_CUTOFF_KEYWORDS = (
    "expression level", "expression levels", "threshold", "cutoff", "cut-off",
    "h-score", "ihc", "tps", "cps", "positivity", "staining intensity",
)
_NORMAL_TRIGGERS = ("normal", "healthy", "control")
_TISSUE_VOCAB = (
    "kidney", "renal", "uterus", "uterine", "endothelium", "vascular", "liver",
    "skin", "gi tract", "gastrointestinal", "lung", "breast", "pancreas",
    "heart", "brain", "ovary", "colon", "stomach", "epithelium",
)


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def _parse_abstract(xml_text: str) -> str:
    """Concatenate AbstractText sections from a PubMed efetch XML response."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return ""
    parts: list[str] = []
    for node in root.iter("AbstractText"):
        text = "".join(node.itertext()).strip()
        if not text:
            continue
        label = node.get("Label")
        parts.append(f"{label}: {text}" if label else text)
    return " ".join(parts).strip()


def _extract_cutoffs(abstract: str) -> list[str]:
    """Sentences mentioning biomarker cutoff / expression-threshold language."""
    return [
        sentence
        for sentence in _split_sentences(abstract)
        if any(keyword in sentence.lower() for keyword in _CUTOFF_KEYWORDS)
    ]


def _extract_normal_tissue(abstract: str) -> list[str]:
    """Normal/healthy tissues named in the abstract (cross-reactivity signal)."""
    tissues: set[str] = set()
    for sentence in _split_sentences(abstract):
        low = sentence.lower()
        if any(trigger in low for trigger in _NORMAL_TRIGGERS):
            tissues.update(tissue for tissue in _TISSUE_VOCAB if tissue in low)
    return sorted(tissues)


# ---------------------------------------------------------------------------
# 1. Literature Agent — PubMed E-utilities (esearch + efetch abstract parse)
# ---------------------------------------------------------------------------

async def literature_agent(indication: str, target: str) -> AgentOutput:
    gene = _gene_symbol(target)
    term = f"{gene} ADC {indication}".strip()
    flags: list[str] = []
    count = 0
    abstract = ""

    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        search = await client.get(
            f"{PUBMED_BASE}/esearch.fcgi",
            params=_ncbi_params(
                db="pubmed",
                term=term,
                retmax="10",
                retmode="json",
                sort="relevance",
            ),
        )
        search.raise_for_status()
        esearch = search.json().get("esearchresult", {})
        pmids = esearch.get("idlist", [])
        count = int(esearch.get("count", 0))

        # Pull the abstract for the first (most relevant) result via efetch.
        if pmids:
            fetch = await client.get(
                f"{PUBMED_BASE}/efetch.fcgi",
                params=_ncbi_params(
                    db="pubmed",
                    id=pmids[0],
                    retmode="xml",
                    rettype="abstract",
                ),
            )
            fetch.raise_for_status()
            abstract = _parse_abstract(fetch.text)

    # Graceful fallback: no hits, or a top result with no usable abstract text.
    if not pmids or not abstract:
        flags.append("incomplete data")
        if count == 0:
            flags.append("No PubMed coverage for target + indication")
        return AgentOutput(
            status="complete",
            input_sources=[f"PubMed E-utilities ({count} papers)"],
            findings=[
                "Abstract: unavailable for top result",
                "Biomarker cutoffs identified: none (no abstract parsed)",
                "Normal tissue cross-reactivity risk: unknown (no abstract parsed)",
            ],
            confidence=50,
            flags=flags,
        )

    cutoffs = _extract_cutoffs(abstract)
    tissues = _extract_normal_tissue(abstract)

    findings = [
        f"Abstract: {abstract[:200]}",
        "Biomarker cutoffs identified: "
        + ("; ".join(cutoffs) if cutoffs else "none found in abstract"),
        "Normal tissue cross-reactivity risk: "
        + (f"yes — {', '.join(tissues)}" if tissues else "no explicit normal-tissue signal"),
    ]

    if count < 5:
        flags.append("Low PubMed coverage")

    # Confidence from data quality: corpus size + extracted signal richness.
    confidence = _clamp_confidence(
        50
        + math.log10(count + 1) * 12
        + (10 if cutoffs else 0)
        + (8 if tissues else 0)
    )

    return AgentOutput(
        status="complete",
        input_sources=[f"PubMed E-utilities ({count} papers)"],
        findings=findings,
        confidence=confidence,
        flags=flags,
    )


# ---------------------------------------------------------------------------
# 2. Trial Agent — ClinicalTrials.gov v2
# ---------------------------------------------------------------------------

_ACTIVE_STATUSES = {"RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION"}


async def trial_agent(indication: str, target: str) -> AgentOutput:
    gene = _gene_symbol(target)
    term = f"{gene} ADC {indication}".strip()
    findings: list[str] = []
    flags: list[str] = []
    active = 0

    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        resp = await client.get(
            CTGOV_BASE,
            params={"query.term": term, "pageSize": "8", "format": "json"},
        )
        resp.raise_for_status()
        studies = resp.json().get("studies", [])

    # TODO(team): enrich — phase weighting, sponsor tiering, enrollment counts.
    for study in studies:
        proto = study.get("protocolSection", {})
        ident = proto.get("identificationModule", {})
        status_mod = proto.get("statusModule", {})
        design = proto.get("designModule", {})
        nct = ident.get("nctId", "")
        title = ident.get("briefTitle", "")
        phase = (design.get("phases") or ["N/A"])[0]
        overall = status_mod.get("overallStatus", "")
        if overall in _ACTIVE_STATUSES:
            active += 1
        if title:
            findings.append(f"{title} — {phase} ({overall}, {nct})")

    if not studies:
        flags.append("No ClinicalTrials.gov entries for target + indication")
    confidence = _clamp_confidence(45 + active * 10 + min(len(studies), 5) * 3)

    return AgentOutput(
        status="complete",
        input_sources=["ClinicalTrials.gov API v2"],
        findings=findings[:5] or ["No trials found for this target + indication."],
        confidence=confidence,
        flags=flags,
    )


# ---------------------------------------------------------------------------
# 3. Regulatory Agent — openFDA drug labels
# ---------------------------------------------------------------------------

async def regulatory_agent(indication: str, target: str) -> AgentOutput:
    findings: list[str] = []
    flags: list[str] = []

    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        resp = await client.get(
            OPENFDA_LABEL,
            params={
                "search": f'indications_and_usage:"{indication}"',
                "limit": "5",
            },
        )
        # openFDA returns 404 when zero documents match — treat as empty, not error.
        if resp.status_code == 404:
            results = []
        else:
            resp.raise_for_status()
            results = resp.json().get("results", [])

    hits = len(results)
    # TODO(team): parse accelerated-approval language, CDx requirements, and
    #             boxed warnings; map comparator drugs (SG/TV/EV) per indication.
    for label in results:
        openfda = label.get("openfda", {})
        brand = (openfda.get("brand_name") or ["Unknown"])[0]
        generic = (openfda.get("generic_name") or ["unknown"])[0]
        findings.append(f"FDA-labeled precedent in {indication}: {brand} ({generic})")

    if hits == 0:
        flags.append("No FDA label precedent for this indication")
    confidence = _clamp_confidence(40 + hits * 12)

    return AgentOutput(
        status="complete",
        input_sources=["openFDA drug/label.json"],
        findings=findings[:5] or ["No FDA labels matched this indication."],
        confidence=confidence,
        flags=flags,
    )


# ---------------------------------------------------------------------------
# 4. Commercial Agent — SEER incidence lookup table
# ---------------------------------------------------------------------------

async def commercial_agent(indication: str, target: str) -> AgentOutput:
    # SEER has no simple public REST API; use a curated incidence table.
    # TODO(team): swap for NCI Cancer Statistics API (api.cancer.gov) when keyed.
    record = lookup_incidence(indication)
    flags: list[str] = []

    if record:
        incidence = record["annual_us_incidence"]
        findings = [
            f"{indication} US incidence ~{incidence:,}/year (SEER)",
            f"Estimated target+ addressable subgroup: {record['subgroup_estimate']}",
            record.get("commercial_note", ""),
        ]
        findings = [f for f in findings if f]
        confidence = 75
    else:
        findings = [f"No SEER incidence record for '{indication}'."]
        flags.append("Indication missing from SEER lookup table")
        confidence = 35

    return AgentOutput(
        status="complete",
        input_sources=["SEER incidence table (cached)"],
        findings=findings,
        confidence=confidence,
        flags=flags,
    )


# ---------------------------------------------------------------------------
# 5. ADC Design Agent — molecular DB lookup (ChEMBL)
# ---------------------------------------------------------------------------

async def adc_design_agent(indication: str, target: str) -> AgentOutput:
    # ChEMBL free-text search rejects terse gene abbreviations (e.g. "TF" -> 400),
    # so query by the descriptive target name and request JSON explicitly.
    query = _target_name(target)
    findings: list[str] = []
    flags: list[str] = []

    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        resp = await client.get(CHEMBL_TARGET, params={"q": query, "format": "json"})
        resp.raise_for_status()
        targets = resp.json().get("targets", [])

    # TODO(team): query payload DB for target-class ADCs, internalization
    #             kinetics, DAR precedent, and payload (MMAE vs DXd) options.
    if targets:
        top = targets[0]
        pref_name = top.get("pref_name", query)
        findings.append(f"ChEMBL: {len(targets)} target record(s); top match '{pref_name}'.")
        findings.append("Payload class and DAR optimization required for therapeutic window.")
        confidence = 60
    else:
        flags.append("No molecular DB record for target")
        confidence = 45

    return AgentOutput(
        status="complete",
        input_sources=["ChEMBL target API"],
        findings=findings or ["No molecular design precedent retrieved."],
        confidence=confidence,
        flags=flags,
    )


# ---------------------------------------------------------------------------
# 6. Failure Memory Agent — cached prior-ADC post-mortems
# ---------------------------------------------------------------------------

async def failure_agent(indication: str, target: str) -> AgentOutput:
    # Cached archetypes for now.
    # TODO(team): replace with vector search over a failure-archetype DB and
    #             similarity-match against the candidate's profile.
    findings = [
        "Crowded-market archetype: late ADC entrants often capture <30% of leader revenue.",
        "Weak-enrichment archetype: broad trials without a validated biomarker cutoff underperform.",
        "Target-liability archetype: normal-tissue expression narrows the therapeutic index.",
    ]
    flags = ["Crowded market risk", "Weak enrichment risk"]
    return AgentOutput(
        status="complete",
        input_sources=["Prior ADC failure archetypes (cached)"],
        findings=findings,
        confidence=70,
        flags=flags,
    )


# ---------------------------------------------------------------------------
# 7. BioNeMo Agent — NVIDIA BioNeMo cloud endpoint (async POST)
# ---------------------------------------------------------------------------

async def bionemo_agent(indication: str, target: str) -> AgentOutput:
    api_key = os.environ.get("NGC_API_KEY")
    gene = _gene_symbol(target)

    if not api_key:
        # Graceful degradation when credentials are absent (offline/demo mode).
        return AgentOutput(
            status="complete",
            input_sources=["BioNeMo (not configured)"],
            findings=["BioNeMo credentials not set — skipped live plausibility call."],
            confidence=50,
            flags=["BioNeMo API key missing"],
        )

    async with httpx.AsyncClient(timeout=_TIMEOUT, headers=_HEADERS) as client:
        resp = await client.post(
            BIONEMO_ENDPOINT,
            headers={"Authorization": f"Bearer {api_key}"},
            json={"target": gene, "indication": indication},
        )
        resp.raise_for_status()
        data = resp.json()

    # TODO(team): map BioNeMo response → pathway proximity, druggability,
    #             internalization, and cross-reactivity → findings + confidence.
    plausibility = data.get("overall_plausibility", 0.7)
    findings = [
        f"Pathway proximity: {data.get('pathway_proximity', 'n/a')}",
        f"Druggability score: {data.get('druggability_score', 'n/a')}",
        f"Internalization efficiency: {data.get('internalization_efficiency', 'n/a')}",
    ]
    return AgentOutput(
        status="complete",
        input_sources=["NVIDIA BioNeMo NIM endpoint"],
        findings=findings,
        confidence=_clamp_confidence(plausibility * 100),
        flags=[],
    )


# ---------------------------------------------------------------------------
# 8. Strategy Agent — executive synthesis of the other agents
# ---------------------------------------------------------------------------

async def strategy_agent(
    indication: str,
    target: str,
    upstream: Optional[dict] = None,
) -> AgentOutput:
    upstream = upstream or {}
    confidences = [a.get("confidence", 0) for a in upstream.values()]
    avg = sum(confidences) / len(confidences) if confidences else 50.0
    all_flags = [f for a in upstream.values() for f in a.get("flags", [])]

    # TODO(team): replace heuristic synthesis with an LLM/strategy model that
    #             reasons over the full findings set rather than just confidence.
    if avg >= 75:
        thesis = "Diligence Priority: HIGH — strong, consistent multi-source signal."
    elif avg >= 55:
        thesis = "Diligence Priority: SELECTIVE — credible but gated on key missing data."
    else:
        thesis = "Diligence Priority: LOWER — weak or unvalidated signal across sources."

    findings = [
        thesis,
        f"Mean upstream agent confidence: {avg:.0f}/100 across {len(confidences)} agents.",
    ]

    return AgentOutput(
        status="complete",
        input_sources=["All agent outputs"],
        findings=findings,
        confidence=_clamp_confidence(avg),
        flags=list(dict.fromkeys(all_flags))[:4],
    )


# ---------------------------------------------------------------------------
# Latency wrapper + orchestration
# ---------------------------------------------------------------------------

async def _run_timed(name: str, coro: Awaitable[AgentOutput]) -> tuple[str, dict]:
    """Await one agent, measure wall-clock latency, and normalize to a dict.

    Per-agent exceptions are caught here so a single failing source cannot abort
    the asyncio.gather batch.
    """
    start = time.perf_counter()
    try:
        output = await coro
    except Exception as exc:  # noqa: BLE001 — isolate one agent's failure
        output = AgentOutput(
            status="error",
            input_sources=[],
            findings=[f"Agent failed: {exc}"],
            confidence=0,
            flags=["API fetch failed"],
        )
    output.latency_ms = int((time.perf_counter() - start) * 1000)
    return name, AgentOutput.model_validate(output.model_dump()).model_dump()


# Agents that can all run concurrently. Strategy depends on these and runs after.
_PARALLEL: list[tuple[str, Callable[[str, str], Awaitable[AgentOutput]]]] = [
    ("Literature Agent", literature_agent),
    ("Trial Agent", trial_agent),
    ("Regulatory Agent", regulatory_agent),
    ("Commercial Agent", commercial_agent),
    ("ADC Design Agent", adc_design_agent),
    ("Failure Memory Agent", failure_agent),
    ("BioNeMo Agent", bionemo_agent),
]


async def run_all_agents(indication: str, target: str) -> dict:
    """Fan out all parallel agents, then synthesize with the Strategy Agent.

    Returns a dict keyed by agent name, each value an AgentOutput dict
    (status, input_sources, findings, confidence, flags, latency_ms).
    """
    results = await asyncio.gather(
        *[_run_timed(name, fn(indication, target)) for name, fn in _PARALLEL]
    )
    agents = dict(results)

    strat_name, strat_out = await _run_timed(
        "Strategy Agent", strategy_agent(indication, target, agents)
    )
    agents[strat_name] = strat_out
    return agents

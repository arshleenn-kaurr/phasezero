"""
NVIDIA API client — thin defensive wrapper for BioNeMo (ESM-2) and Nemotron.

All public functions return None on any failure (missing key, HTTP error,
timeout, parse error) and emit a single-line warning log. Never raises.

Endpoint notes — verify model IDs on build.nvidia.com before using in prod:
  Nemotron chat: https://integrate.api.nvidia.com/v1/chat/completions
  ESM-2 embed:   https://health.api.nvidia.com/v1/biology/nvidia/esm2nv
"""

import logging
import math
import os
from typing import Optional

import requests

log = logging.getLogger(__name__)

_NEMOTRON_BASE = "https://integrate.api.nvidia.com/v1"
# Verify on build.nvidia.com → copy from the model card's Python example.
_NEMOTRON_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct"

# ESM-2 NIM — verify path + request body from the ESM-2 model card on build.nvidia.com.
_ESM2_URL = "https://health.api.nvidia.com/v1/biology/nvidia/esm2nv"

_TIMEOUT = 20          # seconds — never block the pipeline longer than this
_ESM2_MAX_LEN = 1022   # ESM-2 650M context length minus CLS/EOS tokens


def api_available() -> bool:
    """True when NVIDIA_API_KEY is present in the environment."""
    return bool(os.environ.get("NVIDIA_API_KEY"))


def _key() -> Optional[str]:
    return os.environ.get("NVIDIA_API_KEY")


def esm2_embed(sequence: str) -> Optional[list]:
    """POST a protein sequence to the ESM-2 NIM; return a mean-pooled float vector."""
    key = _key()
    if not key:
        return None
    seq = sequence[:_ESM2_MAX_LEN]
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(
            _ESM2_URL,
            json={"sequences": [seq]},
            headers=headers,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        # BioNeMo may return mean_embeddings directly or per-residue embeddings.
        mean_emb = data.get("mean_embeddings")
        per_residue = data.get("embeddings")

        if mean_emb is not None:
            first = mean_emb[0] if isinstance(mean_emb[0], list) else mean_emb
            return [float(x) for x in first]

        if per_residue is not None:
            # Per-residue shape: [[residue0_emb, residue1_emb, ...]] (batch dim first)
            seq_embs = per_residue[0] if isinstance(per_residue[0][0], list) else per_residue
            n = len(seq_embs)
            if n == 0:
                return None
            dim = len(seq_embs[0])
            pooled = [sum(seq_embs[t][d] for t in range(n)) / n for d in range(dim)]
            return pooled

        log.warning("ESM-2: unexpected response shape — keys: %s", list(data.keys()))
        return None
    except Exception as exc:
        log.warning("ESM-2 embed failed: %s", exc)
        return None


def nemotron_complete(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1200,
) -> Optional[str]:
    """Single chat-completion via Nemotron. Returns assistant text or None."""
    key = _key()
    if not key:
        return None
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": _NEMOTRON_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.3,
    }
    try:
        resp = requests.post(
            f"{_NEMOTRON_BASE}/chat/completions",
            json=payload,
            headers=headers,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as exc:
        log.warning("Nemotron complete failed: %s", exc)
        return None


def cosine(a: list, b: list) -> float:
    """Cosine similarity between two equal-length float vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0
    return dot / (mag_a * mag_b)

# NVIDIA Integration

## What is real vs. mocked

| Field | Source | When real |
|-------|--------|-----------|
| `target_representation` | ESM-2 NIM (NVIDIA BioNeMo) | Key set + API reachable |
| `structure_availability` | AlphaFold EBI API | Key set + API reachable |
| `cross_reactivity_risk` | ESM-2 cosine similarity proxy | Key set + API reachable |
| `druggability_score` | Heuristic / literature-derived (stub) | Always stub |
| `internalization_efficiency` | Heuristic / literature-derived (stub) | Always stub |
| `pathway_proximity` | Heuristic / literature-derived (stub) | Always stub |
| Memo narrative sections | Nemotron LLM | Key set + API reachable |

Only fields marked "ESM-2" in the BioNeMo section of the memo are model-derived.
Composite scores that blend real signals with heuristics are labeled as such in code comments.

## Running with real NVIDIA APIs

```bash
cp .env.example .env
# edit .env and set your key
NVIDIA_API_KEY=nvapi-xxxxx

cd backend
uvicorn app.main:app --reload
```

When the key is present:
- BioNeMo section shows real ESM-2 embedding info and AlphaFold structure status.
- Memo narrative (executive summary, what-would-need-to-be-true, strategy synthesis) is written by Nemotron.

## Fallback behavior

When `NVIDIA_API_KEY` is absent **or any API call fails/times out**, the system falls back
transparently to `src/bionemo_stub.py` values and template strings in `src/memo.py`.
The frontend is unaffected — all dict and markdown shapes are identical.

## Verifying model IDs

Before using in production verify model IDs on [build.nvidia.com](https://build.nvidia.com):
- Nemotron model: `src/nvidia_client.py` → `_NEMOTRON_MODEL`
- ESM-2 endpoint: `src/nvidia_client.py` → `_ESM2_URL`

Copy the exact model ID from the model card's Python example on build.nvidia.com.

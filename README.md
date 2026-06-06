# PhaseZero

PhaseZero is a cross-functional ADC opportunity command center for early pharma diligence. It connects agentic evidence parsing, deterministic scoring, Monte Carlo stress tests, HMM-style state inference, BioNeMo-style plausibility, Signal Intelligence, and a human-readable diligence memo into one demo experience.

This is a demo system, not an autonomous go/no-go tool and not an approval predictor.

## What To Open

Run the backend API and frontend app, then open:

```text
http://127.0.0.1:5173/
```

For the fastest judge walkthrough, use:

```text
http://127.0.0.1:5173/signals
```

## Quick Start

Use two terminals from the repository root.

### 1. Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
PYTHONPATH=backend python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

### 2. Frontend

```bash
cd web
npm ci --legacy-peer-deps
npm run dev -- --host 127.0.0.1 --port 5173
```

Then open:

```text
http://127.0.0.1:5173/
```

## Demo Flow

1. Start at the Briefing Room for the high-level PhaseZero story.
2. Open Signal Intel to see the weighted Signal Intelligence layer.
3. Select each ADC candidate and watch the regime, evidence burden, warning signals, and diligence questions update.
4. Open Opportunities, then a candidate detail page, to see scores, BioNeMo plausibility, Monte Carlo, HMM state tracking, evidence, and memo output.
5. Open Memos to view/download the diligence memo.

## What Is Included

- `backend/app/main.py` exposes the FastAPI API.
- `backend/src/pipeline.py` orchestrates scoring, agents, BioNeMo-style plausibility, Monte Carlo, HMM, evidence graph, Signal Intelligence, and memo generation.
- `backend/src/signal_intelligence.py` computes weighted public evidence events, momentum, contradiction burden, evidence agreement, missing-data burden, and signal regimes.
- `backend/data/signal_events.json` contains deterministic Signal Intelligence events for the three demo ADC candidates.
- `web/` contains the React/Vite/TanStack frontend.

## Notes

- The app uses only the three included ADC candidates.
- Live credentials are optional. If NVIDIA/BioNeMo credentials are not configured, the demo uses deterministic fallback behavior.
- If `npm ci` reports a peer dependency conflict, use `npm ci --legacy-peer-deps`; this is the verified install command for the current demo.
- The backend should run on port `8000` and the frontend on port `5173` so the frontend can reach the API.

## Verified

Before submission, the project was checked with:

```bash
python -m compileall backend
cd web && npm run build
```

The final integrated demo was also smoke-tested through the browser for Signal Intel and candidate detail pages.

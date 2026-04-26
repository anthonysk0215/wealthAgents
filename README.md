# WealthAgents

An autonomous wealth management platform powered by a 5-layer, 12-agent AI pipeline. Submit your financial profile, watch agents debate and allocate in real time, and receive a personalized wealth plan.

---

## Architecture

```
Frontend (Next.js)  ──POST /api/plan/start──►  Backend (FastAPI)
                    ◄──GET /api/plan/:id/stream──  SSE stream
```

**Agent pipeline (backend):**

| Layer | Agents | Role |
|-------|--------|------|
| 1 | Cash Flow, Retirement, Housing, Investment | Parallel financial analysis |
| 2 | Bull, Bear, Facilitator | 3-round debate → verdict |
| 3 | Allocator | Portfolio allocation plan |
| 4 | Aggressive, Neutral, Conservative, Risk Manager | Risk calibration |
| 5 | Wealth Manager | Final synthesis → WealthPlan |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **pnpm** (`npm install -g pnpm`)
- An **ASI:One API key** — get one at [asi1.ai](https://asi1.ai)

---

## Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment variables

Create `backend/.env`:

```env
ASI_ONE_API_KEY=your_asi_one_api_key_here
ASI_ONE_BASE_URL=https://api.asi1.ai/v1
ASI_ONE_MODEL=asi1-mini

# Optional — comma-separated origins allowed by CORS (default: localhost:3000)
ALLOWED_ORIGINS=http://localhost:3000

# Optional — shared Supabase/Postgres database for custom accounts + saved reports.
# If omitted, backend falls back to local SQLite at backend/app/data/wealthagents.sqlite3.
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require

# Required for Supabase Auth sign-in bridge.
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
```

For Supabase, click **Connect** in your project dashboard and copy the pooled Postgres connection string.
Use the session pooler URL and keep `sslmode=require`. These app accounts are stored in custom
`public.users`, `public.sessions`, and `public.reports` tables; they will not appear under Supabase Auth users.

### Run the backend

```bash
# From the backend/ directory, with venv active
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

**Health check:**
```bash
curl http://localhost:8000/healthz
# → {"ok":true,"service":"wealthagents-api"}
```

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install
```

### Environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Run the frontend

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Running the Full Stack

Open three terminals:

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Layer 2 uAgents (Bull / Bear / Facilitator):**
```bash
cd backend
source venv/bin/activate
set -a; source .env; set +a
python3 -m app.agents.layer2.run_all
```

**Terminal 3 — Frontend:**
```bash
cd frontend
pnpm dev
```

Then open `http://localhost:3000` in your browser.

Notes:
- Layer 2 uAgents may log Almanac/mailbox warnings in local development; this does not block local pipeline testing.
- Keep Backend and Layer 2 uAgents in separate terminals because both run long-lived processes.

---

## Project Structure

```
wealthAgents/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── layer1/          # Cash flow, retirement, housing, investment analysts
│   │   │   ├── layer2/          # Bull/bear debate + facilitator
│   │   │   ├── layer3/          # Portfolio allocator
│   │   │   ├── layer4/          # Risk agents + risk manager
│   │   │   └── layer5/          # Wealth manager (final synthesis)
│   │   ├── llm.py               # ASI:One LLM helper (call_llm)
│   │   ├── main.py              # FastAPI server + SSE endpoints
│   │   ├── market_data.py       # Live market data (rates, CPI, etc.)
│   │   ├── orchestrator.py      # Pipeline runner — wires all 5 layers
│   │   └── schemas.py           # Pydantic data contracts (UserProfile, WealthPlan, etc.)
│   ├── requirements.txt
│   └── .env                     # ← you create this (not committed)
│
└── frontend/
    ├── app/
    │   ├── page.tsx             # Landing page
    │   └── plan/[id]/page.tsx  # Real-time agent conversation + results
    ├── components/
    │   ├── intake-form-section.tsx   # Multi-step intake form
    │   ├── bento/                    # Bento card illustrations
    │   └── ui/                      # shadcn/ui components
    ├── package.json
    └── .env.local                   # ← you create this (not committed)
```

---

## API Reference

### `POST /api/plan/start`
Starts the agent pipeline and returns a plan ID.

**Request body** (`UserProfile`):
```json
{
  "name": "Alex Johnson",
  "age": 28,
  "occupation": "Software Engineer",
  "industry": "Technology & Software",
  "annual_salary": 120000,
  "monthly_expenses": 3500,
  "current_savings": 18000,
  "debt_amount": 0,
  "primary_goal": "Buy a home in Austin, TX for $650,000",
  "target_age": 35,
  "risk_tolerance": "moderate"
}
```

**Response:**
```json
{ "plan_id": "uuid-here" }
```

### `GET /api/plan/{plan_id}/stream`
SSE stream of agent events. Each event has a named type and JSON payload.

| Event type | Payload key | Description |
|------------|-------------|-------------|
| `layer1_start` | `message` | Pipeline starting |
| `market_data` | `mortgage_rate_30yr`, `treasury_10yr`, `cpi_yoy` | Live market snapshot |
| `cash_flow` | `summary`, `monthly_surplus`, ... | Cash flow report |
| `retirement` | `summary`, `recommended_401k_pct`, ... | Retirement report |
| `housing` | `summary`, `years_to_down_payment`, ... | Housing report |
| `investments` | `summary`, `equity_pct`, ... | Investment report |
| `bull_round_N` | `argument`, `confidence` | Bull agent debate round |
| `bear_round_N` | `argument`, `confidence` | Bear agent debate round |
| `debate_verdict` | `summary`, `aggression_dial` | Facilitator verdict |
| `allocation_proposed` | `summary`, bucket percentages | Portfolio allocation |
| `risk_aggressive/neutral/conservative` | `reasoning` | Risk agent views |
| `risk_final` | `summary`, `risk_score`, `warnings` | Final risk decision |
| `wealth_plan` | `headline`, `health_score` | Synthesized plan |
| `done` | Full `WealthPlan` object | Pipeline complete |
| `error` | `message` | Pipeline error |

### `GET /health`
Returns `{"status": "ok"}`.

---

## Common Issues

**`Failed to fetch` on form submit**
→ Make sure the backend is running on port 8000 before submitting the form.

**`ASI_ONE_API_KEY` not set**
→ Create `backend/.env` with your key (see setup above).

**CORS errors in browser**
→ Ensure `ALLOWED_ORIGINS` in `backend/.env` includes your frontend origin (default `http://localhost:3000`).

**`pnpm: command not found`**
→ Install pnpm: `npm install -g pnpm`

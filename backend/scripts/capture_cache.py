"""
capture_cache.py — Demo safety net.

Runs the full pipeline against the canonical demo persona and writes the
event trace to backend/app/demo_cache.json in the format expected by
main.py's _stream_from_cache().

Usage (from repo root):
  cd backend
  python scripts/capture_cache.py

Requires a working ASI_ONE_API_KEY in backend/.env (or environment).
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

# Add backend/app to sys.path so we can import schemas and orchestrator.
sys.path.insert(0, str(Path(__file__).parent.parent / "app"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from orchestrator import run_pipeline  # noqa: E402
from schemas import UserProfile         # noqa: E402

DEMO_PROFILE = UserProfile(
    name="Demo",
    age=28,
    occupation="Software Engineer",
    industry="Tech",
    location="San Francisco, CA",
    annual_salary=145_000,
    monthly_expenses=4_600,
    current_savings=18_000,
    taxable_investments=5_000,
    retirement_balance=12_000,
    debt_amount=0,
    debt_interest_rate=0.0,
    employer_401k_match=4.0,
    primary_goal="Buy a $1M home by 33",
    target_age=33,
    dream_scenario="Maybe start a company",
    risk_tolerance="moderate_aggressive",
)

CACHE_PATH = Path(__file__).parent.parent / "app" / "demo_cache.json"


async def main() -> None:
    events: list[dict] = []
    prev_ts = time.time()

    def on_event(stage: str, payload: dict) -> None:
        nonlocal prev_ts
        now = time.time()
        delay_ms = int((now - prev_ts) * 1000)
        prev_ts = now
        events.append({"stage": stage, "payload": payload, "delay_ms_since_prev": delay_ms})
        print(f"  [{stage}] +{delay_ms}ms")

    print("Running full pipeline against demo persona …")
    plan = await run_pipeline(DEMO_PROFILE, on_event=on_event)

    events.append({
        "stage": "done",
        "payload": json.loads(plan.model_dump_json()),
        "delay_ms_since_prev": 200,
    })

    CACHE_PATH.write_text(json.dumps(events, indent=2, default=str))
    print(f"\nSaved {len(events)} events → {CACHE_PATH}")


if __name__ == "__main__":
    asyncio.run(main())

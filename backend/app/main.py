"""
WealthAgents — FastAPI server.

Two endpoints + healthcheck. In-memory plan store keyed by UUID.
SSE streaming via sse-starlette.

START LOCAL (run from backend/):
  uvicorn app.main:app --reload --port 8000

START PRODUCTION (Render/Railway):
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
"""

import asyncio
import json
import os
import uuid
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app.schemas import UserProfile
from app.orchestrator import run_pipeline

load_dotenv()

app = FastAPI(title="WealthAgents API")

# =============================================================
# CORS
# =============================================================
# Hour 5: allow localhost only.
# Hour 7: add Vercel preview URL after Person 3 deploys.
# Hour 9: lock to specific origins. Comma-separated env var supported.

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================
# In-memory plan store
# =============================================================

plans: Dict[str, asyncio.Queue] = {}


# =============================================================
# Health check
# =============================================================

@app.get("/healthz")
async def healthz():
    return {"ok": True, "service": "wealthagents-api"}


# =============================================================
# Start a plan
# =============================================================

@app.post("/api/plan/start")
async def start_plan(profile: UserProfile):
    """
    Validate the user profile, register a plan_id, and kick off
    the orchestrator pipeline as a background task. The pipeline
    streams events into an asyncio.Queue keyed by plan_id, which
    the /stream endpoint consumes.
    """
    plan_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    plans[plan_id] = queue

    async def background():
        def on_event(stage: str, payload):
            # Orchestrator hands us a dict (already model_dump'd).
            queue.put_nowait({
                "event": stage,
                "data": json.dumps(payload, default=str),
            })

        try:
            plan = await run_pipeline(profile, on_event=on_event)
            queue.put_nowait({
                "event": "done",
                "data": plan.model_dump_json(),
            })
        except Exception as e:
            queue.put_nowait({
                "event": "error",
                "data": json.dumps({"message": str(e), "type": type(e).__name__}),
            })
        finally:
            # Sentinel signals the consumer to close the stream.
            queue.put_nowait(None)

    asyncio.create_task(background())
    return {"plan_id": plan_id}


# =============================================================
# Stream events
# =============================================================

@app.get("/api/plan/{plan_id}/stream")
async def stream_plan(plan_id: str, request: Request, cached: bool = False):
    """
    Stream agent events as Server-Sent Events.

    If ?cached=true, replay from demo_cache.json with realistic delays.
    Use this as a fallback if ASI:One is rate-limited during the demo.
    """
    if cached:
        return EventSourceResponse(_stream_from_cache())

    if plan_id not in plans:
        raise HTTPException(status_code=404, detail="plan_id not found")

    queue = plans[plan_id]

    async def event_gen():
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(queue.get(), timeout=120)
            except asyncio.TimeoutError:
                # No events for 2 minutes — assume something hung. Close.
                yield {"event": "error", "data": json.dumps({"message": "stream timeout"})}
                break

            if event is None:
                # Sentinel — pipeline finished.
                break

            yield event

    return EventSourceResponse(event_gen())


# =============================================================
# Cached replay (demo fallback)
# =============================================================

CACHE_PATH = Path(__file__).parent / "demo_cache.json"


async def _stream_from_cache():
    """
    Replay events from disk with realistic delays.
    Cache format: list of {stage, payload, delay_ms_since_prev}.
    """
    if not CACHE_PATH.exists():
        yield {
            "event": "error",
            "data": json.dumps({"message": "demo_cache.json not found — run capture_cache.py first"}),
        }
        return

    with CACHE_PATH.open() as f:
        events = json.load(f)

    for entry in events:
        delay_s = min(entry.get("delay_ms_since_prev", 800) / 1000, 4.0)
        await asyncio.sleep(delay_s)

        if entry["stage"] == "done":
            yield {"event": "done", "data": json.dumps(entry["payload"], default=str)}
        else:
            yield {"event": entry["stage"], "data": json.dumps(entry["payload"], default=str)}
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
import logging
import os
import uuid
from pathlib import Path
from typing import Dict, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import httpx

load_dotenv()

from app.schemas import UserProfile
from app.orchestrator import run_pipeline
from app.accounts import (
    DuplicateEmailError,
    authenticate_user,
    create_or_get_oauth_user,
    create_session,
    create_user,
    delete_report,
    delete_session,
    get_report,
    get_user_by_token,
    init_db,
    list_reports,
    save_report,
    using_postgres,
)

app = FastAPI(title="WealthAgents API")
init_db()


class AuthRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)


class RegisterRequest(AuthRequest):
    name: str = Field(min_length=1)


class SupabaseAuthRequest(BaseModel):
    access_token: str = Field(min_length=1)


async def _get_supabase_user(access_token: str) -> dict:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_anon_key:
        raise HTTPException(status_code=500, detail="Supabase Auth is not configured")

    auth_url = f"{supabase_url.rstrip('/')}/auth/v1/user"
    async with httpx.AsyncClient(timeout=10.0) as client:
        res = await client.get(
            auth_url,
            headers={
                "apikey": supabase_anon_key,
                "Authorization": f"Bearer {access_token}",
            },
        )
    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Supabase session")
    return res.json()


def _token_from_header(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def optional_current_user(authorization: Optional[str] = Header(default=None)):
    token = _token_from_header(authorization)
    if not token:
        return None
    user = get_user_by_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def require_current_user(authorization: Optional[str] = Header(default=None)):
    token = _token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    user = get_user_by_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def require_token(authorization: Optional[str] = Header(default=None)) -> str:
    token = _token_from_header(authorization)
    if not token or get_user_by_token(token) is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token

# =============================================================
# CORS
# =============================================================
# Hour 5: allow localhost only.
# Hour 7: add Vercel preview URL after Person 3 deploys.
# Hour 9: lock to specific origins. Comma-separated env var supported.

_env_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in _env_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================
# In-memory plan store
# =============================================================
# Each plan is a dict with:
#   events   : list of SSE dicts accumulated so far
#   done     : True once the pipeline finishes or errors
#   notify   : asyncio.Event signalled on every new event
plans: Dict[str, dict] = {}


# =============================================================
# Health check
# =============================================================

@app.get("/healthz")
async def healthz():
    return {
        "ok": True,
        "service": "wealthagents-api",
        "database": "postgres" if using_postgres() else "sqlite",
    }


# =============================================================
# Accounts
# =============================================================

@app.post("/api/auth/register")
async def register(req: RegisterRequest):
    if not req.name.strip():
        raise HTTPException(status_code=422, detail="Name is required")
    try:
        user = create_user(req.email, req.password, req.name)
    except DuplicateEmailError:
        raise HTTPException(status_code=409, detail="Email already registered")
    token = create_session(user["id"])
    return {"token": token, "user": user}


@app.post("/api/auth/login")
async def login(req: AuthRequest):
    user = authenticate_user(req.email, req.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_session(user["id"])
    return {"token": token, "user": user}


@app.post("/api/auth/supabase")
async def supabase_login(req: SupabaseAuthRequest):
    supabase_user = await _get_supabase_user(req.access_token)
    email = supabase_user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Supabase user has no email")

    metadata = supabase_user.get("user_metadata") or {}
    display_name = (
        metadata.get("full_name")
        or metadata.get("name")
        or metadata.get("preferred_username")
        or email.split("@")[0]
    )

    user = create_or_get_oauth_user(
        email=email,
        name=display_name,
        provider="supabase",
        provider_subject=supabase_user["id"],
    )
    token = create_session(user["id"])
    return {"token": token, "user": user}


@app.post("/api/auth/logout")
async def logout(token: str = Depends(require_token)):
    delete_session(token)
    return {"ok": True}


@app.get("/api/auth/me")
async def me(user=Depends(require_current_user)):
    return {"user": user}


@app.get("/api/reports")
async def reports(user=Depends(require_current_user)):
    return {"reports": list_reports(user["id"])}


@app.get("/api/reports/{report_id}")
async def report_detail(report_id: str, user=Depends(require_current_user)):
    report = get_report(user["id"], report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.delete("/api/reports/{report_id}")
async def remove_report(report_id: str, user=Depends(require_current_user)):
    if not delete_report(user["id"], report_id):
        raise HTTPException(status_code=404, detail="Report not found")
    return {"ok": True}


# =============================================================
# Start a plan
# =============================================================

@app.post("/api/plan/start")
async def start_plan(profile: UserProfile, user=Depends(optional_current_user)):
    """
    Validate the user profile, register a plan_id, and kick off
    the orchestrator pipeline as a background task. The pipeline
    streams events into an asyncio.Queue keyed by plan_id, which
    the /stream endpoint consumes.
    """
    plan_id = str(uuid.uuid4())
    store: dict = {
        "events": [],
        "done": False,
        "notify": asyncio.Event(),
        "user_id": user["id"] if user else None,
    }
    plans[plan_id] = store

    async def background():
        def on_event(stage: str, payload):
            store["events"].append({
                "event": stage,
                "data": json.dumps(payload, default=str),
            })
            store["notify"].set()

        try:
            plan = await run_pipeline(profile, on_event=on_event)
            if store.get("user_id"):
                report_id = save_report(store["user_id"], plan_id, profile, plan)
                store["events"].append({
                    "event": "report_saved",
                    "data": json.dumps({"report_id": report_id}),
                })
            store["events"].append({
                "event": "done",
                "data": plan.model_dump_json(),
            })
        except Exception as e:
            store["events"].append({
                "event": "error",
                "data": json.dumps({"message": str(e), "type": type(e).__name__}),
            })
        finally:
            store["done"] = True
            store["notify"].set()

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

    store = plans[plan_id]

    async def event_gen():
        cursor = 0
        while True:
            if await request.is_disconnected():
                break

            events = store["events"]
            if cursor < len(events):
                event = events[cursor]
                cursor += 1
                yield event
                if event.get("event") in ("done", "error"):
                    break
                continue

            if store["done"]:
                break

            # Nothing new yet — wait for the pipeline to signal
            store["notify"].clear()
            try:
                await asyncio.wait_for(store["notify"].wait(), timeout=25)
            except asyncio.TimeoutError:
                yield {"data": ": keepalive"}
                continue

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

from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.schemas import UserProfile, WealthPlan


DB_PATH = Path(os.getenv("WEALTHAGENTS_DB", Path(__file__).parent / "data" / "wealthagents.sqlite3"))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                plan_id TEXT NOT NULL,
                title TEXT NOT NULL,
                profile_json TEXT NOT NULL,
                plan_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 150_000)
    return f"pbkdf2_sha256${salt}${digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt, expected = stored.split("$", 2)
    except ValueError:
        return False
    if scheme != "pbkdf2_sha256":
        return False
    candidate = _hash_password(password, salt).split("$", 2)[2]
    return secrets.compare_digest(candidate, expected)


def create_user(email: str, password: str, name: str) -> dict[str, str]:
    init_db()
    user_id = secrets.token_urlsafe(16)
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO users (id, email, name, password_hash, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, _normalize_email(email), name.strip(), _hash_password(password), _now()),
        )
    return {"id": user_id, "email": _normalize_email(email), "name": name.strip()}


def authenticate_user(email: str, password: str) -> Optional[dict[str, str]]:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, email, name, password_hash FROM users WHERE email = ?",
            (_normalize_email(email),),
        ).fetchone()
    if row is None or not _verify_password(password, row["password_hash"]):
        return None
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


def create_session(user_id: str) -> str:
    init_db()
    token = secrets.token_urlsafe(32)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, user_id, _now()),
        )
    return token


def get_user_by_token(token: str) -> Optional[dict[str, str]]:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT users.id, users.email, users.name
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()
    if row is None:
        return None
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


def delete_session(token: str) -> None:
    init_db()
    with _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def save_report(user_id: str, plan_id: str, profile: UserProfile, plan: WealthPlan) -> str:
    init_db()
    report_id = secrets.token_urlsafe(16)
    title = f"{profile.name} - {profile.primary_goal}"[:120]
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO reports (id, user_id, plan_id, title, profile_json, plan_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                user_id,
                plan_id,
                title,
                profile.model_dump_json(),
                plan.model_dump_json(),
                _now(),
            ),
        )
    return report_id


def list_reports(user_id: str) -> list[dict[str, Any]]:
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT id, plan_id, title, profile_json, plan_json, created_at
            FROM reports
            WHERE user_id = ?
            ORDER BY created_at DESC
            """,
            (user_id,),
        ).fetchall()

    reports: list[dict[str, Any]] = []
    for row in rows:
        profile = json.loads(row["profile_json"])
        plan = json.loads(row["plan_json"])
        reports.append(
            {
                "id": row["id"],
                "plan_id": row["plan_id"],
                "title": row["title"],
                "created_at": row["created_at"],
                "profile_name": profile.get("name"),
                "primary_goal": profile.get("primary_goal"),
                "headline": plan.get("headline"),
                "health_score": plan.get("health_score"),
            }
        )
    return reports


def get_report(user_id: str, report_id: str) -> Optional[dict[str, Any]]:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            """
            SELECT id, plan_id, title, profile_json, plan_json, created_at
            FROM reports
            WHERE user_id = ? AND id = ?
            """,
            (user_id, report_id),
        ).fetchone()
    if row is None:
        return None
    return {
        "id": row["id"],
        "plan_id": row["plan_id"],
        "title": row["title"],
        "created_at": row["created_at"],
        "profile": json.loads(row["profile_json"]),
        "plan": json.loads(row["plan_json"]),
    }


def delete_report(user_id: str, report_id: str) -> bool:
    init_db()
    with _connect() as conn:
        cursor = conn.execute("DELETE FROM reports WHERE user_id = ? AND id = ?", (user_id, report_id))
    return cursor.rowcount > 0

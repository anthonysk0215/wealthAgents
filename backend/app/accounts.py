from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator, Optional

from app.schemas import UserProfile, WealthPlan


DEFAULT_DB_PATH = Path(__file__).parent / "data" / "wealthagents.sqlite3"
DB_PATH = Path(os.getenv("WEALTHAGENTS_DB", DEFAULT_DB_PATH))


def _database_url() -> Optional[str]:
    return os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")


def _db_path() -> Path:
    return Path(os.getenv("WEALTHAGENTS_DB", DB_PATH))


class DuplicateEmailError(Exception):
    pass


def using_postgres() -> bool:
    return bool(_database_url())


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


@contextmanager
def _sqlite_conn() -> Iterator[sqlite3.Connection]:
    db_path = _db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


@contextmanager
def _postgres_conn():
    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise RuntimeError("Postgres auth requires psycopg. Run: pip install -r requirements.txt") from exc

    conn = psycopg.connect(_database_url(), row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def _param() -> str:
    return "%s" if using_postgres() else "?"


def _row_get(row, key: str):
    if isinstance(row, dict):
        return row[key]
    return row[key]


def init_db() -> None:
    if using_postgres():
        with _postgres_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS reports (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    plan_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    profile_json JSONB NOT NULL,
                    plan_json JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """
            )
            conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC)")
        return

    with _sqlite_conn() as conn:
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

            CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at DESC);
            """
        )


def _is_unique_email_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "unique" in text and "email" in text


def create_user(email: str, password: str, name: str) -> dict[str, str]:
    init_db()
    user_id = secrets.token_urlsafe(16)
    normalized_email = _normalize_email(email)
    try:
        if using_postgres():
            with _postgres_conn() as conn:
                conn.execute(
                    """
                    INSERT INTO users (id, email, name, password_hash, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user_id, normalized_email, name.strip(), _hash_password(password), _now()),
                )
        else:
            with _sqlite_conn() as conn:
                conn.execute(
                    """
                    INSERT INTO users (id, email, name, password_hash, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, normalized_email, name.strip(), _hash_password(password), _now()),
                )
    except Exception as exc:
        if _is_unique_email_error(exc):
            raise DuplicateEmailError from exc
        raise
    return {"id": user_id, "email": normalized_email, "name": name.strip()}


def create_or_get_oauth_user(email: str, name: str, provider: str, provider_subject: str) -> dict[str, str]:
    init_db()
    normalized_email = _normalize_email(email)
    placeholder = _param()
    select_sql = f"SELECT id, email, name FROM users WHERE email = {placeholder}"

    if using_postgres():
        with _postgres_conn() as conn:
            row = conn.execute(select_sql, (normalized_email,)).fetchone()
    else:
        with _sqlite_conn() as conn:
            row = conn.execute(select_sql, (normalized_email,)).fetchone()

    if row is not None:
        return {"id": _row_get(row, "id"), "email": _row_get(row, "email"), "name": _row_get(row, "name")}

    user_id = secrets.token_urlsafe(16)
    display_name = name.strip() or normalized_email.split("@")[0]
    oauth_marker = f"oauth_{provider}${provider_subject}"
    try:
        if using_postgres():
            with _postgres_conn() as conn:
                conn.execute(
                    """
                    INSERT INTO users (id, email, name, password_hash, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (user_id, normalized_email, display_name, oauth_marker, _now()),
                )
        else:
            with _sqlite_conn() as conn:
                conn.execute(
                    """
                    INSERT INTO users (id, email, name, password_hash, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, normalized_email, display_name, oauth_marker, _now()),
                )
    except Exception as exc:
        if not _is_unique_email_error(exc):
            raise
        if using_postgres():
            with _postgres_conn() as conn:
                row = conn.execute(select_sql, (normalized_email,)).fetchone()
        else:
            with _sqlite_conn() as conn:
                row = conn.execute(select_sql, (normalized_email,)).fetchone()
        if row is None:
            raise
        return {"id": _row_get(row, "id"), "email": _row_get(row, "email"), "name": _row_get(row, "name")}

    return {"id": user_id, "email": normalized_email, "name": display_name}


def authenticate_user(email: str, password: str) -> Optional[dict[str, str]]:
    init_db()
    placeholder = _param()
    sql = f"SELECT id, email, name, password_hash FROM users WHERE email = {placeholder}"
    if using_postgres():
        with _postgres_conn() as conn:
            row = conn.execute(sql, (_normalize_email(email),)).fetchone()
    else:
        with _sqlite_conn() as conn:
            row = conn.execute(sql, (_normalize_email(email),)).fetchone()
    if row is None or not _verify_password(password, _row_get(row, "password_hash")):
        return None
    return {"id": _row_get(row, "id"), "email": _row_get(row, "email"), "name": _row_get(row, "name")}


def create_session(user_id: str) -> str:
    init_db()
    token = secrets.token_urlsafe(32)
    if using_postgres():
        with _postgres_conn() as conn:
            conn.execute(
                "INSERT INTO sessions (token, user_id, created_at) VALUES (%s, %s, %s)",
                (token, user_id, _now()),
            )
    else:
        with _sqlite_conn() as conn:
            conn.execute(
                "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
                (token, user_id, _now()),
            )
    return token


def get_user_by_token(token: str) -> Optional[dict[str, str]]:
    init_db()
    placeholder = _param()
    sql = f"""
        SELECT users.id, users.email, users.name
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = {placeholder}
    """
    if using_postgres():
        with _postgres_conn() as conn:
            row = conn.execute(sql, (token,)).fetchone()
    else:
        with _sqlite_conn() as conn:
            row = conn.execute(sql, (token,)).fetchone()
    if row is None:
        return None
    return {"id": _row_get(row, "id"), "email": _row_get(row, "email"), "name": _row_get(row, "name")}


def delete_session(token: str) -> None:
    init_db()
    if using_postgres():
        with _postgres_conn() as conn:
            conn.execute("DELETE FROM sessions WHERE token = %s", (token,))
    else:
        with _sqlite_conn() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def save_report(user_id: str, plan_id: str, profile: UserProfile, plan: WealthPlan) -> str:
    init_db()
    report_id = secrets.token_urlsafe(16)
    title = f"{profile.name} - {profile.primary_goal}"[:120]
    profile_json = profile.model_dump_json()
    plan_json = plan.model_dump_json()
    if using_postgres():
        with _postgres_conn() as conn:
            conn.execute(
                """
                INSERT INTO reports (id, user_id, plan_id, title, profile_json, plan_json, created_at)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s)
                """,
                (report_id, user_id, plan_id, title, profile_json, plan_json, _now()),
            )
    else:
        with _sqlite_conn() as conn:
            conn.execute(
                """
                INSERT INTO reports (id, user_id, plan_id, title, profile_json, plan_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (report_id, user_id, plan_id, title, profile_json, plan_json, _now()),
            )
    return report_id


def _loads_json(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    return json.loads(value)


def list_reports(user_id: str) -> list[dict[str, Any]]:
    init_db()
    placeholder = _param()
    sql = f"""
        SELECT id, plan_id, title, profile_json, plan_json, created_at
        FROM reports
        WHERE user_id = {placeholder}
        ORDER BY created_at DESC
    """
    if using_postgres():
        with _postgres_conn() as conn:
            rows = conn.execute(sql, (user_id,)).fetchall()
    else:
        with _sqlite_conn() as conn:
            rows = conn.execute(sql, (user_id,)).fetchall()

    reports: list[dict[str, Any]] = []
    for row in rows:
        profile = _loads_json(_row_get(row, "profile_json"))
        plan = _loads_json(_row_get(row, "plan_json"))
        created_at = _row_get(row, "created_at")
        reports.append(
            {
                "id": _row_get(row, "id"),
                "plan_id": _row_get(row, "plan_id"),
                "title": _row_get(row, "title"),
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
                "profile_name": profile.get("name"),
                "primary_goal": profile.get("primary_goal"),
                "headline": plan.get("headline"),
                "health_score": plan.get("health_score"),
            }
        )
    return reports


def get_report(user_id: str, report_id: str) -> Optional[dict[str, Any]]:
    init_db()
    placeholder = _param()
    sql = f"""
        SELECT id, plan_id, title, profile_json, plan_json, created_at
        FROM reports
        WHERE user_id = {placeholder} AND id = {placeholder}
    """
    if using_postgres():
        with _postgres_conn() as conn:
            row = conn.execute(sql, (user_id, report_id)).fetchone()
    else:
        with _sqlite_conn() as conn:
            row = conn.execute(sql, (user_id, report_id)).fetchone()
    if row is None:
        return None
    created_at = _row_get(row, "created_at")
    return {
        "id": _row_get(row, "id"),
        "plan_id": _row_get(row, "plan_id"),
        "title": _row_get(row, "title"),
        "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
        "profile": _loads_json(_row_get(row, "profile_json")),
        "plan": _loads_json(_row_get(row, "plan_json")),
    }


def delete_report(user_id: str, report_id: str) -> bool:
    init_db()
    if using_postgres():
        with _postgres_conn() as conn:
            cursor = conn.execute("DELETE FROM reports WHERE user_id = %s AND id = %s", (user_id, report_id))
    else:
        with _sqlite_conn() as conn:
            cursor = conn.execute("DELETE FROM reports WHERE user_id = ? AND id = ?", (user_id, report_id))
    return cursor.rowcount > 0

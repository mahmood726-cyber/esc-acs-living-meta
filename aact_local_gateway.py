#!/usr/bin/env python3
"""
Local AACT SQL gateway for ESC living-review workflows.

Purpose:
- Keep AACT credentials server-side (never in browser JS)
- Execute parameterized SELECT queries from living-review.js
- Return JSON rows to localhost browser clients

Usage:
  set AACT_USER=your_username
  set AACT_PASSWORD=your_password
  python aact_local_gateway.py

Default endpoint:
  POST http://127.0.0.1:8787/aact/query
"""

from __future__ import annotations

import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Sequence, Tuple
from datetime import date, datetime


try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    DB_DRIVER = "psycopg2"
except ImportError:  # pragma: no cover
    try:
        import pg8000
        DB_DRIVER = "pg8000"
    except ImportError:
        DB_DRIVER = None


ALLOWED_QUERY_IDS = {"esc_aact_rct_search"}
FORBIDDEN_SQL_TOKENS = (
    " insert ",
    " update ",
    " delete ",
    " drop ",
    " alter ",
    " create ",
    " grant ",
    " revoke ",
    " truncate ",
)

PLACEHOLDER_PATTERN = re.compile(r"\$(\d+)")


def get_config() -> Dict[str, Any]:
    return {
        "host": os.environ.get("AACT_HOST", "aact-db.ctti-clinicaltrials.org"),
        "port": int(os.environ.get("AACT_PORT", "5432")),
        "database": os.environ.get("AACT_DATABASE", "aact"),
        "user": os.environ.get("AACT_USER", "").strip(),
        "password": os.environ.get("AACT_PASSWORD", "").strip(),
    }


def validate_sql(sql: str) -> Tuple[bool, str]:
    normalized = f" {sql.strip().lower()} "
    if not normalized.strip().startswith("select"):
        return False, "Only SELECT statements are allowed."
    if "from ctgov." not in normalized:
        return False, "Query must target ctgov schema."
    for token in FORBIDDEN_SQL_TOKENS:
        if token in normalized:
            return False, f"Forbidden SQL token detected: {token.strip()}"
    return True, ""


def convert_postgres_placeholders(sql: str, parameters: Sequence[Any]) -> Tuple[str, List[Any]]:
    """
    Convert PostgreSQL-style placeholders ($1, $2, ...) to DB-API placeholders (%s)
    and reorder parameters according to placeholder appearance.
    """
    ordered_params: List[Any] = []

    def _replace(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        if idx < 1 or idx > len(parameters):
            raise RuntimeError(f"SQL placeholder ${idx} has no matching parameter.")
        ordered_params.append(parameters[idx - 1])
        return "%s"

    converted_sql = PLACEHOLDER_PATTERN.sub(_replace, sql)
    if ordered_params:
        return converted_sql, ordered_params
    return sql, list(parameters)


def execute_query(sql: str, parameters: Sequence[Any]) -> List[Dict[str, Any]]:
    cfg = get_config()
    if not cfg["user"] or not cfg["password"]:
        raise RuntimeError("AACT credentials are missing. Set AACT_USER and AACT_PASSWORD.")
    if DB_DRIVER is None:
        raise RuntimeError("No PostgreSQL driver available. Install psycopg2-binary or pg8000.")

    if DB_DRIVER == "psycopg2":
        sql_text, sql_params = convert_postgres_placeholders(sql, parameters)
        conn = psycopg2.connect(
            host=cfg["host"],
            port=cfg["port"],
            database=cfg["database"],
            user=cfg["user"],
            password=cfg["password"],
            sslmode="require",
        )
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql_text, sql_params)
                rows = cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    # pg8000 fallback
    sql_text, sql_params = convert_postgres_placeholders(sql, parameters)
    conn = pg8000.connect(
        host=cfg["host"],
        port=cfg["port"],
        database=cfg["database"],
        user=cfg["user"],
        password=cfg["password"],
        ssl_context=True,
    )
    try:
        cursor = conn.cursor()
        cursor.execute(sql_text, sql_params)
        columns = [c[0] for c in (cursor.description or [])]
        rows = cursor.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    finally:
        conn.close()


def _json_default(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


class GatewayHandler(BaseHTTPRequestHandler):
    server_version = "AACTLocalGateway/1.0"

    def _send_json(self, status: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=True, default=_json_default).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json(200, {"ok": True})

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") == "/health":
            cfg = get_config()
            self._send_json(
                200,
                {
                    "ok": True,
                    "driver": DB_DRIVER,
                    "configured": bool(cfg["user"] and cfg["password"]),
                    "host": cfg["host"],
                    "database": cfg["database"],
                },
            )
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/aact/query":
            self._send_json(404, {"error": "Not found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception:
            self._send_json(400, {"error": "Invalid JSON payload"})
            return

        query_id = str(payload.get("queryId", "")).strip()
        if query_id not in ALLOWED_QUERY_IDS:
            self._send_json(403, {"error": f"queryId '{query_id}' is not allowed"})
            return

        sql = str(payload.get("sql", "")).strip()
        params = payload.get("parameters", [])
        if not isinstance(params, list):
            self._send_json(400, {"error": "parameters must be an array"})
            return

        valid, reason = validate_sql(sql)
        if not valid:
            self._send_json(400, {"error": reason})
            return

        try:
            rows = execute_query(sql, params)
            self._send_json(200, {"rows": rows, "count": len(rows)})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})


def main() -> None:
    host = os.environ.get("AACT_GATEWAY_HOST", "127.0.0.1")
    port = int(os.environ.get("AACT_GATEWAY_PORT", "8787"))
    server = ThreadingHTTPServer((host, port), GatewayHandler)
    print(f"AACT local gateway listening on http://{host}:{port}")
    print("Health check: GET /health")
    print("Query endpoint: POST /aact/query")
    server.serve_forever()


if __name__ == "__main__":
    main()

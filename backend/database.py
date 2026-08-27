"""
Database Connection & Query Execution Layer
Student Learning Analytics & Decision Intelligence Platform

Provides thread-safe connection pooling, read-only transaction enforcement,
strict query execution timeouts, and SQL safety validation to guarantee zero mutations.
"""
import logging
from contextlib import contextmanager
from typing import Any, Dict, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

from backend.config import settings
from backend.sql_guard import sanitize_and_validate_sql, SqlGuardrailViolation

logger = logging.getLogger("backend.database")

# Re-export for convenience and compatibility
DatabaseSecurityViolation = SqlGuardrailViolation

# Global thread-safe connection pool
_pool: Optional[ThreadedConnectionPool] = None


def init_connection_pool() -> ThreadedConnectionPool:
    """Initializes the PostgreSQL connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        _pool = ThreadedConnectionPool(
            minconn=settings.DB_POOL_MIN,
            maxconn=settings.DB_POOL_MAX,
            host=settings.POSTGRES_HOST,
            port=settings.POSTGRES_PORT,
            dbname=settings.POSTGRES_DB,
            user=settings.POSTGRES_USER,
            password=settings.POSTGRES_PASSWORD,
        )
        logger.info("PostgreSQL connection pool initialized successfully.")
    return _pool


def get_connection_pool() -> ThreadedConnectionPool:
    """Retrieves the active connection pool, initializing it if necessary."""
    global _pool
    if _pool is None or _pool.closed:
        return init_connection_pool()
    return _pool


def close_connection_pool() -> None:
    """Closes all connections in the pool gracefully."""
    global _pool
    if _pool is not None and not _pool.closed:
        _pool.closeall()
        logger.info("PostgreSQL connection pool closed.")
        _pool = None


@contextmanager
def get_db_cursor(read_only: bool = True):
    """
    Context manager yielding a RealDictCursor with automatic connection release.
    Enforces read-only sessions and statement timeouts by default.
    """
    pool = get_connection_pool()
    conn = pool.getconn()
    try:
        # Enforce read-only at session level as an absolute invariant
        conn.set_session(readonly=True, autocommit=True)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            timeout_ms = settings.DB_STATEMENT_TIMEOUT_MS
            cur.execute(f"SET statement_timeout = '{timeout_ms}';")
            yield cur
    finally:
        pool.putconn(conn)


def check_connection() -> Dict[str, Any]:
    """
    Safely executes a read-only ping to verify PostgreSQL connectivity.
    """
    try:
        with get_db_cursor(read_only=True) as cur:
            cur.execute("SELECT 1 AS ping, current_database() AS db, version() AS db_version;")
            row = cur.fetchone()
            if row and row["ping"] == 1:
                return {
                    "status": "connected",
                    "database": row["db"],
                    "read_only": True,
                    "version_summary": row["db_version"].split(",")[0] if "db_version" in row else "PostgreSQL",
                }
            return {"status": "error", "message": "Unexpected ping response"}
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return {
            "status": "disconnected",
            "error": str(e)
        }


def fetch_all(sql: str, params: Optional[tuple] = None, sanitize: bool = True, max_limit: int = 100) -> List[Dict[str, Any]]:
    """
    Executes a read-only parameterized query and returns matching rows as a list of dictionaries.
    """
    executed_sql = sql
    if sanitize:
        executed_sql = sanitize_and_validate_sql(sql, max_limit=max_limit)

    with get_db_cursor(read_only=True) as cur:
        if params is not None and len(params) > 0:
            cur.execute(executed_sql, params)
        else:
            cur.execute(executed_sql)
        return [dict(row) for row in cur.fetchall()]


def fetch_one(sql: str, params: Optional[tuple] = None, sanitize: bool = True) -> Optional[Dict[str, Any]]:
    """
    Executes a read-only parameterized query and returns a single row as a dictionary, or None.
    """
    executed_sql = sql
    if sanitize:
        executed_sql = sanitize_and_validate_sql(sql, max_limit=1)

    with get_db_cursor(read_only=True) as cur:
        if params is not None and len(params) > 0:
            cur.execute(executed_sql, params)
        else:
            cur.execute(executed_sql)
        row = cur.fetchone()
        return dict(row) if row else None

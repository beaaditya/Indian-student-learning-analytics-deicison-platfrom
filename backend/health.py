"""
System Health Check Router
Student Learning Analytics & Decision Intelligence Platform

Provides /health endpoint for uptime monitoring and PostgreSQL connectivity checks.
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from backend.database import check_connection

router = APIRouter(tags=["System"])


@router.get("/health", summary="System Health Check")
def get_health():
    """
    Checks backend service status and verifies read-only PostgreSQL database connectivity.
    """
    db_health = check_connection()
    is_db_connected = db_health.get("status") == "connected"

    payload = {
        "status": "healthy" if is_db_connected else "degraded",
        "service": "Student Learning Analytics Decision Intelligence API",
        "database": "connected" if is_db_connected else "disconnected",
        "details": db_health
    }

    if not is_db_connected:
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)

    return payload

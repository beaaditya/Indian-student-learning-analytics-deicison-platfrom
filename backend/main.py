"""
FastAPI Main Application
Student Learning Analytics & Decision Intelligence Platform

Configures FastAPI, CORS, system health check, connection pool lifecycle,
and registers architectural API router structure for future analytics endpoints.
"""
from contextlib import asynccontextmanager
import logging
from typing import Optional
from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import init_connection_pool, close_connection_pool
from backend.health import router as health_router
from backend.overview import get_executive_overview
from backend.schools import get_schools, get_school_details
from backend.grades import get_grades_overview
from backend.subjects import get_subjects_overview
from backend.students import get_students, get_student_profile
from backend.risk import get_risk_overview
from backend.interventions import get_interventions_overview
from backend.insights import get_proactive_insights
from backend.agent import execute_agent_query
from pydantic import BaseModel, Field

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown lifecycle.
    Initializes PostgreSQL connection pool on startup and gracefully shuts down on exit.
    """
    logger.info("Starting up Student Learning Analytics Platform backend...")
    try:
        init_connection_pool()
        logger.info("Database connection pool initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize database pool on startup: {e}")
    
    yield

    logger.info("Shutting down backend, releasing database connection pool...")
    close_connection_pool()
    logger.info("Backend shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# ------------------------------------------------------------------------------
# CORS Middleware Configuration
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Core System Routers
# ------------------------------------------------------------------------------
# Health check available at /health and /api/health
app.include_router(health_router)
app.include_router(health_router, prefix=settings.API_V1_PREFIX)


# ------------------------------------------------------------------------------
# 1. Executive Overview Endpoint
# ------------------------------------------------------------------------------
@app.get("/api/overview", tags=["Executive Analytics"], summary="Executive Overview Analytics")
def get_overview(
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    management_type: Optional[str] = Query(None, description="Filter by management type (e.g. Government, Private, Aided)"),
    academic_year: Optional[str] = Query(None, description="Filter by academic year (e.g. 2024-25)"),
    grade: Optional[int] = Query(None, ge=6, le=10, description="Filter by grade (6-10)")
):
    """
    Returns executive learning performance KPIs, longitudinal trends,
    performance band distributions, and institutional rankings.
    """
    try:
        return get_executive_overview(
            state=state,
            district=district,
            management_type=management_type,
            academic_year=academic_year,
            grade=grade
        )
    except Exception as e:
        logger.error(f"Error fetching executive overview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 2. Schools Analytics Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/schools", tags=["School Analytics"], summary="List School Performance Scorecards")
def list_schools(
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    school_type: Optional[str] = Query(None, description="Filter by school type (e.g. Higher Secondary, Secondary, High School)"),
    management_type: Optional[str] = Query(None, description="Filter by management type (e.g. State Government, Private Management, Government Aided)"),
    board: Optional[str] = Query(None, description="Filter by board (e.g. CBSE, ICSE, State Board)"),
    urban_rural: Optional[str] = Query(None, description="Filter by locality (Urban/Rural)"),
    search: Optional[str] = Query(None, description="Search by school name or school ID"),
    limit: int = Query(50, ge=1, le=500, description="Page limit / size"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=500, description="Page size")
):
    """
    Returns school performance scorecards with demographic filtering, search, and safe pagination.
    """
    try:
        return get_schools(
            state=state,
            district=district,
            school_type=school_type,
            management_type=management_type,
            board=board,
            urban_rural=urban_rural,
            search=search,
            limit=limit,
            offset=offset,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Error listing schools: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schools/{school_id}", tags=["School Analytics"], summary="School Intelligence Diagnostic Profile")
def get_single_school(school_id: str):
    """
    Returns exhaustive institutional diagnostic profile for a specific school,
    including metadata, performance metrics, grade-level breakdown, subject breakdown,
    longitudinal monthly trends, and risk summaries.
    """
    try:
        res = get_school_details(school_id)
        if res.get("status") == "not_found":
            raise HTTPException(status_code=404, detail=res["message"])
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching school details for '{school_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 3. Grade Analytics Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/grades", tags=["Grade Analytics"], summary="Grade-Level Learning Outcomes & Diagnostics")
def list_grades(
    school_id: Optional[str] = Query(None, description="Filter by school ID"),
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district"),
    management_type: Optional[str] = Query(None, description="Filter by management type")
):
    """
    Returns grade-level learning outcomes, sub-skill diagnostics, and cohort transition step gaps (Grades 6-10).
    """
    try:
        return get_grades_overview(
            school_id=school_id,
            state=state,
            district=district,
            management_type=management_type
        )
    except Exception as e:
        logger.error(f"Error fetching grade analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 4. Subject Analytics Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/subjects", tags=["Subject Analytics"], summary="Subject-Level Competency & Diagnostics")
def list_subjects(
    grade: Optional[int] = Query(None, ge=6, le=10, description="Filter by grade (6-10)"),
    school_id: Optional[str] = Query(None, description="Filter by school ID"),
    state: Optional[str] = Query(None, description="Filter by state"),
    district: Optional[str] = Query(None, description="Filter by district")
):
    """
    Returns subject performance metrics, sub-skill competency breakdowns, and learning deficit detection.
    """
    try:
        return get_subjects_overview(
            grade=grade,
            school_id=school_id,
            state=state,
            district=district
        )
    except Exception as e:
        logger.error(f"Error fetching subject analytics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 5. Student Analytics Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/students", tags=["Student Analytics"], summary="List Student Analytical Directory")
def list_students(
    school_id: Optional[str] = Query(None, description="Filter by school ID"),
    grade: Optional[int] = Query(None, ge=6, le=10, description="Filter by grade (6-10)"),
    gender: Optional[str] = Query(None, description="Filter by gender (Male/Female)"),
    socioeconomic_band: Optional[str] = Query(None, description="Filter by socioeconomic band"),
    benchmark_status: Optional[str] = Query(None, description="Filter by benchmark status (e.g. Meets Benchmark, Below Benchmark)"),
    risk_status: Optional[str] = Query(None, description="Filter by risk status (e.g. High, Medium, Low, None)"),
    search: Optional[str] = Query(None, description="Search by student ID or school name"),
    limit: int = Query(50, ge=1, le=500, description="Page limit / size"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=500, description="Page size")
):
    """
    Returns student analytical directory with demographic, academic, and risk filtering, and safe pagination.
    """
    try:
        return get_students(
            school_id=school_id,
            grade=grade,
            gender=gender,
            socioeconomic_band=socioeconomic_band,
            benchmark_status=benchmark_status,
            risk_status=risk_status,
            search=search,
            limit=limit,
            offset=offset,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Error listing students: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/students/{student_id}", tags=["Student Analytics"], summary="Student 360-Degree Learning Profile")
def get_single_student(student_id: str):
    """
    Returns an exhaustive 360-degree learning diagnostic profile for a specific student,
    including metadata, sub-skill diagnostics, assessment history, engagement timelines, and risk cases.
    """
    try:
        res = get_student_profile(student_id)
        if res.get("status") == "not_found":
            raise HTTPException(status_code=404, detail=res["message"])
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching student profile for '{student_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class AgentQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Natural language analytical question")
    context: Optional[list] = Field(None, description="Optional conversation context")


# ------------------------------------------------------------------------------
# 6. Risk & Early Warning Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/risk", tags=["Risk Analytics"], summary="Risk Severity & Triage Queue")
def list_risk(
    school_id: Optional[str] = Query(None, description="Filter by school ID"),
    grade: Optional[int] = Query(None, ge=6, le=10, description="Filter by grade (6-10)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (High, Medium, Low)"),
    priority: Optional[str] = Query(None, description="Filter by priority (Critical, High, Medium)"),
    status: Optional[str] = Query(None, description="Filter by intervention status (Open, In Progress, Resolved)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Returns risk diagnostic summaries, root-cause distribution, and prioritized triage queue.
    """
    try:
        return get_risk_overview(
            school_id=school_id,
            grade=grade,
            risk_level=risk_level,
            priority=priority,
            status=status,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Error fetching risk overview: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 7. Intervention Intelligence Endpoints
# ------------------------------------------------------------------------------
@app.get("/api/interventions", tags=["Intervention Analytics"], summary="Intervention ROI & Remediation Tracking")
def list_interventions(
    school_id: Optional[str] = Query(None, description="Filter by school ID"),
    grade: Optional[int] = Query(None, ge=6, le=10, description="Filter by grade (6-10)"),
    status: Optional[str] = Query(None, description="Filter by intervention status"),
    effectiveness_category: Optional[str] = Query(None, description="Filter by effectiveness category"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Returns intervention effectiveness metrics, status breakdowns, and pre/post score recovery records.
    """
    try:
        return get_interventions_overview(
            school_id=school_id,
            grade=grade,
            status=status,
            effectiveness_category=effectiveness_category,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Error fetching interventions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 8. AI Insights Endpoints (Proactive Grounded Intelligence)
# ------------------------------------------------------------------------------
@app.get("/api/insights", tags=["AI Insights"], summary="Proactive Grounded Learning Insights")
def list_insights(
    category: Optional[str] = Query(None, description="Filter by insight category"),
    priority: Optional[str] = Query(None, description="Filter by priority (Critical, High, Medium, Positive)"),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Returns prioritized list of grounded insight cards and macro summary KPIs.
    """
    try:
        return get_proactive_insights(category=category, priority=priority, limit=limit)
    except Exception as e:
        logger.error(f"Error fetching proactive insights: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/insights/generate", tags=["AI Insights"], summary="Trigger Fresh Grounded Insight Detection")
def generate_insights():
    """
    Re-scans live database facts and returns refreshed prioritized insight cards.
    """
    try:
        return get_proactive_insights()
    except Exception as e:
        logger.error(f"Error generating fresh insights: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# 9. AI Student Analyst Endpoints
# ------------------------------------------------------------------------------
@app.post("/api/agent/query", tags=["AI Analyst"], summary="Natural Language Analytical Query Investigation")
def post_agent_query(request: AgentQueryRequest):
    """
    Translates user natural language questions into safe, allowlisted SQL queries,
    retrieves grounded evidence from PostgreSQL, and synthesizes an executive explanation.
    """
    try:
        return execute_agent_query(request.question, request.context)
    except Exception as e:
        logger.error(f"Error executing agent query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ------------------------------------------------------------------------------
# Prepared API Router Architecture for Future Analytical Modules
# ------------------------------------------------------------------------------
api_router = APIRouter(prefix=settings.API_V1_PREFIX)

@api_router.get("/status", tags=["System"])
def api_status():
    """Returns general API status and architecture overview."""
    return {
        "status": "ready",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "planned_modules": [
            f"{settings.API_V1_PREFIX}/overview",
            f"{settings.API_V1_PREFIX}/schools",
            f"{settings.API_V1_PREFIX}/grades",
            f"{settings.API_V1_PREFIX}/subjects",
            f"{settings.API_V1_PREFIX}/students",
            f"{settings.API_V1_PREFIX}/risk",
            f"{settings.API_V1_PREFIX}/interventions",
            f"{settings.API_V1_PREFIX}/insights",
            f"{settings.API_V1_PREFIX}/agent/query"
        ]
    }

app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)


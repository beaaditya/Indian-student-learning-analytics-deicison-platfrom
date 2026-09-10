"""
School Intelligence Analytics Module
Student Learning Analytics & Decision Intelligence Platform

Provides school scorecard listings, demographic & management filtering,
safe pagination, institutional rankings, and granular diagnostic school profiles.
"""
import logging
from typing import Any, Dict, List, Optional
from backend.database import fetch_all, fetch_one
from backend.cache import make_cache_key, get_cached, set_cached

logger = logging.getLogger("backend.schools")


def get_schools(
    state: Optional[str] = None,
    district: Optional[str] = None,
    school_type: Optional[str] = None,
    management_type: Optional[str] = None,
    board: Optional[str] = None,
    urban_rural: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    page: Optional[int] = None,
    page_size: Optional[int] = None
) -> Dict[str, Any]:
    """
    Returns school performance scorecards with demographic filtering, search, and pagination.
    Supports both limit/offset and page/page_size pagination models.
    """
    cache_key = make_cache_key(
        "schools",
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
    cached_data = get_cached(cache_key)
    if cached_data is not None:
        return cached_data

    # --------------------------------------------------------------------------
    # 1. Normalize Pagination Parameters
    # --------------------------------------------------------------------------
    if page is not None and page > 0:
        effective_page_size = page_size if (page_size is not None and page_size > 0) else (limit if limit > 0 else 50)
        limit = effective_page_size
        offset = (page - 1) * limit
        current_page = page
    else:
        limit = limit if (limit and limit > 0) else 50
        offset = offset if (offset and offset >= 0) else 0
        current_page = (offset // limit) + 1
        effective_page_size = limit

    # --------------------------------------------------------------------------
    # 2. Build Filter Where Clauses & Parameters
    # --------------------------------------------------------------------------
    where_clauses: List[str] = ["1=1"]
    params: List[Any] = []

    if state:
        where_clauses.append("state ILIKE %s")
        params.append(state.strip())
    if district:
        where_clauses.append("district ILIKE %s")
        params.append(district.strip())
    if school_type:
        where_clauses.append("school_type ILIKE %s")
        params.append(school_type.strip())
    if management_type:
        where_clauses.append("(management_type ILIKE %s OR management_type ILIKE %s)")
        params.extend([management_type.strip(), f"%{management_type.strip()}%"])
    if board:
        where_clauses.append("board ILIKE %s")
        params.append(board.strip())
    if urban_rural:
        where_clauses.append("urban_rural ILIKE %s")
        params.append(urban_rural.strip())
    if search:
        clean_search = search.strip()
        where_clauses.append("(school_name ILIKE %s OR school_id ILIKE %s)")
        params.extend([f"%{clean_search}%", f"%{clean_search}%"])

    where_sql = " AND ".join(where_clauses)

    # --------------------------------------------------------------------------
    # 3. Total Count from Dimension (Fast O(1) Scan)
    # --------------------------------------------------------------------------
    count_sql = f"SELECT COUNT(*) AS total FROM analytics.dim_school WHERE {where_sql};"
    count_res = fetch_one(count_sql, tuple(params))
    total_count = count_res["total"] if count_res else 0

    total_pages = (total_count + limit - 1) // limit if limit > 0 else 0

    # --------------------------------------------------------------------------
    # 4. Fetch School Performance Scorecards
    # --------------------------------------------------------------------------
    data_sql = f"""
        SELECT
            school_id,
            school_name,
            state,
            district,
            city,
            urban_rural,
            school_type,
            management_type,
            board,
            total_students,
            evaluated_students,
            total_assessments,
            average_performance,
            average_reading_score,
            average_fluency,
            average_comprehension,
            average_vocabulary,
            average_grammar,
            benchmark_percentage,
            below_benchmark_percentage,
            average_improvement,
            at_risk_student_count,
            rank
        FROM analytics.v_school_performance
        WHERE {where_sql}
        ORDER BY rank ASC
        LIMIT %s OFFSET %s;
    """
    query_params = list(params) + [limit, offset]
    schools = fetch_all(data_sql, tuple(query_params), max_limit=limit + 10)

    result = {
        "status": "success",
        "total_count": total_count,
        "page": current_page,
        "page_size": effective_page_size,
        "total_pages": total_pages,
        "limit": limit,
        "offset": offset,
        "schools": schools
    }
    set_cached(cache_key, result)
    return result


def get_school_details(school_id: str) -> Dict[str, Any]:
    """
    Returns a comprehensive institutional analytical diagnostic profile for a specific school.
    Includes performance metrics, ranking, sub-skill diagnostics, grade-level breakdown,
    subject breakdown, longitudinal trends, and early-warning risk summary.
    """
    if not school_id or not school_id.strip():
        return {"status": "not_found", "message": "School ID cannot be empty."}

    clean_id = school_id.strip()
    cache_key = make_cache_key("school_detail", school_id=clean_id)
    cached_data = get_cached(cache_key)
    if cached_data is not None:
        return cached_data

    # --------------------------------------------------------------------------
    # 1. School Metadata & Overall Scorecard
    # --------------------------------------------------------------------------
    school_sql = "SELECT * FROM analytics.v_school_performance WHERE school_id = %s;"
    school = fetch_one(school_sql, (clean_id,))
    if not school:
        return {"status": "not_found", "message": f"School '{clean_id}' not found."}

    # --------------------------------------------------------------------------
    # 2. Institutional Dimensions & Student Attendance
    # --------------------------------------------------------------------------
    dim_sql = """
        SELECT
            s.establishment_year,
            s.teacher_count,
            s.student_teacher_ratio,
            s.infrastructure_score,
            s.digital_access_score,
            s.assessment_frequency,
            ROUND(AVG(st.attendance_pct), 2) AS average_attendance_pct
        FROM analytics.dim_school s
        LEFT JOIN analytics.dim_student st ON s.school_id = st.school_id
        WHERE s.school_id = %s
        GROUP BY s.school_id, s.establishment_year, s.teacher_count, s.student_teacher_ratio,
                 s.infrastructure_score, s.digital_access_score, s.assessment_frequency;
    """
    dim_res = fetch_one(dim_sql, (clean_id,))
    if dim_res:
        school["establishment_year"] = dim_res.get("establishment_year")
        school["teacher_count"] = dim_res.get("teacher_count")
        school["student_teacher_ratio"] = dim_res.get("student_teacher_ratio")
        school["infrastructure_score"] = dim_res.get("infrastructure_score")
        school["digital_access_score"] = dim_res.get("digital_access_score")
        school["assessment_frequency"] = dim_res.get("assessment_frequency")
        school["average_attendance_pct"] = dim_res.get("average_attendance_pct")

    # --------------------------------------------------------------------------
    # 3. Grade-level Performance Breakdown
    # --------------------------------------------------------------------------
    grade_sql = """
        SELECT
            p.grade,
            COUNT(DISTINCT p.student_id) AS student_count,
            COUNT(p.performance_id) AS assessment_count,
            ROUND(AVG(p.reading_score), 2) AS average_score,
            ROUND(AVG(p.fluency_score), 2) AS average_fluency,
            ROUND(AVG(p.comprehension_score), 2) AS average_comprehension,
            ROUND(AVG(p.vocabulary_score), 2) AS average_vocabulary,
            ROUND(AVG(p.grammar_score), 2) AS average_grammar,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
            ROUND(AVG(p.improvement_pct), 2) AS average_improvement
        FROM analytics.fact_performance p
        WHERE p.school_id = %s
        GROUP BY p.grade
        ORDER BY p.grade ASC;
    """
    grade_breakdown = fetch_all(grade_sql, (clean_id,))

    # --------------------------------------------------------------------------
    # 4. Subject-level Breakdown
    # --------------------------------------------------------------------------
    subject_sql = """
        SELECT
            p.subject,
            COUNT(p.performance_id) AS assessment_count,
            ROUND(AVG(p.reading_score), 2) AS average_score,
            ROUND(AVG(p.fluency_score), 2) AS average_fluency,
            ROUND(AVG(p.comprehension_score), 2) AS average_comprehension,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage
        FROM analytics.fact_performance p
        WHERE p.school_id = %s
        GROUP BY p.subject
        ORDER BY average_score DESC;
    """
    subject_breakdown = fetch_all(subject_sql, (clean_id,))

    # --------------------------------------------------------------------------
    # 5. Monthly Longitudinal Trend
    # --------------------------------------------------------------------------
    trend_sql = """
        SELECT
            TO_CHAR(p.performance_date, 'YYYY-MM') AS month,
            COUNT(p.performance_id) AS assessment_count,
            ROUND(AVG(p.reading_score), 2) AS average_score,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage
        FROM analytics.fact_performance p
        WHERE p.school_id = %s
        GROUP BY TO_CHAR(p.performance_date, 'YYYY-MM')
        ORDER BY month ASC;
    """
    monthly_trend = fetch_all(trend_sql, (clean_id,), max_limit=50)

    # --------------------------------------------------------------------------
    # 6. Risk & Intervention Registry Summary
    # --------------------------------------------------------------------------
    risk_sql = """
        SELECT
            i.risk_level,
            COUNT(*) AS student_count
        FROM analytics.fact_intervention i
        WHERE i.school_id = %s
        GROUP BY i.risk_level
        ORDER BY student_count DESC;
    """
    risk_summary = fetch_all(risk_sql, (clean_id,))

    result = {
        "status": "success",
        "school": school,
        "grade_breakdown": grade_breakdown,
        "subject_breakdown": subject_breakdown,
        "monthly_trend": monthly_trend,
        "risk_summary": risk_summary
    }
    set_cached(cache_key, result)
    return result

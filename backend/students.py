"""
Student Intelligence Analytics Module
Student Learning Analytics & Decision Intelligence Platform

Provides student directory lookups, multi-attribute filtering, safe pagination,
sub-skill mastery diagnostics, longitudinal assessment histories, engagement timelines,
and early-warning risk intervention profiles.
"""
import logging
from typing import Any, Dict, List, Optional
from backend.database import fetch_all, fetch_one

logger = logging.getLogger("backend.students")


def get_students(
    school_id: Optional[str] = None,
    grade: Optional[int] = None,
    gender: Optional[str] = None,
    socioeconomic_band: Optional[str] = None,
    benchmark_status: Optional[str] = None,
    risk_status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    page: Optional[int] = None,
    page_size: Optional[int] = None
) -> Dict[str, Any]:
    """
    Returns student analytical directory with demographic, academic, and risk filtering,
    supporting both limit/offset and page/page_size pagination models.
    """
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
    # 2. Build Filter Conditions & Parameter Tuples
    # --------------------------------------------------------------------------
    where_clauses: List[str] = ["1=1"]
    params: List[Any] = []

    if school_id:
        where_clauses.append("school_id = %s")
        params.append(school_id.strip())
    if grade is not None:
        where_clauses.append("grade = %s")
        params.append(int(grade))
    if gender:
        where_clauses.append("gender ILIKE %s")
        params.append(gender.strip())
    if socioeconomic_band:
        where_clauses.append("socioeconomic_band ILIKE %s")
        params.append(socioeconomic_band.strip())
    if benchmark_status:
        where_clauses.append("benchmark_status ILIKE %s")
        params.append(f"%{benchmark_status.strip()}%")
    if risk_status:
        where_clauses.append("risk_status ILIKE %s")
        params.append(f"%{risk_status.strip()}%")
    if search:
        clean_search = search.strip()
        where_clauses.append("(student_id ILIKE %s OR school_name ILIKE %s)")
        params.extend([f"%{clean_search}%", f"%{clean_search}%"])

    where_sql = " AND ".join(where_clauses)

    # --------------------------------------------------------------------------
    # 3. Compute Total Count (Fast-path optimization where feasible)
    # --------------------------------------------------------------------------
    # If filter does not require view-computed fields, scan dim_student directly for speed
    if not benchmark_status and not risk_status and (not search or not ("school_name" in search.lower())):
        dim_where: List[str] = ["1=1"]
        dim_params: List[Any] = []
        if school_id:
            dim_where.append("school_id = %s")
            dim_params.append(school_id.strip())
        if grade is not None:
            dim_where.append("grade = %s")
            dim_params.append(int(grade))
        if gender:
            dim_where.append("gender ILIKE %s")
            dim_params.append(gender.strip())
        if socioeconomic_band:
            dim_where.append("socioeconomic_band ILIKE %s")
            dim_params.append(socioeconomic_band.strip())
        if search:
            dim_where.append("student_id ILIKE %s")
            dim_params.append(f"%{search.strip()}%")

        count_sql = f"SELECT COUNT(*) AS total FROM analytics.dim_student WHERE {' AND '.join(dim_where)};"
        count_res = fetch_one(count_sql, tuple(dim_params))
    else:
        count_sql = f"SELECT COUNT(*) AS total FROM analytics.v_student_performance WHERE {where_sql};"
        count_res = fetch_one(count_sql, tuple(params))

    total_count = count_res["total"] if count_res else 0
    total_pages = (total_count + limit - 1) // limit if limit > 0 else 0

    # --------------------------------------------------------------------------
    # 4. Fetch Student Records
    # --------------------------------------------------------------------------
    data_sql = f"""
        SELECT
            student_id,
            school_id,
            school_name,
            grade,
            section,
            academic_year,
            gender,
            socioeconomic_band,
            digital_access,
            latest_performance,
            average_performance,
            reading_score,
            fluency_score,
            comprehension_score,
            vocabulary_score,
            grammar_score,
            pronunciation_score,
            accuracy_pct,
            percentile,
            benchmark_status,
            improvement_percentage,
            performance_band,
            latest_assessment_date,
            total_assessments,
            risk_status,
            risk_score,
            risk_reason,
            intervention_status
        FROM analytics.v_student_performance
        WHERE {where_sql}
        ORDER BY student_id ASC
        LIMIT %s OFFSET %s;
    """
    query_params = list(params) + [limit, offset]
    students = fetch_all(data_sql, tuple(query_params), max_limit=limit + 10)

    return {
        "status": "success",
        "total_count": total_count,
        "page": current_page,
        "page_size": effective_page_size,
        "total_pages": total_pages,
        "limit": limit,
        "offset": offset,
        "students": students
    }


def get_student_profile(student_id: str) -> Dict[str, Any]:
    """
    Returns an exhaustive 360-degree learning diagnostic profile for a specific student.
    Includes core demographic & enrollment metadata, sub-skill diagnostics, longitudinal
    assessment history, engagement timelines, and risk intervention tracking.
    """
    if not student_id or not student_id.strip():
        return {"status": "not_found", "message": "Student ID cannot be empty."}

    clean_id = student_id.strip()

    # --------------------------------------------------------------------------
    # 1. Core Profile & Performance Diagnostics from View
    # --------------------------------------------------------------------------
    profile_sql = "SELECT * FROM analytics.v_student_performance WHERE student_id = %s;"
    profile = fetch_one(profile_sql, (clean_id,))
    if not profile:
        return {"status": "not_found", "message": f"Student '{clean_id}' not found."}

    # --------------------------------------------------------------------------
    # 2. Enrich with Student Dimension Metadata (Attendance, Baseline, Age)
    # --------------------------------------------------------------------------
    dim_sql = """
        SELECT
            attendance_pct,
            baseline_reading_level,
            learning_mode,
            medium,
            previous_year_score,
            age,
            enrollment_date,
            active_status
        FROM analytics.dim_student
        WHERE student_id = %s;
    """
    dim_res = fetch_one(dim_sql, (clean_id,))
    if dim_res:
        profile["attendance_pct"] = dim_res.get("attendance_pct")
        profile["baseline_reading_level"] = dim_res.get("baseline_reading_level")
        profile["learning_mode"] = dim_res.get("learning_mode")
        profile["medium"] = dim_res.get("medium")
        profile["previous_year_score"] = dim_res.get("previous_year_score")
        profile["age"] = dim_res.get("age")
        profile["enrollment_date"] = dim_res.get("enrollment_date")
        profile["active_status"] = dim_res.get("active_status")

    # --------------------------------------------------------------------------
    # 3. Longitudinal Assessment History
    # --------------------------------------------------------------------------
    history_sql = """
        SELECT
            p.performance_id,
            a.assessment_id,
            a.assessment_date,
            a.assessment_month,
            a.assessment_type,
            p.subject,
            p.reading_score,
            p.fluency_score,
            p.pronunciation_score,
            p.accuracy_pct,
            p.comprehension_score,
            p.vocabulary_score,
            p.grammar_score,
            p.wpm,
            p.wcpm,
            p.benchmark_status,
            p.performance_band,
            p.improvement_pct
        FROM analytics.fact_performance p
        JOIN analytics.fact_assessment a ON p.assessment_id = a.assessment_id
        WHERE p.student_id = %s
        ORDER BY a.assessment_date ASC;
    """
    history = fetch_all(history_sql, (clean_id,), max_limit=100)

    # --------------------------------------------------------------------------
    # 4. Monthly Engagement Timeline
    # --------------------------------------------------------------------------
    engagement_sql = """
        SELECT
            month,
            academic_year,
            attendance_pct,
            classes_attended,
            classes_missed,
            assignments_assigned,
            assignments_completed,
            assignment_completion_pct,
            learning_sessions,
            platform_minutes,
            participation_score,
            engagement_level
        FROM analytics.fact_engagement
        WHERE student_id = %s
        ORDER BY month ASC;
    """
    engagement = fetch_all(engagement_sql, (clean_id,), max_limit=100)

    # --------------------------------------------------------------------------
    # 5. Risk & Intervention Cases
    # --------------------------------------------------------------------------
    intervention_sql = """
        SELECT
            intervention_id,
            identified_date,
            risk_level,
            risk_score,
            risk_reason,
            priority,
            recommended_action,
            assigned_to,
            status,
            resolution_date
        FROM analytics.fact_intervention
        WHERE student_id = %s
        ORDER BY identified_date DESC;
    """
    interventions = fetch_all(intervention_sql, (clean_id,), max_limit=50)

    return {
        "status": "success",
        "profile": profile,
        "assessment_history": history,
        "engagement_timeline": engagement,
        "interventions": interventions
    }

"""
Executive Overview Analytics Module
Student Learning Analytics & Decision Intelligence Platform

Provides executive-level learning KPIs, longitudinal assessment trends,
performance band distributions, and institutional rankings with safe parameterized slicing.
Optimized for high-throughput concurrency and in-memory TTL caching.
"""
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional
from backend.database import fetch_all, fetch_one
from backend.cache import make_cache_key, get_cached, set_cached

logger = logging.getLogger("backend.overview")


def get_executive_overview(
    state: Optional[str] = None,
    district: Optional[str] = None,
    management_type: Optional[str] = None,
    academic_year: Optional[str] = None,
    grade: Optional[int] = None
) -> Dict[str, Any]:
    """
    Computes high-level executive analytics summary, trends, distributions, and rankings.
    Supports optional slicing by geography, school management type, academic year, and grade.
    All filters are parameterized safely.
    Uses in-memory TTL caching and concurrent query execution for low latency.
    """
    cache_key = make_cache_key(
        "overview",
        state=state,
        district=district,
        management_type=management_type,
        academic_year=academic_year,
        grade=grade
    )
    cached_data = get_cached(cache_key)
    if cached_data is not None:
        return cached_data

    # --------------------------------------------------------------------------
    # 1. Build Filter Conditions & Parameter Tuples
    # --------------------------------------------------------------------------
    has_school_filter = bool(state or district or management_type)

    perf_joins: List[str] = ["analytics.fact_performance p"]
    if has_school_filter:
        perf_joins.append("JOIN analytics.dim_school s ON p.school_id = s.school_id")

    perf_where: List[str] = ["1=1"]
    perf_params: List[Any] = []

    if academic_year:
        perf_joins.append("JOIN analytics.fact_assessment a ON p.assessment_id = a.assessment_id")
        perf_where.append("a.academic_year = %s")
        perf_params.append(academic_year.strip())

    if state:
        perf_where.append("s.state ILIKE %s")
        perf_params.append(state.strip())
    if district:
        perf_where.append("s.district ILIKE %s")
        perf_params.append(district.strip())
    if management_type:
        perf_where.append("(s.management_type ILIKE %s OR s.management_type ILIKE %s)")
        perf_params.extend([management_type.strip(), f"%{management_type.strip()}%"])
    if grade is not None:
        perf_where.append("p.grade = %s")
        perf_params.append(int(grade))

    perf_from_sql = " ".join(perf_joins)
    perf_where_sql = " AND ".join(perf_where)

    # Filter for school dimension
    sch_where: List[str] = ["1=1"]
    sch_params: List[Any] = []

    if state:
        sch_where.append("s.state ILIKE %s")
        sch_params.append(state.strip())
    if district:
        sch_where.append("s.district ILIKE %s")
        sch_params.append(district.strip())
    if management_type:
        sch_where.append("(s.management_type ILIKE %s OR s.management_type ILIKE %s)")
        sch_params.extend([management_type.strip(), f"%{management_type.strip()}%"])

    sch_where_sql = " AND ".join(sch_where)

    # Filter for intervention fact
    risk_joins: List[str] = ["analytics.fact_intervention i"]
    if has_school_filter:
        risk_joins.append("JOIN analytics.dim_school s ON i.school_id = s.school_id")

    risk_where: List[str] = ["1=1"]
    risk_params: List[Any] = []

    if academic_year:
        risk_joins.append("JOIN analytics.dim_student st ON i.student_id = st.student_id")
        risk_where.append("st.academic_year = %s")
        risk_params.append(academic_year.strip())

    if state:
        risk_where.append("s.state ILIKE %s")
        risk_params.append(state.strip())
    if district:
        risk_where.append("s.district ILIKE %s")
        risk_params.append(district.strip())
    if management_type:
        risk_where.append("(s.management_type ILIKE %s OR s.management_type ILIKE %s)")
        risk_params.extend([management_type.strip(), f"%{management_type.strip()}%"])
    if grade is not None:
        risk_where.append("i.grade = %s")
        risk_params.append(int(grade))

    risk_from_sql = " ".join(risk_joins)
    risk_where_sql = " AND ".join(risk_where)

    # --------------------------------------------------------------------------
    # 2. Define Queries for Concurrent Execution
    # --------------------------------------------------------------------------
    total_schools_sql = f"""
        SELECT COUNT(DISTINCT s.school_id) AS total_schools
        FROM analytics.dim_school s
        WHERE {sch_where_sql};
    """

    risk_sql = f"""
        SELECT
            COUNT(DISTINCT i.student_id) AS total_at_risk_students,
            COUNT(i.intervention_id) AS total_interventions
        FROM {risk_from_sql}
        WHERE {risk_where_sql};
    """

    kpi_sql = f"""
        SELECT
            COUNT(DISTINCT p.student_id) AS total_students,
            COUNT(p.performance_id) AS total_assessments,
            ROUND(AVG(p.reading_score), 2) AS average_reading_score,
            ROUND(AVG(p.fluency_score), 2) AS average_fluency_score,
            ROUND(AVG(p.comprehension_score), 2) AS average_comprehension_score,
            ROUND(AVG(p.vocabulary_score), 2) AS average_vocabulary_score,
            ROUND(AVG(p.grammar_score), 2) AS average_grammar_score,
            ROUND(AVG(p.pronunciation_score), 2) AS average_pronunciation_score,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('below benchmark', 'needs attention')) / NULLIF(COUNT(*), 0), 2) AS below_benchmark_percentage,
            ROUND(AVG(p.improvement_pct), 2) AS average_improvement_pct
        FROM {perf_from_sql}
        WHERE {perf_where_sql};
    """

    att_sql = f"""
        SELECT ROUND(AVG(st.attendance_pct), 2) AS average_attendance_pct
        FROM analytics.dim_student st
        JOIN analytics.dim_school s ON st.school_id = s.school_id
        WHERE {sch_where_sql};
    """

    trend_sql = f"""
        SELECT
            TO_CHAR(p.performance_date, 'YYYY-MM') AS month,
            COUNT(DISTINCT p.student_id) AS student_count,
            COUNT(p.performance_id) AS assessment_count,
            ROUND(AVG(p.reading_score), 2) AS average_score,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage
        FROM {perf_from_sql}
        WHERE {perf_where_sql}
        GROUP BY TO_CHAR(p.performance_date, 'YYYY-MM')
        ORDER BY month ASC;
    """

    band_sql = f"""
        SELECT
            p.performance_band,
            COUNT(*) AS student_count,
            ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percentage
        FROM {perf_from_sql}
        WHERE {perf_where_sql}
        GROUP BY p.performance_band
        ORDER BY student_count DESC;
    """

    # Single combined school aggregation query instead of running 2 separate full-table scans
    schools_agg_sql = f"""
        SELECT
            s.school_id,
            s.school_name,
            s.district,
            s.state,
            COUNT(p.performance_id) AS assessments,
            ROUND(AVG(p.reading_score), 2) AS average_score,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage
        FROM analytics.fact_performance p
        JOIN analytics.dim_school s ON p.school_id = s.school_id
        WHERE {perf_where_sql}
        GROUP BY s.school_id, s.school_name, s.district, s.state
        HAVING COUNT(p.performance_id) >= 30;
    """

    grade_perf_sql = """
        SELECT grade, average_reading_score, benchmark_percentage
        FROM analytics.v_grade_performance
        ORDER BY average_reading_score DESC;
    """

    subject_perf_sql = """
        SELECT subject, average_performance, benchmark_percentage
        FROM analytics.v_subject_performance
        ORDER BY average_performance DESC;
    """

    # --------------------------------------------------------------------------
    # 3. Concurrent Query Execution via ThreadPoolExecutor
    # --------------------------------------------------------------------------
    with ThreadPoolExecutor(max_workers=4) as executor:
        f_total_schools = executor.submit(fetch_one, total_schools_sql, tuple(sch_params))
        f_risk = executor.submit(fetch_one, risk_sql, tuple(risk_params))
        f_kpis = executor.submit(fetch_one, kpi_sql, tuple(perf_params))
        f_att = executor.submit(fetch_one, att_sql, tuple(sch_params))
        f_trends = executor.submit(fetch_all, trend_sql, tuple(perf_params), True, 50)
        f_bands = executor.submit(fetch_all, band_sql, tuple(perf_params), True, 20)
        f_schools = executor.submit(fetch_all, schools_agg_sql, tuple(perf_params), True, 1000)
        f_grades = executor.submit(fetch_all, grade_perf_sql, (), True, 10)
        f_subjects = executor.submit(fetch_all, subject_perf_sql, (), True, 10)

        total_schools_res = f_total_schools.result()
        risk_res = f_risk.result()
        kpis = f_kpis.result() or {}
        att_res = f_att.result()
        trends = f_trends.result() or []
        band_distribution = f_bands.result() or []
        all_schools_perf = f_schools.result() or []
        grade_rows = f_grades.result() or []
        subject_rows = f_subjects.result() or []

    # --------------------------------------------------------------------------
    # 4. Synthesize KPIs and Rankings
    # --------------------------------------------------------------------------
    kpis["total_schools"] = total_schools_res["total_schools"] if total_schools_res else 0
    kpis["high_risk_student_count"] = risk_res["total_at_risk_students"] if risk_res else 0
    kpis["total_interventions_count"] = risk_res["total_interventions"] if risk_res else 0
    kpis["average_attendance_pct"] = att_res["average_attendance_pct"] if att_res else None
    kpis["total_students"] = kpis.get("total_students") or 0
    kpis["total_assessments"] = kpis.get("total_assessments") or 0

    # Sort aggregated schools in Python for Top 5 and Bottom 5 in < 0.1ms
    top_schools = sorted(
        all_schools_perf,
        key=lambda x: (float(x.get("benchmark_percentage") or 0), float(x.get("average_score") or 0)),
        reverse=True
    )[:5]

    bottom_schools = sorted(
        all_schools_perf,
        key=lambda x: (float(x.get("benchmark_percentage") or 0), float(x.get("average_score") or 0)),
        reverse=False
    )[:5]

    strongest_grade = grade_rows[0] if grade_rows else None
    weakest_grade = grade_rows[-1] if grade_rows else None
    strongest_subject = subject_rows[0] if subject_rows else None
    weakest_subject = subject_rows[-1] if subject_rows else None

    result = {
        "status": "success",
        "kpis": kpis,
        "trends": trends,
        "distributions": {
            "performance_bands": band_distribution
        },
        "rankings": {
            "top_performing_schools": top_schools,
            "lowest_performing_schools": bottom_schools,
            "strongest_grade": strongest_grade,
            "weakest_grade": weakest_grade,
            "strongest_subject": strongest_subject,
            "weakest_subject": weakest_subject
        }
    }

    set_cached(cache_key, result)
    return result

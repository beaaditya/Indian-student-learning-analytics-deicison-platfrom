"""
Executive Overview Analytics Module
Student Learning Analytics & Decision Intelligence Platform

Provides executive-level learning KPIs, longitudinal assessment trends,
performance band distributions, and institutional rankings with safe parameterized slicing.
"""
import logging
from typing import Any, Dict, List, Optional
from backend.database import fetch_all, fetch_one

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
    """
    # --------------------------------------------------------------------------
    # 1. Build Filter Conditions & Parameter Tuples
    # --------------------------------------------------------------------------
    perf_joins: List[str] = ["analytics.fact_performance p", "JOIN analytics.dim_school s ON p.school_id = s.school_id"]
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
    risk_joins: List[str] = ["analytics.fact_intervention i", "JOIN analytics.dim_school s ON i.school_id = s.school_id"]
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
    # 2. Total Schools Count
    # --------------------------------------------------------------------------
    total_schools_sql = f"""
        SELECT COUNT(DISTINCT s.school_id) AS total_schools
        FROM analytics.dim_school s
        WHERE {sch_where_sql};
    """
    total_schools_res = fetch_one(total_schools_sql, tuple(sch_params))
    total_schools_cnt = total_schools_res["total_schools"] if total_schools_res else 0

    # --------------------------------------------------------------------------
    # 3. Risk & Intervention Counts
    # --------------------------------------------------------------------------
    risk_sql = f"""
        SELECT
            COUNT(DISTINCT i.student_id) AS total_at_risk_students,
            COUNT(i.intervention_id) AS total_interventions
        FROM {risk_from_sql}
        WHERE {risk_where_sql};
    """
    risk_res = fetch_one(risk_sql, tuple(risk_params))
    at_risk_cnt = risk_res["total_at_risk_students"] if risk_res else 0
    interventions_cnt = risk_res["total_interventions"] if risk_res else 0

    # --------------------------------------------------------------------------
    # 4. Executive Performance Core KPIs
    # --------------------------------------------------------------------------
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
    kpis = fetch_one(kpi_sql, tuple(perf_params)) or {}
    kpis["total_schools"] = total_schools_cnt
    kpis["high_risk_student_count"] = at_risk_cnt
    kpis["total_interventions_count"] = interventions_cnt

    # Attendance Metric
    att_sql = f"""
        SELECT ROUND(AVG(st.attendance_pct), 2) AS average_attendance_pct
        FROM analytics.dim_student st
        JOIN analytics.dim_school s ON st.school_id = s.school_id
        WHERE {sch_where_sql};
    """
    att_res = fetch_one(att_sql, tuple(sch_params))
    kpis["average_attendance_pct"] = att_res["average_attendance_pct"] if att_res else None

    # Ensure total_students and total_assessments default cleanly
    kpis["total_students"] = kpis.get("total_students") or 0
    kpis["total_assessments"] = kpis.get("total_assessments") or 0

    # --------------------------------------------------------------------------
    # 5. Longitudinal Monthly Assessment Trends
    # --------------------------------------------------------------------------
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
    trends = fetch_all(trend_sql, tuple(perf_params), max_limit=50)

    # --------------------------------------------------------------------------
    # 6. Performance Band Distribution
    # --------------------------------------------------------------------------
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
    band_distribution = fetch_all(band_sql, tuple(perf_params), max_limit=20)

    # --------------------------------------------------------------------------
    # 7. Top & Bottom Performing Schools
    # --------------------------------------------------------------------------
    top_schools_sql = f"""
        SELECT
            s.school_id,
            s.school_name,
            s.district,
            s.state,
            COUNT(p.performance_id) AS assessments,
            ROUND(AVG(p.reading_score), 2) AS average_score,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage
        FROM {perf_from_sql}
        WHERE {perf_where_sql}
        GROUP BY s.school_id, s.school_name, s.district, s.state
        HAVING COUNT(p.performance_id) >= 30
        ORDER BY benchmark_percentage DESC, average_score DESC
        LIMIT 5;
    """
    top_schools = fetch_all(top_schools_sql, tuple(perf_params), max_limit=5)

    bottom_schools_sql = f"""
        SELECT
            s.school_id,
            s.school_name,
            s.district,
            s.state,
            COUNT(p.performance_id) AS assessments,
            ROUND(AVG(p.reading_score), 2) AS average_score,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage
        FROM {perf_from_sql}
        WHERE {perf_where_sql}
        GROUP BY s.school_id, s.school_name, s.district, s.state
        HAVING COUNT(p.performance_id) >= 30
        ORDER BY benchmark_percentage ASC, average_score ASC
        LIMIT 5;
    """
    bottom_schools = fetch_all(bottom_schools_sql, tuple(perf_params), max_limit=5)

    # --------------------------------------------------------------------------
    # 8. Grade & Subject Performance Extremes
    # --------------------------------------------------------------------------
    grade_perf_sql = """
        SELECT grade, average_reading_score, benchmark_percentage
        FROM analytics.v_grade_performance
        ORDER BY average_reading_score DESC;
    """
    grade_rows = fetch_all(grade_perf_sql, max_limit=10)
    strongest_grade = grade_rows[0] if grade_rows else None
    weakest_grade = grade_rows[-1] if grade_rows else None

    subject_perf_sql = """
        SELECT subject, average_performance, benchmark_percentage
        FROM analytics.v_subject_performance
        ORDER BY average_performance DESC;
    """
    subject_rows = fetch_all(subject_perf_sql, max_limit=10)
    strongest_subject = subject_rows[0] if subject_rows else None
    weakest_subject = subject_rows[-1] if subject_rows else None

    return {
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

"""
Risk & Early Warning Intelligence Module
Student Learning Analytics & Decision Intelligence Platform

Monitors student risk severity, Pareto root-cause distributions, priority triage queues,
and early-warning indicators across institutions and grade cohorts.
"""
import logging
from typing import Any, Dict, List, Optional
from backend.database import fetch_all, fetch_one

logger = logging.getLogger("backend.risk")


def get_risk_overview(
    school_id: Optional[str] = None,
    grade: Optional[int] = None,
    risk_level: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Returns high-risk diagnostic summaries, Pareto root-cause charts, and prioritized triage queue.
    """
    where_clauses: List[str] = ["1=1"]
    params: List[Any] = []

    if school_id:
        where_clauses.append("i.school_id = %s")
        params.append(school_id.strip())
    if grade is not None:
        where_clauses.append("i.grade = %s")
        params.append(int(grade))
    if risk_level:
        where_clauses.append("i.risk_level ILIKE %s")
        params.append(risk_level.strip())
    if priority:
        where_clauses.append("i.priority ILIKE %s")
        params.append(priority.strip())
    if status:
        where_clauses.append("i.status ILIKE %s")
        params.append(status.strip())

    where_sql = " AND ".join(where_clauses)

    # 1. High-Level Risk KPIs
    kpi_sql = f"""
        SELECT
            COUNT(DISTINCT i.student_id) AS total_at_risk_students,
            COUNT(i.intervention_id) AS total_risk_cases,
            ROUND(AVG(i.risk_score), 2) AS average_risk_score,
            COUNT(*) FILTER (WHERE i.risk_level = 'High') AS high_risk_count,
            COUNT(*) FILTER (WHERE i.risk_level = 'Medium') AS medium_risk_count,
            COUNT(*) FILTER (WHERE i.risk_level = 'Low') AS low_risk_count,
            COUNT(*) FILTER (WHERE i.status = 'Open') AS open_cases,
            COUNT(*) FILTER (WHERE i.status = 'In Progress') AS in_progress_cases,
            COUNT(*) FILTER (WHERE i.status = 'Resolved') AS resolved_cases
        FROM analytics.fact_intervention i
        WHERE {where_sql};
    """
    kpis = fetch_one(kpi_sql, tuple(params))

    # 2. Risk Reasons Breakdown
    reasons_sql = f"""
        SELECT
            i.risk_reason,
            COUNT(*) AS case_count,
            ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percentage_of_total,
            ROUND(AVG(i.risk_score), 2) AS average_severity
        FROM analytics.fact_intervention i
        WHERE {where_sql}
        GROUP BY i.risk_reason
        ORDER BY case_count DESC;
    """
    reasons = fetch_all(reasons_sql, tuple(params), max_limit=20)

    # 3. Actionable Prioritized Triage Queue
    queue_sql = f"""
        SELECT
            i.intervention_id,
            i.student_id,
            i.school_id,
            s.school_name,
            i.grade,
            st.section,
            st.gender,
            i.identified_date,
            i.risk_level,
            i.risk_score,
            i.risk_reason,
            i.priority,
            i.recommended_action,
            i.assigned_to,
            i.status AS intervention_status
        FROM analytics.fact_intervention i
        JOIN analytics.dim_school s ON i.school_id = s.school_id
        JOIN analytics.dim_student st ON i.student_id = st.student_id
        WHERE {where_sql}
        ORDER BY
            CASE i.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
            i.risk_score DESC,
            i.identified_date ASC
        LIMIT %s OFFSET %s;
    """
    queue_params = list(params) + [limit, offset]
    triage_queue = fetch_all(queue_sql, tuple(queue_params), max_limit=limit + 10)

    return {
        "status": "success",
        "kpis": kpis,
        "risk_reasons_distribution": reasons,
        "total_queue_items": kpis["total_risk_cases"] if kpis else 0,
        "limit": limit,
        "offset": offset,
        "triage_queue": triage_queue
    }

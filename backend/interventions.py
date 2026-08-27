"""
Intervention Intelligence Analytics Module
Student Learning Analytics & Decision Intelligence Platform

Evaluates remediation outcomes, resolution efficiency, pre/post intervention score recovery,
and recommended action effectiveness across cohorts and schools.
"""
import logging
from typing import Any, Dict, List, Optional
from backend.database import fetch_all, fetch_one

logger = logging.getLogger("backend.interventions")


def get_interventions_overview(
    school_id: Optional[str] = None,
    grade: Optional[int] = None,
    status: Optional[str] = None,
    effectiveness_category: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Returns intervention effectiveness metrics, status breakdowns, and pre/post score recovery records.
    """
    where_clauses: List[str] = ["1=1"]
    params: List[Any] = []

    if school_id:
        where_clauses.append("ie.school_id = %s")
        params.append(school_id.strip())
    if grade is not None:
        where_clauses.append("i.grade = %s")
        params.append(int(grade))
    if status:
        where_clauses.append("ie.intervention_status ILIKE %s")
        params.append(status.strip())
    if effectiveness_category:
        where_clauses.append("ie.effectiveness_category ILIKE %s")
        params.append(effectiveness_category.strip())

    where_sql = " AND ".join(where_clauses)

    # 1. High-level Intervention ROI Summary
    kpi_sql = f"""
        SELECT
            COUNT(*) AS total_interventions,
            COUNT(*) FILTER (WHERE ie.intervention_status = 'Open') AS open_cases,
            COUNT(*) FILTER (WHERE ie.intervention_status = 'In Progress') AS in_progress_cases,
            COUNT(*) FILTER (WHERE ie.intervention_status = 'Resolved') AS resolved_cases,
            ROUND(100.0 * COUNT(*) FILTER (WHERE ie.intervention_status = 'Resolved') / NULLIF(COUNT(*), 0), 2) AS resolution_rate_pct,
            ROUND(AVG(ie.improvement), 2) AS average_score_recovery,
            COUNT(*) FILTER (WHERE ie.effectiveness_category = 'Highly Effective') AS highly_effective_count,
            COUNT(*) FILTER (WHERE ie.effectiveness_category = 'Moderately Effective') AS moderately_effective_count,
            COUNT(*) FILTER (WHERE ie.effectiveness_category = 'Ineffective / Score Dropped') AS ineffective_count
        FROM analytics.v_intervention_effectiveness ie
        LEFT JOIN analytics.fact_intervention i ON ie.intervention_id = i.intervention_id
        WHERE {where_sql};
    """
    kpis = fetch_one(kpi_sql, tuple(params))

    # 2. Effectiveness Categories Distribution
    effectiveness_sql = f"""
        SELECT
            ie.effectiveness_category,
            COUNT(*) AS count,
            ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 2) AS percentage,
            ROUND(AVG(ie.improvement), 2) AS avg_improvement
        FROM analytics.v_intervention_effectiveness ie
        LEFT JOIN analytics.fact_intervention i ON ie.intervention_id = i.intervention_id
        WHERE {where_sql}
        GROUP BY ie.effectiveness_category
        ORDER BY count DESC;
    """
    effectiveness_dist = fetch_all(effectiveness_sql, tuple(params), max_limit=10)

    # 3. Recommended Actions Analysis
    actions_sql = f"""
        SELECT
            ie.recommended_action,
            COUNT(*) AS assigned_count,
            COUNT(*) FILTER (WHERE ie.intervention_status = 'Resolved') AS resolved_count,
            ROUND(AVG(ie.improvement), 2) AS avg_improvement
        FROM analytics.v_intervention_effectiveness ie
        LEFT JOIN analytics.fact_intervention i ON ie.intervention_id = i.intervention_id
        WHERE {where_sql}
        GROUP BY ie.recommended_action
        ORDER BY assigned_count DESC;
    """
    actions = fetch_all(actions_sql, tuple(params), max_limit=20)

    # 4. Detailed Pre/Post Intervention Evaluation Listing
    list_sql = f"""
        SELECT
            ie.intervention_id,
            ie.student_id,
            ie.school_id,
            ie.school_name,
            ie.intervention_status,
            ie.identified_date,
            ie.resolution_date,
            ie.risk_level,
            ie.risk_reason,
            ie.recommended_action,
            ie.pre_assessment_count,
            ie.pre_intervention_score,
            ie.post_assessment_count,
            ie.post_intervention_score,
            ie.improvement,
            ie.effectiveness_category
        FROM analytics.v_intervention_effectiveness ie
        LEFT JOIN analytics.fact_intervention i ON ie.intervention_id = i.intervention_id
        WHERE {where_sql}
        ORDER BY ie.identified_date DESC
        LIMIT %s OFFSET %s;
    """
    list_params = list(params) + [limit, offset]
    interventions = fetch_all(list_sql, tuple(list_params), max_limit=limit + 10)

    return {
        "status": "success",
        "kpis": kpis,
        "effectiveness_distribution": effectiveness_dist,
        "recommended_actions_summary": actions,
        "total_count": kpis["total_interventions"] if kpis else 0,
        "limit": limit,
        "offset": offset,
        "interventions": interventions
    }

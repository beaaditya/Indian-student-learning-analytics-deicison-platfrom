"""
Grade Intelligence Analytics Module
Student Learning Analytics & Decision Intelligence Platform

Analyzes cohort learning outcomes, transition gaps, sub-skill diagnostics,
and at-risk distributions across Grades 6 through 10.
"""
import logging
from typing import Any, Dict, List, Optional
from backend.database import fetch_all

logger = logging.getLogger("backend.grades")


def get_grades_overview(
    school_id: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    management_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns grade-level learning outcomes, sub-skill mastery diagnostics,
    and cohort transition step gaps across Grades 6 through 10.
    """
    where_clauses: List[str] = ["p.grade BETWEEN 6 AND 10"]
    params: List[Any] = []

    if school_id:
        where_clauses.append("p.school_id = %s")
        params.append(school_id.strip())
    if state:
        where_clauses.append("s.state ILIKE %s")
        params.append(state.strip())
    if district:
        where_clauses.append("s.district ILIKE %s")
        params.append(district.strip())
    if management_type:
        where_clauses.append("(s.management_type ILIKE %s OR s.management_type ILIKE %s)")
        params.extend([management_type.strip(), f"%{management_type.strip()}%"])

    where_sql = " AND ".join(where_clauses)

    grade_sql = f"""
        SELECT
            p.grade,
            COUNT(DISTINCT p.student_id) AS total_students_evaluated,
            COUNT(DISTINCT p.student_id) AS student_count,
            COUNT(p.performance_id) AS total_assessments,
            ROUND(AVG(p.reading_score), 2) AS average_performance,
            ROUND(AVG(p.reading_score), 2) AS average_reading_score,
            ROUND(AVG(p.fluency_score), 2) AS average_fluency,
            ROUND(AVG(p.comprehension_score), 2) AS average_comprehension,
            ROUND(AVG(p.vocabulary_score), 2) AS average_vocabulary,
            ROUND(AVG(p.grammar_score), 2) AS average_grammar,
            ROUND(AVG(p.pronunciation_score), 2) AS average_pronunciation,
            ROUND(AVG(p.accuracy_pct), 2) AS average_accuracy_pct,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
            ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('below benchmark', 'needs attention')) / NULLIF(COUNT(*), 0), 2) AS below_benchmark_percentage,
            ROUND(AVG(p.improvement_pct), 2) AS average_improvement_pct
        FROM analytics.fact_performance p
        JOIN analytics.dim_school s ON p.school_id = s.school_id
        WHERE {where_sql}
        GROUP BY p.grade
        ORDER BY p.grade ASC;
    """
    grades_data = fetch_all(grade_sql, tuple(params), max_limit=10)

    # Calculate Transition Step Gaps between consecutive grades
    transition_gaps: List[Dict[str, Any]] = []
    for i in range(1, len(grades_data)):
        prev_g = grades_data[i-1]
        curr_g = grades_data[i]
        prev_score = prev_g.get("average_reading_score") or 0.0
        curr_score = curr_g.get("average_reading_score") or 0.0
        prev_bm = prev_g.get("benchmark_percentage") or 0.0
        curr_bm = curr_g.get("benchmark_percentage") or 0.0
        score_delta = round(float(curr_score) - float(prev_score), 2)
        benchmark_delta = round(float(curr_bm) - float(prev_bm), 2)

        transition_gaps.append({
            "transition": f"Grade {prev_g['grade']} -> Grade {curr_g['grade']}",
            "from_grade": prev_g["grade"],
            "to_grade": curr_g["grade"],
            "score_growth_delta": score_delta,
            "benchmark_rate_delta": benchmark_delta,
            "status": "Growth" if score_delta >= 0 else "Decline"
        })

    return {
        "status": "success",
        "grades": grades_data,
        "transition_gaps": transition_gaps
    }

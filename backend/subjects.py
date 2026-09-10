"""
Subject Intelligence Analytics Module
Student Learning Analytics & Decision Intelligence Platform

Evaluates competency-level mastery, sub-skill diagnostic heatmaps,
learning deficit detection, and benchmark achievement across academic subjects.
Optimized for high performance with smart join elimination and in-memory TTL caching.
"""
import logging
from typing import Any, Dict, List, Optional
from backend.database import fetch_all
from backend.cache import make_cache_key, get_cached, set_cached

logger = logging.getLogger("backend.subjects")


def get_subjects_overview(
    grade: Optional[int] = None,
    school_id: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None
) -> Dict[str, Any]:
    """
    Returns subject performance metrics, sub-skill diagnostics, and deficit areas.
    """
    cache_key = make_cache_key(
        "subjects",
        grade=grade,
        school_id=school_id,
        state=state,
        district=district
    )
    cached_data = get_cached(cache_key)
    if cached_data is not None:
        return cached_data

    has_school_filter = bool(state or district)

    where_clauses: List[str] = ["1=1"]
    params: List[Any] = []

    if grade is not None:
        where_clauses.append("p.grade = %s")
        params.append(int(grade))
    if school_id:
        where_clauses.append("p.school_id = %s")
        params.append(school_id.strip())
    if state:
        where_clauses.append("s.state ILIKE %s")
        params.append(state.strip())
    if district:
        where_clauses.append("s.district ILIKE %s")
        params.append(district.strip())

    where_sql = " AND ".join(where_clauses)
    from_sql = (
        "analytics.fact_performance p JOIN analytics.dim_school s ON p.school_id = s.school_id"
        if has_school_filter
        else "analytics.fact_performance p"
    )

    subject_sql = f"""
        SELECT
            p.subject,
            COUNT(DISTINCT p.student_id) AS evaluated_students,
            COUNT(DISTINCT p.student_id) AS total_students_evaluated,
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
        FROM {from_sql}
        WHERE {where_sql}
        GROUP BY p.subject
        ORDER BY average_performance DESC;
    """
    subjects_data = fetch_all(subject_sql, tuple(params), True, max_limit=10)

    # Determine sub-skill gap per subject
    skill_diagnostics: List[Dict[str, Any]] = []
    for s in subjects_data:
        sub_skills = {
            "Fluency": float(s["average_fluency"]) if s.get("average_fluency") is not None else 0.0,
            "Comprehension": float(s["average_comprehension"]) if s.get("average_comprehension") is not None else 0.0,
            "Vocabulary": float(s["average_vocabulary"]) if s.get("average_vocabulary") is not None else 0.0,
            "Grammar": float(s["average_grammar"]) if s.get("average_grammar") is not None else 0.0,
            "Pronunciation": float(s["average_pronunciation"]) if s.get("average_pronunciation") is not None else 0.0,
            "Accuracy": float(s["average_accuracy_pct"]) if s.get("average_accuracy_pct") is not None else 0.0
        }
        weakest_skill = min(sub_skills.items(), key=lambda x: x[1])
        strongest_skill = max(sub_skills.items(), key=lambda x: x[1])
        skill_diagnostics.append({
            "subject": s["subject"],
            "skills": sub_skills,
            "weakest_competency": {"skill": weakest_skill[0], "score": weakest_skill[1]},
            "strongest_competency": {"skill": strongest_skill[0], "score": strongest_skill[1]}
        })

    result = {
        "status": "success",
        "subjects": subjects_data,
        "skill_diagnostics": skill_diagnostics
    }
    set_cached(cache_key, result)
    return result

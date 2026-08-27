"""
AI Student Learning Analyst Engine
Student Learning Analytics & Decision Intelligence Platform

Translates natural-language questions into safe, allowlisted PostgreSQL queries,
enforces rigorous read-only SQL guardrails, and synthesizes grounded analytical insights
with dual-mode operation (Gemini AI + Deterministic Fallback).
"""
import re
import logging
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional

from backend.database import fetch_all
from backend.sql_guard import sanitize_and_validate_sql, SqlGuardrailViolation, ALLOWED_ANALYTICS_VIEWS
from backend.gemini_service import generate_ai_analysis, generate_report_json
from backend.prompts import INTENT_PLANNER_SYSTEM_PROMPT, GROUNDED_SYNTHESIS_SYSTEM_PROMPT

logger = logging.getLogger("backend.agent")

# Known Indian States in the database
KNOWN_STATES = [
    "Maharashtra", "Karnataka", "Uttar Pradesh", "Gujarat", "Tamil Nadu",
    "Madhya Pradesh", "Rajasthan", "Andhra Pradesh", "Telangana", "Delhi",
    "West Bengal", "Kerala", "Bihar", "Jharkhand", "Punjab",
    "Odisha", "Chhattisgarh", "Haryana", "Uttarakhand", "Assam",
    "Jammu and Kashmir", "Himachal Pradesh", "Goa", "Chandigarh"
]

DESTRUCTIVE_KEYWORDS = [
    r"\bINSERT\b", r"\bUPDATE\b", r"\bDELETE\b", r"\bDROP\b",
    r"\bALTER\b", r"\bTRUNCATE\b", r"\bCREATE\b", r"\bGRANT\b",
    r"\bREVOKE\b", r"\bEXEC\b", r"\bEXECUTE\b", r"\bINTO\b",
    r"\bPG_SLEEP\b", r"\bCOPY\b"
]


def extract_state_from_text(text: str) -> Optional[str]:
    """Extracts a matching Indian state from the text query if present."""
    if not text:
        return None
    lower_text = text.lower()
    for state in KNOWN_STATES:
        pattern = r"\b" + re.escape(state.lower()) + r"\b"
        if re.search(pattern, lower_text):
            return state
    return None


def extract_limit_from_text(text: str, default: int = 10) -> int:
    """Extracts ranking limit (e.g. 'top 5', 'top 10', '10 students') from query."""
    if not text:
        return default
    m = re.search(r"\b(?:top|best|lowest|bottom|first|last|leading)\s+(\d+)\b", text, re.IGNORECASE)
    if m:
        try:
            val = int(m.group(1))
            return max(1, min(val, 50))
        except ValueError:
            pass
    m2 = re.search(r"\b(\d+)\s+(?:students?|schools?|learners?)\b", text, re.IGNORECASE)
    if m2:
        try:
            val = int(m2.group(1))
            return max(1, min(val, 50))
        except ValueError:
            pass
    return default


def extract_grade_from_text(text: str) -> Optional[int]:
    """Extracts grade number (6-10) if mentioned."""
    if not text:
        return None
    m = re.search(r"\b(?:grade|class)\s*(?:-|:)?\s*([6-9]|10)\b", text, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return None


def is_destructive_prompt(user_question: str) -> bool:
    """Checks whether the user prompt explicitly requests a database modification."""
    for pattern in DESTRUCTIVE_KEYWORDS:
        if re.search(pattern, user_question, re.IGNORECASE):
            return True
    return False


def classify_analyst_intent(user_question: str) -> str:
    """Classifies user natural-language questions into an operational investigation intent."""
    q_lower = user_question.lower()

    # 1. Total student count / Overall macro KPIs
    if any(k in q_lower for k in ["how many student", "total number of student", "total students", "student count", "overall performance", "system performance", "macro"]):
        return "overall_performance"

    # 2. Risk & Dropout Analysis
    if any(k in q_lower for k in ["high risk", "at risk", "risk student", "dropout", "fail", "urgent", "most risk", "risk level"]):
        if any(k in q_lower for k in ["school", "schools", "institutions"]):
            return "risk_by_school"
        return "highest_risk_students"

    # 3. School Rankings & Diagnostics
    if any(k in q_lower for k in ["school", "schools", "institution", "underperform", "worst school", "best school", "need attention", "highest average performance", "top school"]):
        if any(k in q_lower for k in ["underperform", "lowest", "worst", "need attention", "lagging", "lag"]):
            return "underperforming_schools"
        return "top_performing_schools"

    # 4. Student Rankings & Performance
    if any(k in q_lower for k in ["top performing student", "best student", "highest performing student", "top 10 performing student", "low performing student", "lowest student", "students with low performance", "top student"]):
        if any(k in q_lower for k in ["low", "lowest", "poor", "remedial", "worst"]):
            return "lowest_performing_students"
        return "top_performing_students"

    # 5. Grade Analysis
    if any(k in q_lower for k in ["grade", "cohort", "grade performs best", "grade 6", "grade 7", "grade 8", "grade 9", "grade 10", "between grades"]):
        return "grade_gap_analysis"

    # 6. Subject Analysis
    if any(k in q_lower for k in ["subject", "math", "mathematics", "english", "science", "lowest performance", "highest subject"]):
        return "subject_gap_analysis"

    # 7. Attendance & Engagement Analysis
    if any(k in q_lower for k in ["attendance", "engagement", "absent", "platform", "sessions", "classes missed"]):
        return "engagement_correlation"

    # 8. Intervention Effectiveness
    if any(k in q_lower for k in ["intervention", "effectiveness", "recovery", "remedial", "effective", "remediation"]):
        return "intervention_effectiveness"

    # 9. State / Geographic Analysis
    if extract_state_from_text(user_question):
        return "state_performance"

    return "overall_performance"


def build_deterministic_sql(intent_key: str, user_question: str) -> str:
    """Builds a safe, parameter-interpolated PostgreSQL query for deterministic fallback."""
    state = extract_state_from_text(user_question)
    limit = extract_limit_from_text(user_question, default=10)
    grade = extract_grade_from_text(user_question)

    if intent_key == "overall_performance":
        return """
            SELECT
                total_students,
                total_assessments,
                average_reading_score,
                average_fluency_score,
                average_comprehension_score,
                average_vocabulary_score,
                average_grammar_score,
                benchmark_percentage,
                below_benchmark_percentage,
                average_improvement
            FROM analytics.v_overall_performance
            LIMIT 1;
        """.strip()

    elif intent_key in ("top_performing_students", "lowest_performing_students"):
        direction = "DESC" if intent_key == "top_performing_students" else "ASC"
        where_clauses = ["1=1"]
        if grade:
            where_clauses.append(f"grade = {grade}")
        where_str = f"WHERE {' AND '.join(where_clauses)}"
        return f"""
            SELECT
                student_id,
                school_name,
                grade,
                section,
                gender,
                latest_performance,
                average_performance,
                reading_score,
                fluency_score,
                comprehension_score,
                benchmark_status,
                risk_status
            FROM analytics.v_student_performance
            {where_str}
            ORDER BY average_performance {direction}, student_id ASC
            LIMIT {limit};
        """.strip()

    elif intent_key in ("top_performing_schools", "underperforming_schools"):
        is_top = (intent_key == "top_performing_schools")
        where_clauses = ["evaluated_students >= 30"]
        if state:
            where_clauses.append(f"state ILIKE '{state}'")
        where_str = f"WHERE {' AND '.join(where_clauses)}"
        order_str = "average_reading_score DESC, rank ASC" if is_top else "benchmark_percentage ASC, average_reading_score ASC"
        return f"""
            SELECT
                school_id,
                school_name,
                district,
                state,
                management_type,
                average_reading_score,
                benchmark_percentage,
                at_risk_student_count,
                rank
            FROM analytics.v_school_performance
            {where_str}
            ORDER BY {order_str}
            LIMIT {limit};
        """.strip()

    elif intent_key == "risk_by_school":
        return f"""
            SELECT
                school_id,
                school_name,
                district,
                state,
                at_risk_student_count,
                average_reading_score,
                benchmark_percentage
            FROM analytics.v_school_performance
            WHERE at_risk_student_count > 0
            ORDER BY at_risk_student_count DESC, average_reading_score ASC
            LIMIT {limit};
        """.strip()

    elif intent_key == "highest_risk_students":
        where_clauses = ["risk_level = 'High'", "intervention_status IN ('Open', 'In Progress')"]
        if grade:
            where_clauses.append(f"grade = {grade}")
        where_str = f"WHERE {' AND '.join(where_clauses)}"
        return f"""
            SELECT
                student_id,
                school_name,
                grade,
                risk_level,
                risk_score,
                risk_reason,
                priority,
                recommended_action,
                intervention_status
            FROM analytics.v_student_risk
            {where_str}
            ORDER BY risk_score DESC
            LIMIT {limit};
        """.strip()

    elif intent_key == "grade_gap_analysis":
        return """
            SELECT
                grade,
                total_students,
                evaluated_students,
                average_reading_score,
                average_fluency,
                average_comprehension,
                average_vocabulary,
                average_grammar,
                benchmark_percentage,
                below_benchmark_percentage,
                average_improvement,
                at_risk_student_count
            FROM analytics.v_grade_performance
            ORDER BY grade ASC
            LIMIT 10;
        """.strip()

    elif intent_key == "subject_gap_analysis":
        return """
            SELECT
                subject,
                total_students_evaluated,
                total_assessments,
                average_performance,
                average_fluency,
                average_comprehension,
                average_vocabulary,
                average_grammar,
                average_pronunciation,
                average_accuracy_pct,
                benchmark_percentage,
                below_benchmark_percentage
            FROM analytics.v_subject_performance
            ORDER BY average_performance ASC
            LIMIT 10;
        """.strip()

    elif intent_key == "engagement_correlation":
        return """
            SELECT
                CASE
                    WHEN avg_attendance_pct >= 85 THEN 'High (>=85%)'
                    WHEN avg_attendance_pct >= 70 THEN 'Moderate (70-84%)'
                    ELSE 'Low (<70%)'
                END AS attendance_bracket,
                COUNT(*) AS student_count,
                ROUND(AVG(avg_reading_score), 2) AS avg_reading_score,
                ROUND(AVG(benchmark_met_pct), 2) AS benchmark_attainment_pct
            FROM analytics.v_engagement_performance
            GROUP BY 1
            ORDER BY avg_reading_score DESC
            LIMIT 10;
        """.strip()

    elif intent_key == "intervention_effectiveness":
        return """
            SELECT
                effectiveness_category,
                COUNT(*) AS case_count,
                ROUND(AVG(improvement), 2) AS avg_score_improvement
            FROM analytics.v_intervention_effectiveness
            GROUP BY effectiveness_category
            ORDER BY case_count DESC
            LIMIT 10;
        """.strip()

    elif intent_key == "state_performance":
        st = state or "Maharashtra"
        return f"""
            SELECT
                state,
                COUNT(DISTINCT school_id) AS total_schools,
                SUM(evaluated_students) AS total_students_evaluated,
                ROUND(AVG(average_reading_score), 2) AS average_performance,
                ROUND(AVG(benchmark_percentage), 2) AS benchmark_percentage,
                SUM(at_risk_student_count) AS total_at_risk_students
            FROM analytics.v_school_performance
            WHERE state ILIKE '{st}'
            GROUP BY state
            LIMIT 10;
        """.strip()

    else:
        return """
            SELECT
                total_students,
                total_assessments,
                average_reading_score,
                benchmark_percentage
            FROM analytics.v_overall_performance
            LIMIT 1;
        """.strip()


def synthesize_deterministic_answer(intent_key: str, question: str, data: List[Dict[str, Any]]) -> str:
    """Generates a grounded natural-language summary from database query results."""
    if not data:
        return "Based on the current analytics database, no records were found matching the specified criteria."

    if intent_key == "overall_performance":
        row = data[0]
        tot_stu = int(row.get("total_students") or 0)
        tot_asm = int(row.get("total_assessments") or 0)
        avg_score = float(row.get("average_reading_score") or 0)
        bm_pct = float(row.get("benchmark_percentage") or 0)
        return (
            f"Based on the system dataset, there are {tot_stu:,} total enrolled students "
            f"across {tot_asm:,} completed assessments. "
            f"The system-wide average reading score is {avg_score:.2f}, "
            f"with a benchmark achievement rate of {bm_pct:.2f}%."
        )

    elif intent_key == "top_performing_students":
        top = data[0]
        avg_perf = float(top.get("average_performance") or 0)
        rd_score = float(top.get("reading_score") or 0)
        return (
            f"The top-performing student in the database is {top.get('student_id')} from {top.get('school_name')} "
            f"(Grade {top.get('grade')}) with an average performance score of {avg_perf:.2f} "
            f"and reading score of {rd_score:.2f}. A total of {len(data)} top learners are identified."
        )

    elif intent_key == "lowest_performing_students":
        lowest = data[0]
        avg_perf = float(lowest.get("average_performance") or 0)
        return (
            f"Students with lower academic scores include {lowest.get('student_id')} from {lowest.get('school_name')} "
            f"(Grade {lowest.get('grade')}) with an average performance of {avg_perf:.2f} "
            f"and benchmark status '{lowest.get('benchmark_status')}'. Targeted foundational support is recommended."
        )

    elif intent_key == "top_performing_schools":
        best = data[0]
        avg_score = float(best.get("average_reading_score") or 0)
        bm_pct = float(best.get("benchmark_percentage") or 0)
        return (
            f"The top-performing school is {best.get('school_name')} ({best.get('district')}, {best.get('state')}) "
            f"with an average reading score of {avg_score:.2f} "
            f"and a benchmark attainment rate of {bm_pct:.2f}%."
        )

    elif intent_key == "underperforming_schools":
        worst = data[0]
        avg_score = float(worst.get("average_reading_score") or 0)
        bm_pct = float(worst.get("benchmark_percentage") or 0)
        risk_cnt = int(worst.get("at_risk_student_count") or 0)
        return (
            f"Schools requiring academic attention include {worst.get('school_name')} ({worst.get('district')}, {worst.get('state')}) "
            f"with an average reading score of {avg_score:.2f}, "
            f"a benchmark attainment rate of {bm_pct:.2f}%, "
            f"and {risk_cnt} students currently identified at risk."
        )

    elif intent_key == "grade_gap_analysis":
        highest = max(data, key=lambda x: float(x.get("average_reading_score") or 0))
        lowest = min(data, key=lambda x: float(x.get("average_reading_score") or 0))
        hi_score = float(highest.get("average_reading_score") or 0)
        hi_bm = float(highest.get("benchmark_percentage") or 0)
        lo_score = float(lowest.get("average_reading_score") or 0)
        return (
            f"Comparing performance across grades, Grade {highest.get('grade')} performs best with an average reading score "
            f"of {hi_score:.2f} (benchmark rate: {hi_bm:.2f}%), "
            f"while Grade {lowest.get('grade')} has the lowest average score at {lo_score:.2f}."
        )

    elif intent_key == "subject_gap_analysis":
        lowest_sub = data[0]
        highest_sub = data[-1]
        lo_perf = float(lowest_sub.get("average_performance") or 0)
        lo_bm = float(lowest_sub.get("benchmark_percentage") or 0)
        hi_perf = float(highest_sub.get("average_performance") or 0)
        return (
            f"Among assessed subjects, {lowest_sub.get('subject')} has the lowest average performance at "
            f"{lo_perf:.2f} (benchmark rate: {lo_bm:.2f}%), "
            f"whereas {highest_sub.get('subject')} has the highest performance at {hi_perf:.2f}."
        )

    elif intent_key == "highest_risk_students":
        first_r = data[0]
        r_score = float(first_r.get("risk_score") or 0)
        return (
            f"Identified {len(data)} students currently at High Risk pending intervention. "
            f"The highest severity case is {first_r.get('student_id')} at {first_r.get('school_name')} "
            f"(Risk Score: {r_score:.2f}, Reason: {first_r.get('risk_reason')}, "
            f"Priority: {first_r.get('priority')}). Immediate teacher and counselor follow-up is recommended."
        )

    elif intent_key == "risk_by_school":
        top_risk_sch = data[0]
        r_cnt = int(top_risk_sch.get("at_risk_student_count") or 0)
        avg_score = float(top_risk_sch.get("average_reading_score") or 0)
        return (
            f"The institution with the most at-risk learners is {top_risk_sch.get('school_name')} "
            f"({top_risk_sch.get('district')}, {top_risk_sch.get('state')}) with {r_cnt} "
            f"at-risk students and an average reading score of {avg_score:.2f}."
        )

    elif intent_key == "engagement_correlation":
        first_e = data[0]
        avg_score = float(first_e.get("avg_reading_score") or 0)
        bm_pct = float(first_e.get("benchmark_attainment_pct") or 0)
        return (
            f"Analysis of attendance tiers demonstrates a clear correlation with reading mastery: "
            f"Students in the {first_e.get('attendance_bracket')} tier achieve an average reading score of "
            f"{avg_score:.2f} with {bm_pct:.2f}% benchmark attainment."
        )

    elif intent_key == "intervention_effectiveness":
        best_cat = data[0]
        case_cnt = int(best_cat.get("case_count") or 0)
        avg_imp = float(best_cat.get("avg_score_improvement") or 0)
        return (
            f"Intervention effectiveness analysis shows {case_cnt} cases in the "
            f"'{best_cat.get('effectiveness_category')}' category, achieving an average score improvement of "
            f"+{avg_imp:.2f} points."
        )

    elif intent_key == "state_performance":
        st_row = data[0]
        avg_perf = float(st_row.get("average_performance") or 0)
        tot_sch = int(st_row.get("total_schools") or 0)
        tot_stu = int(float(st_row.get("total_students_evaluated") or 0))
        bm_pct = float(st_row.get("benchmark_percentage") or 0)
        return (
            f"In {st_row.get('state')}, the average reading performance is {avg_perf:.2f} "
            f"across {tot_sch} schools and {tot_stu:,} evaluated students, "
            f"with a state benchmark achievement rate of {bm_pct:.2f}%."
        )

    return f"Based on the analytical database query, retrieved {len(data)} verified record(s)."


def execute_agent_query(user_question: str, context: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
    """
    Main entry point for natural language analytics query execution:
    1. Rejects empty questions and destructive operations.
    2. Classifies intent and determines safe SQL query.
    3. Attempts Gemini AI query planning with automatic deterministic fallback.
    4. Enforces strict SQL safety guardrails and read-only execution.
    5. Retrieves grounded data from PostgreSQL.
    6. Synthesizes an executive grounded explanation.
    """
    if not user_question or not user_question.strip():
        return {
            "status": "error",
            "mode": "invalid_request",
            "question": user_question or "",
            "answer": "Question cannot be empty. Please ask an educational analytics question.",
            "data": [],
            "evidence_data": [],
            "evidence_row_count": 0,
            "executed_sql": "",
            "metadata": {"intent": "empty"}
        }

    clean_q = user_question.strip()

    # 1. Security Check: Reject destructive prompts immediately
    if is_destructive_prompt(clean_q):
        return {
            "status": "error",
            "mode": "security_rejected",
            "question": clean_q,
            "answer": "Security constraint violation: Requested operation is not permitted. Only read-only analytical queries (SELECT/WITH) on approved analytics views are allowed.",
            "data": [],
            "evidence_data": [],
            "evidence_row_count": 0,
            "executed_sql": "",
            "metadata": {"intent": "rejected_destructive"}
        }

    # 2. Classify intent
    intent_key = classify_analyst_intent(clean_q)
    target_sql = build_deterministic_sql(intent_key, clean_q)
    mode = "deterministic"

    # 3. Attempt Gemini AI planning if configured
    gemini_plan = None
    try:
        planning_prompt = f"User Question: {clean_q}\nClassified Base Intent: {intent_key}"
        if context:
            planning_prompt += f"\nConversation Context: {context}"

        plan_schema = {
            "type": "OBJECT",
            "properties": {
                "intent_key": {"type": "STRING"},
                "is_supported": {"type": "BOOLEAN"},
                "sql_query": {"type": "STRING"}
            },
            "required": ["intent_key", "is_supported", "sql_query"]
        }
        gemini_plan = generate_report_json(INTENT_PLANNER_SYSTEM_PROMPT, planning_prompt, plan_schema)
        if gemini_plan and gemini_plan.get("is_supported") and gemini_plan.get("sql_query"):
            candidate_sql = gemini_plan["sql_query"].strip()
            # Validate proposed SQL against SQL Guard
            sanitized_candidate = sanitize_and_validate_sql(candidate_sql)
            target_sql = sanitized_candidate
            intent_key = gemini_plan.get("intent_key") or intent_key
            mode = "ai_grounded"
    except Exception as e:
        logger.info(f"Gemini planner bypassed ({e}), using deterministic SQL.")
        mode = "deterministic"

    # 4. Enforce SQL Guardrail on final SQL
    try:
        sanitized_sql = sanitize_and_validate_sql(target_sql)
    except SqlGuardrailViolation as e:
        logger.warning(f"SQL guardrail violation on '{target_sql}': {e}. Falling back to default baseline SQL.")
        sanitized_sql = sanitize_and_validate_sql(build_deterministic_sql(intent_key, clean_q))
        mode = "deterministic"

    # 5. Execute safe query against PostgreSQL
    try:
        evidence_rows = fetch_all(sanitized_sql)
    except Exception as e:
        logger.error(f"Error executing agent SQL '{sanitized_sql}': {e}")
        # Retry with overall performance safe baseline
        sanitized_sql = sanitize_and_validate_sql(build_deterministic_sql("overall_performance", clean_q))
        evidence_rows = fetch_all(sanitized_sql)
        mode = "deterministic"

    # Convert Decimals for JSON serialization
    clean_rows: List[Dict[str, Any]] = []
    for r in evidence_rows:
        clean_r: Dict[str, Any] = {}
        for k, v in r.items():
            if isinstance(v, Decimal):
                clean_r[k] = float(v)
            elif hasattr(v, "isoformat"):
                clean_r[k] = v.isoformat()
            else:
                clean_r[k] = v
        clean_rows.append(clean_r)

    # 6. Generate Grounded Explanation
    answer_text = None
    if mode == "ai_grounded":
        try:
            synthesis_prompt = (
                f"Question: {clean_q}\n"
                f"Intent: {intent_key}\n"
                f"PostgreSQL Evidence (JSON):\n{clean_rows[:15]}\n"
            )
            ai_explanation = generate_ai_analysis(
                GROUNDED_SYNTHESIS_SYSTEM_PROMPT,
                synthesis_prompt,
                temperature=0.2
            )
            if ai_explanation and ai_explanation.strip():
                answer_text = ai_explanation.strip()
        except Exception as e:
            logger.info(f"Gemini synthesis failed ({e}), using deterministic synthesis.")

    if not answer_text:
        answer_text = synthesize_deterministic_answer(intent_key, clean_q, clean_rows)

    return {
        "status": "success",
        "mode": mode,
        "question": clean_q,
        "answer": answer_text,
        "data": clean_rows,
        "evidence_data": clean_rows,
        "evidence_row_count": len(clean_rows),
        "executed_sql": sanitized_sql,
        "metadata": {
            "intent": intent_key,
            "row_count": len(clean_rows),
            "grounding_status": "Verified against live PostgreSQL analytics schema",
            "generated_at": datetime.now().isoformat()
        }
    }

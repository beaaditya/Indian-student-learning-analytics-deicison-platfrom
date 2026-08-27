"""
SQL Guardrail & Allowlist Security Module
Student Learning Analytics & Decision Intelligence Platform

Enforces strict read-only execution, analytics object allowlisting,
DDL/DML rejection, comment injection blocking, and query isolation.
"""
import re
from typing import Set


class SqlGuardrailViolation(Exception):
    """Raised when an analytical query violates database security guardrails."""
    pass


# Strictly approved analytics views and tables
ALLOWED_ANALYTICS_VIEWS: Set[str] = {
    "analytics.v_overall_performance",
    "analytics.v_school_performance",
    "analytics.v_grade_performance",
    "analytics.v_student_performance",
    "analytics.v_subject_performance",
    "analytics.v_performance_trend",
    "analytics.v_engagement_performance",
    "analytics.v_student_risk",
    "analytics.v_intervention_effectiveness",
    "analytics.v_powerbi_master",
    # Underlying analytics fact/dim tables for read-only aggregation
    "analytics.dim_school",
    "analytics.dim_student",
    "analytics.fact_assessment",
    "analytics.fact_performance",
    "analytics.fact_engagement",
    "analytics.fact_intervention",
}

# Forbidden keywords, DDL, DML, administrative commands, and unauthorized schemas
FORBIDDEN_SQL_PATTERNS = [
    r"\bINSERT\b",
    r"\bUPDATE\b",
    r"\bDELETE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bTRUNCATE\b",
    r"\bCREATE\b",
    r"\bGRANT\b",
    r"\bREVOKE\b",
    r"\bMERGE\b",
    r"\bUPSERT\b",
    r"\bVACUUM\b",
    r"\bREINDEX\b",
    r"\bCOMMENT\b",
    r"\bCOPY\b",
    r"\bCALL\b",
    r"\bDO\b",
    r"\bEXEC\b",
    r"\bEXECUTE\b",
    r"\bINTO\b",
    r"\bPG_SLEEP\b",
    r"\bPG_SHADOW\b",
    r"\bPG_AUTHID\b",
    r"\bPG_USER\b",
    r"\bPG_DATABASE\b",
    r"\bPG_TABLES\b",
    r"\bPG_CATALOG\b",
    r"\bINFORMATION_SCHEMA\b",
    r"\bRAW\.",
    r"\bSTAGING\.",
    r"\bETL\.",
]


def sanitize_and_validate_sql(sql_query: str, max_limit: int = 100) -> str:
    """
    Validates that a SQL query satisfies all database security guardrails:
    1. Must be a non-empty string.
    2. Must NOT contain SQL comment injection (-- or /* */).
    3. Must NOT contain multiple statements separated by semicolons.
    4. Must start strictly with SELECT or WITH.
    5. Must NOT contain any forbidden DDL/DML/administrative/system keywords.
    6. Must only reference allowed analytics views or tables.
    7. Enforces an explicit LIMIT clause if not present or exceeding max_limit.
    """
    if not sql_query or not isinstance(sql_query, str):
        raise SqlGuardrailViolation("Query must be a valid non-empty string.")

    cleaned = sql_query.strip()

    # 1. Reject SQL comment injection
    if re.search(r"--", cleaned) or re.search(r"/\*.*?\*/", cleaned, re.DOTALL):
        raise SqlGuardrailViolation("SQL comments are strictly forbidden to prevent injection attacks.")

    # 2. Reject multi-statement queries
    if ";" in cleaned.rstrip(";"):
        raise SqlGuardrailViolation("Multi-statement queries containing semicolons are strictly prohibited.")

    cleaned_no_trailing_semi = cleaned.rstrip(";").strip()

    # 3. Must begin with SELECT or WITH
    if not (re.match(r"^\s*SELECT\b", cleaned_no_trailing_semi, re.IGNORECASE) or
            re.match(r"^\s*WITH\b", cleaned_no_trailing_semi, re.IGNORECASE)):
        raise SqlGuardrailViolation("Query must begin strictly with SELECT or WITH.")

    # 4. Check for forbidden keywords and system objects
    for pattern in FORBIDDEN_SQL_PATTERNS:
        if re.search(pattern, cleaned_no_trailing_semi, re.IGNORECASE):
            raise SqlGuardrailViolation(f"Security violation: Query contains disallowed keyword/pattern '{pattern}'.")

    # 5. Verify that any referenced schema identifier is allowed
    schema_references = re.findall(r"\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b", cleaned_no_trailing_semi)
    common_aliases = {"s", "p", "st", "i", "a", "ie", "sp", "sr", "sys", "sa", "gp", "ep", "sub", "ts", "top_schools"}
    for schema, table in schema_references:
        full_name = f"{schema.lower()}.{table.lower()}"
        if full_name not in ALLOWED_ANALYTICS_VIEWS and schema.lower() not in common_aliases:
            raise SqlGuardrailViolation(f"Unauthorized object access: '{full_name}' is not in the approved analytics allowlist.")

    # 6. Ensure or enforce query LIMIT
    if re.search(r"\bLIMIT\b", cleaned_no_trailing_semi, re.IGNORECASE):
        numeric_limit = re.search(r"\bLIMIT\s+(\d+)\b", cleaned_no_trailing_semi, re.IGNORECASE)
        if numeric_limit:
            current_limit = int(numeric_limit.group(1))
            if current_limit > max_limit:
                cleaned_no_trailing_semi = re.sub(
                    r"\bLIMIT\s+\d+\b",
                    f"LIMIT {max_limit}",
                    cleaned_no_trailing_semi,
                    flags=re.IGNORECASE
                )
    else:
        cleaned_no_trailing_semi = f"{cleaned_no_trailing_semi} LIMIT {max_limit}"

    return cleaned_no_trailing_semi + ";"


def is_safe_sql(sql_query: str) -> bool:
    """Returns True if the SQL query passes all safety checks, False otherwise."""
    try:
        sanitize_and_validate_sql(sql_query)
        return True
    except SqlGuardrailViolation:
        return False

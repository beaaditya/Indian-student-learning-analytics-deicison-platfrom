"""
Unit & Security Tests for backend/sql_guard.py
Verifies strict SQL allowlisting, DDL/DML rejection, multi-statement blocking, and schema isolation.
"""
import pytest
from backend.sql_guard import sanitize_and_validate_sql, is_safe_sql, SqlGuardrailViolation

def test_valid_select_allowed_view():
    """Valid queries on approved analytics views must pass successfully."""
    valid_queries = [
        "SELECT * FROM analytics.v_overall_performance LIMIT 10;",
        "SELECT school_id, school_name, average_reading_score FROM analytics.v_school_performance WHERE average_reading_score >= 75 ORDER BY average_reading_score DESC LIMIT 20;",
        "SELECT grade, average_reading_score, benchmark_percentage FROM analytics.v_grade_performance ORDER BY grade ASC;",
        "SELECT student_id, risk_level, risk_score FROM analytics.v_student_risk WHERE risk_level = 'High' LIMIT 15;",
        "WITH top_schools AS (SELECT school_id, school_name, rank FROM analytics.v_school_performance WHERE rank <= 5) SELECT * FROM top_schools;"
    ]
    for q in valid_queries:
        sanitized = sanitize_and_validate_sql(q)
        assert sanitized.endswith(";")
        assert is_safe_sql(q) is True

def test_reject_dangerous_dml():
    """Direct DML modification statements must be strictly rejected."""
    dangerous_dml = [
        "DELETE FROM analytics.dim_student;",
        "UPDATE analytics.dim_student SET grade = 10;",
        "INSERT INTO analytics.dim_school (school_id, school_name) VALUES ('TEST', 'Hacked');",
        "MERGE INTO analytics.fact_performance USING analytics.dim_student ON 1=1 WHEN MATCHED THEN UPDATE SET reading_score = 100;",
        "UPSERT INTO analytics.dim_student (student_id) VALUES ('STU999');"
    ]
    for q in dangerous_dml:
        with pytest.raises(SqlGuardrailViolation):
            sanitize_and_validate_sql(q)
        assert is_safe_sql(q) is False

def test_reject_dangerous_ddl_and_admin():
    """DDL and database administration commands must be strictly rejected."""
    dangerous_ddl = [
        "DROP TABLE analytics.fact_performance;",
        "DROP SCHEMA analytics CASCADE;",
        "TRUNCATE analytics.fact_performance;",
        "ALTER TABLE analytics.dim_school DROP COLUMN state;",
        "CREATE TABLE analytics.malicious (id int);",
        "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA analytics TO public;",
        "REVOKE SELECT ON analytics.v_school_performance FROM public;",
        "VACUUM FULL;",
        "REINDEX DATABASE postgres;",
        "COPY analytics.dim_student TO '/tmp/dump.csv';"
    ]
    for q in dangerous_ddl:
        with pytest.raises(SqlGuardrailViolation):
            sanitize_and_validate_sql(q)
        assert is_safe_sql(q) is False

def test_reject_multistatement_injection():
    """Queries with semicolon-separated statements must be strictly blocked."""
    injections = [
        "SELECT * FROM analytics.v_school_performance; DROP TABLE analytics.dim_student;",
        "SELECT 1; DELETE FROM analytics.fact_performance WHERE 1=1;",
        "SELECT * FROM analytics.v_overall_performance; UPDATE analytics.dim_school SET school_name='Hacked';"
    ]
    for q in injections:
        with pytest.raises(SqlGuardrailViolation):
            sanitize_and_validate_sql(q)
        assert is_safe_sql(q) is False

def test_reject_comment_injection():
    """SQL comments used for injection or bypass must be rejected."""
    comment_queries = [
        "SELECT * FROM analytics.v_school_performance -- bypass safety filter",
        "SELECT * FROM analytics.v_overall_performance /* comment block */",
        "SELECT 1 --\nUNION SELECT password FROM users"
    ]
    for q in comment_queries:
        with pytest.raises(SqlGuardrailViolation):
            sanitize_and_validate_sql(q)
        assert is_safe_sql(q) is False

def test_reject_unauthorized_schemas_and_system_tables():
    """Access to pg_catalog, information_schema, raw, staging, and etl schemas must be blocked."""
    unauthorized_queries = [
        "SELECT * FROM information_schema.tables;",
        "SELECT usename, passwd FROM pg_shadow;",
        "SELECT * FROM pg_catalog.pg_tables;",
        "SELECT * FROM raw.schools_raw;",
        "SELECT * FROM staging.stg_students;",
        "SELECT * FROM etl.pipeline_logs;"
    ]
    for q in unauthorized_queries:
        with pytest.raises(SqlGuardrailViolation):
            sanitize_and_validate_sql(q)
        assert is_safe_sql(q) is False

def test_enforce_query_limit():
    """Queries without a LIMIT or with an excessive LIMIT must be capped."""
    q_no_limit = "SELECT school_id, school_name FROM analytics.v_school_performance"
    sanitized = sanitize_and_validate_sql(q_no_limit, max_limit=50)
    assert "LIMIT 50" in sanitized

    q_excessive = "SELECT school_id FROM analytics.v_school_performance LIMIT 1000"
    sanitized_excessive = sanitize_and_validate_sql(q_excessive, max_limit=100)
    assert "LIMIT 100" in sanitized_excessive

-- ==============================================================================
-- 10_validate_decision_intelligence.sql
-- Validation Suite for Decision Intelligence Backend & API Data Layer
-- Validates KPI reconciliation, object counts, referential integrity, and domain constraints
-- ==============================================================================

-- 1. API Source Query: Executive Overview KPIs Reconcile
SELECT
    '1. KPI Reconciliation: Total Students Reconciled' AS test_name,
    CASE WHEN (SELECT COUNT(DISTINCT student_id) FROM analytics.fact_performance) = (SELECT total_students FROM analytics.v_overall_performance)
         THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT COUNT(DISTINCT student_id) FROM analytics.fact_performance) - (SELECT total_students FROM analytics.v_overall_performance) AS metric_delta

UNION ALL

-- 2. KPI Reconciliation: Total Assessments Reconciled
SELECT
    '2. KPI Reconciliation: Total Assessments Reconciled' AS test_name,
    CASE WHEN (SELECT COUNT(*) FROM analytics.fact_performance) = (SELECT total_assessments FROM analytics.v_overall_performance)
         THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT COUNT(*) FROM analytics.fact_performance) - (SELECT total_assessments FROM analytics.v_overall_performance) AS metric_delta

UNION ALL

-- 3. KPI Reconciliation: Average Reading Score Reconciled
SELECT
    '3. KPI Reconciliation: Average Reading Score Reconciled' AS test_name,
    CASE WHEN (SELECT ROUND(AVG(reading_score), 2) FROM analytics.fact_performance) = (SELECT average_reading_score FROM analytics.v_overall_performance)
         THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT ROUND(AVG(reading_score), 2) FROM analytics.fact_performance) - (SELECT average_reading_score FROM analytics.v_overall_performance) AS metric_delta

UNION ALL

-- 4. School Count Reconciled (989 schools)
SELECT
    '4. Object Count: School Count in v_school_performance' AS test_name,
    CASE WHEN (SELECT COUNT(*) FROM analytics.v_school_performance) = 989 THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT COUNT(*) FROM analytics.v_school_performance) AS metric_delta

UNION ALL

-- 5. Grade Count Reconciled (5 grades: 6, 7, 8, 9, 10)
SELECT
    '5. Object Count: Grade Count in v_grade_performance' AS test_name,
    CASE WHEN (SELECT COUNT(*) FROM analytics.v_grade_performance) = 5 THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT COUNT(*) FROM analytics.v_grade_performance) AS metric_delta

UNION ALL

-- 6. Subject Count Reconciled (3 subjects: English, Math, Science)
SELECT
    '6. Object Count: Subject Count in v_subject_performance' AS test_name,
    CASE WHEN (SELECT COUNT(*) FROM analytics.v_subject_performance) = 3 THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT COUNT(*) FROM analytics.v_subject_performance) AS metric_delta

UNION ALL

-- 7. Risk Intervention Volume Reconciled (14,373 cases)
SELECT
    '7. Object Count: Intervention Volume in fact_intervention' AS test_name,
    CASE WHEN (SELECT COUNT(*) FROM analytics.fact_intervention) = 14373 THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT COUNT(*) FROM analytics.fact_intervention) AS metric_delta

UNION ALL

-- 8. Zero Orphan School Identifiers
SELECT
    '8. Referential Integrity: Zero Orphan School IDs' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_delta
FROM analytics.fact_performance p
LEFT JOIN analytics.dim_school s ON p.school_id = s.school_id
WHERE s.school_id IS NULL

UNION ALL

-- 9. Zero Orphan Student Identifiers
SELECT
    '9. Referential Integrity: Zero Orphan Student IDs' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_delta
FROM analytics.fact_performance p
LEFT JOIN analytics.dim_student st ON p.student_id = st.student_id
WHERE st.student_id IS NULL

UNION ALL

-- 10. Grade Domain Constraint Invariant (Strictly 6 to 10)
SELECT
    '10. Domain Range: Grades strictly between 6 and 10' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_delta
FROM analytics.fact_performance
WHERE grade NOT BETWEEN 6 AND 10

UNION ALL

-- 11. Performance Scores Within Valid Range [0, 100]
SELECT
    '11. Domain Range: Scores within [0, 100]' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_delta
FROM analytics.fact_performance
WHERE reading_score < 0 OR reading_score > 100
   OR accuracy_pct < 0 OR accuracy_pct > 100

UNION ALL

-- 12. Business Rule: WCPM <= WPM
SELECT
    '12. Fluency Invariant: WCPM <= WPM' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_delta
FROM analytics.fact_performance
WHERE wcpm > wpm

UNION ALL

-- 13. Business Rule: Assignments Completed <= Assigned
SELECT
    '13. Engagement Invariant: Completed <= Assigned' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_delta
FROM analytics.fact_engagement
WHERE assignments_completed > assignments_assigned;

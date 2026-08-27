-- ==============================================================================
-- 08_validate_analytics.sql
-- Analytical Data Quality & View Verification Suite
-- Validates dimensional integrity, referential constraints, business rules, and view availability
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Primary Key Uniqueness & Non-Duplication
-- ------------------------------------------------------------------------------
SELECT
    '1. Dimension Primary Key Uniqueness (dim_student)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM (
    SELECT student_id, COUNT(*)
    FROM analytics.dim_student
    GROUP BY student_id
    HAVING COUNT(*) > 1
) sub

UNION ALL

SELECT
    '2. Dimension Primary Key Uniqueness (dim_school)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM (
    SELECT school_id, COUNT(*)
    FROM analytics.dim_school
    GROUP BY school_id
    HAVING COUNT(*) > 1
) sub

UNION ALL

SELECT
    '3. Fact Primary Key Uniqueness (fact_assessment)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM (
    SELECT assessment_id, COUNT(*)
    FROM analytics.fact_assessment
    GROUP BY assessment_id
    HAVING COUNT(*) > 1
) sub

UNION ALL

SELECT
    '4. Fact Primary Key Uniqueness (fact_performance)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM (
    SELECT performance_id, COUNT(*)
    FROM analytics.fact_performance
    GROUP BY performance_id
    HAVING COUNT(*) > 1
) sub

UNION ALL

SELECT
    '5. Fact Primary Key Uniqueness (fact_engagement)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM (
    SELECT engagement_id, COUNT(*)
    FROM analytics.fact_engagement
    GROUP BY engagement_id
    HAVING COUNT(*) > 1
) sub

UNION ALL

SELECT
    '6. Fact Primary Key Uniqueness (fact_intervention)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM (
    SELECT intervention_id, COUNT(*)
    FROM analytics.fact_intervention
    GROUP BY intervention_id
    HAVING COUNT(*) > 1
) sub

-- ------------------------------------------------------------------------------
-- 2. Referential Integrity (No Orphan Records)
-- ------------------------------------------------------------------------------
UNION ALL

SELECT
    '7. Referential Integrity: dim_student -> dim_school' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.dim_student st
LEFT JOIN analytics.dim_school sc ON st.school_id = sc.school_id
WHERE sc.school_id IS NULL

UNION ALL

SELECT
    '8. Referential Integrity: fact_assessment -> dim_student' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_assessment a
LEFT JOIN analytics.dim_student st ON a.student_id = st.student_id
WHERE st.student_id IS NULL

UNION ALL

SELECT
    '9. Referential Integrity: fact_performance -> fact_assessment' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_performance p
LEFT JOIN analytics.fact_assessment a ON p.assessment_id = a.assessment_id
WHERE a.assessment_id IS NULL

UNION ALL

SELECT
    '10. Referential Integrity: fact_engagement -> dim_student' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_engagement e
LEFT JOIN analytics.dim_student st ON e.student_id = st.student_id
WHERE st.student_id IS NULL

UNION ALL

SELECT
    '11. Referential Integrity: fact_intervention -> dim_student' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_intervention i
LEFT JOIN analytics.dim_student st ON i.student_id = st.student_id
WHERE st.student_id IS NULL

-- ------------------------------------------------------------------------------
-- 3. Domain & Schema Constraint Validation
-- ------------------------------------------------------------------------------
UNION ALL

SELECT
    '12. Domain Range: Grades strictly between 6 and 10' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM (
    SELECT grade FROM analytics.dim_student WHERE grade NOT BETWEEN 6 AND 10
    UNION ALL
    SELECT grade FROM analytics.fact_assessment WHERE grade NOT BETWEEN 6 AND 10
    UNION ALL
    SELECT grade FROM analytics.fact_performance WHERE grade NOT BETWEEN 6 AND 10
    UNION ALL
    SELECT grade FROM analytics.fact_engagement WHERE grade NOT BETWEEN 6 AND 10
    UNION ALL
    SELECT grade FROM analytics.fact_intervention WHERE grade NOT BETWEEN 6 AND 10
) invalid_grades

UNION ALL

SELECT
    '13. Domain Range: Performance scores within [0, 100]' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_performance
WHERE reading_score < 0 OR reading_score > 100
   OR accuracy_pct < 0 OR accuracy_pct > 100
   OR fluency_score < 0 OR fluency_score > 100
   OR comprehension_score < 0 OR comprehension_score > 100
   OR vocabulary_score < 0 OR vocabulary_score > 100
   OR grammar_score < 0 OR grammar_score > 100
   OR pronunciation_score < 0 OR pronunciation_score > 100

-- ------------------------------------------------------------------------------
-- 4. Business Logic Integrity Checks
-- ------------------------------------------------------------------------------
UNION ALL

SELECT
    '14. Business Rule: WCPM <= WPM' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_performance
WHERE wcpm > wpm

UNION ALL

SELECT
    '15. Business Rule: Assignments Completed <= Assigned' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_engagement
WHERE assignments_completed > assignments_assigned

UNION ALL

SELECT
    '16. Business Rule: Resolution Date >= Identified Date' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.fact_intervention
WHERE resolution_date IS NOT NULL
  AND resolution_date < identified_date

-- ------------------------------------------------------------------------------
-- 5. Analytical Views Availability & Row Count Check
-- ------------------------------------------------------------------------------
UNION ALL

SELECT
    '17. View Verification: v_overall_performance returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_overall_performance

UNION ALL

SELECT
    '18. View Verification: v_school_performance returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_school_performance

UNION ALL

SELECT
    '19. View Verification: v_grade_performance returns 5 grades (6-10)' AS test_name,
    CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_grade_performance

UNION ALL

SELECT
    '20. View Verification: v_student_performance returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_student_performance

UNION ALL

SELECT
    '21. View Verification: v_subject_performance returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_subject_performance

UNION ALL

SELECT
    '22. View Verification: v_performance_trend returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_performance_trend

UNION ALL

SELECT
    '23. View Verification: v_engagement_performance returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_engagement_performance

UNION ALL

SELECT
    '24. View Verification: v_student_risk returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_student_risk

UNION ALL

SELECT
    '25. View Verification: v_intervention_effectiveness returns data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS violation_count
FROM analytics.v_intervention_effectiveness;

-- ==============================================================================
-- 09_validate_powerbi_master.sql
-- Validation Suite for analytics.v_powerbi_master
-- Verifies view existence, grain uniqueness, constraint validity, and KPI reconciliation
-- ==============================================================================

-- 1. View Exists and Returns Rows
SELECT
    '1. View Exists and Returns Data' AS test_name,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM analytics.v_powerbi_master

UNION ALL

-- 2. No Duplicate Business Grain (performance_id is unique)
SELECT
    '2. Grain Uniqueness (performance_id has 0 duplicates)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM (
    SELECT performance_id, COUNT(*)
    FROM analytics.v_powerbi_master
    GROUP BY performance_id
    HAVING COUNT(*) > 1
) dupes

UNION ALL

-- 3. Row Count Equality (No Join Multiplication vs. fact_performance)
SELECT
    '3. Row Count Parity with fact_performance' AS test_name,
    CASE WHEN (SELECT COUNT(*) FROM analytics.v_powerbi_master) = (SELECT COUNT(*) FROM analytics.fact_performance)
         THEN 'PASS' ELSE 'FAIL' END AS status,
    (SELECT COUNT(*) FROM analytics.v_powerbi_master) - (SELECT COUNT(*) FROM analytics.fact_performance) AS metric_value

UNION ALL

-- 4. Valid Student IDs (All student_id exist in dim_student)
SELECT
    '4. Student ID Referential Integrity' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM analytics.v_powerbi_master m
LEFT JOIN analytics.dim_student st ON m.student_id = st.student_id
WHERE st.student_id IS NULL

UNION ALL

-- 5. Valid School IDs (All school_id exist in dim_school)
SELECT
    '5. School ID Referential Integrity' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM analytics.v_powerbi_master m
LEFT JOIN analytics.dim_school sc ON m.school_id = sc.school_id
WHERE sc.school_id IS NULL

UNION ALL

-- 6. Grade Range Invariant (Grades strictly 6 to 10)
SELECT
    '6. Grade Range Invariant (6-10)' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM analytics.v_powerbi_master
WHERE grade NOT BETWEEN 6 AND 10

UNION ALL

-- 7. Academic Performance Score Range Invariant [0, 100]
SELECT
    '7. Score Range Invariant ([0, 100])' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM analytics.v_powerbi_master
WHERE reading_score < 0 OR reading_score > 100
   OR accuracy_pct < 0 OR accuracy_pct > 100
   OR fluency_score < 0 OR fluency_score > 100
   OR comprehension_score < 0 OR comprehension_score > 100
   OR vocabulary_score < 0 OR vocabulary_score > 100
   OR grammar_score < 0 OR grammar_score > 100
   OR pronunciation_score < 0 OR pronunciation_score > 100

UNION ALL

-- 8. Business Rule: WCPM <= WPM
SELECT
    '8. Fluency Invariant: WCPM <= WPM' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM analytics.v_powerbi_master
WHERE wcpm > wpm

UNION ALL

-- 9. Business Rule: Assignments Completed <= Assigned
SELECT
    '9. Engagement Invariant: Completed <= Assigned' AS test_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
    COUNT(*) AS metric_value
FROM analytics.v_powerbi_master
WHERE assignments_completed IS NOT NULL 
  AND assignments_assigned IS NOT NULL
  AND assignments_completed > assignments_assigned

UNION ALL

-- 10. KPI Reconciliation: Average Reading Score matches v_overall_performance
SELECT
    '10. KPI Reconciliation: Average Reading Score' AS test_name,
    CASE WHEN ROUND((SELECT AVG(reading_score) FROM analytics.v_powerbi_master), 2) = 
              (SELECT average_reading_score FROM analytics.v_overall_performance)
         THEN 'PASS' ELSE 'FAIL' END AS status,
    ROUND((SELECT AVG(reading_score) FROM analytics.v_powerbi_master) - 
          (SELECT average_reading_score FROM analytics.v_overall_performance), 4) AS metric_value

UNION ALL

-- 11. KPI Reconciliation: Benchmark Attainment % matches v_overall_performance
SELECT
    '11. KPI Reconciliation: Benchmark Percentage' AS test_name,
    CASE WHEN ROUND(100.0 * (SELECT COUNT(*) FROM analytics.v_powerbi_master WHERE LOWER(benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF((SELECT COUNT(*) FROM analytics.v_powerbi_master), 0), 2) = 
              (SELECT benchmark_percentage FROM analytics.v_overall_performance)
         THEN 'PASS' ELSE 'FAIL' END AS status,
    ROUND(100.0 * (SELECT COUNT(*) FROM analytics.v_powerbi_master WHERE LOWER(benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF((SELECT COUNT(*) FROM analytics.v_powerbi_master), 0), 2) - 
          (SELECT benchmark_percentage FROM analytics.v_overall_performance) AS metric_value;

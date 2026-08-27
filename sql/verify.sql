SELECT COUNT(*) AS count_dim_school FROM analytics.dim_school;
SELECT COUNT(*) AS count_dim_student FROM analytics.dim_student;
SELECT COUNT(*) AS count_fact_assessment FROM analytics.fact_assessment;
SELECT COUNT(*) AS count_fact_performance FROM analytics.fact_performance;
SELECT COUNT(*) AS count_fact_engagement FROM analytics.fact_engagement;
SELECT COUNT(*) AS count_fact_intervention FROM analytics.fact_intervention;

SELECT *
FROM etl.etl_run_log
ORDER BY run_id DESC
LIMIT 5;

SELECT
    dataset,
    issue_type,
    COUNT(*) AS issue_count
FROM etl.data_quality_log
GROUP BY dataset, issue_type
ORDER BY dataset, issue_type;

SELECT
    dataset,
    rejection_reason,
    COUNT(*) AS rejection_count
FROM etl.rejected_records
GROUP BY dataset, rejection_reason
ORDER BY dataset, rejection_reason;

SELECT COUNT(*) AS count_missing_digital_access
FROM analytics.dim_school
WHERE digital_access_score IS NULL;

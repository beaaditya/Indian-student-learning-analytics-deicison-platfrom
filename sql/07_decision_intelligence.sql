-- ==============================================================================
-- 07_decision_intelligence.sql
-- Decision-Intelligence Analytical Queries
-- Actionable patterns and diagnostic queries for educational leadership
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Top-Performing Schools
-- Identifies top 10 schools by benchmark attainment rate and average reading score
-- ------------------------------------------------------------------------------
-- Decision Use: Highlight model institutions for peer learning and best-practice sharing
SELECT
    school_id,
    school_name,
    district,
    state,
    management_type,
    total_students,
    evaluated_students,
    average_reading_score,
    benchmark_percentage,
    at_risk_student_count,
    rank
FROM analytics.v_school_performance
WHERE evaluated_students >= 50
ORDER BY benchmark_percentage DESC, average_reading_score DESC
LIMIT 10;

-- ------------------------------------------------------------------------------
-- 2. Lowest-Performing Schools
-- Identifies bottom 10 schools in critical need of administrative intervention
-- ------------------------------------------------------------------------------
-- Decision Use: Target specialized remedial funding, pedagogical coaching, and inspections
SELECT
    school_id,
    school_name,
    district,
    state,
    management_type,
    total_students,
    evaluated_students,
    average_reading_score,
    benchmark_percentage,
    below_benchmark_percentage,
    at_risk_student_count
FROM analytics.v_school_performance
WHERE evaluated_students >= 30
ORDER BY benchmark_percentage ASC, average_reading_score ASC
LIMIT 10;

-- ------------------------------------------------------------------------------
-- 3. Schools Significantly Below Overall System Average
-- Identifies schools where average performance is >= 15 points below system average
-- ------------------------------------------------------------------------------
-- Decision Use: Trigger systemic district-level remediation reviews
WITH sys_avg AS (
    SELECT average_reading_score AS overall_avg
    FROM analytics.v_overall_performance
)
SELECT
    sp.school_id,
    sp.school_name,
    sp.district,
    sp.state,
    sp.average_reading_score,
    sa.overall_avg AS system_average_reading_score,
    ROUND(sp.average_reading_score - sa.overall_avg, 2) AS score_gap_vs_system,
    sp.benchmark_percentage,
    sp.at_risk_student_count
FROM analytics.v_school_performance sp
CROSS JOIN sys_avg sa
WHERE sp.average_reading_score < (sa.overall_avg - 15.00)
ORDER BY score_gap_vs_system ASC;

-- ------------------------------------------------------------------------------
-- 4. Grades Needing Focused Reinforcement
-- Ranks grades 6-10 by proportion of students failing benchmarks
-- ------------------------------------------------------------------------------
-- Decision Use: Allocate curriculum developers and supplementary materials to target grades
SELECT
    grade,
    total_students,
    evaluated_students,
    average_reading_score,
    average_comprehension,
    average_fluency,
    below_benchmark_percentage,
    at_risk_student_count,
    ROUND(100.0 * at_risk_student_count / NULLIF(total_students, 0), 2) AS at_risk_rate_pct
FROM analytics.v_grade_performance
ORDER BY below_benchmark_percentage DESC;

-- ------------------------------------------------------------------------------
-- 5. Students at Highest Risk (Critical Severity)
-- Identifies students with High/Critical risk scores needing immediate 1-on-1 support
-- ------------------------------------------------------------------------------
-- Decision Use: Populate immediate weekly caseload for counselors and remedial specialists
SELECT
    r.student_id,
    r.school_id,
    r.school_name,
    r.grade,
    r.section,
    r.risk_level,
    r.risk_score,
    r.risk_reason,
    r.priority,
    r.recommended_action,
    r.intervention_status
FROM analytics.v_student_risk r
WHERE r.risk_level = 'High'
  AND r.intervention_status IN ('Open', 'In Progress')
ORDER BY r.risk_score DESC, r.identified_date ASC
LIMIT 50;

-- ------------------------------------------------------------------------------
-- 6. Students Showing Declining Performance Trajectory
-- Identifies students with negative improvement rates across assessments
-- ------------------------------------------------------------------------------
-- Decision Use: Early warning trigger to prevent students from falling below benchmark
SELECT
    sp.student_id,
    sp.school_id,
    sp.school_name,
    sp.grade,
    sp.section,
    sp.latest_performance,
    sp.average_performance,
    sp.improvement_percentage,
    sp.benchmark_status,
    sp.performance_band,
    sp.risk_status
FROM analytics.v_student_performance sp
WHERE sp.total_assessments >= 2
  AND sp.improvement_percentage < -5.00
ORDER BY sp.improvement_percentage ASC
LIMIT 50;

-- ------------------------------------------------------------------------------
-- 7. Students Showing Strong Improvement Outliers
-- Identifies students achieving exemplary learning growth
-- ------------------------------------------------------------------------------
-- Decision Use: Recognize student achievement and identify successful peer study behaviors
SELECT
    sp.student_id,
    sp.school_id,
    sp.school_name,
    sp.grade,
    sp.section,
    sp.latest_performance,
    sp.average_performance,
    sp.improvement_percentage,
    sp.benchmark_status,
    sp.performance_band
FROM analytics.v_student_performance sp
WHERE sp.total_assessments >= 2
  AND sp.improvement_percentage >= 15.00
ORDER BY sp.improvement_percentage DESC
LIMIT 50;

-- ------------------------------------------------------------------------------
-- 8. Common Risk Reasons & Root-Cause Distribution
-- Analyzes primary drivers behind academic risk flags across all students
-- ------------------------------------------------------------------------------
-- Decision Use: Design systemic policy responses (e.g. attendance drives vs. reading kits)
SELECT
    risk_reason,
    COUNT(*) AS total_flagged_students,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM analytics.fact_intervention), 2) AS percentage_of_total_risk,
    ROUND(AVG(risk_score), 2) AS average_risk_severity,
    COUNT(*) FILTER (WHERE status = 'Open') AS open_cases,
    COUNT(*) FILTER (WHERE status = 'Resolved') AS resolved_cases
FROM analytics.fact_intervention
GROUP BY risk_reason
ORDER BY total_flagged_students DESC;

-- ------------------------------------------------------------------------------
-- 9. Engagement Indicators Associated with Low Performance
-- Evaluates performance differences grouped by student engagement level & attendance
-- ------------------------------------------------------------------------------
-- Decision Use: Establish minimum required engagement thresholds for schools
SELECT
    primary_engagement_level,
    CASE
        WHEN avg_attendance_pct >= 85 THEN 'High Attendance (>=85%)'
        WHEN avg_attendance_pct >= 70 THEN 'Moderate Attendance (70-84%)'
        ELSE 'Chronic Absenteeism (<70%)'
    END AS attendance_category,
    COUNT(student_id) AS student_count,
    ROUND(AVG(avg_assignment_completion_pct), 2) AS cohort_avg_assignment_completion,
    ROUND(AVG(avg_platform_minutes), 1) AS cohort_avg_platform_minutes,
    ROUND(AVG(avg_reading_score), 2) AS cohort_avg_reading_score,
    ROUND(AVG(benchmark_met_pct), 2) AS cohort_benchmark_attainment_pct
FROM analytics.v_engagement_performance
GROUP BY
    primary_engagement_level,
    CASE
        WHEN avg_attendance_pct >= 85 THEN 'High Attendance (>=85%)'
        WHEN avg_attendance_pct >= 70 THEN 'Moderate Attendance (70-84%)'
        ELSE 'Chronic Absenteeism (<70%)'
    END
ORDER BY cohort_avg_reading_score ASC;

-- ------------------------------------------------------------------------------
-- 10. Schools with Dual Vulnerability (High Risk Concentration + Low Engagement)
-- Identifies institutions experiencing acute disengagement and high academic failure
-- ------------------------------------------------------------------------------
-- Decision Use: Priority deployment of holistic community, infrastructure, and academic packages
WITH school_eng_agg AS (
    SELECT
        ep.school_id,
        ROUND(AVG(ep.avg_attendance_pct), 2) AS school_avg_attendance,
        ROUND(AVG(ep.avg_assignment_completion_pct), 2) AS school_avg_assignment_completion
    FROM analytics.v_engagement_performance ep
    GROUP BY ep.school_id
)
SELECT
    sp.school_id,
    sp.school_name,
    sp.district,
    sp.state,
    sp.total_students,
    sp.at_risk_student_count,
    ROUND(100.0 * sp.at_risk_student_count / NULLIF(sp.total_students, 0), 2) AS at_risk_rate_pct,
    sea.school_avg_attendance,
    sea.school_avg_assignment_completion,
    sp.average_reading_score,
    sp.benchmark_percentage
FROM analytics.v_school_performance sp
JOIN school_eng_agg sea ON sp.school_id = sea.school_id
WHERE (100.0 * sp.at_risk_student_count / NULLIF(sp.total_students, 0)) >= 15.0
  AND sea.school_avg_attendance < 75.0
ORDER BY at_risk_rate_pct DESC, sea.school_avg_attendance ASC;

-- ------------------------------------------------------------------------------
-- 11. Students Needing Urgent Intervention Priority Queue
-- Unresolved, high-priority interventions ordered by priority and risk score
-- ------------------------------------------------------------------------------
-- Decision Use: Daily operational dispatch list for assigned counselors/teachers
SELECT
    r.intervention_id,
    r.student_id,
    r.school_name,
    r.grade,
    r.section,
    r.risk_level,
    r.risk_score,
    r.risk_reason,
    r.priority,
    r.recommended_action,
    r.assigned_to,
    r.identified_date
FROM analytics.v_student_risk r
WHERE r.intervention_status = 'Open'
  AND r.priority IN ('Critical', 'High')
ORDER BY
    CASE r.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 ELSE 3 END,
    r.risk_score DESC,
    r.identified_date ASC;

-- ------------------------------------------------------------------------------
-- 12. Skill Areas Heatmap & Weakest Foundational Competencies
-- Compares relative performance across reading sub-skills to isolate system bottlenecks
-- ------------------------------------------------------------------------------
-- Decision Use: Target instructional design towards specific sub-skills (e.g. grammar vs fluency)
SELECT
    subject,
    total_assessments,
    average_performance AS overall_avg_score,
    average_fluency,
    average_comprehension,
    average_vocabulary,
    average_grammar,
    average_pronunciation,
    average_accuracy_pct,
    -- Identify the weakest competency per subject
    CASE
        WHEN average_grammar <= LEAST(average_fluency, average_comprehension, average_vocabulary, average_pronunciation) THEN 'Grammar'
        WHEN average_comprehension <= LEAST(average_fluency, average_vocabulary, average_grammar, average_pronunciation) THEN 'Comprehension'
        WHEN average_vocabulary <= LEAST(average_fluency, average_comprehension, average_grammar, average_pronunciation) THEN 'Vocabulary'
        WHEN average_fluency <= LEAST(average_comprehension, average_vocabulary, average_grammar, average_pronunciation) THEN 'Fluency'
        ELSE 'Pronunciation'
    END AS primary_skill_deficit_area
FROM analytics.v_subject_performance;

-- ==============================================================================
-- 06_analytics_views.sql
-- Production Analytical Views for Student Learning Analytics & Decision Intelligence
-- Schema: analytics
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. View: analytics.v_overall_performance
-- Executive system-wide learning performance and benchmark attainment KPIs
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_overall_performance AS
SELECT
    COUNT(DISTINCT p.student_id) AS total_students,
    COUNT(p.performance_id) AS total_assessments,
    ROUND(AVG(p.reading_score), 2) AS average_reading_score,
    ROUND(AVG(p.fluency_score), 2) AS average_fluency_score,
    ROUND(AVG(p.comprehension_score), 2) AS average_comprehension_score,
    ROUND(AVG(p.vocabulary_score), 2) AS average_vocabulary_score,
    ROUND(AVG(p.grammar_score), 2) AS average_grammar_score,
    ROUND(AVG(p.pronunciation_score), 2) AS average_pronunciation_score,
    ROUND(AVG(p.accuracy_pct), 2) AS average_accuracy_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('below benchmark', 'needs attention')) / NULLIF(COUNT(*), 0), 2) AS below_benchmark_percentage,
    ROUND(AVG(p.improvement_pct), 2) AS average_improvement,
    COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'needs attention') AS band_needs_attention_count,
    COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'developing') AS band_developing_count,
    COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'proficient') AS band_proficient_count,
    COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'advanced') AS band_advanced_count,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'needs attention') / NULLIF(COUNT(*), 0), 2) AS band_needs_attention_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'developing') / NULLIF(COUNT(*), 0), 2) AS band_developing_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'proficient') / NULLIF(COUNT(*), 0), 2) AS band_proficient_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.performance_band) = 'advanced') / NULLIF(COUNT(*), 0), 2) AS band_advanced_pct
FROM analytics.fact_performance p;

-- ------------------------------------------------------------------------------
-- 2. View: analytics.v_school_performance
-- School-level scorecard with demographics, score averages, benchmark rates, and risk
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_school_performance AS
WITH school_perf AS (
    SELECT
        p.school_id,
        COUNT(DISTINCT p.student_id) AS evaluated_students,
        COUNT(p.performance_id) AS total_assessments,
        ROUND(AVG(p.reading_score), 2) AS average_performance,
        ROUND(AVG(p.reading_score), 2) AS average_reading_score,
        ROUND(AVG(p.fluency_score), 2) AS average_fluency,
        ROUND(AVG(p.comprehension_score), 2) AS average_comprehension,
        ROUND(AVG(p.vocabulary_score), 2) AS average_vocabulary,
        ROUND(AVG(p.grammar_score), 2) AS average_grammar,
        ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
        ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('below benchmark', 'needs attention')) / NULLIF(COUNT(*), 0), 2) AS below_benchmark_percentage,
        ROUND(AVG(p.improvement_pct), 2) AS average_improvement
    FROM analytics.fact_performance p
    GROUP BY p.school_id
),
school_risk AS (
    SELECT
        i.school_id,
        COUNT(DISTINCT i.student_id) AS at_risk_student_count
    FROM analytics.fact_intervention i
    GROUP BY i.school_id
)
SELECT
    s.school_id,
    s.school_name,
    s.state,
    s.district,
    s.city,
    s.urban_rural,
    s.school_type,
    s.management_type,
    s.board,
    s.total_students,
    COALESCE(sp.evaluated_students, 0) AS evaluated_students,
    COALESCE(sp.total_assessments, 0) AS total_assessments,
    COALESCE(sp.average_performance, 0.00) AS average_performance,
    COALESCE(sp.average_reading_score, 0.00) AS average_reading_score,
    COALESCE(sp.average_fluency, 0.00) AS average_fluency,
    COALESCE(sp.average_comprehension, 0.00) AS average_comprehension,
    COALESCE(sp.average_vocabulary, 0.00) AS average_vocabulary,
    COALESCE(sp.average_grammar, 0.00) AS average_grammar,
    COALESCE(sp.benchmark_percentage, 0.00) AS benchmark_percentage,
    COALESCE(sp.below_benchmark_percentage, 0.00) AS below_benchmark_percentage,
    COALESCE(sp.average_improvement, 0.00) AS average_improvement,
    COALESCE(sr.at_risk_student_count, 0) AS at_risk_student_count,
    DENSE_RANK() OVER (ORDER BY COALESCE(sp.average_reading_score, 0.00) DESC) AS rank
FROM analytics.dim_school s
LEFT JOIN school_perf sp ON s.school_id = sp.school_id
LEFT JOIN school_risk sr ON s.school_id = sr.school_id;

-- ------------------------------------------------------------------------------
-- 3. View: analytics.v_grade_performance
-- Grade-level learning outcomes across Grades 6 through 10
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_grade_performance AS
WITH grade_perf AS (
    SELECT
        p.grade,
        COUNT(DISTINCT p.student_id) AS evaluated_students,
        COUNT(p.performance_id) AS total_assessments,
        ROUND(AVG(p.reading_score), 2) AS average_performance,
        ROUND(AVG(p.reading_score), 2) AS average_reading_score,
        ROUND(AVG(p.fluency_score), 2) AS average_fluency,
        ROUND(AVG(p.comprehension_score), 2) AS average_comprehension,
        ROUND(AVG(p.vocabulary_score), 2) AS average_vocabulary,
        ROUND(AVG(p.grammar_score), 2) AS average_grammar,
        ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
        ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('below benchmark', 'needs attention')) / NULLIF(COUNT(*), 0), 2) AS below_benchmark_percentage,
        ROUND(AVG(p.improvement_pct), 2) AS average_improvement
    FROM analytics.fact_performance p
    WHERE p.grade BETWEEN 6 AND 10
    GROUP BY p.grade
),
grade_students AS (
    SELECT
        st.grade,
        COUNT(DISTINCT st.student_id) AS total_students
    FROM analytics.dim_student st
    WHERE st.grade BETWEEN 6 AND 10
    GROUP BY st.grade
),
grade_risk AS (
    SELECT
        i.grade,
        COUNT(DISTINCT i.student_id) AS at_risk_student_count
    FROM analytics.fact_intervention i
    WHERE i.grade BETWEEN 6 AND 10
    GROUP BY i.grade
)
SELECT
    gs.grade,
    gs.total_students,
    COALESCE(gp.evaluated_students, 0) AS evaluated_students,
    COALESCE(gp.total_assessments, 0) AS total_assessments,
    COALESCE(gp.average_performance, 0.00) AS average_performance,
    COALESCE(gp.average_reading_score, 0.00) AS average_reading_score,
    COALESCE(gp.average_fluency, 0.00) AS average_fluency,
    COALESCE(gp.average_comprehension, 0.00) AS average_comprehension,
    COALESCE(gp.average_vocabulary, 0.00) AS average_vocabulary,
    COALESCE(gp.average_grammar, 0.00) AS average_grammar,
    COALESCE(gp.benchmark_percentage, 0.00) AS benchmark_percentage,
    COALESCE(gp.below_benchmark_percentage, 0.00) AS below_benchmark_percentage,
    COALESCE(gp.average_improvement, 0.00) AS average_improvement,
    COALESCE(gr.at_risk_student_count, 0) AS at_risk_student_count
FROM grade_students gs
LEFT JOIN grade_perf gp ON gs.grade = gp.grade
LEFT JOIN grade_risk gr ON gs.grade = gr.grade
ORDER BY gs.grade ASC;

-- ------------------------------------------------------------------------------
-- 4. View: analytics.v_student_performance
-- Granular student learning profiles, sub-skill diagnostics, and risk status
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_student_performance AS
WITH ranked_perf AS (
    SELECT
        p.student_id,
        p.reading_score AS latest_performance,
        p.reading_score,
        p.fluency_score,
        p.comprehension_score,
        p.vocabulary_score,
        p.grammar_score,
        p.pronunciation_score,
        p.accuracy_pct,
        p.percentile,
        p.benchmark_status,
        p.improvement_pct,
        p.performance_band,
        p.performance_date,
        ROW_NUMBER() OVER (PARTITION BY p.student_id ORDER BY p.performance_date DESC, p.performance_id DESC) AS rn
    FROM analytics.fact_performance p
),
student_agg AS (
    SELECT
        p.student_id,
        COUNT(p.performance_id) AS total_assessments,
        ROUND(AVG(p.reading_score), 2) AS average_performance,
        ROUND(AVG(p.improvement_pct), 2) AS overall_avg_improvement
    FROM analytics.fact_performance p
    GROUP BY p.student_id
),
latest_risk AS (
    SELECT
        i.student_id,
        i.risk_level,
        i.risk_score,
        i.risk_reason,
        i.status AS intervention_status,
        ROW_NUMBER() OVER (PARTITION BY i.student_id ORDER BY i.identified_date DESC, i.intervention_id DESC) AS rn
    FROM analytics.fact_intervention i
)
SELECT
    s.student_id,
    s.school_id,
    sch.school_name,
    s.grade,
    s.section,
    s.academic_year,
    s.gender,
    s.socioeconomic_band,
    s.digital_access,
    COALESCE(rp.latest_performance, 0.00) AS latest_performance,
    COALESCE(sa.average_performance, 0.00) AS average_performance,
    COALESCE(rp.reading_score, 0.00) AS reading_score,
    COALESCE(rp.fluency_score, 0.00) AS fluency_score,
    COALESCE(rp.comprehension_score, 0.00) AS comprehension_score,
    COALESCE(rp.vocabulary_score, 0.00) AS vocabulary_score,
    COALESCE(rp.grammar_score, 0.00) AS grammar_score,
    COALESCE(rp.pronunciation_score, 0.00) AS pronunciation_score,
    COALESCE(rp.accuracy_pct, 0.00) AS accuracy_pct,
    COALESCE(rp.percentile, 0) AS percentile,
    COALESCE(rp.benchmark_status, 'Unknown') AS benchmark_status,
    COALESCE(rp.improvement_pct, 0.00) AS improvement_percentage,
    COALESCE(rp.performance_band, 'Unknown') AS performance_band,
    rp.performance_date AS latest_assessment_date,
    COALESCE(sa.total_assessments, 0) AS total_assessments,
    COALESCE(lr.risk_level, 'None') AS risk_status,
    lr.risk_score,
    lr.risk_reason,
    lr.intervention_status
FROM analytics.dim_student s
JOIN analytics.dim_school sch ON s.school_id = sch.school_id
LEFT JOIN ranked_perf rp ON s.student_id = rp.student_id AND rp.rn = 1
LEFT JOIN student_agg sa ON s.student_id = sa.student_id
LEFT JOIN latest_risk lr ON s.student_id = lr.student_id AND lr.rn = 1;

-- ------------------------------------------------------------------------------
-- 5. View: analytics.v_subject_performance
-- Subject-level mastery breakdown and benchmark achievement rates
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_subject_performance AS
SELECT
    p.subject,
    COUNT(DISTINCT p.student_id) AS total_students_evaluated,
    COUNT(p.performance_id) AS total_assessments,
    ROUND(AVG(p.reading_score), 2) AS average_performance,
    ROUND(AVG(p.fluency_score), 2) AS average_fluency,
    ROUND(AVG(p.comprehension_score), 2) AS average_comprehension,
    ROUND(AVG(p.vocabulary_score), 2) AS average_vocabulary,
    ROUND(AVG(p.grammar_score), 2) AS average_grammar,
    ROUND(AVG(p.pronunciation_score), 2) AS average_pronunciation,
    ROUND(AVG(p.accuracy_pct), 2) AS average_accuracy_pct,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('below benchmark', 'needs attention')) / NULLIF(COUNT(*), 0), 2) AS below_benchmark_percentage,
    ROUND(AVG(p.improvement_pct), 2) AS average_improvement
FROM analytics.fact_performance p
GROUP BY p.subject;

-- ------------------------------------------------------------------------------
-- 6. View: analytics.v_performance_trend
-- Temporal learning trajectories by month and grade level
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_performance_trend AS
SELECT
    TO_CHAR(p.performance_date, 'YYYY-MM') AS assessment_month,
    p.grade,
    COUNT(DISTINCT p.student_id) AS student_count,
    COUNT(p.performance_id) AS assessment_count,
    ROUND(AVG(p.reading_score), 2) AS average_performance,
    ROUND(AVG(p.fluency_score), 2) AS average_fluency,
    ROUND(AVG(p.comprehension_score), 2) AS average_comprehension,
    ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_percentage,
    ROUND(AVG(p.improvement_pct), 2) AS average_improvement
FROM analytics.fact_performance p
GROUP BY TO_CHAR(p.performance_date, 'YYYY-MM'), p.grade
ORDER BY assessment_month ASC, p.grade ASC;

-- ------------------------------------------------------------------------------
-- 7. View: analytics.v_engagement_performance
-- Inter-relationship analysis between digital/classroom engagement and academic outcomes
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_engagement_performance AS
WITH student_eng AS (
    SELECT
        e.student_id,
        e.school_id,
        e.grade,
        ROUND(AVG(e.attendance_pct), 2) AS avg_attendance_pct,
        ROUND(AVG(e.assignment_completion_pct), 2) AS avg_assignment_completion_pct,
        ROUND(AVG(e.learning_sessions), 1) AS avg_learning_sessions,
        ROUND(AVG(e.platform_minutes), 1) AS avg_platform_minutes,
        ROUND(AVG(e.participation_score), 2) AS avg_participation_score,
        MODE() WITHIN GROUP (ORDER BY e.engagement_level) AS primary_engagement_level
    FROM analytics.fact_engagement e
    GROUP BY e.student_id, e.school_id, e.grade
),
student_perf AS (
    SELECT
        p.student_id,
        COUNT(p.performance_id) AS total_assessments,
        ROUND(AVG(p.reading_score), 2) AS avg_reading_score,
        ROUND(AVG(p.accuracy_pct), 2) AS avg_accuracy_pct,
        ROUND(AVG(p.improvement_pct), 2) AS avg_improvement_pct,
        ROUND(100.0 * COUNT(*) FILTER (WHERE LOWER(p.benchmark_status) IN ('meets benchmark', 'exceeds benchmark', 'met', 'exceeded')) / NULLIF(COUNT(*), 0), 2) AS benchmark_met_pct
    FROM analytics.fact_performance p
    GROUP BY p.student_id
)
SELECT
    se.student_id,
    se.school_id,
    sch.school_name,
    se.grade,
    se.avg_attendance_pct,
    se.avg_assignment_completion_pct,
    se.avg_learning_sessions,
    se.avg_platform_minutes,
    se.avg_participation_score,
    se.primary_engagement_level,
    COALESCE(sp.total_assessments, 0) AS total_assessments,
    COALESCE(sp.avg_reading_score, 0.00) AS avg_reading_score,
    COALESCE(sp.avg_accuracy_pct, 0.00) AS avg_accuracy_pct,
    COALESCE(sp.avg_improvement_pct, 0.00) AS avg_improvement_pct,
    COALESCE(sp.benchmark_met_pct, 0.00) AS benchmark_met_pct
FROM student_eng se
JOIN analytics.dim_school sch ON se.school_id = sch.school_id
LEFT JOIN student_perf sp ON se.student_id = sp.student_id;

-- ------------------------------------------------------------------------------
-- 8. View: analytics.v_student_risk
-- Active early-warning risk registry and intervention tracker
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_student_risk AS
SELECT
    i.intervention_id,
    i.student_id,
    i.school_id,
    s.school_name,
    i.grade,
    st.section,
    st.gender,
    st.socioeconomic_band,
    st.digital_access,
    i.identified_date,
    i.risk_level,
    i.risk_score,
    i.risk_reason,
    i.priority,
    i.recommended_action,
    i.assigned_to,
    i.status AS intervention_status,
    i.resolution_date
FROM analytics.fact_intervention i
JOIN analytics.dim_school s ON i.school_id = s.school_id
JOIN analytics.dim_student st ON i.student_id = st.student_id;

-- ------------------------------------------------------------------------------
-- 9. View: analytics.v_intervention_effectiveness
-- Pre- vs. Post-intervention longitudinal outcome analysis
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW analytics.v_intervention_effectiveness AS
WITH intervention_periods AS (
    SELECT
        i.intervention_id,
        i.student_id,
        i.school_id,
        i.grade,
        i.identified_date,
        i.resolution_date,
        i.status,
        i.risk_level,
        i.risk_reason,
        i.recommended_action
    FROM analytics.fact_intervention i
),
pre_post_perf AS (
    SELECT
        ip.intervention_id,
        ip.student_id,
        ip.school_id,
        ip.status,
        ip.identified_date,
        ip.resolution_date,
        ip.risk_level,
        ip.risk_reason,
        ip.recommended_action,
        -- Pre-intervention performance: assessments on or prior to identified_date
        ROUND(AVG(CASE WHEN p.performance_date <= ip.identified_date THEN p.reading_score END), 2) AS pre_intervention_score,
        COUNT(CASE WHEN p.performance_date <= ip.identified_date THEN p.performance_id END) AS pre_assessment_count,
        -- Post-intervention performance: assessments on or after resolution_date (or identified_date if still in progress)
        ROUND(AVG(CASE WHEN p.performance_date > COALESCE(ip.resolution_date, ip.identified_date) THEN p.reading_score END), 2) AS post_intervention_score,
        COUNT(CASE WHEN p.performance_date > COALESCE(ip.resolution_date, ip.identified_date) THEN p.performance_id END) AS post_assessment_count
    FROM intervention_periods ip
    LEFT JOIN analytics.fact_performance p ON ip.student_id = p.student_id
    GROUP BY
        ip.intervention_id, ip.student_id, ip.school_id, ip.status,
        ip.identified_date, ip.resolution_date, ip.risk_level,
        ip.risk_reason, ip.recommended_action
)
SELECT
    ppp.intervention_id,
    ppp.student_id,
    ppp.school_id,
    sch.school_name,
    ppp.status AS intervention_status,
    ppp.identified_date,
    ppp.resolution_date,
    ppp.risk_level,
    ppp.risk_reason,
    ppp.recommended_action,
    ppp.pre_assessment_count,
    ppp.pre_intervention_score,
    ppp.post_assessment_count,
    ppp.post_intervention_score,
    CASE
        WHEN ppp.pre_intervention_score IS NOT NULL AND ppp.post_intervention_score IS NOT NULL
        THEN ROUND(ppp.post_intervention_score - ppp.pre_intervention_score, 2)
        ELSE NULL
    END AS improvement,
    CASE
        WHEN ppp.pre_intervention_score IS NULL OR ppp.post_intervention_score IS NULL THEN 'Insufficient Data'
        WHEN (ppp.post_intervention_score - ppp.pre_intervention_score) >= 10.0 THEN 'Highly Effective'
        WHEN (ppp.post_intervention_score - ppp.pre_intervention_score) > 0.0 THEN 'Moderately Effective'
        WHEN (ppp.post_intervention_score - ppp.pre_intervention_score) = 0.0 THEN 'No Change'
        ELSE 'Ineffective / Score Dropped'
    END AS effectiveness_category
FROM pre_post_perf ppp
JOIN analytics.dim_school sch ON ppp.school_id = sch.school_id;

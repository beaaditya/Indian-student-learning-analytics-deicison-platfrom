-- ==============================================================================
-- 09_create_powerbi_master.sql
-- Consolidated Power BI Master Analytics View
-- Schema: analytics
-- View: analytics.v_powerbi_master
-- Granularity: 1 Row = 1 Student Assessment Performance Record (530,470 rows)
-- ==============================================================================

CREATE OR REPLACE VIEW analytics.v_powerbi_master AS
WITH latest_intervention AS (
    SELECT
        student_id,
        risk_level,
        risk_score,
        risk_reason,
        priority,
        recommended_action,
        assigned_to,
        status AS intervention_status,
        identified_date,
        resolution_date,
        ROW_NUMBER() OVER (
            PARTITION BY student_id 
            ORDER BY identified_date DESC, intervention_id DESC
        ) AS rn
    FROM analytics.fact_intervention
)
SELECT
    -- --------------------------------------------------------------------------
    -- 1. Primary Granularity Identifiers
    -- --------------------------------------------------------------------------
    p.performance_id,
    p.assessment_id,
    p.student_id,
    p.school_id,

    -- --------------------------------------------------------------------------
    -- 2. School Dimensions
    -- --------------------------------------------------------------------------
    sc.school_name,
    sc.school_type,
    sc.management_type,
    sc.state,
    sc.district,
    sc.city,
    sc.urban_rural,
    sc.board,
    sc.school_medium,
    sc.infrastructure_score,
    sc.digital_access_score AS school_digital_access_score,

    -- --------------------------------------------------------------------------
    -- 3. Student Dimensions
    -- --------------------------------------------------------------------------
    p.grade,
    st.section,
    a.academic_year,
    st.gender,
    st.age,
    st.socioeconomic_band,
    st.learning_mode,
    st.digital_access AS student_digital_access,

    -- --------------------------------------------------------------------------
    -- 4. Academic Assessment & Performance Metrics
    -- --------------------------------------------------------------------------
    p.subject,
    a.assessment_type,
    a.assessment_date,
    a.assessment_month,
    p.reading_score,
    p.fluency_score,
    p.pronunciation_score,
    p.accuracy_pct,
    p.comprehension_score,
    p.vocabulary_score,
    p.grammar_score,
    p.wpm,
    p.wcpm,
    p.percentile,
    p.benchmark_status,
    p.performance_band,
    p.improvement_pct,

    -- --------------------------------------------------------------------------
    -- 5. Monthly & Student Engagement Metrics
    -- --------------------------------------------------------------------------
    COALESCE(e.attendance_pct, st.attendance_pct) AS attendance_pct,
    e.classes_attended,
    e.classes_missed,
    e.assignments_assigned,
    e.assignments_completed,
    e.assignment_completion_pct,
    e.learning_sessions,
    e.platform_minutes,
    e.participation_score,
    COALESCE(e.engagement_level, 'Not Recorded') AS engagement_level,

    -- --------------------------------------------------------------------------
    -- 6. Early-Warning Risk Indicators
    -- --------------------------------------------------------------------------
    COALESCE(i.risk_level, 'Low / No Risk') AS risk_level,
    i.risk_score,
    COALESCE(i.risk_reason, 'None') AS risk_reason,
    COALESCE(i.priority, 'None') AS risk_priority,

    -- --------------------------------------------------------------------------
    -- 7. Academic Intervention Details
    -- --------------------------------------------------------------------------
    COALESCE(i.intervention_status, 'No Intervention') AS intervention_status,
    i.recommended_action,
    i.assigned_to,
    i.identified_date AS intervention_identified_date,
    i.resolution_date AS intervention_resolution_date

FROM analytics.fact_performance p
JOIN analytics.fact_assessment a 
    ON p.assessment_id = a.assessment_id
JOIN analytics.dim_student st 
    ON p.student_id = st.student_id
JOIN analytics.dim_school sc 
    ON p.school_id = sc.school_id
LEFT JOIN analytics.fact_engagement e 
    ON p.student_id = e.student_id 
   AND a.assessment_month = e.month
LEFT JOIN latest_intervention i 
    ON p.student_id = i.student_id 
   AND i.rn = 1;

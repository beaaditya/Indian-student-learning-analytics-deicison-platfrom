-- ==============================================================================
-- 02_create_staging_tables.sql
-- Raw staging tables in schema 'raw'
-- Designed to be permissive to ingest dirty source feeds without constraint errors
-- ==============================================================================

-- 1. Staging Schools
CREATE TABLE IF NOT EXISTS raw.stg_schools (
    school_id VARCHAR(50),
    school_name VARCHAR(255),
    school_type VARCHAR(100),
    management_type VARCHAR(100),
    state VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100),
    urban_rural VARCHAR(50),
    school_medium VARCHAR(100),
    board VARCHAR(100),
    establishment_year VARCHAR(50),
    total_students VARCHAR(50),
    teacher_count VARCHAR(50),
    student_teacher_ratio VARCHAR(50),
    infrastructure_score VARCHAR(50),
    digital_access_score VARCHAR(50),
    assessment_frequency VARCHAR(50),
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Staging Students
CREATE TABLE IF NOT EXISTS raw.stg_students (
    student_id VARCHAR(50),
    school_id VARCHAR(50),
    grade VARCHAR(50),
    section VARCHAR(50),
    academic_year VARCHAR(50),
    enrollment_date VARCHAR(50),
    age VARCHAR(50),
    gender VARCHAR(50),
    medium VARCHAR(50),
    attendance_pct VARCHAR(50),
    previous_year_score VARCHAR(50),
    socioeconomic_band VARCHAR(50),
    digital_access VARCHAR(50),
    learning_mode VARCHAR(50),
    baseline_reading_level VARCHAR(50),
    active_status VARCHAR(50),
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Staging Assessments
CREATE TABLE IF NOT EXISTS raw.stg_assessments (
    assessment_id VARCHAR(50),
    student_id VARCHAR(50),
    school_id VARCHAR(50),
    grade VARCHAR(50),
    subject VARCHAR(100),
    assessment_type VARCHAR(100),
    assessment_date VARCHAR(50),
    academic_year VARCHAR(50),
    term VARCHAR(50),
    attempt_number VARCHAR(50),
    status VARCHAR(50),
    submission_channel VARCHAR(100),
    processing_time_sec VARCHAR(50),
    assessment_month VARCHAR(50),
    assessment_sequence VARCHAR(50),
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Staging Performance
CREATE TABLE IF NOT EXISTS raw.stg_performance (
    performance_id VARCHAR(50),
    assessment_id VARCHAR(50),
    student_id VARCHAR(50),
    school_id VARCHAR(50),
    grade VARCHAR(50),
    subject VARCHAR(100),
    wpm VARCHAR(50),
    wcpm VARCHAR(50),
    fluency_score VARCHAR(50),
    pronunciation_score VARCHAR(50),
    accuracy_pct VARCHAR(50),
    comprehension_score VARCHAR(50),
    vocabulary_score VARCHAR(50),
    grammar_score VARCHAR(50),
    reading_score VARCHAR(50),
    percentile VARCHAR(50),
    benchmark_status VARCHAR(100),
    improvement_pct VARCHAR(50),
    performance_band VARCHAR(100),
    performance_date VARCHAR(50),
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Staging Engagement
CREATE TABLE IF NOT EXISTS raw.stg_engagement (
    engagement_id VARCHAR(50),
    student_id VARCHAR(50),
    school_id VARCHAR(50),
    grade VARCHAR(50),
    academic_year VARCHAR(50),
    month VARCHAR(50),
    attendance_pct VARCHAR(50),
    classes_attended VARCHAR(50),
    classes_missed VARCHAR(50),
    assignments_assigned VARCHAR(50),
    assignments_completed VARCHAR(50),
    assignment_completion_pct VARCHAR(50),
    learning_sessions VARCHAR(50),
    platform_minutes VARCHAR(50),
    participation_score VARCHAR(50),
    engagement_level VARCHAR(100),
    engagement_date VARCHAR(50),
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Staging Interventions
CREATE TABLE IF NOT EXISTS raw.stg_interventions (
    intervention_id VARCHAR(50),
    student_id VARCHAR(50),
    school_id VARCHAR(50),
    grade VARCHAR(50),
    identified_date VARCHAR(50),
    risk_level VARCHAR(50),
    risk_score VARCHAR(50),
    risk_reason VARCHAR(100),
    priority VARCHAR(50),
    recommended_action VARCHAR(100),
    assigned_to VARCHAR(100),
    status VARCHAR(50),
    resolution_date VARCHAR(50),
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

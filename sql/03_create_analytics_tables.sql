-- ==============================================================================
-- 03_create_analytics_tables.sql
-- Star schema dimensional model in schema 'analytics'
-- Includes dimensions, facts, constraints, and referential integrity
-- ==============================================================================

-- ==============================================================================
-- DIMENSIONS
-- ==============================================================================

-- 1. Dimension: dim_school
CREATE TABLE IF NOT EXISTS analytics.dim_school (
    school_id VARCHAR(50) PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL,
    school_type VARCHAR(50) NOT NULL,
    management_type VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    urban_rural VARCHAR(20) NOT NULL,
    school_medium VARCHAR(50) NOT NULL,
    board VARCHAR(50) NOT NULL,
    establishment_year INT NOT NULL,
    total_students INT NOT NULL,
    teacher_count INT NOT NULL,
    student_teacher_ratio NUMERIC(6, 2) NOT NULL,
    infrastructure_score NUMERIC(5, 2) NOT NULL,
    digital_access_score NUMERIC(5, 2) NOT NULL,
    assessment_frequency VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dimension: dim_student
CREATE TABLE IF NOT EXISTS analytics.dim_student (
    student_id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_school(school_id),
    grade INT NOT NULL,
    section VARCHAR(10) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    enrollment_date DATE NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    medium VARCHAR(50) NOT NULL,
    attendance_pct NUMERIC(5, 2) NOT NULL,
    previous_year_score NUMERIC(5, 2) NOT NULL,
    socioeconomic_band VARCHAR(50) NOT NULL,
    digital_access VARCHAR(50) NOT NULL,
    learning_mode VARCHAR(50) NOT NULL,
    baseline_reading_level VARCHAR(50) NOT NULL,
    active_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- FACTS
-- ==============================================================================

-- 3. Fact: fact_assessment
CREATE TABLE IF NOT EXISTS analytics.fact_assessment (
    assessment_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_student(student_id),
    school_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_school(school_id),
    grade INT NOT NULL,
    subject VARCHAR(50) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL,
    assessment_date DATE NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(20) NOT NULL,
    attempt_number INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    submission_channel VARCHAR(50) NOT NULL,
    processing_time_sec NUMERIC(6, 2) NOT NULL,
    assessment_month VARCHAR(10) NOT NULL,
    assessment_sequence INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fact: fact_performance
CREATE TABLE IF NOT EXISTS analytics.fact_performance (
    performance_id VARCHAR(50) PRIMARY KEY,
    assessment_id VARCHAR(50) NOT NULL REFERENCES analytics.fact_assessment(assessment_id),
    student_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_student(student_id),
    school_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_school(school_id),
    grade INT NOT NULL,
    subject VARCHAR(50) NOT NULL,
    wpm NUMERIC(6, 2) NOT NULL,
    wcpm NUMERIC(6, 2) NOT NULL,
    fluency_score NUMERIC(5, 2) NOT NULL,
    pronunciation_score NUMERIC(5, 2) NOT NULL,
    accuracy_pct NUMERIC(5, 2) NOT NULL,
    comprehension_score NUMERIC(5, 2) NOT NULL,
    vocabulary_score NUMERIC(5, 2) NOT NULL,
    grammar_score NUMERIC(5, 2) NOT NULL,
    reading_score NUMERIC(5, 2) NOT NULL,
    percentile INT NOT NULL,
    benchmark_status VARCHAR(50) NOT NULL,
    improvement_pct NUMERIC(6, 2) NOT NULL,
    performance_band VARCHAR(50) NOT NULL,
    performance_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Fact: fact_engagement
CREATE TABLE IF NOT EXISTS analytics.fact_engagement (
    engagement_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_student(student_id),
    school_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_school(school_id),
    grade INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    month VARCHAR(10) NOT NULL,
    attendance_pct NUMERIC(5, 2) NOT NULL,
    classes_attended INT NOT NULL,
    classes_missed INT NOT NULL,
    assignments_assigned INT NOT NULL,
    assignments_completed INT NOT NULL,
    assignment_completion_pct NUMERIC(5, 2) NOT NULL,
    learning_sessions INT NOT NULL,
    platform_minutes INT NOT NULL,
    participation_score NUMERIC(5, 2) NOT NULL,
    engagement_level VARCHAR(50) NOT NULL,
    engagement_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Fact: fact_intervention
CREATE TABLE IF NOT EXISTS analytics.fact_intervention (
    intervention_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_student(student_id),
    school_id VARCHAR(50) NOT NULL REFERENCES analytics.dim_school(school_id),
    grade INT NOT NULL,
    identified_date DATE NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    risk_score NUMERIC(5, 2) NOT NULL,
    risk_reason VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    recommended_action VARCHAR(100) NOT NULL,
    assigned_to VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    resolution_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

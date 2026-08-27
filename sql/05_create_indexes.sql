-- ==============================================================================
-- 05_create_indexes.sql
-- Performance optimization indexes on high-cardinality foreign keys and dates
-- ==============================================================================

-- 1. dim_student Indexes
CREATE INDEX IF NOT EXISTS idx_student_school 
    ON analytics.dim_student(school_id);

-- 2. fact_assessment Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_student 
    ON analytics.fact_assessment(student_id);

CREATE INDEX IF NOT EXISTS idx_assessment_school 
    ON analytics.fact_assessment(school_id);

CREATE INDEX IF NOT EXISTS idx_assessment_date 
    ON analytics.fact_assessment(assessment_date);

-- 3. fact_performance Indexes
CREATE INDEX IF NOT EXISTS idx_performance_student 
    ON analytics.fact_performance(student_id);

CREATE INDEX IF NOT EXISTS idx_performance_assessment 
    ON analytics.fact_performance(assessment_id);

CREATE INDEX IF NOT EXISTS idx_performance_date 
    ON analytics.fact_performance(performance_date);

-- 4. fact_engagement Indexes
CREATE INDEX IF NOT EXISTS idx_engagement_student 
    ON analytics.fact_engagement(student_id);

CREATE INDEX IF NOT EXISTS idx_engagement_date 
    ON analytics.fact_engagement(engagement_date);

-- 5. fact_intervention Indexes
CREATE INDEX IF NOT EXISTS idx_intervention_student 
    ON analytics.fact_intervention(student_id);

CREATE INDEX IF NOT EXISTS idx_intervention_date 
    ON analytics.fact_intervention(identified_date);

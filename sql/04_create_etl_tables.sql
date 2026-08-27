-- ==============================================================================
-- 04_create_etl_tables.sql
-- Operational logging and data quality tracking tables in schema 'etl'
-- ==============================================================================

-- 1. ETL Run Log
CREATE TABLE IF NOT EXISTS etl.etl_run_log (
    run_id SERIAL PRIMARY KEY,
    pipeline_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    records_read INT DEFAULT 0,
    records_loaded INT DEFAULT 0,
    records_rejected INT DEFAULT 0,
    records_cleaned INT DEFAULT 0,
    error_message TEXT
);

-- 2. Data Quality Log
CREATE TABLE IF NOT EXISTS etl.data_quality_log (
    quality_issue_id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES etl.etl_run_log(run_id),
    dataset VARCHAR(100) NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    column_name VARCHAR(100),
    record_identifier VARCHAR(100),
    issue_description TEXT NOT NULL,
    original_value TEXT,
    action_taken VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Rejected Records Log
CREATE TABLE IF NOT EXISTS etl.rejected_records (
    rejection_id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES etl.etl_run_log(run_id),
    dataset VARCHAR(100) NOT NULL,
    record_identifier VARCHAR(100),
    rejection_reason TEXT NOT NULL,
    raw_record JSONB NOT NULL,
    rejected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

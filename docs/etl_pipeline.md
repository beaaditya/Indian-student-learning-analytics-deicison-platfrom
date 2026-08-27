# ETL Pipeline Documentation

## 1. Purpose
The ETL (Extract, Transform, Load) pipeline processes controlled dirty raw datasets representing student learning analytics, validates and cleans them according to strict business rules, and loads them idempotently into a PostgreSQL analytics star schema.

## 2. Source Data
The source data resides in `data/source_raw/` in CSV format. The pipeline ingests:
- `schools_raw.csv`
- `students_raw.csv`
- `assessments_raw.csv`
- `performance_raw.csv`
- `engagement_raw.csv`
- `interventions_raw.csv`

## 3. Extraction
Extraction is handled by `etl/extract.py`. It reads the CSV files, yielding dictionaries for each row. The extractor preserves the exact original state of the incoming data.

## 4. Staging
Staging is handled by `etl/load.py` `load_staging()`. The extracted raw data is bulk-inserted verbatim into the permissive `raw.*` staging tables using PostgreSQL `execute_values`. This preserves the data in its uncleaned state for audit purposes.

## 5. Data Quality Checks & 6. Cleaning
Validation and cleaning are handled by `etl/validate.py` and `etl/transform.py`.
- **Deduplication**: Exact duplicate primary keys are detected. Only the first canonical record is retained.
- **String Cleaning**: Trims whitespace and normalizes category capitalization.
- **Null Handling**: Critical missing fields result in rejection. Non-critical missing fields are imputed or retained as NULL depending on the business rule.
- **Business Rules**: Validates logical rules such as `WCPM <= WPM`, `assignments_completed <= assignments_assigned`, and `resolution_date >= identified_date`.
- **Referential Integrity**: An in-memory cache of valid Foreign Keys is built sequentially to reject orphan records.

## 7. Transformation
The cleaned dictionaries are transformed to strictly match the column schema required by the `analytics.*` tables.

## 8. Rejection
Unrecoverable records (e.g., missing primary keys, missing foreign keys, impossible structural errors) are quarantined. `etl/quality_logger.py` stores the rejection reason and the complete JSONB payload in `etl.rejected_records`.

## 9. PostgreSQL Loading
`etl/load.py` `load_analytics()` performs the final load into the star schema using `INSERT ... ON CONFLICT (pk) DO UPDATE` queries. The load order strictly enforces referential integrity:
1. `dim_school`
2. `dim_student`
3. `fact_assessment`
4. `fact_performance`, `fact_engagement`, `fact_intervention`

## 10. Audit Logging
Every run creates a tracking record in `etl.etl_run_log`. Every detected quality issue (whitespace trim, null imputation, etc.) is logged into `etl.data_quality_log` with before/after states.

## 11. Idempotency
Because the analytics load uses PostgreSQL UPSERTs (`ON CONFLICT DO UPDATE`), running the pipeline multiple times safely updates existing records without creating duplicates. 

## 12. Execution
To run the pipeline, set the required environment variables in `.env` (or let it default to localhost postgres credentials), then execute:
```bash
python -m etl.main
```

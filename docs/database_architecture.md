# Database Architecture & Schema Specification

## 1. Architectural Overview

The database architecture for the **Indian Student Learning Analytics & Decision Intelligence Platform** is structured into three dedicated PostgreSQL schemas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              POSTGRESQL                                │
├─────────────────────────┬────────────────────────┬─────────────────────┤
│       raw (Staging)     │   analytics (Core DW)  │    etl (Audit)      │
├─────────────────────────┼────────────────────────┼─────────────────────┤
│  stg_schools            │  dim_school            │  etl_run_log        │
│  stg_students           │  dim_student           │  data_quality_log   │
│  stg_assessments        │  fact_assessment       │  rejected_records   │
│  stg_performance        │  fact_performance      │                     │
│  stg_engagement         │  fact_engagement       │                     │
│  stg_interventions      │  fact_intervention     │                     │
└─────────────────────────┴────────────────────────┴─────────────────────┘
```

1. **`raw` (Staging Layer):** Permissive landing schema for unvalidated source feeds. Stores untransformed records as text/varchar to prevent ingestion bottlenecks and premature failure on corrupt inputs.
2. **`analytics` (Core Star Schema Data Warehouse):** Production dimensional model enforcing strict types, primary keys, and referential integrity constraints. Powers business intelligence and analytical querying.
3. **`etl` (Operations & Quality Audit Layer):** Operational log tracking every ETL pipeline run, field-level quality issues discovered, and non-recoverable rejected records stored in structured JSONB format.

---

## 2. Dimensional Model & Relationships

```
                 analytics.dim_school
                    │
                    │ (1:N)
              ┌─────┴─────┐
              │           │
      analytics.dim_student│
              │           │
      ┌───────┼───────┐   │ (1:N)
      │ (1:N) │ (1:N) │   │
      ↓       ↓       ↓   ↓
 fact_assessment  fact_engagement  fact_intervention
      │
      │ (1:1)
      ↓
 fact_performance
```

---

## 3. Detailed Table Specifications

### 3.1 `analytics` Schema (Core Data Warehouse)

| Table | Type | Primary Key | Foreign Keys | Description |
| :--- | :--- | :--- | :--- | :--- |
| `dim_school` | Dimension | `school_id` | *None* | School master attributes (management, location hierarchy, infrastructure & digital scores). |
| `dim_student` | Dimension | `student_id` | `school_id -> dim_school(school_id)` | Student master attributes (grade, section, medium, baseline score & reading level). |
| `fact_assessment` | Fact | `assessment_id` | `student_id -> dim_student(student_id)`,<br>`school_id -> dim_school(school_id)` | Granular assessment attempts, submission channel, processing time, status. |
| `fact_performance` | Fact | `performance_id` | `assessment_id -> fact_assessment(assessment_id)`,<br>`student_id -> dim_student(student_id)`,<br>`school_id -> dim_school(school_id)` | Standardized learning performance metrics (WPM, WCPM, 6 component scores, composite reading score, percentile). |
| `fact_engagement` | Fact | `engagement_id` | `student_id -> dim_student(student_id)`,<br>`school_id -> dim_school(school_id)` | Monthly longitudinal student engagement (attendance, assignments, sessions, minutes, participation score). |
| `fact_intervention` | Fact | `intervention_id` | `student_id -> dim_student(student_id)`,<br>`school_id -> dim_school(school_id)` | Decision intelligence risk alerts, priority, recommended pedagogical action, status, and resolution history. |

---

### 3.2 `etl` Schema (Auditing & Data Quality)

#### 1. `etl.etl_run_log`
Tracks high-level pipeline execution metadata:
* `run_id` (SERIAL PK)
* `pipeline_name` (VARCHAR)
* `start_time` (TIMESTAMP), `end_time` (TIMESTAMP)
* `status` (VARCHAR: `RUNNING`, `SUCCESS`, `FAILED`, `PARTIAL_SUCCESS`)
* `records_read`, `records_loaded`, `records_rejected`, `records_cleaned` (INT)
* `error_message` (TEXT)

#### 2. `etl.data_quality_log`
Tracks individual data quality violations detected during extraction, cleaning, and transformation:
* `quality_issue_id` (SERIAL PK)
* `run_id` (INT FK $\rightarrow$ `etl_run_log.run_id`)
* `dataset` (VARCHAR), `issue_type` (VARCHAR: `missing_value`, `whitespace`, `capitalization`, `numeric_out_of_range`, `invalid_category`, `logical_inconsistency`, `foreign_key_violation`)
* `column_name` (VARCHAR), `record_identifier` (VARCHAR)
* `issue_description` (TEXT), `original_value` (TEXT)
* `action_taken` (VARCHAR: `cleaned_whitespace`, `imputed_median`, `normalized_case`, `rejected`, `defaulted`)
* `created_at` (TIMESTAMP)

#### 3. `etl.rejected_records`
Stores completely unrecoverable dirty records quarantined from the analytics warehouse:
* `rejection_id` (SERIAL PK)
* `run_id` (INT FK $\rightarrow$ `etl_run_log.run_id`)
* `dataset` (VARCHAR), `record_identifier` (VARCHAR)
* `rejection_reason` (TEXT)
* `raw_record` (JSONB) - Complete original row payload preserved for debugging
* `rejected_at` (TIMESTAMP)

---

## 4. Indexing Strategy

To optimize analytics queries across large fact tables, dedicated B-tree indexes are created on high-cardinality foreign keys and date partition keys:

| Table | Index Name | Columns Indexed | Purpose |
| :--- | :--- | :--- | :--- |
| `dim_student` | `idx_student_school` | `school_id` | Student filtering by school |
| `fact_assessment` | `idx_assessment_student` | `student_id` | Student history lookups |
| `fact_assessment` | `idx_assessment_school` | `school_id` | School aggregate analysis |
| `fact_assessment` | `idx_assessment_date` | `assessment_date` | Time-series filtering |
| `fact_performance` | `idx_performance_student` | `student_id` | Student longitudinal analytics |
| `fact_performance` | `idx_performance_assessment` | `assessment_id` | 1:1 fact join optimization |
| `fact_performance` | `idx_performance_date` | `performance_date` | Performance timeline trends |
| `fact_engagement` | `idx_engagement_student` | `student_id` | Monthly longitudinal drill-downs |
| `fact_engagement` | `idx_engagement_date` | `engagement_date` | Academic period cohort analysis |
| `fact_intervention` | `idx_intervention_student` | `student_id` | Student risk tracking |
| `fact_intervention` | `idx_intervention_date` | `identified_date` | Intervention cohort analysis |

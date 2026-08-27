# Power BI Master Analytics View Architecture (`analytics.v_powerbi_master`)

## 1. Overview & Purpose
The view `analytics.v_powerbi_master` serves as the consolidated, single-source semantic dataset for Power BI dashboard development. It flattens the dimensional star schema into an optimized single-table model (OBT - One Big Table) that eliminates complex Power BI client-side relationships, maximizes VertiPaq engine compression, avoids ambiguous filter propagation, and accelerates dashboard responsiveness.

---

## 2. Granularity Specification
- **Grain Definition**: **ONE ROW = ONE STUDENT ASSESSMENT PERFORMANCE RECORD**.
- **Total Verified Rows**: **530,470 rows** (exact parity with `analytics.fact_performance`).
- **Join Strategy & Deduplication Safety**:
  - `fact_performance` is joined 1:1 with `fact_assessment` on `assessment_id`.
  - `fact_performance` is joined N:1 with `dim_student` on `student_id`.
  - `fact_performance` is joined N:1 with `dim_school` on `school_id`.
  - `fact_engagement` is joined on `(student_id, month = assessment_month)` to pull the contemporaneous monthly engagement record without multiplying rows.
  - `fact_intervention` is joined on `student_id` using a window function ranking (`ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY identified_date DESC, intervention_id DESC) = 1`) to assign the student's latest active risk and intervention state to each assessment record without row multiplication.

---

## 3. Source Tables & Lineage

```
                     +-----------------------------------+
                     |       analytics.dim_school        |
                     +-----------------+-----------------+
                                       |
                     +-----------------+-----------------+
                     |       analytics.dim_student       |
                     +-----------------+-----------------+
                                       |
+--------------------------------+     |     +----------------------------------+
|   analytics.fact_assessment    +-----+-----+   analytics.fact_performance     |
+--------------------------------+           +-----------------+----------------+
                                                               |
+--------------------------------+           +-----------------+----------------+
|    analytics.fact_engagement   +-----------+   analytics.fact_intervention    |
+--------------------------------+           +----------------------------------+
                                       |
                                       v
                     +-----------------------------------+
                     |    analytics.v_powerbi_master     |
                     |         (530,470 Rows)            |
                     +-----------------------------------+
```

---

## 4. Column Dictionary & Business Meaning

| # | Column Name | Data Type | Source | Business Description & Purpose |
|---|:---|:---|:---|:---|
| 1 | `performance_id` | `VARCHAR(50)` | `fact_performance` | Unique primary key for the performance record (visual grain identifier). |
| 2 | `assessment_id` | `VARCHAR(50)` | `fact_performance` | Assessment attempt identifier. |
| 3 | `student_id` | `VARCHAR(50)` | `dim_student` | Unique identifier of the student. |
| 4 | `school_id` | `VARCHAR(50)` | `dim_school` | Unique identifier of the school. |
| 5 | `school_name` | `VARCHAR(255)` | `dim_school` | Official name of the school institution. |
| 6 | `school_type` | `VARCHAR(50)` | `dim_school` | Category of school (`Government`, `Private`, `Aided`). |
| 7 | `management_type` | `VARCHAR(100)` | `dim_school` | Administrative management classification. |
| 8 | `state` | `VARCHAR(100)` | `dim_school` | State jurisdiction. |
| 9 | `district` | `VARCHAR(100)` | `dim_school` | District jurisdiction. |
| 10 | `city` | `VARCHAR(100)` | `dim_school` | City / Municipality location. |
| 11 | `urban_rural` | `VARCHAR(20)` | `dim_school` | Locality setting (`Urban` vs. `Rural`). |
| 12 | `board` | `VARCHAR(50)` | `dim_school` | Educational board (`CBSE`, `ICSE`, `State Board`). |
| 13 | `school_medium` | `VARCHAR(50)` | `dim_school` | Medium of instruction at the school level. |
| 14 | `infrastructure_score` | `NUMERIC(5,2)` | `dim_school` | School infrastructure rating (0–100). |
| 15 | `school_digital_access_score`| `NUMERIC(5,2)` | `dim_school` | School digital lab and connectivity rating (0–100). |
| 16 | `grade` | `INT` | `fact_performance` | Student grade level (strictly bounded between 6 and 10). |
| 17 | `section` | `VARCHAR(10)` | `dim_student` | Classroom section identifier (e.g. `A`, `B`, `C`). |
| 18 | `academic_year` | `VARCHAR(20)` | `fact_assessment` | Academic school year session (e.g. `2024-25`, `2025-26`). |
| 19 | `gender` | `VARCHAR(20)` | `dim_student` | Student gender (`Male`, `Female`, `Other`). |
| 20 | `age` | `INT` | `dim_student` | Student chronological age. |
| 21 | `socioeconomic_band` | `VARCHAR(50)` | `dim_student` | Socioeconomic status (`Low`, `Middle`, `High`). |
| 22 | `learning_mode` | `VARCHAR(50)` | `dim_student` | Learning channel (`In-Person`, `Hybrid`, `Digital`). |
| 23 | `student_digital_access` | `VARCHAR(50)` | `dim_student` | Home device/connectivity access level. |
| 24 | `subject` | `VARCHAR(50)` | `fact_performance` | Assessment subject (`English`, `Mathematics`, `Science`). |
| 25 | `assessment_type` | `VARCHAR(50)` | `fact_assessment` | Type of assessment (`Diagnostic`, `Monthly`, `Midterm`, `Formative`). |
| 26 | `assessment_date` | `DATE` | `fact_assessment` | Exact date on which assessment occurred. |
| 27 | `assessment_month` | `VARCHAR(10)` | `fact_assessment` | Year-month formatted string (`YYYY-MM`) for trend grouping. |
| 28 | `reading_score` | `NUMERIC(5,2)` | `fact_performance` | Composite reading / performance score (0.00–100.00). |
| 29 | `fluency_score` | `NUMERIC(5,2)` | `fact_performance` | Oral reading fluency rating (0.00–100.00). |
| 30 | `pronunciation_score` | `NUMERIC(5,2)` | `fact_performance` | Speech and pronunciation accuracy rating (0.00–100.00). |
| 31 | `accuracy_pct` | `NUMERIC(5,2)` | `fact_performance` | Overall reading accuracy percentage. |
| 32 | `comprehension_score` | `NUMERIC(5,2)` | `fact_performance` | Text comprehension and recall score (0.00–100.00). |
| 33 | `vocabulary_score` | `NUMERIC(5,2)` | `fact_performance` | Lexical mastery score (0.00–100.00). |
| 34 | `grammar_score` | `NUMERIC(5,2)` | `fact_performance` | Structural grammar score (0.00–100.00). |
| 35 | `wpm` | `NUMERIC(6,2)` | `fact_performance` | Words Read Per Minute. |
| 36 | `wcpm` | `NUMERIC(6,2)` | `fact_performance` | Words Correct Per Minute ($WCPM \le WPM$). |
| 37 | `percentile` | `INT` | `fact_performance` | Cohort percentile rank (0–100). |
| 38 | `benchmark_status` | `VARCHAR(50)` | `fact_performance` | Standardized attainment (`Meets Benchmark`, `Exceeds Benchmark`, `Below Benchmark`). |
| 39 | `performance_band` | `VARCHAR(50)` | `fact_performance` | Proficiency band (`Needs Attention`, `Developing`, `Proficient`, `Advanced`). |
| 40 | `improvement_pct` | `NUMERIC(6,2)` | `fact_performance` | Score growth delta over prior assessment attempt. |
| 41 | `attendance_pct` | `NUMERIC(5,2)` | `fact_engagement` | Monthly classroom attendance percentage. |
| 42 | `classes_attended` | `INT` | `fact_engagement` | Monthly class sessions attended. |
| 43 | `classes_missed` | `INT` | `fact_engagement` | Monthly class sessions missed. |
| 44 | `assignments_assigned` | `INT` | `fact_engagement` | Number of digital assignments assigned during the month. |
| 45 | `assignments_completed` | `INT` | `fact_engagement` | Number of digital assignments completed. |
| 46 | `assignment_completion_pct`| `NUMERIC(5,2)` | `fact_engagement`| Assignment completion percentage ($0.00\text{--}100.00$). |
| 47 | `learning_sessions` | `INT` | `fact_engagement` | Number of digital learning sessions logged. |
| 48 | `platform_minutes` | `INT` | `fact_engagement` | Total minutes spent on the learning platform. |
| 49 | `participation_score` | `NUMERIC(5,2)` | `fact_engagement` | Monthly student classroom/digital participation index. |
| 50 | `engagement_level` | `VARCHAR(50)` | `fact_engagement` | Categorical engagement tier (`High`, `Medium`, `Low`, `Not Recorded`). |
| 51 | `risk_level` | `VARCHAR(50)` | `fact_intervention` | Early-warning risk flag (`High`, `Medium`, `Low`, `Low / No Risk`). |
| 52 | `risk_score` | `NUMERIC(5,2)` | `fact_intervention` | Composite numerical risk severity score. |
| 53 | `risk_reason` | `VARCHAR(100)` | `fact_intervention` | Primary identified trigger for risk flag. |
| 54 | `risk_priority` | `VARCHAR(50)` | `fact_intervention` | Remedial triage priority (`Critical`, `High`, `Medium`, `None`). |
| 55 | `intervention_status` | `VARCHAR(50)` | `fact_intervention` | Operational status (`Open`, `In Progress`, `Resolved`, `No Intervention`). |
| 56 | `recommended_action` | `VARCHAR(100)` | `fact_intervention` | Specific prescribed remedial pathway. |
| 57 | `assigned_to` | `VARCHAR(100)` | `fact_intervention` | Educator or counselor assigned to the intervention. |
| 58 | `intervention_identified_date`| `DATE` | `fact_intervention` | Date risk was formally detected. |
| 59 | `intervention_resolution_date`| `DATE` | `fact_intervention` | Date intervention case was formally closed. |

---

## 5. Columns Intentionally Excluded & Justification

- `created_at` / `updated_at`: Internal database ETL tracking timestamps not relevant to educational decision-makers.
- `processing_time_sec`: Internal ingestion execution latency metric.
- `submission_channel`: Technical ingestion channel (`Mobile App`, `Web Portal`, `Batch Sync`).
- `assessment_sequence`: Redundant with temporal chronological sorting on `assessment_date`.
- `attempt_number`: Replaced by more informative business metrics (`improvement_pct` and `assessment_date`).
- `active_status`: Redundant since all active students in the cohort are evaluated.

---

## 6. How Power BI Consumes This Master View

1. **Direct Import / DirectQuery**: In Power BI Desktop, connect to PostgreSQL and select `analytics.v_powerbi_master` as the single tabular dataset.
2. **DAX Measures Compatibility**:
   - `Total Students = DISTINCTCOUNT(v_powerbi_master[student_id])`
   - `Total Assessments = COUNT(v_powerbi_master[performance_id])`
   - `Average Reading Score = AVERAGE(v_powerbi_master[reading_score])`
   - `Benchmark % = DIVIDE(CALCULATE(COUNTROWS(v_powerbi_master), v_powerbi_master[benchmark_status] IN {"Meets Benchmark", "Exceeds Benchmark"}), COUNTROWS(v_powerbi_master), 0)`
   - `At-Risk Students = CALCULATE(DISTINCTCOUNT(v_powerbi_master[student_id]), v_powerbi_master[risk_level] IN {"High", "Medium"})`
3. **Slicers Supported**:
   - Institutional: `school_name`, `school_type`, `management_type`, `state`, `district`, `city`, `urban_rural`, `board`
   - Cohort: `grade`, `academic_year`, `subject`, `assessment_type`, `assessment_month`
   - Student Demographics: `gender`, `socioeconomic_band`, `learning_mode`
   - Operational: `performance_band`, `benchmark_status`, `risk_level`, `intervention_status`, `risk_priority`

---

## 7. Known Limitations

- **Contemporaneous Engagement Mapping**: Monthly engagement is linked by matching `student_id` and `assessment_month`. For occasional diagnostic/baseline assessments occurring outside active monthly engagement periods, baseline student attendance is cleanly populated via fallback coalescing.
- **Intervention Snapshot**: Reflects the student's latest active/resolved intervention case to maintain exact 1:1 grain per assessment.

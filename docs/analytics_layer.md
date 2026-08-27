# Analytical & Decision-Intelligence Layer Architecture

## 1. Executive Summary & Purpose
The SQL Analytical & Decision-Intelligence Layer (`analytics` schema) provides a robust, high-performance semantic interface on top of the PostgreSQL dimensional star schema. It transforms normalized dimensional facts into aggregated, business-ready analytical views that power executive dashboards, institutional benchmarking, cohort diagnostics, early warning alerts, and longitudinal intervention tracking.

All analytical logic is codified strictly within modular PostgreSQL views and diagnostic queries, ensuring consistency across downstream consumption channels (REST APIs, web dashboards, and scheduled operational reports).

---

## 2. Analytical Views Architecture

The platform provides 9 production-grade analytical views in `sql/06_analytics_views.sql`:

```
                                    +----------------------------------+
                                    |    analytics.dim_school          |
                                    |    analytics.dim_student         |
                                    +-----------------+----------------+
                                                      |
                   +----------------------------------+----------------------------------+
                   |                                  |                                  |
   +---------------+---------------+  +---------------+---------------+  +---------------+---------------+
   |   analytics.fact_assessment   |  |   analytics.fact_engagement   |  |  analytics.fact_intervention  |
   |   analytics.fact_performance  |  |                               |  |                               |
   +---------------+---------------+  +---------------+---------------+  +---------------+---------------+
                   |                                  |                                  |
                   +----------------------------------+----------------------------------+
                                                      |
                                                      v
    +----------------------------------------------------------------------------------------------------+
    |                                   ANALYTICAL SQL VIEWS LAYER                                       |
    +----------------------------------------------------------------------------------------------------+
    | 1. v_overall_performance         | Executive-level KPIs, system averages, performance bands        |
    | 2. v_school_performance          | School scorecard, benchmark pass rates, risk concentration, rank|
    | 3. v_grade_performance           | Grade 6-10 cohort outcomes, gap analysis, volume distribution   |
    | 4. v_student_performance         | Granular student profiles, sub-skill diagnostics, risk flags    |
    | 5. v_subject_performance         | Subject-level mastery (English, Math, Science), sub-skills      |
    | 6. v_performance_trend           | Monthly longitudinal trajectory by grade and cohort             |
    | 7. v_engagement_performance      | Digital platform usage & attendance vs. academic attainment     |
    | 8. v_student_risk                | Early warning active risk registry, priority, root-causes       |
    | 9. v_intervention_effectiveness  | Pre- vs. Post-intervention learning recovery measurement        |
    +----------------------------------------------------------------------------------------------------+
```

### View Specifications & Granularity

| View Name | Granularity | Key Metrics / Output Fields | Primary Business Purpose |
| :--- | :--- | :--- | :--- |
| **`v_overall_performance`** | System-Wide (1 Row) | Total students, total assessments, avg reading score, sub-skill scores (fluency, comprehension, vocabulary, grammar, pronunciation), benchmark %, below-benchmark %, avg improvement %, band counts and percentages. | Executive summary for state/district leadership. |
| **`v_school_performance`** | School (`school_id`) | School metadata, total students, evaluated students, total assessments, avg performance, sub-skill averages, benchmark %, below-benchmark %, avg improvement, at-risk count, dense rank. | School comparative scorecard & resource allocation. |
| **`v_grade_performance`** | Grade (`grade` 6–10) | Grade, total students, evaluated students, avg performance, sub-skill averages, benchmark %, below-benchmark %, avg improvement %, at-risk count. | Grade-level curriculum pacing and gap monitoring. |
| **`v_student_performance`** | Student (`student_id`) | Student demographic info, latest performance, historical avg, sub-skill breakdown, percentile, benchmark status, improvement %, performance band, active risk status, risk score/reason. | Teacher classroom dashboard & individual student profile. |
| **`v_subject_performance`** | Subject (`subject`) | Total students, total assessments, avg performance, sub-skill averages, accuracy %, benchmark %, below-benchmark %, avg improvement %. | Subject-matter curriculum evaluation. |
| **`v_performance_trend`** | Month + Grade (`YYYY-MM`, `grade`) | Assessment month, grade, student count, assessment count, avg performance, sub-skill averages, benchmark %, avg improvement %. | Longitudinal progress tracking over academic terms. |
| **`v_engagement_performance`** | Student (`student_id`) | Avg attendance %, avg assignment completion %, avg platform minutes, avg sessions, participation score, primary engagement level, avg reading score, benchmark met %. | Investigating behavioral and attendance correlations. |
| **`v_student_risk`** | Intervention (`intervention_id`) | Student metadata, risk level, risk score, risk reason, priority, recommended action, assigned staff, status (`Open`, `In Progress`, `Resolved`). | Actionable triage queue for counselors & teachers. |
| **`v_intervention_effectiveness`**| Intervention (`intervention_id`) | Intervention metadata, pre-intervention score, post-intervention score, delta improvement, effectiveness category (`Highly Effective`, `Moderately Effective`, etc.). | Measuring ROI of educational intervention programs. |

---

## 3. Core KPI Definitions & Formulas

1. **Benchmark Achievement Rate (%)**:
   $$\text{Benchmark Attainment Rate} = \frac{\text{Count of Assessments with Status } \in (\text{'Met'}, \text{'Exceeded'})}{\text{Total Valid Assessments}} \times 100$$

2. **Below Benchmark Rate (%)**:
   $$\text{Below Benchmark Rate} = \frac{\text{Count of Assessments with Status} = \text{'Below Benchmark'}}{\text{Total Valid Assessments}} \times 100$$

3. **Performance Score**:
   Continuous scale from $0.00$ to $100.00$ reflecting composite foundational literacy/numeracy evaluation.

4. **Words Correct Per Minute (WCPM) / Words Per Minute (WPM)**:
   Oral reading fluency metrics adhering strictly to the invariant $WCPM \le WPM$.

5. **Student Improvement Percentage (%)**:
   Calculated longitudinal delta between sequential assessment attempts:
   $$\text{Improvement \%} = \frac{\text{Score}_{\text{current}} - \text{Score}_{\text{previous}}}{\text{Score}_{\text{previous}}} \times 100$$

6. **Intervention Effectiveness Delta**:
   $$\Delta_{\text{intervention}} = \overline{\text{Score}}_{\text{post-intervention}} - \overline{\text{Score}}_{\text{pre-intervention}}$$
   - $\Delta \ge 10.0 \implies \text{Highly Effective}$
   - $\Delta > 0.0 \implies \text{Moderately Effective}$
   - $\Delta = 0.0 \implies \text{No Change}$
   - $\Delta < 0.0 \implies \text{Ineffective / Score Dropped}$

---

## 4. Decision-Intelligence Query Catalog

The file `sql/07_decision_intelligence.sql` contains 12 parameterized operational queries addressing key administrative decisions:

1. **Top-Performing Schools**: Ranks top 10 institutions by benchmark pass rate and average reading scores (minimum sample size $\ge 50$ students).
2. **Lowest-Performing Schools**: Identifies bottom 10 institutions needing immediate academic audits and coaching.
3. **Severe Underperformance Outliers**: Identifies schools whose average performance lags the system average by $\ge 15.0$ points.
4. **Grade Vulnerability Ranking**: Identifies specific transition grades with the highest rates of benchmark failure.
5. **Critical Student Risk Registry**: Daily prioritized caseload of High-risk students in active open status.
6. **Declining Performance Early Warning**: Identifies students with negative improvement rates ($< -5.0\%$) over multi-attempt histories.
7. **High-Growth Student Outliers**: Identifies students demonstrating $\ge +15.0\%$ growth for positive reinforcement and study habit modeling.
8. **Root-Cause Risk Breakdown**: Pareto distribution of risk drivers across the student population.
9. **Engagement-Performance Gradient**: Bivariate breakdown linking attendance brackets ($<70\%$, $70\text{--}84\%$, $\ge 85\%$) and engagement levels to benchmark pass rates.
10. **Dual-Vulnerability Schools**: Targets institutions suffering from both high risk density ($\ge 15\%$ of student body) and chronic low attendance ($< 75\%$).
11. **Actionable Intervention Priority Queue**: Operational dispatch list filtered by `Critical` and `High` urgency.
12. **Sub-Skill Competency Heatmap**: Highlights the weakest foundational skill (e.g. grammar vs. vocabulary vs. comprehension) per subject.

---

## 5. Analytical Validation & Quality Assurance

`sql/08_validate_analytics.sql` provides 25 automated assertion checks covering:
- **Primary Key Uniqueness**: All dimension and fact tables enforce unique primary identifiers.
- **Referential Integrity**: Zero orphan records across student-school, assessment-student, performance-assessment, engagement-student, and intervention-student joins.
- **Domain Constraints**: Grade levels strictly bounded within $\{6, 7, 8, 9, 10\}$. All scores bounded in $[0.00, 100.00]$.
- **Business Invariants**: Verified that $WCPM \le WPM$, $Assignments_{\text{completed}} \le Assignments_{\text{assigned}}$, and $ResolutionDate \ge IdentifiedDate$.
- **View Availability**: Verified that all 9 views return valid, non-empty, schema-compliant rows.

---

## 6. Known Analytical Limitations

1. **Synthetic Data Context**: All observations are generated synthetically for realistic scenario modeling and do not reflect real individuals.
2. **Intervention Temporal Overlap**: Certain students may have multiple overlapping intervention records; the pre/post evaluation models the latest discrete intervention window per student.
3. **Correlation vs. Causation**: Engagement metrics (platform minutes, attendance) are documented as statistical associations with performance, not definitive causal determinants.

---

## 7. Web Application Integration & API Consumption Guide

When building the backend API and frontend dashboards in subsequent phases:
1. **API Endpoints**: Map REST endpoints directly to analytical views:
   - `GET /api/v1/analytics/overview` $\rightarrow$ `analytics.v_overall_performance`
   - `GET /api/v1/analytics/schools` $\rightarrow$ `analytics.v_school_performance`
   - `GET /api/v1/analytics/schools/:id` $\rightarrow$ `analytics.v_school_performance WHERE school_id = :id`
   - `GET /api/v1/analytics/grades` $\rightarrow$ `analytics.v_grade_performance`
   - `GET /api/v1/analytics/students/:id` $\rightarrow$ `analytics.v_student_performance WHERE student_id = :id`
   - `GET /api/v1/analytics/trends` $\rightarrow$ `analytics.v_performance_trend`
   - `GET /api/v1/analytics/risk` $\rightarrow$ `analytics.v_student_risk`
   - `GET /api/v1/analytics/interventions/effectiveness` $\rightarrow$ `analytics.v_intervention_effectiveness`
2. **Query Performance & Index Utilization**:
   - Views leverage underlying B-tree indexes defined in `sql/05_create_indexes.sql` on `student_id`, `school_id`, `performance_date`, `grade`, and `status`.
   - For ultra-high concurrency in production, materialized views with periodic refresh (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) can be introduced seamlessly using the same underlying view definitions.

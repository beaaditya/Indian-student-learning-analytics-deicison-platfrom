# Decision Intelligence Backend Layer Architecture

## 1. Executive Summary & System Architecture
The Decision Intelligence Backend Layer bridges the PostgreSQL analytical database with the future Student Learning Analytics & Decision Intelligence web application. Built with **FastAPI** and **psycopg2**, it provides high-throughput, sub-100ms analytical APIs, deterministic automated insight discovery, end-to-end multi-domain analytical pipelines, and security guardrails for a future AI Student Learning Analyst agent.

```
+----------------------------------------------------------------------------------------------------+
|                                    DATA & STORAGE LAYER (PostgreSQL)                               |
+----------------------------------------------------------------------------------------------------+
|  • Dimension Tables: dim_school (989), dim_student (98,141)                                        |
|  • Fact Tables: fact_assessment (582k), fact_performance (530k), engagement (966k), intervention   |
|  • Step 11 Analytical Views: v_overall, v_school, v_grade, v_subject, v_student, v_risk, v_trend   |
|  • Step 12A Master BI View: analytics.v_powerbi_master (530,470 OBT rows)                          |
+-------------------------------------------------+--------------------------------------------------+
                                                  | (psycopg2 Connection Pool / Parameterized SQL)
                                                  v
+----------------------------------------------------------------------------------------------------+
|                            FASTAPI DECISION INTELLIGENCE BACKEND LAYER                             |
+----------------------------------------------------------------------------------------------------+
|  [backend/database.py]        Connection Pooling, Read-Only Enforcer, DDL/DML Rejection Guardrails  |
|  [backend/overview.py]        Executive KPIs, Monthly Trends, Band Distributions, Rankings         |
|  [backend/schools.py]         School Scorecards, Multi-Filter Slicers, Deep-Dive Institutional DNA |
|  [backend/grades.py]          Grade-Level (6-10) Learning Gaps & Transition Progressions           |
|  [backend/subjects.py]        Competency Mastery, Sub-Skill Heatmaps (Fluency, Grammar, etc.)      |
|  [backend/students.py]        Granular Student 360 Diagnostic Profiles & Longitudinal Attempts     |
|  [backend/risk.py]            Early-Warning Risk Analytics, Pareto Drivers, Triage Dispatch Queue   |
|  [backend/interventions.py]   Remediation ROI Tracking, Pre/Post Recovery Measurement              |
|  [backend/insights.py]        Deterministic Insight Engine (Strictly Schema-Compliant JSON)        |
|  [backend/analysis_pipeline.py] Comprehensive Automated Analytical Audit & Synthesis Pipeline      |
|  [backend/agent.py]           AI Student Learning Analyst Intent Router, Safe SQL & Grounding      |
+-------------------------------------------------+--------------------------------------------------+
                                                  | (JSON REST APIs / CORS Enabled)
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                  FUTURE CONSUMPTION CHANNELS                                       |
+----------------------------------------------------------------------------------------------------+
|  • Web Application Dashboard (Executive, School, Grade, Student, Risk, Intervention Hubs)          |
|  • Power BI Dashboards (Direct Connection to analytics.v_powerbi_master)                           |
|  • AI Chatbot Assistant (Natural-Language Investigation Interface via POST /api/agent/query)       |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. API Endpoints Dictionary

All endpoints return structured JSON, enforce parameter safety, and support multi-dimensional filtering:

| Endpoint | Method | Query Parameters | Description |
| :--- | :---: | :--- | :--- |
| `/health` | `GET` | None | API and PostgreSQL connection health status. |
| `/api/overview` | `GET` | `state`, `district`, `management_type`, `academic_year`, `grade` | System-wide KPIs, monthly trends, band distributions, and top/bottom schools. |
| `/api/schools` | `GET` | `state`, `district`, `school_type`, `management_type`, `board`, `urban_rural`, `search`, `limit`, `offset` | Paginated school performance scorecards and rankings. |
| `/api/schools/{id}` | `GET` | None | Detailed 360-degree school profile (grade breakdown, subjects, monthly trends, risk). |
| `/api/grades` | `GET` | `school_id`, `state`, `management_type` | Grade 6–10 cohort metrics, sub-skill diagnostics, and transition gap analysis. |
| `/api/subjects` | `GET` | `grade`, `school_id`, `state` | Subject-level mastery (English, Math, Science) and sub-skill diagnostic heatmaps. |
| `/api/students` | `GET` | `school_id`, `grade`, `gender`, `socioeconomic_band`, `benchmark_status`, `risk_status`, `search`, `limit`, `offset` | Paginated student profiles with multi-attribute demographic filtering. |
| `/api/students/{id}` | `GET` | None | Exhaustive student diagnostic (assessment history, monthly engagement, interventions). |
| `/api/risk` | `GET` | `school_id`, `grade`, `risk_level`, `priority`, `status`, `limit`, `offset` | Early-warning risk volume, Pareto root-cause distribution, and prioritized triage queue. |
| `/api/interventions`| `GET` | `school_id`, `grade`, `status`, `effectiveness_category`, `limit`, `offset` | Intervention caseload metrics, resolution efficiency, and pre/post score recovery records. |
| `/api/insights` | `GET` | `category`, `priority` | Structured deterministic insights generated across all 7 educational domains. |
| `/api/insights/summary`| `GET` | None | Aggregated summary of insights by category, priority, and top urgent flags. |
| `/api/analysis-pipeline`| `GET` | None | Full automated analysis pipeline output (executive findings, risks, opportunities, actions).|
| `/api/agent/query` | `POST` | JSON: `{"question": "..."}` | AI Student Learning Analyst query interface with intent planning and grounded SQL results. |

---

## 3. Deterministic Insight Engine Architecture (`backend/insights.py`)

The insight engine operates strictly deterministically without LLM hallucinations or hardcoded numbers:
1. **Source of Truth**: Queries live PostgreSQL views (`v_overall_performance`, `v_school_performance`, `v_grade_performance`, `v_subject_performance`, `v_engagement_performance`, `v_intervention_effectiveness`).
2. **Schema Compliance**: Every insight outputs the standardized 14-field JSON structure:
   - `insight_id`, `category`, `entity_type`, `entity_id`, `entity_name`, `metric`, `value`, `comparison_value`, `difference`, `priority`, `title`, `description`, `recommended_action`, `source`, `generated_at`.
3. **Observational Integrity**: Adheres strictly to non-causal language rules for behavioral correlations (e.g. attendance is framed as an *association* with academic performance, not a direct causal mechanism).

---

## 4. AI Student Learning Analyst Framework (`backend/agent.py`)

The backend establishes the foundational architecture for the future conversational AI Analyst:

```
                          [User Question]
                                 │
                                 ▼
                     [Intent Classification]
            (Schools / Grades / Risk / Subject / Engagement)
                                 │
                                 ▼
                    [SQL Guardrail Validation]
            (Must be SELECT/WITH, Single Statement, Read-Only)
                                 │
                                 ▼
                     [PostgreSQL Safe Query]
                                 │
                                 ▼
                     [Live Evidence Rows]
                                 │
                                 ▼
                    [Grounded JSON Response]
```

### SQL Safety Rules
- **Prohibited Keywords**: All DML/DDL operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, `REVOKE`, `EXEC`, `COPY`) are rejected at the Python parser level.
- **Statement Guardrail**: Multi-statement queries containing semicolons are blocked to prevent SQL injection chaining.
- **Database Session**: Connections run within explicit read-only transactions (`conn.set_session(readonly=True)`).

---

## 5. Security & Multi-Tenant Slicing Considerations

1. **Parameterized Queries**: All dynamic user inputs are passed strictly as query parameters (`%s` placeholders), eliminating SQL injection vectors.
2. **No Data Ingestion in Web APIs**: The web API is 100% read-only. Ingestion and ETL remain strictly isolated within the verified `etl/` pipeline.
3. **CORS Configuration**: Enabled across standard HTTP methods (`GET`, `POST`, `OPTIONS`) to support decoupled frontend web deployment.

---

## 6. How the Future Web Application Will Consume This Layer

1. **Dashboard Cards & Widgets**: Fetch high-level KPIs and trends via `GET /api/overview`.
2. **Interactive Data Tables**: Fetch paginated institutional and student registries with dynamic server-side filtering via `GET /api/schools` and `GET /api/students`.
3. **Early Warning Triage Center**: Power counselor action queues using `GET /api/risk` and `GET /api/interventions`.
4. **Automated Executive Briefing**: Populate the "Smart Insights" feed directly from `GET /api/insights` and `GET /api/analysis-pipeline`.
5. **Interactive Copilot**: Power the conversational analyst chat drawer using `POST /api/agent/query`.

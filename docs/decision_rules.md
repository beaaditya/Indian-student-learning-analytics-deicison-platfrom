# Educational Decision Rules & Threshold Dictionary

## 1. Overview
This document formalizes the transparent, statistical, and domain-informed decision rules implemented across the Student Learning Analytics & Decision Intelligence Platform. Every automated insight, early-warning trigger, and recommendation is calculated deterministically against live PostgreSQL data using these criteria.

---

## 2. Benchmark & Performance Definitions

| Performance Band | Score Range | Operational Meaning | Recommended Pedagogical Action |
| :--- | :---: | :--- | :--- |
| **Advanced** | $\ge 85.0$ | Exceeds grade-level expectations; master reader. | Enrichment activities, advanced literature, peer-mentoring roles. |
| **Proficient** | $70.0 - 84.9$ | Meets grade-level learning standards consistently. | Standard grade curriculum pacing, regular formative checks. |
| **Developing** | $50.0 - 69.9$ | Emerging foundational mastery; minor learning gaps. | Guided reading groups, targeted vocabulary drills, modular practice. |
| **Needs Attention** | $< 50.0$ | Substantial foundational deficit; below benchmark. | Mandatory small-group remediation, 1-on-1 tutoring, phonics review. |

### Benchmark Attainment Rule
- **Benchmark Met/Exceeded**: Reading Score $\ge 70.0$ OR `benchmark_status` $\in$ (`'Meets Benchmark'`, `'Exceeds Benchmark'`).
- **Below Benchmark**: Reading Score $< 70.0$ OR `benchmark_status` = `'Below Benchmark'`.

---

## 3. Institutional & School-Level Decision Rules

| Rule Identifier | Trigger Criteria | Severity / Priority | Automated Insight & Recommendation |
| :--- | :--- | :---: | :--- |
| **RULE_SCH_01: Critical Underperformance** | School Avg Reading Score $< (\mu_{\text{system}} - 15.0)$ OR Benchmark Pass Rate $< 50.0\%$ | `High` | **Action**: Dispatch district academic taskforce; mandate teacher coaching workshops and supplementary reading kits. |
| **RULE_SCH_02: High Risk Concentration** | Proportion of At-Risk Students $\ge 15.0\%$ of school enrollment | `High` | **Action**: Assign dedicated remedial resource teachers; conduct school-wide attendance audit. |
| **RULE_SCH_03: Dual-Vulnerability Flag** | At-Risk Rate $\ge 15.0\%$ AND School Avg Attendance $< 75.0\%$ | `High` | **Action**: Launch community engagement drive; provide digital device access subsidies; implement morning attendance incentives. |
| **RULE_SCH_04: High Achievement Benchmark** | School Benchmark Pass Rate $\ge 98.0\%$ AND Avg Score $\ge 80.0$ | `Low / Recognition` | **Action**: Document instructional practices for regional peer-learning webinars and best-practice dissemination. |
| **RULE_SCH_05: Severe Infrastructure Deficit** | Infrastructure Score $< 40.0$ OR Digital Access Score $< 40.0$ | `Medium` | **Action**: Prioritize school for state infrastructure grants, computer lab upgrades, and solar backup power. |

---

## 4. Grade-Level Progression Rules (Grades 6–10)

| Rule Identifier | Trigger Criteria | Severity / Priority | Automated Insight & Recommendation |
| :--- | :--- | :---: | :--- |
| **RULE_GRD_01: Transition Grade Stagnation** | Grade Benchmark Pass Rate $< (\mu_{\text{system}} - 3.0\%)$ OR Grade Avg Score $< 72.0$ | `Medium` | **Action**: Review middle-to-secondary transition curriculum pacing; introduce bridge courses at the start of the term. |
| **RULE_GRD_02: Grade Risk Outlier** | Grade At-Risk Student Count $> 20.0\%$ of total system risk volume | `Medium` | **Action**: Deploy grade-specific remedial reading modules and increase weekly practice session quotas. |

---

## 5. Subject & Skill Competency Rules

| Rule Identifier | Trigger Criteria | Severity / Priority | Automated Insight & Recommendation |
| :--- | :--- | :---: | :--- |
| **RULE_SUB_01: Sub-Skill Deficit Gap** | Sub-skill score (e.g. Grammar, Fluency) $< 45.0$ OR lags overall subject average by $\ge 10.0$ points | `Medium` | **Action**: Embed structured daily 15-minute drills targeting the specific deficit competency into daily lesson plans. |
| **RULE_SUB_02: Subject Benchmark Lag** | Subject Benchmark Pass Rate lags other subjects by $\ge 5.0\%$ | `Medium` | **Action**: Conduct teacher content-mastery refresher workshops in the affected subject. |

---

## 6. Student-Level Early Warning & Risk Rules

| Rule Identifier | Trigger Criteria | Severity / Priority | Automated Insight & Recommendation |
| :--- | :--- | :---: | :--- |
| **RULE_STU_01: Critical Multi-Factor Risk** | Risk Score $\ge 75.0$ AND Risk Level = `'High'` AND Intervention Status $\in$ (`'Open'`, `'In Progress'`) | `High` | **Action**: Mandatory immediate 1-on-1 academic counseling; assign individualized remedial learning pathway. |
| **RULE_STU_02: Declining Performance Trajectory** | `improvement_pct` $\le -10.0\%$ across sequential assessment attempts | `High` | **Action**: Schedule parent-teacher diagnostic conference; investigate recent attendance or behavioral shifts. |
| **RULE_STU_03: High Growth Outlier** | `improvement_pct` $\ge +15.0\%$ over prior assessment attempt | `Low / Positive` | **Action**: Provide certificate of achievement; transition student to standard/advanced learning cohort. |

---

## 7. Engagement & Behavioral Association Rules

*Note: All engagement rules analyze empirical associations without assuming direct causation.*

| Rule Identifier | Trigger Criteria | Association Finding | Operational Policy Recommendation |
| :--- | :--- | :--- | :--- |
| **RULE_ENG_01: Chronic Absenteeism Threshold** | Student Attendance $< 70.0\%$ | Strongly associated with 3x higher probability of failing grade-level benchmark. | Establish mandatory SMS notification to parents upon 3 consecutive missed classes. |
| **RULE_ENG_02: Low Assignment Completion** | Assignment Completion Rate $< 50.0\%$ | Associated with significant deficit in vocabulary and grammar sub-skill scores. | Provide offline printable assignment packets and in-school homework assistance periods. |
| **RULE_ENG_03: High Digital Platform Engagement** | Platform Minutes $\ge 300$ min/month AND Learning Sessions $\ge 8$ / month | Associated with higher average accuracy (+8.5%) and positive score trajectory. | Encourage classroom adoption of digital reading modules during zero periods. |

---

## 8. Intervention Efficacy & ROI Rules

| Rule Identifier | Trigger Criteria | Outcome Category | Administrative Decision |
| :--- | :--- | :---: | :--- |
| **RULE_INT_01: Highly Effective Intervention** | $\text{Score}_{\text{post}} - \text{Score}_{\text{pre}} \ge +10.0$ points | `Highly Effective` | Scale the prescribed intervention modality (e.g. Peer Tutoring) across the district. |
| **RULE_INT_02: Moderately Effective** | $0.0 < \text{Score}_{\text{post}} - \text{Score}_{\text{pre}} < 10.0$ points | `Moderately Effective` | Continue intervention; adjust session frequency to accelerate recovery. |
| **RULE_INT_03: Ineffective / Score Dropped** | $\text{Score}_{\text{post}} - \text{Score}_{\text{pre}} \le 0.0$ points | `Ineffective` | Terminate current intervention strategy; re-evaluate student for alternative diagnostic causes. |
| **RULE_INT_04: Unresolved High-Risk Case** | Case Status = `'Open'` for $> 60$ days with Priority = `'Critical'` / `'High'` | `Escalation` | Escalate directly to Block Education Officer (BEO) and School Principal for urgent audit. |

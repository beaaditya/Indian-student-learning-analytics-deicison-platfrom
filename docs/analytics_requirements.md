# Analytical Requirements & Decision-Intelligence Framework

## 1. Overview & Business Objectives
The Student Learning Analytics & Decision Intelligence Platform empowers educators, school administrators, and state educational policymakers to monitor foundational learning outcomes, detect learning gaps early, optimize resource allocation, and evaluate the effectiveness of academic interventions across Indian schools.

This document outlines the core analytical questions, key performance indicators (KPIs), and decision-making logic implemented across the SQL analytical layer.

---

## 2. Core Analytical Question Categories

### A. Overall System Performance
*Executive-level overview of aggregate student learning outcomes and benchmark attainment across the educational system.*
- **Key Questions:**
  - What is the system-wide average reading score and sub-skill scores (fluency, comprehension, vocabulary, grammar, pronunciation)?
  - What proportion and percentage of students meet or exceed the grade-level benchmark?
  - What percentage of students are currently performing below the benchmark?
  - How is the student population distributed across performance bands (`Needs Attention`, `Developing`, `Proficient`, `Advanced`)?
  - What is the system-wide average improvement percentage over consecutive assessment attempts?

### B. School-Level Performance & Equity Analysis
*Comparative assessment of institutional performance to identify systemic disparities, high-achieving clusters, and vulnerable schools.*
- **Key Questions:**
  - Which schools are achieving the highest and lowest average assessment outcomes?
  - What is the benchmark achievement rate across different management types (Government, Private, Aided) and geographies (Urban vs. Rural)?
  - Which schools exhibit disproportionate concentrations of at-risk students?
  - How does individual school performance compare against the state/district average?
  - What is the relationship between school infrastructure / digital access scores and student assessment performance?

### C. Grade-Level Progressions (Grades 6–10)
*Cohort-level learning trajectories across key transition grades.*
- **Key Questions:**
  - How do average performance scores, fluency, and comprehension vary from Grade 6 through Grade 10?
  - In which grades do learning gaps widen most significantly?
  - Which grades exhibit the highest volume and rate of academic risk?
  - How does score improvement rate differ between middle school (Grades 6–8) and secondary school (Grades 9–10)?

### D. Student-Level Mastery & Diagnostics
*Granular diagnostics to support personalized learning and teacher feedback.*
- **Key Questions:**
  - Which individual students require immediate remedial support vs. enrichment?
  - What are the specific sub-skill strengths and deficits for a given student (e.g., strong decoding/fluency but weak comprehension)?
  - Which students are on a declining performance trajectory (negative improvement percentage)?
  - Which students are demonstrating high growth and closing learning gaps?
  - What is a student's latest assessment performance compared to their historical average?

### E. Subject & Foundational Skill Mastery
*Subject-matter and competency-level outcome evaluation.*
- **Key Questions:**
  - How does student performance compare across core subjects (English, Mathematics, Science)?
  - Which sub-skills (e.g., Reading Comprehension, Grammar, Oral Fluency) show the lowest overall mastery rates?
  - What percentage of assessment attempts in each subject meet the subject benchmark?
  - Which subjects have the highest rate of score progression or stagnation?

### F. Engagement & Behavioral Correlation
*Analyzing the relationship between digital platform engagement, classroom attendance, and academic success.*
- **Key Questions:**
  - Is classroom attendance positively associated with assessment scores and benchmark attainment?
  - Does higher digital platform usage (platform minutes, learning sessions) correlate with greater score improvement?
  - What is the relationship between assignment completion percentage and benchmark achievement?
  - What threshold of low engagement (e.g., attendance < 70%, completion < 50%) is strongly associated with high risk of failing benchmarks?

### G. Risk Diagnostics & Intervention Effectiveness
*Monitoring proactive early-warning indicators and evaluating the return on remedial actions.*
- **Key Questions:**
  - How many students are actively flagged at `High` or `Medium` risk levels?
  - What are the predominant root causes for academic risk (e.g., Low Attendance, Declining Scores, Low Assignment Completion)?
  - What is the operational status of identified interventions (`Open`, `In Progress`, `Resolved`)?
  - For students who received targeted interventions, did their post-intervention assessment scores improve relative to their pre-intervention baseline?
  - Which intervention strategies (e.g., Remedial Classes, Peer Tutoring, Teacher Mentoring) demonstrate the highest success and score recovery rates?

---

## 3. Decision-Intelligence Matrix & Action Rules

| Decision Use Case | Trigger Criteria | Recommended Decision / Action | Primary Stakeholder |
| :--- | :--- | :--- | :--- |
| **School Remediation Alert** | Benchmark % < 50% OR Avg Reading Score < 40 | Deploy academic coaching, curriculum audit, and teacher training resources. | District Education Officer (DEO) / BEO |
| **Critical Student Intervention** | Risk Score $\ge$ 75 AND Benchmark Status = 'Below Benchmark' | Assign personalized remedial plan and mandatory 1-on-1 tutoring sessions. | School Principal / Subject Teacher |
| **Declining Trajectory Warning** | Improvement % < -10% across 2+ consecutive assessments | Schedule parent-teacher conference and conduct diagnostic skill evaluation. | Class Teacher / Academic Counselor |
| **High Risk + Low Engagement Cluster** | School with > 25% at-risk students AND Avg Attendance < 75% | Community engagement campaign, attendance drive, and digital access augmentation. | State Education Department |
| **Skill Reinforcement Focus** | Cohort sub-skill score (e.g. Grammar or Fluency) < 45 | Adjust pedagogical strategy and introduce targeted modular reading exercises. | Curriculum Coordinator |

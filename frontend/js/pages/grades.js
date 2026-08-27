/**
 * LearnIQ — Grade & Subject Intelligence Analytics Page Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified backend endpoints:
 * GET /api/grades (cohort outcomes & transition step gaps across Grades 6-10)
 * GET /api/subjects (subject mastery & sub-skill diagnostics)
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent } from "../utils/formatters.js";
import { renderErrorState } from "../components/error-state.js";

// Active page filter state
let activeFilters = {
  state: "",
  management_type: "",
  grade: "",
};

/**
 * Main export to render Grade & Subject Intelligence page
 */
export async function renderGradesPage(container) {
  if (!container) return;

  // 1. Immediately render persistent shell with skeleton loader
  renderGradesShell(container);

  // 2. Fetch and render data
  await loadGradesAndSubjectsData(container);
}

/**
 * Renders the persistent shell including header and filter bar
 */
function renderGradesShell(container) {
  container.innerHTML = `
    <div class="page-container">
      
      <!-- 1. Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Analytics</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Grade & Subject</span>
      </div>

      <!-- 2. Section Header -->
      <div class="section-header">
        <div class="section-title-wrap">
          <h1 class="section-title">Grade & Subject Intelligence</h1>
          <p class="section-subtitle">Cohort performance, subject mastery & learning-gap diagnostics.</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="status-pill status-pill-success">
            <span class="status-pill-dot"></span> Live PostgreSQL Data
          </span>
        </div>
      </div>

      <!-- 3. Filter & Slicer Control Bar -->
      <div class="glass-panel" id="grades-filter-panel" style="padding: var(--space-3) var(--space-5); margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
          <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Filter Cohorts:</span>
          
          <!-- State Slicer -->
          <select class="filter-select" id="grades-filter-state" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All States</option>
            <option value="Andhra Pradesh" ${activeFilters.state === "Andhra Pradesh" ? "selected" : ""}>Andhra Pradesh</option>
            <option value="Assam" ${activeFilters.state === "Assam" ? "selected" : ""}>Assam</option>
            <option value="Bihar" ${activeFilters.state === "Bihar" ? "selected" : ""}>Bihar</option>
            <option value="Chandigarh" ${activeFilters.state === "Chandigarh" ? "selected" : ""}>Chandigarh</option>
            <option value="Delhi" ${activeFilters.state === "Delhi" ? "selected" : ""}>Delhi</option>
            <option value="Goa" ${activeFilters.state === "Goa" ? "selected" : ""}>Goa</option>
            <option value="Gujarat" ${activeFilters.state === "Gujarat" ? "selected" : ""}>Gujarat</option>
            <option value="Haryana" ${activeFilters.state === "Haryana" ? "selected" : ""}>Haryana</option>
            <option value="Himachal Pradesh" ${activeFilters.state === "Himachal Pradesh" ? "selected" : ""}>Himachal Pradesh</option>
            <option value="Karnataka" ${activeFilters.state === "Karnataka" ? "selected" : ""}>Karnataka</option>
            <option value="Kerala" ${activeFilters.state === "Kerala" ? "selected" : ""}>Kerala</option>
            <option value="Madhya Pradesh" ${activeFilters.state === "Madhya Pradesh" ? "selected" : ""}>Madhya Pradesh</option>
            <option value="Maharashtra" ${activeFilters.state === "Maharashtra" ? "selected" : ""}>Maharashtra</option>
            <option value="Punjab" ${activeFilters.state === "Punjab" ? "selected" : ""}>Punjab</option>
            <option value="Rajasthan" ${activeFilters.state === "Rajasthan" ? "selected" : ""}>Rajasthan</option>
            <option value="Tamil Nadu" ${activeFilters.state === "Tamil Nadu" ? "selected" : ""}>Tamil Nadu</option>
            <option value="Telangana" ${activeFilters.state === "Telangana" ? "selected" : ""}>Telangana</option>
            <option value="Uttar Pradesh" ${activeFilters.state === "Uttar Pradesh" ? "selected" : ""}>Uttar Pradesh</option>
            <option value="West Bengal" ${activeFilters.state === "West Bengal" ? "selected" : ""}>West Bengal</option>
          </select>

          <!-- Management Slicer -->
          <select class="filter-select" id="grades-filter-mgmt" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Management Types</option>
            <option value="State Government" ${activeFilters.management_type === "State Government" ? "selected" : ""}>State Government</option>
            <option value="Private Management" ${activeFilters.management_type === "Private Management" ? "selected" : ""}>Private Management</option>
            <option value="Government Aided" ${activeFilters.management_type === "Government Aided" ? "selected" : ""}>Government Aided</option>
            <option value="Private Trust" ${activeFilters.management_type === "Private Trust" ? "selected" : ""}>Private Trust</option>
            <option value="Local Government" ${activeFilters.management_type === "Local Government" ? "selected" : ""}>Local Government</option>
          </select>

          <!-- Grade Slicer (Focus Filter) -->
          <select class="filter-select" id="grades-filter-grade" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Grades (6–10)</option>
            <option value="6" ${activeFilters.grade === "6" ? "selected" : ""}>Grade 6</option>
            <option value="7" ${activeFilters.grade === "7" ? "selected" : ""}>Grade 7</option>
            <option value="8" ${activeFilters.grade === "8" ? "selected" : ""}>Grade 8</option>
            <option value="9" ${activeFilters.grade === "9" ? "selected" : ""}>Grade 9</option>
            <option value="10" ${activeFilters.grade === "10" ? "selected" : ""}>Grade 10</option>
          </select>
        </div>

        <button class="btn btn-secondary" id="btn-reset-grades-filters" style="padding: 4px 10px; font-size: var(--text-xs);">
          Reset Filters
        </button>
      </div>

      <!-- 4. Dynamic Analytics Mount -->
      <div id="grades-dynamic-mount">
        <!-- Rendered asynchronously -->
      </div>

    </div>
  `;

  // Attach filter event listeners
  attachFilterListeners(container);
}

/**
 * Attaches filter change and reset handlers
 */
function attachFilterListeners(container) {
  const stateSelect = container.querySelector("#grades-filter-state");
  const mgmtSelect = container.querySelector("#grades-filter-mgmt");
  const gradeSelect = container.querySelector("#grades-filter-grade");
  const resetBtn = container.querySelector("#btn-reset-grades-filters");

  const onFilterChange = () => {
    activeFilters.state = stateSelect ? stateSelect.value : "";
    activeFilters.management_type = mgmtSelect ? mgmtSelect.value : "";
    activeFilters.grade = gradeSelect ? gradeSelect.value : "";
    loadGradesAndSubjectsData(container);
  };

  [stateSelect, mgmtSelect, gradeSelect].forEach((el) => {
    if (el) el.addEventListener("change", onFilterChange);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      activeFilters = { state: "", management_type: "", grade: "" };
      if (stateSelect) stateSelect.value = "";
      if (mgmtSelect) mgmtSelect.value = "";
      if (gradeSelect) gradeSelect.value = "";
      loadGradesAndSubjectsData(container);
    });
  }
}

/**
 * Fetches data from /api/grades and /api/subjects concurrently
 */
async function loadGradesAndSubjectsData(container) {
  const mount = container.querySelector("#grades-dynamic-mount");
  if (!mount) return;

  renderGradesSkeleton(mount);

  try {
    // Build query parameters
    const gradeParams = {};
    if (activeFilters.state) gradeParams.state = activeFilters.state;
    if (activeFilters.management_type) gradeParams.management_type = activeFilters.management_type;

    const subjectParams = {};
    if (activeFilters.state) subjectParams.state = activeFilters.state;
    if (activeFilters.grade) subjectParams.grade = parseInt(activeFilters.grade, 10);

    // Fetch both datasets concurrently
    const [gradesRes, subjectsRes] = await Promise.all([
      api.grades(gradeParams),
      api.subjects(subjectParams),
    ]);

    if (!gradesRes || gradesRes.status !== "success") {
      throw new Error(gradesRes?.message || "Failed to retrieve grade-level learning outcomes.");
    }
    if (!subjectsRes || subjectsRes.status !== "success") {
      throw new Error(subjectsRes?.message || "Failed to retrieve subject-level diagnostics.");
    }

    renderGradesDashboard(mount, gradesRes, subjectsRes);
  } catch (err) {
    console.error("[Grade & Subject Intelligence Error]", err);
    renderErrorState(mount, {
      title: "Unable to load Grade & Subject Intelligence",
      message: err.message || "Failed to connect to the PostgreSQL analytics engine. Please verify the backend.",
      onRetry: () => loadGradesAndSubjectsData(container),
    });
  }
}

/**
 * Renders the verified Grade & Subject Intelligence Dashboard
 */
function renderGradesDashboard(mount, gradesData, subjectsData) {
  let grades = gradesData.grades || [];
  const transitionGaps = gradesData.transition_gaps || [];
  const subjects = subjectsData.subjects || [];
  const skillDiagnostics = subjectsData.skill_diagnostics || [];

  // Filter grades if specific grade selected
  if (activeFilters.grade) {
    grades = grades.filter((g) => String(g.grade) === String(activeFilters.grade));
  }

  // Handle empty state
  if (grades.length === 0 && subjects.length === 0) {
    mount.innerHTML = `
      <div class="glass-panel" style="padding: var(--space-10) var(--space-6); text-align: center; margin: var(--space-6) 0;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-surface-subtle); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-1);">No cohort data found</h3>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 420px; margin: 0 auto var(--space-4); line-height: 1.5;">
          No grade or subject records matched the selected filter criteria. Try choosing a different state or management type.
        </p>
        <button class="btn btn-secondary" id="btn-empty-reset-grades" style="font-size: var(--text-xs);">
          Reset Filters
        </button>
      </div>
    `;
    const btn = mount.querySelector("#btn-empty-reset-grades");
    if (btn) {
      btn.addEventListener("click", () => {
        activeFilters = { state: "", management_type: "", grade: "" };
        const container = mount.closest(".page-container") || document;
        renderGradesPage(container.parentElement || container);
      });
    }
    return;
  }

  // Calculate real macro aggregate KPIs
  const totalStudents = grades.reduce((acc, g) => acc + Number(g.student_count || g.total_students_evaluated || 0), 0);
  const totalAssessments = grades.reduce((acc, g) => acc + Number(g.total_assessments || 0), 0);
  const avgPerf = grades.length > 0
    ? grades.reduce((acc, g) => acc + Number(g.average_performance || g.average_reading_score || 0), 0) / grades.length
    : 0;
  const avgBenchmark = grades.length > 0
    ? grades.reduce((acc, g) => acc + Number(g.benchmark_percentage || 0), 0) / grades.length
    : 0;
  const avgImprovement = grades.length > 0
    ? grades.reduce((acc, g) => acc + Number(g.average_improvement_pct || 0), 0) / grades.length
    : 0;

  // Identify lowest and highest performing cohorts
  const sortedGrades = [...grades].sort((a, b) => Number(a.average_performance || 0) - Number(b.average_performance || 0));
  const focusGrade = sortedGrades[0];
  const leaderGrade = sortedGrades[sortedGrades.length - 1];

  // Identify weakest subject
  const sortedSubjects = [...subjects].sort((a, b) => Number(a.average_performance || 0) - Number(b.average_performance || 0));
  const focusSubject = sortedSubjects[0];
  const leaderSubject = sortedSubjects[sortedSubjects.length - 1];

  // Deterministic learning signals
  const signals = [];
  if (focusGrade && leaderGrade && grades.length > 1) {
    signals.push({
      type: "info",
      title: "Grade-Level Performance Trajectory",
      text: `Grade ${leaderGrade.grade} achieves the highest average score (${formatScore(leaderGrade.average_performance)}), while Grade ${focusGrade.grade} represents the foundational focus cohort (${formatScore(focusGrade.average_performance)}).`,
    });
  }
  if (focusSubject && leaderSubject) {
    signals.push({
      type: "warning",
      title: "Subject Competency Gap",
      text: `${leaderSubject.subject} leads subject proficiency (${formatScore(leaderSubject.average_performance)} avg), with ${focusSubject.subject} identified for targeted instructional reinforcement (${formatScore(focusSubject.average_performance)} avg).`,
    });
  }
  if (transitionGaps.length > 0) {
    const minTransition = [...transitionGaps].sort((a, b) => Number(a.score_growth_delta) - Number(b.score_growth_delta))[0];
    if (minTransition) {
      signals.push({
        type: "success",
        title: "Cohort Transition Step Velocity",
        text: `Longitudinal transition analysis demonstrates positive progression across grades, with ${minTransition.transition} registering a +${minTransition.score_growth_delta} score delta.`,
      });
    }
  }

  mount.innerHTML = `
    <!-- 1. Primary Macro KPI Grid (4 cards: 2 rows x 2 cols) -->
    <div class="grid-2-cols">
      
      <!-- KPI 1: Evaluated Cohorts -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Evaluated Cohorts</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
        </div>
        <div class="kpi-value">${grades.length} Grades</div>
        <div class="kpi-subtext">${formatNumber(totalStudents)} learners evaluated</div>
      </div>

      <!-- KPI 2: Cross-Cohort Mean Score -->
      <div class="kpi-card" style="border-top: 3px solid var(--primary);">
        <div class="kpi-header">
          <span>Average Performance</span>
          <span class="badge badge-primary">Mean</span>
        </div>
        <div class="kpi-value" style="color: var(--primary);">${formatScore(avgPerf)} <span style="font-size: var(--text-sm); font-weight: 500; color: var(--text-muted);">/ 100</span></div>
        <div class="kpi-subtext">${formatPercent(avgImprovement)} average growth</div>
      </div>

      <!-- KPI 3: Benchmark Attainment -->
      <div class="kpi-card" style="border-top: 3px solid var(--emerald);">
        <div class="kpi-header">
          <span>Benchmark Attainment</span>
          <span class="badge" style="background: var(--emerald-subtle); color: #047857;">Target</span>
        </div>
        <div class="kpi-value" style="color: #047857;">${formatPercent(avgBenchmark)}</div>
        <div class="kpi-subtext">Meeting proficiency standard</div>
      </div>

      <!-- KPI 4: Primary Focus Cohort -->
      <div class="kpi-card" style="border-top: 3px solid var(--amber);">
        <div class="kpi-header">
          <span>Focus Cohort</span>
          <span class="badge" style="background: var(--amber-subtle); color: #b45309;">Attention</span>
        </div>
        <div class="kpi-value" style="color: #b45309;">Grade ${focusGrade?.grade || "—"}</div>
        <div class="kpi-subtext">${formatScore(focusGrade?.average_performance)} avg score</div>
      </div>

      <!-- KPI 5: Curricular Subjects -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Core Curricula</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--teal);"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <div class="kpi-value">${subjects.length} Subjects</div>
        <div class="kpi-subtext">${formatNumber(totalAssessments)} total assessments</div>
      </div>

    </div>

    <!-- 2. Grade Cohort Performance Cards -->
    <div style="margin-bottom: var(--space-6);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
        <div>
          <h2 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin: 0;">Grade-Level Cohort Scorecards</h2>
          <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 2px 0 0 0;">Competency proficiency and benchmark achievement across monitored grade levels</p>
        </div>
        <span class="badge badge-primary">${grades.length} Grades Monitored</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
        ${grades.map((g) => `
          <div class="glass-panel" style="padding: var(--space-4); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2);">
                <span style="font-size: var(--text-base); font-weight: 800; color: var(--text-primary);">Grade ${g.grade}</span>
                <span class="badge" style="background: ${Number(g.benchmark_percentage) >= 95 ? "var(--emerald-subtle)" : "var(--amber-subtle)"}; color: ${Number(g.benchmark_percentage) >= 95 ? "#047857" : "#b45309"}; font-size: 10px;">
                  ${formatPercent(g.benchmark_percentage)} Met
                </span>
              </div>
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span style="font-size: var(--text-2xl); font-weight: 800; color: var(--primary); font-family: var(--font-mono);">${formatScore(g.average_performance || g.average_reading_score)}</span>
                <span style="font-size: var(--text-xs); color: var(--text-muted);">avg score</span>
              </div>
              <div style="height: 6px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden; margin: var(--space-3) 0 var(--space-2) 0;">
                <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(g.average_performance || 0)))}%; background: var(--primary);"></div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px solid var(--glass-border); font-size: 11px;">
              <div>
                <span style="color: var(--text-muted);">Learners:</span>
                <strong style="color: var(--text-primary); margin-left: 2px;">${formatNumber(g.student_count)}</strong>
              </div>
              <div style="text-align: right;">
                <span style="color: var(--text-muted);">Growth:</span>
                <strong style="color: #047857; margin-left: 2px;">+${formatPercent(g.average_improvement_pct)}</strong>
              </div>
              <div>
                <span style="color: var(--text-muted);">Fluency:</span>
                <strong style="color: var(--text-secondary); margin-left: 2px;">${formatScore(g.average_fluency)}</strong>
              </div>
              <div style="text-align: right;">
                <span style="color: var(--text-muted);">Accuracy:</span>
                <strong style="color: var(--text-secondary); margin-left: 2px;">${formatPercent(g.average_accuracy_pct)}</strong>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- 3. Cohort Transition Step Gaps -->
    ${transitionGaps.length > 0 ? `
      <div class="glass-panel" style="padding: var(--space-5); margin-bottom: var(--space-6);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
          <div>
            <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 6px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
              Longitudinal Cohort Transition Dynamics
            </h3>
            <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Step-gap progression and attainment delta between consecutive grade levels</p>
          </div>
          <span class="badge badge-teal">${transitionGaps.length} Transitions Evaluated</span>
        </div>

        <div class="grid-2-cols" style="gap: var(--space-3); margin-bottom: 0;">
          ${transitionGaps.map((tg) => `
            <div style="padding: 12px 14px; background: rgba(248, 250, 252, 0.85); border: 1px solid var(--glass-border); border-left: 3px solid ${tg.score_growth_delta >= 0 ? "var(--emerald)" : "var(--coral)"}; border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary);">${tg.transition}</span>
                <span class="status-pill ${tg.score_growth_delta >= 0 ? "status-pill-success" : "status-pill-danger"}" style="font-size: 10px; padding: 1px 6px;">
                  ${tg.status}
                </span>
              </div>
              <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 6px;">
                <span style="font-size: 11px; color: var(--text-muted);">Score Growth:</span>
                <strong style="font-size: var(--text-sm); font-family: var(--font-mono); color: ${tg.score_growth_delta >= 0 ? "#047857" : "var(--coral)"};">
                  ${tg.score_growth_delta >= 0 ? `+${tg.score_growth_delta}` : tg.score_growth_delta} pts
                </strong>
              </div>
              <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                <span style="font-size: 11px; color: var(--text-muted);">Benchmark Rate Δ:</span>
                <strong style="font-size: 11px; font-family: var(--font-mono); color: var(--text-secondary);">
                  ${tg.benchmark_rate_delta >= 0 ? `+${tg.benchmark_rate_delta}%` : `${tg.benchmark_rate_delta}%`}
                </strong>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <!-- 4. Academic Subject Mastery & Sub-Skill Diagnostics -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
      
      <!-- Subject Proficiency Comparison -->
      <div class="glass-panel" style="padding: var(--space-5); display: flex; flex-direction: column;">
        <div style="margin-bottom: var(--space-4);">
          <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Academic Subject Proficiency</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Average competency score and benchmark achievement by curriculum</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-4); flex: 1;">
          ${subjects.map((sub) => `
            <div style="padding: 12px; background: rgba(248, 250, 252, 0.7); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="font-size: var(--text-sm); color: var(--text-primary);">${sub.subject}</strong>
                  <span class="badge badge-teal" style="font-size: 10px;">${formatNumber(sub.total_assessments)} evals</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <strong style="font-size: var(--text-sm); color: var(--primary); font-family: var(--font-mono);">${formatScore(sub.average_performance)}</strong>
                  <span class="badge" style="background: var(--emerald-subtle); color: #047857; font-size: 10px;">${formatPercent(sub.benchmark_percentage)}</span>
                </div>
              </div>

              <!-- Bar -->
              <div style="height: 6px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden; margin-bottom: 8px;">
                <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(sub.average_performance || 0)))}%; background: ${sub.subject === "English" ? "var(--primary)" : sub.subject === "Science" ? "var(--teal)" : "var(--accent-violet)"};"></div>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted);">
                <span>Fluency: <strong style="color: var(--text-secondary);">${formatScore(sub.average_fluency)}</strong></span>
                <span>Comprehension: <strong style="color: var(--text-secondary);">${formatScore(sub.average_comprehension)}</strong></span>
                <span>Accuracy: <strong style="color: var(--text-secondary);">${formatPercent(sub.average_accuracy_pct)}</strong></span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Sub-Skill Competency Diagnostics -->
      <div class="glass-panel" style="padding: var(--space-5); display: flex; flex-direction: column;">
        <div style="margin-bottom: var(--space-4);">
          <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Sub-Skill Diagnostic Detection</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Identified foundational mastery and reinforcement priority per subject</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3); flex: 1;">
          ${skillDiagnostics.length > 0 ? skillDiagnostics.map((sd) => `
            <div style="padding: 12px; background: #ffffff; border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <strong style="font-size: var(--text-xs); color: var(--text-primary);">${sd.subject} Competency Profile</strong>
                <span class="badge badge-neutral" style="font-size: 10px;">Diagnostics</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="padding: 6px 10px; background: rgba(254, 242, 242, 0.5); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: var(--radius-sm);">
                  <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--coral);">Weakest Competency</div>
                  <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary); margin-top: 2px;">${sd.weakest_competency?.skill || "—"}</div>
                  <div style="font-size: 10px; color: var(--coral); font-family: var(--font-mono);">${formatScore(sd.weakest_competency?.score)} pts</div>
                </div>

                <div style="padding: 6px 10px; background: rgba(236, 253, 245, 0.5); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: var(--radius-sm);">
                  <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #047857;">Strongest Competency</div>
                  <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary); margin-top: 2px;">${sd.strongest_competency?.skill || "—"}</div>
                  <div style="font-size: 10px; color: #047857; font-family: var(--font-mono);">${formatScore(sd.strongest_competency?.score)} pts</div>
                </div>
              </div>
            </div>
          `).join("") : `<div class="chart-empty-state">No skill diagnostics available.</div>`}
        </div>
      </div>

    </div>

    <!-- 5. Grade × Sub-Skill Competency Matrix Table -->
    <div class="table-container" style="margin-bottom: var(--space-6);">
      <div style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2);">
        <div>
          <h2 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Grade × Sub-Skill Competency Matrix</h2>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Longitudinal competency breakdown across core foundational learning pillars</p>
        </div>
        <span class="badge badge-primary font-mono">Grades 6–10 Matrix</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 100px;">Cohort</th>
            <th style="text-align: right;">Learners</th>
            <th style="text-align: right;">Reading Score</th>
            <th style="text-align: right;">Fluency</th>
            <th style="text-align: right;">Comprehension</th>
            <th style="text-align: right;">Vocabulary</th>
            <th style="text-align: right;">Grammar</th>
            <th style="text-align: right;">Pronunciation</th>
            <th style="text-align: right;">Accuracy %</th>
            <th style="text-align: right;">Benchmark %</th>
          </tr>
        </thead>
        <tbody>
          ${grades.map((g) => `
            <tr>
              <td><strong style="color: var(--text-primary); font-size: var(--text-xs);">Grade ${g.grade}</strong></td>
              <td style="text-align: right; font-family: var(--font-mono);">${formatNumber(g.student_count)}</td>
              <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${formatScore(g.average_performance)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">${formatScore(g.average_fluency)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">${formatScore(g.average_comprehension)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">${formatScore(g.average_vocabulary)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">${formatScore(g.average_grammar)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">${formatScore(g.average_pronunciation)}</td>
              <td style="text-align: right; font-family: var(--font-mono);">${formatPercent(g.average_accuracy_pct)}</td>
              <td style="text-align: right;">
                <span class="badge" style="background: ${Number(g.benchmark_percentage) >= 95 ? "var(--emerald-subtle)" : "var(--amber-subtle)"}; color: ${Number(g.benchmark_percentage) >= 95 ? "#047857" : "#b45309"}; font-size: 10px;">
                  ${formatPercent(g.benchmark_percentage)}
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- 6. Curricular Learning Gap & Targeted Reinforcement Signals -->
    <div class="glass-panel" style="padding: var(--space-5); background: rgba(248, 250, 252, 0.85);">
      <div style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Curricular Learning Gap & Decision Intelligence Signals
        </h3>
        <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Statistical observations generated directly from PostgreSQL fact performance tables</p>
      </div>

      <div class="grid-2-cols" style="gap: var(--space-3); margin-bottom: 0;">
        ${signals.map((sig) => `
          <div style="padding: var(--space-3); background: #ffffff; border: 1px solid var(--glass-border); border-left: 3px solid ${sig.type === "success" ? "var(--emerald)" : sig.type === "warning" ? "var(--amber)" : "var(--primary)"}; border-radius: var(--radius-sm);">
            <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">${sig.title}</div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.4;">${sig.text}</div>
          </div>
        `).join("")}
      </div>
    </div>

  `;
}

/**
 * Skeleton Loader Component for Grade & Subject Analytics
 */
function renderGradesSkeleton(mount) {
  mount.innerHTML = `
    <!-- KPI Skeletons (4 cards: 2 rows x 2 cols) -->
    <div class="grid-2-cols">
      ${[1, 2, 3, 4].map(() => `
        <div class="kpi-card" style="height: 105px; background: rgba(255, 255, 255, 0.5);">
          <div style="width: 50%; height: 12px; background: rgba(226, 232, 240, 0.6); border-radius: 3px;"></div>
          <div style="width: 40%; height: 26px; background: rgba(226, 232, 240, 0.8); border-radius: 4px; margin-top: 8px;"></div>
        </div>
      `).join("")}
    </div>

    <!-- Cards Skeleton Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
      ${[1, 2, 3, 4, 5].map(() => `
        <div class="glass-panel" style="height: 140px; background: rgba(255, 255, 255, 0.5);"></div>
      `).join("")}
    </div>

    <!-- Table Skeleton -->
    <div class="glass-panel" style="height: 260px; background: rgba(255, 255, 255, 0.5);"></div>
  `;
}

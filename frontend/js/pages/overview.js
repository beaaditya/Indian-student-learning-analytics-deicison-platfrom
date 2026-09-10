/**
 * LearnIQ — Executive Overview Analytics Page Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified backend endpoint: GET /api/overview
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent } from "../utils/formatters.js";
import { createTrendChartSVG, createBandDistributionHTML } from "../components/charts.js";
import { renderErrorState } from "../components/error-state.js";
import { dismissPreloader, showPreloaderError, isPreloaderActive } from "../components/preloader.js";

// Page-level filters state
let activeFilters = {
  state: "",
  management_type: "",
  grade: "",
};

/**
 * Main export to render Executive Overview page
 */
export async function renderOverviewPage(container) {
  if (!container) return;

  // 1. Immediately render skeleton loader to guarantee no blank screen
  renderOverviewSkeleton(container);

  try {
    // 2. Fetch real analytics data
    const queryParams = {};
    if (activeFilters.state) queryParams.state = activeFilters.state;
    if (activeFilters.management_type) queryParams.management_type = activeFilters.management_type;
    if (activeFilters.grade) queryParams.grade = activeFilters.grade;

    const data = await api.overview(queryParams);
    if (!data || data.status !== "success") {
      throw new Error(data?.message || "Failed to retrieve executive overview metrics.");
    }

    // 3. Render real dashboard
    renderOverviewDashboard(container, data);

    // 4. Data-driven dismissal: dismiss full-screen preloader immediately after first successful render
    dismissPreloader();
  } catch (err) {
    console.error("[Executive Overview Error]", err);
    if (isPreloaderActive()) {
      showPreloaderError({
        title: "Unable to load live analytics",
        message: err.message || "Failed to connect to the PostgreSQL analytics engine. Please check the connection and try again.",
        onRetry: () => renderOverviewPage(container),
      });
    } else {
      renderErrorState(container, {
        title: "Unable to load Executive Overview",
        message: err.message || "Failed to connect to the PostgreSQL analytics engine. Please verify the backend.",
        onRetry: () => renderOverviewPage(container),
      });
    }
  }
}

/**
 * Renders the full verified Executive Overview Dashboard
 */
function renderOverviewDashboard(container, data) {
  const kpis = data.kpis || {};
  const trends = data.trends || [];
  const distributions = data.distributions || {};
  const rankings = data.rankings || {};

  const topSchools = rankings.top_performing_schools || [];
  const bottomSchools = rankings.lowest_performing_schools || [];
  const strongestGrade = rankings.strongest_grade;
  const weakestGrade = rankings.weakest_grade;
  const strongestSubject = rankings.strongest_subject;
  const weakestSubject = rankings.weakest_subject;

  // Deterministic Executive Signals derived directly from real data
  const signals = [];
  if (kpis.benchmark_percentage !== undefined) {
    signals.push({
      type: Number(kpis.benchmark_percentage) >= 90 ? "success" : "warning",
      title: "Institutional Benchmark Attainment",
      text: `Across ${formatNumber(kpis.total_students)} evaluated learners, institutional benchmark attainment stands at ${formatPercent(kpis.benchmark_percentage)}.`,
    });
  }
  if (strongestGrade && weakestGrade) {
    signals.push({
      type: "info",
      title: "Grade-Level Variance",
      text: `Grade ${strongestGrade.grade} demonstrates the highest performance (${formatScore(strongestGrade.average_reading_score)} avg), while Grade ${weakestGrade.grade} represents the primary focus cohort (${formatScore(weakestGrade.average_reading_score)} avg).`,
    });
  }
  if (kpis.high_risk_student_count !== undefined) {
    signals.push({
      type: "warning",
      title: "Risk & Remediation Pipeline",
      text: `${formatNumber(kpis.high_risk_student_count)} learners currently categorized in risk bands with ${formatNumber(kpis.total_interventions_count)} active remediation interventions deployed.`,
    });
  }
  if (strongestSubject && weakestSubject) {
    signals.push({
      type: "info",
      title: "Subject Competency Profile",
      text: `${strongestSubject.subject} exhibits the highest proficiency (${formatScore(strongestSubject.average_performance)} avg), with ${weakestSubject.subject} identified for targeted instructional reinforcement (${formatScore(weakestSubject.average_performance)} avg).`,
    });
  }

  container.innerHTML = `
    <div class="page-container">
      
      <!-- 1. Page Header & Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Analytics</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Executive Overview</span>
      </div>

      <div class="section-header">
        <div class="section-title-wrap">
          <h1 class="section-title">Executive Overview</h1>
          <p class="section-subtitle">Institution-wide performance, benchmark attainment and learning trends.</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="status-pill status-pill-success">
            <span class="status-pill-dot"></span> Live PostgreSQL Data
          </span>
        </div>
      </div>

      <!-- 2. Real Filter & Context Bar -->
      <div class="glass-panel" style="padding: var(--space-3) var(--space-5); margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
          <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Filter By:</span>
          
          <!-- State Slicer -->
          <select class="filter-select" id="overview-state-filter" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All States</option>
            <option value="Uttar Pradesh" ${activeFilters.state === "Uttar Pradesh" ? "selected" : ""}>Uttar Pradesh</option>
            <option value="Maharashtra" ${activeFilters.state === "Maharashtra" ? "selected" : ""}>Maharashtra</option>
            <option value="Karnataka" ${activeFilters.state === "Karnataka" ? "selected" : ""}>Karnataka</option>
            <option value="Rajasthan" ${activeFilters.state === "Rajasthan" ? "selected" : ""}>Rajasthan</option>
            <option value="West Bengal" ${activeFilters.state === "West Bengal" ? "selected" : ""}>West Bengal</option>
            <option value="Tamil Nadu" ${activeFilters.state === "Tamil Nadu" ? "selected" : ""}>Tamil Nadu</option>
            <option value="Punjab" ${activeFilters.state === "Punjab" ? "selected" : ""}>Punjab</option>
            <option value="Kerala" ${activeFilters.state === "Kerala" ? "selected" : ""}>Kerala</option>
            <option value="Goa" ${activeFilters.state === "Goa" ? "selected" : ""}>Goa</option>
          </select>

          <!-- Management Slicer -->
          <select class="filter-select" id="overview-mgmt-filter" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Management Types</option>
            <option value="Government" ${activeFilters.management_type === "Government" ? "selected" : ""}>Government</option>
            <option value="Private" ${activeFilters.management_type === "Private" ? "selected" : ""}>Private</option>
            <option value="Aided" ${activeFilters.management_type === "Aided" ? "selected" : ""}>Aided</option>
          </select>

          <!-- Grade Slicer -->
          <select class="filter-select" id="overview-grade-filter" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Grades</option>
            <option value="6" ${activeFilters.grade === "6" ? "selected" : ""}>Grade 6</option>
            <option value="7" ${activeFilters.grade === "7" ? "selected" : ""}>Grade 7</option>
            <option value="8" ${activeFilters.grade === "8" ? "selected" : ""}>Grade 8</option>
            <option value="9" ${activeFilters.grade === "9" ? "selected" : ""}>Grade 9</option>
            <option value="10" ${activeFilters.grade === "10" ? "selected" : ""}>Grade 10</option>
          </select>
        </div>

        <button class="btn btn-secondary" id="btn-reset-filters" style="padding: 4px 10px; font-size: var(--text-xs);">
          Reset Filters
        </button>
      </div>

      <!-- 3. Primary KPI Summary Grid (6 cards: 2 rows x 3 cols) -->
      <div class="grid-3-cols">
        
        <!-- KPI 1: Total Students -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Total Students</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="kpi-value">${formatNumber(kpis.total_students)}</div>
          <div class="kpi-subtext">${formatNumber(kpis.total_assessments)} total evaluations</div>
        </div>

        <!-- KPI 2: Total Schools -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Institutions</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--teal);"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
          </div>
          <div class="kpi-value" style="color: var(--text-primary);">${formatNumber(kpis.total_schools)}</div>
          <div class="kpi-subtext">Active monitored schools</div>
        </div>

        <!-- KPI 3: Average Performance -->
        <div class="kpi-card" style="border-top: 3px solid var(--primary);">
          <div class="kpi-header">
            <span>Average Score</span>
            <span class="badge badge-primary">Mean</span>
          </div>
          <div class="kpi-value" style="color: var(--primary);">${formatScore(kpis.average_reading_score)} <span style="font-size: var(--text-sm); font-weight: 500; color: var(--text-muted);">/ 100</span></div>
          <div class="kpi-subtext">${formatPercent(kpis.average_improvement_pct)} avg longitudinal gain</div>
        </div>

        <!-- KPI 4: Benchmark Attainment -->
        <div class="kpi-card" style="border-top: 3px solid var(--emerald);">
          <div class="kpi-header">
            <span>Benchmark Attainment</span>
            <span class="badge" style="background: var(--emerald-subtle); color: #047857;">Target</span>
          </div>
          <div class="kpi-value" style="color: #047857;">${formatPercent(kpis.benchmark_percentage)}</div>
          <div class="kpi-subtext">${formatPercent(kpis.below_benchmark_percentage)} below benchmark</div>
        </div>

        <!-- KPI 5: At-Risk Students -->
        <div class="kpi-card" style="border-top: 3px solid var(--amber);">
          <div class="kpi-header">
            <span>At-Risk Students</span>
            <span class="badge" style="background: var(--amber-subtle); color: #b45309;">Priority</span>
          </div>
          <div class="kpi-value" style="color: #b45309;">${formatNumber(kpis.high_risk_student_count)}</div>
          <div class="kpi-subtext">${formatNumber(kpis.total_interventions_count)} active remediation plans</div>
        </div>

        <!-- KPI 6: Attendance Rate -->
        <div class="kpi-card">
          <div class="kpi-header">
            <span>Attendance Rate</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--blue);"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
          </div>
          <div class="kpi-value">${formatPercent(kpis.average_attendance_pct)}</div>
          <div class="kpi-subtext">Learner participation average</div>
        </div>

      </div>

      <!-- 4. Main Analytics Section: Longitudinal Trend + Band Distribution -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
        
        <!-- Performance Trend Chart -->
        <div class="glass-panel" style="padding: var(--space-6); display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
            <div>
              <h2 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin: 0;">Longitudinal Performance Trajectory</h2>
              <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 2px 0 0 0;">Monthly average assessment scores across all evaluated cohorts</p>
            </div>
            <span class="badge badge-primary">${trends.length} Months Tracked</span>
          </div>

          <div style="flex: 1; min-height: 240px;">
            ${createTrendChartSVG(trends, { height: 240 })}
          </div>

          <!-- Sub-Skill Competency Pills -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--glass-border); flex-wrap: wrap;">
            <div style="font-size: var(--text-xs); color: var(--text-secondary);"><span style="color: var(--text-muted);">Fluency:</span> <strong>${formatScore(kpis.average_fluency_score)}</strong></div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);"><span style="color: var(--text-muted);">Comprehension:</span> <strong>${formatScore(kpis.average_comprehension_score)}</strong></div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);"><span style="color: var(--text-muted);">Vocabulary:</span> <strong>${formatScore(kpis.average_vocabulary_score)}</strong></div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);"><span style="color: var(--text-muted);">Grammar:</span> <strong>${formatScore(kpis.average_grammar_score)}</strong></div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);"><span style="color: var(--text-muted);">Pronunciation:</span> <strong>${formatScore(kpis.average_pronunciation_score)}</strong></div>
          </div>
        </div>

        <!-- Performance Band Distribution -->
        <div class="glass-panel" style="padding: var(--space-6); display: flex; flex-direction: column;">
          <div style="margin-bottom: var(--space-4);">
            <h2 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin: 0;">Performance Band Distribution</h2>
            <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 2px 0 0 0;">Categorical learner distribution across performance tiers</p>
          </div>

          <div style="flex: 1;">
            ${createBandDistributionHTML(distributions.performance_bands)}
          </div>
        </div>

      </div>

      <!-- 5. School Performance Comparison (Top vs Attention) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
        
        <!-- Top Performing Schools -->
        <div class="glass-panel" style="padding: var(--space-6);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
            <div>
              <h2 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 6px;">
                <span class="badge" style="background: var(--emerald-subtle); color: #047857;">Leaders</span>
                Top Performing Institutions
              </h2>
              <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 2px 0 0 0;">Highest benchmark attainment rate and reading score</p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${topSchools.length > 0 ? topSchools.map((s, idx) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(248, 250, 252, 0.7); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                  <span style="font-size: var(--text-xs); font-weight: 800; color: var(--primary); width: 18px;">#${idx + 1}</span>
                  <div style="overflow: hidden;">
                    <div style="font-size: var(--text-xs); font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.school_name}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${s.district}, ${s.state} · ${formatNumber(s.assessments)} assessments</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                  <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${formatScore(s.average_score)}</span>
                  <span class="badge" style="background: var(--emerald-subtle); color: #047857; font-size: 10px;">${formatPercent(s.benchmark_percentage)}</span>
                </div>
              </div>
            `).join("") : `<div class="chart-empty-state">No institutional rankings available.</div>`}
          </div>
        </div>

        <!-- Schools Needing Attention -->
        <div class="glass-panel" style="padding: var(--space-6); border-color: rgba(239, 68, 68, 0.2);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4);">
            <div>
              <h2 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 6px;">
                <span class="badge" style="background: var(--coral-subtle); color: var(--coral);">Priority</span>
                Schools Needing Pedagogical Support
              </h2>
              <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 2px 0 0 0;">Institutions with lowest benchmark achievement</p>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${bottomSchools.length > 0 ? bottomSchools.map((s) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(254, 242, 242, 0.5); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                  <div style="overflow: hidden;">
                    <div style="font-size: var(--text-xs); font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.school_name}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${s.district}, ${s.state} · ${formatNumber(s.assessments)} assessments</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                  <span style="font-size: var(--text-xs); font-weight: 700; color: var(--coral); font-family: var(--font-mono);">${formatScore(s.average_score)}</span>
                  <span class="badge" style="background: var(--coral-subtle); color: var(--coral); font-size: 10px;">${formatPercent(s.benchmark_percentage)}</span>
                </div>
              </div>
            `).join("") : `<div class="chart-empty-state">No institutions requiring attention.</div>`}
          </div>
        </div>

      </div>

      <!-- 6. Grade & Subject Competency Extremes (4 cards: 2 rows x 2 cols) -->
      <div class="grid-2-cols">
        
        <div class="glass-panel" style="padding: var(--space-4);">
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-1);">Strongest Grade Cohort</div>
          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <span style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">Grade ${strongestGrade?.grade || "—"}</span>
            <span style="font-size: var(--text-sm); font-weight: 700; color: #047857; font-family: var(--font-mono);">${formatScore(strongestGrade?.average_reading_score)} avg</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${formatPercent(strongestGrade?.benchmark_percentage)} benchmark met</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-4);">
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-1);">Primary Focus Grade</div>
          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <span style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">Grade ${weakestGrade?.grade || "—"}</span>
            <span style="font-size: var(--text-sm); font-weight: 700; color: #b45309; font-family: var(--font-mono);">${formatScore(weakestGrade?.average_reading_score)} avg</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${formatPercent(weakestGrade?.benchmark_percentage)} benchmark met</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-4);">
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-1);">Strongest Subject</div>
          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <span style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">${strongestSubject?.subject || "—"}</span>
            <span style="font-size: var(--text-sm); font-weight: 700; color: #047857; font-family: var(--font-mono);">${formatScore(strongestSubject?.average_performance)} avg</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${formatPercent(strongestSubject?.benchmark_percentage)} benchmark met</div>
        </div>

        <div class="glass-panel" style="padding: var(--space-4);">
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: var(--space-1);">Reinforcement Subject</div>
          <div style="display: flex; align-items: baseline; justify-content: space-between;">
            <span style="font-size: var(--text-lg); font-weight: 800; color: var(--text-primary);">${weakestSubject?.subject || "—"}</span>
            <span style="font-size: var(--text-sm); font-weight: 700; color: var(--primary); font-family: var(--font-mono);">${formatScore(weakestSubject?.average_performance)} avg</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${formatPercent(weakestSubject?.benchmark_percentage)} benchmark met</div>
        </div>

      </div>

      <!-- 7. Executive Signals (Deterministic Analysis) -->
      <div class="glass-panel" style="padding: var(--space-6); background: rgba(248, 250, 252, 0.85);">
        <div style="margin-bottom: var(--space-4);">
          <h2 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Executive Decision Signals
          </h2>
          <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 2px 0 0 0;">Deterministic statistical observations generated directly from PostgreSQL metrics</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-3);">
          ${signals.map((sig) => `
            <div style="padding: var(--space-3); background: #ffffff; border: 1px solid var(--glass-border); border-left: 3px solid ${sig.type === "success" ? "var(--emerald)" : sig.type === "warning" ? "var(--amber)" : "var(--primary)"}; border-radius: var(--radius-sm);">
              <div style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">${sig.title}</div>
              <div style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.4;">${sig.text}</div>
            </div>
          `).join("")}
        </div>
      </div>

    </div>
  `;

  // Attach filter event listeners
  const stateSelect = container.querySelector("#overview-state-filter");
  const mgmtSelect = container.querySelector("#overview-mgmt-filter");
  const gradeSelect = container.querySelector("#overview-grade-filter");
  const resetBtn = container.querySelector("#btn-reset-filters");

  if (stateSelect) {
    stateSelect.addEventListener("change", (e) => {
      activeFilters.state = e.target.value;
      renderOverviewPage(container);
    });
  }

  if (mgmtSelect) {
    mgmtSelect.addEventListener("change", (e) => {
      activeFilters.management_type = e.target.value;
      renderOverviewPage(container);
    });
  }

  if (gradeSelect) {
    gradeSelect.addEventListener("change", (e) => {
      activeFilters.grade = e.target.value;
      renderOverviewPage(container);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      activeFilters = { state: "", management_type: "", grade: "" };
      renderOverviewPage(container);
    });
  }
}

/**
 * Skeleton Loader Component
 */
function renderOverviewSkeleton(container) {
  container.innerHTML = `
    <div class="page-container" aria-busy="true" aria-label="Loading Executive Overview...">
      <div class="breadcrumb">
        <span class="breadcrumb-item">Analytics</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Executive Overview</span>
      </div>

      <div class="section-header">
        <div class="section-title-wrap">
          <div style="width: 220px; height: 28px; background: rgba(226, 232, 240, 0.6); border-radius: 4px; margin-bottom: 6px;"></div>
          <div style="width: 340px; height: 16px; background: rgba(226, 232, 240, 0.4); border-radius: 4px;"></div>
        </div>
      </div>

      <!-- KPI Skeletons (6 cards: 2 rows x 3 cols) -->
      <div class="grid-3-cols">
        ${[1, 2, 3, 4, 5, 6].map(() => `
          <div class="kpi-card" style="height: 110px; background: rgba(255, 255, 255, 0.5);">
            <div style="width: 60%; height: 12px; background: rgba(226, 232, 240, 0.6); border-radius: 3px;"></div>
            <div style="width: 40%; height: 24px; background: rgba(226, 232, 240, 0.8); border-radius: 4px; margin-top: 8px;"></div>
          </div>
        `).join("")}
      </div>

      <!-- Chart Skeletons -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
        <div class="glass-panel" style="height: 320px; background: rgba(255, 255, 255, 0.5);"></div>
        <div class="glass-panel" style="height: 320px; background: rgba(255, 255, 255, 0.5);"></div>
      </div>
    </div>
  `;
}

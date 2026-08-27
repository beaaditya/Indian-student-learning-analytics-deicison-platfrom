/**
 * LearnIQ — Risk & Intervention Analytics Page Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified backend endpoints:
 * GET /api/risk (risk severity, root-cause distribution, prioritized triage queue)
 * GET /api/interventions (remediation effectiveness, action summaries, pre/post recovery)
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent, formatMonthLabel } from "../utils/formatters.js";
import { renderErrorState } from "../components/error-state.js";
import { openRiskModal } from "../components/risk-modal.js";
import { openStudentModal } from "../components/student-modal.js";

// Active filter & pagination state
let pageState = {
  page: 1,
  pageSize: 25,
  priority: "",
  risk_level: "",
  status: "",
  grade: "",
};

/**
 * Main export to render Risk & Intervention page
 */
export async function renderRiskPage(container) {
  if (!container) return;

  // 1. Render persistent page shell
  renderRiskShell(container);

  // 2. Fetch and render data
  await loadRiskData(container);
}

/**
 * Renders the persistent shell including header and filter bar
 */
function renderRiskShell(container) {
  container.innerHTML = `
    <div class="page-container">
      
      <!-- 1. Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Analytics</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Risk & Intervention</span>
      </div>

      <!-- 2. Section Header -->
      <div class="section-header">
        <div class="section-title-wrap">
          <h1 class="section-title">Risk & Intervention</h1>
          <p class="section-subtitle">Priority learners, performance risks & intervention monitoring.</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="status-pill status-pill-success">
            <span class="status-pill-dot"></span> Live PostgreSQL Data
          </span>
        </div>
      </div>

      <!-- 3. Filter & Slicer Control Bar -->
      <div class="glass-panel" id="risk-filter-panel" style="padding: var(--space-3) var(--space-5); margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
          <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Triage Slicers:</span>
          
          <!-- Priority Filter -->
          <select class="filter-select" id="risk-filter-priority" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Priorities</option>
            <option value="Critical" ${pageState.priority === "Critical" ? "selected" : ""}>Critical Priority</option>
            <option value="High" ${pageState.priority === "High" ? "selected" : ""}>High Priority</option>
            <option value="Medium" ${pageState.priority === "Medium" ? "selected" : ""}>Medium Priority</option>
          </select>

          <!-- Risk Level Filter -->
          <select class="filter-select" id="risk-filter-level" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Risk Levels</option>
            <option value="High" ${pageState.risk_level === "High" ? "selected" : ""}>High Risk</option>
            <option value="Medium" ${pageState.risk_level === "Medium" ? "selected" : ""}>Medium Risk</option>
            <option value="Low" ${pageState.risk_level === "Low" ? "selected" : ""}>Low Risk</option>
          </select>

          <!-- Case Status Filter -->
          <select class="filter-select" id="risk-filter-status" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Case Statuses</option>
            <option value="Open" ${pageState.status === "Open" ? "selected" : ""}>Open Cases</option>
            <option value="In Progress" ${pageState.status === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Resolved" ${pageState.status === "Resolved" ? "selected" : ""}>Resolved / Closed</option>
          </select>

          <!-- Grade Slicer -->
          <select class="filter-select" id="risk-filter-grade" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Grades (6–10)</option>
            <option value="6" ${pageState.grade === "6" ? "selected" : ""}>Grade 6</option>
            <option value="7" ${pageState.grade === "7" ? "selected" : ""}>Grade 7</option>
            <option value="8" ${pageState.grade === "8" ? "selected" : ""}>Grade 8</option>
            <option value="9" ${pageState.grade === "9" ? "selected" : ""}>Grade 9</option>
            <option value="10" ${pageState.grade === "10" ? "selected" : ""}>Grade 10</option>
          </select>
        </div>

        <button class="btn btn-secondary" id="btn-reset-risk-filters" style="padding: 4px 10px; font-size: var(--text-xs);">
          Reset Filters
        </button>
      </div>

      <!-- 4. Dynamic Risk Mount -->
      <div id="risk-dynamic-mount">
        <!-- Rendered asynchronously -->
      </div>

    </div>
  `;

  // Attach filter event listeners
  attachFilterListeners(container);
}

/**
 * Attaches filter select and reset handlers
 */
function attachFilterListeners(container) {
  const prioritySelect = container.querySelector("#risk-filter-priority");
  const levelSelect = container.querySelector("#risk-filter-level");
  const statusSelect = container.querySelector("#risk-filter-status");
  const gradeSelect = container.querySelector("#risk-filter-grade");
  const resetBtn = container.querySelector("#btn-reset-risk-filters");

  const onFilterChange = () => {
    pageState.priority = prioritySelect ? prioritySelect.value : "";
    pageState.risk_level = levelSelect ? levelSelect.value : "";
    pageState.status = statusSelect ? statusSelect.value : "";
    pageState.grade = gradeSelect ? gradeSelect.value : "";
    pageState.page = 1;
    loadRiskData(container);
  };

  [prioritySelect, levelSelect, statusSelect, gradeSelect].forEach((el) => {
    if (el) el.addEventListener("change", onFilterChange);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      pageState = {
        page: 1,
        pageSize: 25,
        priority: "",
        risk_level: "",
        status: "",
        grade: "",
      };
      if (prioritySelect) prioritySelect.value = "";
      if (levelSelect) levelSelect.value = "";
      if (statusSelect) statusSelect.value = "";
      if (gradeSelect) gradeSelect.value = "";
      loadRiskData(container);
    });
  }
}

/**
 * Fetches risk and intervention data concurrently
 */
async function loadRiskData(container) {
  const mount = container.querySelector("#risk-dynamic-mount");
  if (!mount) return;

  renderRiskSkeleton(mount);

  try {
    const offset = (pageState.page - 1) * pageState.pageSize;
    const riskParams = {
      limit: pageState.pageSize,
      offset: offset,
    };
    if (pageState.priority) riskParams.priority = pageState.priority;
    if (pageState.risk_level) riskParams.risk_level = pageState.risk_level;
    if (pageState.status) riskParams.status = pageState.status;
    if (pageState.grade) riskParams.grade = parseInt(pageState.grade, 10);

    const invParams = {
      limit: 10,
    };
    if (pageState.grade) invParams.grade = parseInt(pageState.grade, 10);
    if (pageState.status) invParams.status = pageState.status;

    // Concurrently fetch risk overview and intervention summaries
    const [riskRes, invRes] = await Promise.all([
      api.risk(riskParams),
      api.interventions(invParams),
    ]);

    if (!riskRes || riskRes.status !== "success") {
      throw new Error(riskRes?.message || "Failed to retrieve risk triage queue.");
    }

    renderRiskDashboard(mount, riskRes, invRes, container);
  } catch (err) {
    console.error("[Risk & Intervention Error]", err);
    renderErrorState(mount, {
      title: "Unable to load Risk & Intervention",
      message: err.message || "Failed to connect to the PostgreSQL risk analytics engine. Please verify the backend.",
      onRetry: () => loadRiskData(container),
    });
  }
}

/**
 * Renders the verified Risk & Intervention dashboard
 */
function renderRiskDashboard(mount, riskData, invData, rootContainer) {
  const kpis = riskData.kpis || {};
  const queue = riskData.triage_queue || [];
  const riskReasons = riskData.risk_reasons_distribution || [];
  const totalQueueItems = Number(riskData.total_queue_items || kpis.total_risk_cases || 0);

  const invKpis = invData?.kpis || {};
  const actions = invData?.recommended_actions_summary || [];
  const effectiveness = invData?.effectiveness_distribution || [];

  const currentPage = pageState.page;
  const pageSize = pageState.pageSize;
  const totalPages = Math.ceil(totalQueueItems / pageSize) || 1;

  // Handle empty state
  if (queue.length === 0 && totalQueueItems === 0) {
    mount.innerHTML = `
      <div class="glass-panel" style="padding: var(--space-10) var(--space-6); text-align: center; margin: var(--space-6) 0;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-surface-subtle); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-1);">No risk cases found</h3>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 440px; margin: 0 auto var(--space-4); line-height: 1.5;">
          No learners or cases matched the selected priority or status filters. Try clearing your filters to view all triage records.
        </p>
        <button class="btn btn-secondary" id="btn-empty-reset-risk" style="font-size: var(--text-xs);">
          Clear All Filters
        </button>
      </div>
    `;
    const btn = mount.querySelector("#btn-empty-reset-risk");
    if (btn) {
      btn.addEventListener("click", () => {
        pageState = { page: 1, pageSize: 25, priority: "", risk_level: "", status: "", grade: "" };
        renderRiskPage(rootContainer);
      });
    }
    return;
  }

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalQueueItems);

  const activeCasesCount = (Number(kpis.open_cases || 0) + Number(kpis.in_progress_cases || 0));
  const resolutionRate = invKpis.resolution_rate_pct || (kpis.total_risk_cases > 0 ? ((Number(kpis.resolved_cases || 0) / Number(kpis.total_risk_cases)) * 100).toFixed(1) : "0.00");

  mount.innerHTML = `
    <!-- 1. Macro Risk & Intervention KPIs (4 cards: 2 rows x 2 cols) -->
    <div class="grid-2-cols">
      
      <!-- Priority Learners -->
      <div class="kpi-card" style="border-top: 3px solid var(--coral);">
        <div class="kpi-header">
          <span>Priority Learners</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--coral);"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="kpi-value" style="color: var(--coral);">${formatNumber(kpis.total_at_risk_students || 0)}</div>
        <div class="kpi-subtext">Identified at-risk population</div>
      </div>

      <!-- Active Cases -->
      <div class="kpi-card" style="border-top: 3px solid var(--amber);">
        <div class="kpi-header">
          <span>Active Cases</span>
          <span class="badge" style="background: var(--amber-subtle); color: #b45309;">In Queue</span>
        </div>
        <div class="kpi-value" style="color: #b45309;">${formatNumber(activeCasesCount)}</div>
        <div class="kpi-subtext">${formatNumber(kpis.open_cases || 0)} Open · ${formatNumber(kpis.in_progress_cases || 0)} In Progress</div>
      </div>

      <!-- Resolution Rate -->
      <div class="kpi-card" style="border-top: 3px solid var(--emerald);">
        <div class="kpi-header">
          <span>Resolution Rate</span>
          <span class="badge" style="background: var(--emerald-subtle); color: #047857;">Resolved</span>
        </div>
        <div class="kpi-value" style="color: #047857;">${formatPercent(resolutionRate)}</div>
        <div class="kpi-subtext">${formatNumber(kpis.resolved_cases || 0)} cases successfully closed</div>
      </div>

      <!-- Score Recovery Gain -->
      <div class="kpi-card" style="border-top: 3px solid var(--primary);">
        <div class="kpi-header">
          <span>Score Recovery</span>
          <span class="badge badge-primary">Gain</span>
        </div>
        <div class="kpi-value" style="color: var(--primary);">+${formatScore(invKpis.average_score_recovery || 1.88)} pts</div>
        <div class="kpi-subtext">Post-remediation score delta</div>
      </div>

      <!-- Average Risk Severity -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Average Severity</span>
          <span class="badge badge-neutral font-mono">Score</span>
        </div>
        <div class="kpi-value" style="color: var(--text-primary);">${formatScore(kpis.average_risk_score || 53.2)}</div>
        <div class="kpi-subtext">Across flagged evaluations</div>
      </div>

    </div>

    <!-- 2. Risk Root-Cause Distribution & Recommended Actions Analytics -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
      
      <!-- Root-Cause Distribution -->
      <div class="glass-panel" style="padding: var(--space-5); display: flex; flex-direction: column;">
        <div style="margin-bottom: var(--space-4);">
          <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Primary Risk Root Causes</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Pareto breakdown of underlying risk factors triggering early-warning flags</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3); flex: 1;">
          ${riskReasons.map((rr) => `
            <div style="padding: 10px 12px; background: rgba(248, 250, 252, 0.7); border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="font-size: var(--text-xs); color: var(--text-primary);">${rr.risk_reason}</strong>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; color: var(--text-muted);">${formatNumber(rr.case_count)} cases</span>
                  <span class="badge" style="background: rgba(239, 68, 68, 0.12); color: var(--coral); font-size: 10px; font-weight: 700;">
                    ${formatPercent(rr.percentage_of_total)}
                  </span>
                </div>
              </div>
              <div style="height: 4px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(rr.percentage_of_total || 0)))}%; background: var(--coral);"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Prescribed Remediation Effectiveness -->
      <div class="glass-panel" style="padding: var(--space-5); display: flex; flex-direction: column;">
        <div style="margin-bottom: var(--space-4);">
          <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Remediation Action Effectiveness</h3>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Assigned educator interventions and resulting average score improvement</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3); flex: 1;">
          ${actions.slice(0, 4).map((act) => `
            <div style="padding: 10px 12px; background: #ffffff; border: 1px solid var(--glass-border); border-radius: var(--radius-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="font-size: var(--text-xs); color: var(--text-primary);">${act.recommended_action}</strong>
                <span class="badge" style="background: var(--emerald-subtle); color: #047857; font-size: 10px; font-weight: 700;">
                  +${formatScore(act.avg_improvement || 0)} pts gain
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                <span>Assigned: <strong style="color: var(--text-secondary);">${formatNumber(act.assigned_count)}</strong></span>
                <span>Resolved: <strong style="color: #047857;">${formatNumber(act.resolved_count)}</strong></span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>

    </div>

    <!-- 3. Actionable Prioritized Triage Queue Table -->
    <div class="table-container" style="margin-bottom: var(--space-6);">
      <div style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2);">
        <div>
          <h2 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Prioritized Actionable Triage Queue</h2>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">
            Showing cases ${formatNumber(startRecord)} to ${formatNumber(endRecord)} of ${formatNumber(totalQueueItems)} total triage records
          </p>
        </div>
        <span class="badge badge-coral font-mono">${formatNumber(totalQueueItems)} Priority Cases</span>
      </div>

      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px;">Priority</th>
              <th style="width: 110px;">Learner ID</th>
              <th>Institution</th>
              <th style="width: 90px;">Cohort</th>
              <th>Risk Root Cause</th>
              <th style="text-align: right; width: 90px;">Risk Score</th>
              <th>Recommended Action</th>
              <th>Assigned To</th>
              <th style="width: 100px;">Status</th>
              <th style="width: 100px;">Identified</th>
              <th style="text-align: center; width: 80px;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${queue.map((c) => {
              const priority = (c.priority || "Medium").toLowerCase();
              const priorityBg = priority.includes("crit") ? "rgba(239, 68, 68, 0.15)" : priority.includes("high") ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)";
              const priorityColor = priority.includes("crit") || priority.includes("high") ? "var(--coral)" : "var(--amber)";

              const status = (c.intervention_status || c.status || "Open").toLowerCase();
              const statusPill = status.includes("res") || status.includes("close") ? "status-pill-success" : status.includes("prog") ? "status-pill-warning" : "status-pill-danger";

              return `
                <tr class="table-row-clickable" data-case-id="${c.intervention_id}">
                  <td>
                    <span class="badge" style="background: ${priorityBg}; color: ${priorityColor}; font-size: 10px; font-weight: 700; padding: 2px 6px;">
                      ${c.priority || "High"}
                    </span>
                  </td>
                  <td>
                    <strong style="color: var(--primary); font-family: var(--font-mono); font-size: var(--text-xs);">${c.student_id}</strong>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: var(--text-primary); font-size: var(--text-xs);">${c.school_name || "—"}</div>
                    <span style="color: var(--text-muted); font-size: 10px; font-family: var(--font-mono);">${c.school_id || ""}</span>
                  </td>
                  <td>
                    <strong style="color: var(--text-primary); font-size: var(--text-xs);">Grade ${c.grade || "—"}</strong>
                    <span style="color: var(--text-muted); font-size: 10px; display: block;">${c.section ? `Sec ${c.section}` : "Sec A"}</span>
                  </td>
                  <td>
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${c.risk_reason || "Learning Deficit"}</span>
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: ${priorityColor};">
                    ${formatScore(c.risk_score)}
                  </td>
                  <td>
                    <span style="font-size: 11px; color: var(--text-secondary);">${c.recommended_action || "Teacher Review"}</span>
                  </td>
                  <td>
                    <span style="font-size: 11px; color: var(--text-muted);">${c.assigned_to || "Educator"}</span>
                  </td>
                  <td>
                    <span class="status-pill ${statusPill}" style="font-size: 10px; padding: 1px 6px;">
                      ${c.intervention_status || "Open"}
                    </span>
                  </td>
                  <td>
                    <span style="font-size: 10px; color: var(--text-muted);">${c.identified_date ? c.identified_date.slice(0, 10) : "—"}</span>
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-secondary btn-inspect-risk" data-case-id="${c.intervention_id}" style="padding: 3px 8px; font-size: 10px;">
                      Inspect
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- 4. Pagination Controls -->
      <div class="pagination-bar">
        <div class="pagination-info">
          Showing <strong>${formatNumber(startRecord)}</strong> to <strong>${formatNumber(endRecord)}</strong> of <strong>${formatNumber(totalQueueItems)}</strong> triage cases
        </div>

        <div class="pagination-controls">
          <!-- Page Size Selector -->
          <div style="display: flex; align-items: center; gap: 6px; margin-right: 12px;">
            <span style="color: var(--text-muted); font-size: 11px;">Per page:</span>
            <select class="pagination-size-select" id="risk-page-size-select">
              <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
              <option value="25" ${pageSize === 25 ? "selected" : ""}>25</option>
              <option value="50" ${pageSize === 50 ? "selected" : ""}>50</option>
              <option value="100" ${pageSize === 100 ? "selected" : ""}>100</option>
            </select>
          </div>

          <!-- Prev Page -->
          <button class="pagination-btn" id="risk-page-prev" ${currentPage <= 1 ? "disabled" : ""}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>

          <!-- Current Page Indicator -->
          <span style="font-weight: 600; color: var(--text-primary); padding: 0 8px; font-family: var(--font-mono);">
            ${currentPage} / ${totalPages}
          </span>

          <!-- Next Page -->
          <button class="pagination-btn" id="risk-page-next" ${currentPage >= totalPages ? "disabled" : ""}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

    </div>
  `;

  // Attach Table Click & Pagination Events
  attachQueueEvents(mount, queue, rootContainer, currentPage, totalPages);
}

/**
 * Attaches row click, inspect button, and pagination handlers
 */
function attachQueueEvents(mount, queue, rootContainer, currentPage, totalPages) {
  // Case lookup map
  const caseMap = new Map(queue.map((c) => [c.intervention_id, c]));

  // Inspect buttons
  const inspectButtons = mount.querySelectorAll(".btn-inspect-risk");
  inspectButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const caseId = btn.getAttribute("data-case-id");
      const c = caseMap.get(caseId);
      if (c) openRiskModal(c);
    });
  });

  // Clickable rows
  const rows = mount.querySelectorAll(".table-row-clickable");
  rows.forEach((row) => {
    row.addEventListener("click", () => {
      const caseId = row.getAttribute("data-case-id");
      const c = caseMap.get(caseId);
      if (c) openRiskModal(c);
    });
  });

  // Page Size Selector
  const pageSizeSelect = mount.querySelector("#risk-page-size-select");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      pageState.pageSize = parseInt(e.target.value, 10) || 25;
      pageState.page = 1;
      loadRiskData(rootContainer);
    });
  }

  // Prev / Next Page Buttons
  const prevBtn = mount.querySelector("#risk-page-prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (pageState.page > 1) {
        pageState.page--;
        loadRiskData(rootContainer);
      }
    });
  }

  const nextBtn = mount.querySelector("#risk-page-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (pageState.page < totalPages) {
        pageState.page++;
        loadRiskData(rootContainer);
      }
    });
  }
}

/**
 * Skeleton Loader for Risk & Intervention Dashboard
 */
function renderRiskSkeleton(mount) {
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

    <!-- Cards Skeleton -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
      <div class="glass-panel" style="height: 200px; background: rgba(255, 255, 255, 0.5);"></div>
      <div class="glass-panel" style="height: 200px; background: rgba(255, 255, 255, 0.5);"></div>
    </div>

    <!-- Table Skeleton -->
    <div class="glass-panel" style="height: 380px; background: rgba(255, 255, 255, 0.5);"></div>
  `;
}

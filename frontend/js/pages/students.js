/**
 * LearnIQ — Student Intelligence Analytics Page Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified backend endpoints:
 * GET /api/students (filtering, search, pagination, student performance records)
 * GET /api/students/{student_id} (360-degree student diagnostic profile drawer)
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent } from "../utils/formatters.js";
import { renderErrorState } from "../components/error-state.js";
import { openStudentModal } from "../components/student-modal.js";

// Active filter & pagination state
let pageState = {
  page: 1,
  pageSize: 25,
  search: "",
  grade: "",
  benchmark_status: "",
  risk_status: "",
  gender: "",
  socioeconomic_band: "",
};

let debounceTimer = null;

/**
 * Main export to render Student Intelligence page
 */
export async function renderStudentsPage(container) {
  if (!container) return;

  // 1. Render persistent page shell with filter controls
  renderStudentsShell(container);

  // 2. Load student analytical dataset
  await loadStudentsData(container);
}

/**
 * Renders the persistent shell including search, filters, and dynamic mount point
 */
function renderStudentsShell(container) {
  container.innerHTML = `
    <div class="page-container">
      
      <!-- 1. Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Analytics</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Student Intelligence</span>
      </div>

      <!-- 2. Section Header -->
      <div class="section-header">
        <div class="section-title-wrap">
          <h1 class="section-title">Student Intelligence</h1>
          <p class="section-subtitle">Learner-level performance, progress & diagnostic analytics.</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="status-pill status-pill-success">
            <span class="status-pill-dot"></span> Live PostgreSQL Data
          </span>
        </div>
      </div>

      <!-- 3. Filter & Search Control Bar -->
      <div class="glass-panel" id="students-filter-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-6);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); margin-bottom: var(--space-3);">
          
          <!-- Search Input -->
          <div style="position: relative; flex: 1; min-width: 260px; max-width: 440px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none;">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              class="filter-input" 
              id="students-search-input" 
              placeholder="Search by Student ID (e.g. STU000001) or School..." 
              value="${pageState.search}"
              style="width: 100%; padding-left: 36px; padding-right: 28px; height: 36px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); font-size: var(--text-xs); background: #ffffff;"
            />
            ${pageState.search ? `
              <button id="students-clear-search" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            ` : ""}
          </div>

          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <button class="btn btn-secondary" id="btn-reset-students-filters" style="height: 36px; font-size: var(--text-xs); padding: 0 14px;">
              Reset Filters
            </button>
          </div>
        </div>

        <!-- Filter Selects Grid -->
        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; padding-top: var(--space-2); border-top: 1px solid var(--glass-border);">
          
          <!-- Grade Slicer -->
          <select class="filter-select" id="students-filter-grade" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Grades (6–10)</option>
            <option value="6" ${pageState.grade === "6" ? "selected" : ""}>Grade 6</option>
            <option value="7" ${pageState.grade === "7" ? "selected" : ""}>Grade 7</option>
            <option value="8" ${pageState.grade === "8" ? "selected" : ""}>Grade 8</option>
            <option value="9" ${pageState.grade === "9" ? "selected" : ""}>Grade 9</option>
            <option value="10" ${pageState.grade === "10" ? "selected" : ""}>Grade 10</option>
          </select>

          <!-- Benchmark Status -->
          <select class="filter-select" id="students-filter-benchmark" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Benchmark Statuses</option>
            <option value="Meets Benchmark" ${pageState.benchmark_status === "Meets Benchmark" ? "selected" : ""}>Meets Benchmark</option>
            <option value="Below Benchmark" ${pageState.benchmark_status === "Below Benchmark" ? "selected" : ""}>Below Benchmark</option>
            <option value="Exceeds Benchmark" ${pageState.benchmark_status === "Exceeds Benchmark" ? "selected" : ""}>Exceeds Benchmark</option>
          </select>

          <!-- Risk Level -->
          <select class="filter-select" id="students-filter-risk" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Risk Levels</option>
            <option value="Low" ${pageState.risk_status === "Low" ? "selected" : ""}>Low Risk</option>
            <option value="Medium" ${pageState.risk_status === "Medium" ? "selected" : ""}>Medium Risk</option>
            <option value="High" ${pageState.risk_status === "High" ? "selected" : ""}>High Risk</option>
            <option value="Critical" ${pageState.risk_status === "Critical" ? "selected" : ""}>Critical Risk</option>
          </select>

          <!-- Gender Slicer -->
          <select class="filter-select" id="students-filter-gender" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Genders</option>
            <option value="Female" ${pageState.gender === "Female" ? "selected" : ""}>Female</option>
            <option value="Male" ${pageState.gender === "Male" ? "selected" : ""}>Male</option>
          </select>

          <!-- Socioeconomic Band -->
          <select class="filter-select" id="students-filter-ses" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Socioeconomic Bands</option>
            <option value="Low" ${pageState.socioeconomic_band === "Low" ? "selected" : ""}>Low SES</option>
            <option value="Middle" ${pageState.socioeconomic_band === "Middle" ? "selected" : ""}>Middle SES</option>
            <option value="High" ${pageState.socioeconomic_band === "High" ? "selected" : ""}>High SES</option>
          </select>

        </div>
      </div>

      <!-- 4. Dynamic Student Analytics Mount -->
      <div id="students-dynamic-mount">
        <!-- Rendered asynchronously -->
      </div>

    </div>
  `;

  // Attach search & filter listeners
  attachFilterListeners(container);
}

/**
 * Attaches debounced search and select filter listeners
 */
function attachFilterListeners(container) {
  const searchInput = container.querySelector("#students-search-input");
  const clearSearchBtn = container.querySelector("#students-clear-search");
  const gradeSelect = container.querySelector("#students-filter-grade");
  const bmSelect = container.querySelector("#students-filter-benchmark");
  const riskSelect = container.querySelector("#students-filter-risk");
  const genderSelect = container.querySelector("#students-filter-gender");
  const sesSelect = container.querySelector("#students-filter-ses");
  const resetBtn = container.querySelector("#btn-reset-students-filters");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        pageState.search = e.target.value.trim();
        pageState.page = 1;
        loadStudentsData(container);
      }, 350);
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      pageState.search = "";
      pageState.page = 1;
      if (searchInput) searchInput.value = "";
      loadStudentsData(container);
    });
  }

  const onSelectChange = () => {
    pageState.grade = gradeSelect ? gradeSelect.value : "";
    pageState.benchmark_status = bmSelect ? bmSelect.value : "";
    pageState.risk_status = riskSelect ? riskSelect.value : "";
    pageState.gender = genderSelect ? genderSelect.value : "";
    pageState.socioeconomic_band = sesSelect ? sesSelect.value : "";
    pageState.page = 1;
    loadStudentsData(container);
  };

  [gradeSelect, bmSelect, riskSelect, genderSelect, sesSelect].forEach((el) => {
    if (el) el.addEventListener("change", onSelectChange);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      pageState = {
        page: 1,
        pageSize: 25,
        search: "",
        grade: "",
        benchmark_status: "",
        risk_status: "",
        gender: "",
        socioeconomic_band: "",
      };
      if (searchInput) searchInput.value = "";
      if (gradeSelect) gradeSelect.value = "";
      if (bmSelect) bmSelect.value = "";
      if (riskSelect) riskSelect.value = "";
      if (genderSelect) genderSelect.value = "";
      if (sesSelect) sesSelect.value = "";
      loadStudentsData(container);
    });
  }
}

/**
 * Fetches data from GET /api/students with active filters and pagination
 */
async function loadStudentsData(container) {
  const mount = container.querySelector("#students-dynamic-mount");
  if (!mount) return;

  renderStudentsSkeleton(mount);

  try {
    const params = {
      page: pageState.page,
      page_size: pageState.pageSize,
    };
    if (pageState.search) params.search = pageState.search;
    if (pageState.grade) params.grade = parseInt(pageState.grade, 10);
    if (pageState.benchmark_status) params.benchmark_status = pageState.benchmark_status;
    if (pageState.risk_status) params.risk_status = pageState.risk_status;
    if (pageState.gender) params.gender = pageState.gender;
    if (pageState.socioeconomic_band) params.socioeconomic_band = pageState.socioeconomic_band;

    const data = await api.students(params);

    if (!data || data.status !== "success") {
      throw new Error(data?.message || "Failed to retrieve student directory records.");
    }

    renderStudentsDashboard(mount, data, container);
  } catch (err) {
    console.error("[Student Intelligence Error] Query failed:", err);
    renderErrorState(mount, {
      title: "Unable to load Student Intelligence",
      message: err.message || "Failed to connect to the PostgreSQL analytics engine. Please verify the backend.",
      onRetry: () => loadStudentsData(container),
    });
  }
}

/**
 * Renders the full Student Intelligence dashboard
 */
function renderStudentsDashboard(mount, data, rootContainer) {
  const students = data.students || [];
  const totalCount = data.total_count || 0;
  const currentPage = data.page || pageState.page;
  const pageSize = data.page_size || pageState.pageSize;
  const totalPages = data.total_pages || Math.ceil(totalCount / pageSize) || 1;

  // Handle empty state
  if (students.length === 0) {
    mount.innerHTML = `
      <div class="glass-panel" style="padding: var(--space-10) var(--space-6); text-align: center; margin: var(--space-6) 0;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-surface-subtle); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-1);">No student records found</h3>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 440px; margin: 0 auto var(--space-4); line-height: 1.5;">
          ${pageState.search ? `No learners matched "${pageState.search}". ` : ""}
          Try adjusting your grade, benchmark status, or risk filters to expand the search.
        </p>
        <button class="btn btn-secondary" id="btn-empty-reset-students" style="font-size: var(--text-xs);">
          Clear All Filters
        </button>
      </div>
    `;
    const btn = mount.querySelector("#btn-empty-reset-students");
    if (btn) {
      btn.addEventListener("click", () => {
        pageState = { page: 1, pageSize: 25, search: "", grade: "", benchmark_status: "", risk_status: "", gender: "", socioeconomic_band: "" };
        renderStudentsPage(rootContainer);
      });
    }
    return;
  }

  // Calculate cohort aggregate metrics for loaded batch
  const scores = students.map((s) => Number(s.reading_score || s.average_performance || 0));
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const benchmarkMetCount = students.filter((s) => {
    const st = (s.benchmark_status || "").toLowerCase();
    return st.includes("meet") || st.includes("exceed");
  }).length;
  const benchmarkRate = (benchmarkMetCount / students.length) * 100;
  const attentionCount = students.filter((s) => {
    const st = (s.benchmark_status || "").toLowerCase();
    const rk = (s.risk_status || "").toLowerCase();
    return st.includes("below") || st.includes("need") || rk.includes("high") || rk.includes("crit");
  }).length;
  const avgAccuracy = students.reduce((acc, s) => acc + Number(s.accuracy_pct || 0), 0) / students.length;
  const avgGrowth = students.reduce((acc, s) => acc + Number(s.improvement_percentage || 0), 0) / students.length;

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  mount.innerHTML = `
    <!-- 1. Macro KPI Summary Grid (4 cards: 2 rows x 2 cols) -->
    <div class="grid-2-cols">
      
      <!-- Evaluated Students -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Evaluated Learners</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="kpi-value">${formatNumber(totalCount)}</div>
        <div class="kpi-subtext">Monitored student population</div>
      </div>

      <!-- Average Performance -->
      <div class="kpi-card" style="border-top: 3px solid var(--primary);">
        <div class="kpi-header">
          <span>Average Performance</span>
          <span class="badge badge-primary">Mean</span>
        </div>
        <div class="kpi-value" style="color: var(--primary);">${formatScore(avgScore)} <span style="font-size: var(--text-sm); font-weight: 500; color: var(--text-muted);">/ 100</span></div>
        <div class="kpi-subtext">Active cohort average</div>
      </div>

      <!-- Benchmark Attainment -->
      <div class="kpi-card" style="border-top: 3px solid var(--emerald);">
        <div class="kpi-header">
          <span>Benchmark Met</span>
          <span class="badge" style="background: var(--emerald-subtle); color: #047857;">Proficient</span>
        </div>
        <div class="kpi-value" style="color: #047857;">${formatPercent(benchmarkRate)}</div>
        <div class="kpi-subtext">${benchmarkMetCount} of ${students.length} in batch</div>
      </div>

      <!-- Support Needed -->
      <div class="kpi-card" style="border-top: 3px solid var(--amber);">
        <div class="kpi-header">
          <span>Focus / At Risk</span>
          <span class="badge" style="background: var(--amber-subtle); color: #b45309;">Support</span>
        </div>
        <div class="kpi-value" style="color: #b45309;">${attentionCount} <span style="font-size: var(--text-xs); font-weight: 500; color: var(--text-muted);">(${formatPercent((attentionCount / students.length) * 100)})</span></div>
        <div class="kpi-subtext">Below benchmark or elevated risk</div>
      </div>

      <!-- Average Accuracy & Growth -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Accuracy & Growth</span>
          <span class="badge badge-teal">Growth</span>
        </div>
        <div class="kpi-value" style="color: var(--teal);">${formatPercent(avgAccuracy)}</div>
        <div class="kpi-subtext">+${formatPercent(avgGrowth)} longitudinal growth</div>
      </div>

    </div>

    <!-- 2. Student Directory & Diagnostic Table -->
    <div class="table-container" style="margin-bottom: var(--space-6);">
      <div style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2);">
        <div>
          <h2 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Student Learning Analytics Directory</h2>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">
            Showing learners ${formatNumber(startRecord)} to ${formatNumber(endRecord)} of ${formatNumber(totalCount)} total evaluated students
          </p>
        </div>
        <span class="badge badge-primary font-mono">${formatNumber(totalCount)} Records</span>
      </div>

      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">#</th>
              <th style="width: 120px;">Student ID</th>
              <th>Institution</th>
              <th style="width: 100px;">Cohort</th>
              <th style="width: 110px;">Demographics</th>
              <th style="text-align: right; width: 110px;">Reading Score</th>
              <th style="text-align: right; width: 90px;">Fluency</th>
              <th style="text-align: right; width: 90px;">Accuracy</th>
              <th style="width: 130px;">Benchmark</th>
              <th style="width: 90px;">Risk</th>
              <th style="text-align: right; width: 80px;">Growth</th>
              <th style="text-align: center; width: 80px;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => {
              const rowNum = startRecord + idx;
              const bm = (s.benchmark_status || "Meets Benchmark").toLowerCase();
              const bmBg = bm.includes("below") || bm.includes("need") ? "var(--amber-subtle)" : "var(--emerald-subtle)";
              const bmText = bm.includes("below") || bm.includes("need") ? "#b45309" : "#047857";

              const risk = (s.risk_status || "Low").toLowerCase();
              const riskPill = risk.includes("crit") ? "status-pill-danger" : risk.includes("high") ? "status-pill-danger" : risk.includes("med") ? "status-pill-warning" : "status-pill-success";

              return `
                <tr class="table-row-clickable" data-student-id="${s.student_id}">
                  <td style="text-align: center;">
                    <span class="table-rank-badge font-mono">${rowNum}</span>
                  </td>
                  <td>
                    <strong style="color: var(--primary); font-family: var(--font-mono); font-size: var(--text-xs);">${s.student_id}</strong>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: var(--text-primary); font-size: var(--text-xs);">${s.school_name || "—"}</div>
                    <span style="color: var(--text-muted); font-size: 10px; font-family: var(--font-mono);">${s.school_id || ""}</span>
                  </td>
                  <td>
                    <strong style="color: var(--text-primary); font-size: var(--text-xs);">Grade ${s.grade || "—"}</strong>
                    <span style="color: var(--text-muted); font-size: 10px; display: block;">${s.section ? `Sec ${s.section}` : "Section A"}</span>
                  </td>
                  <td>
                    <span style="font-size: 11px; color: var(--text-secondary);">${s.gender || "—"}</span>
                    <span style="color: var(--text-muted); font-size: 10px; display: block;">${s.socioeconomic_band || "Middle"} SES</span>
                  </td>
                  <td style="text-align: right;">
                    <div style="font-size: var(--text-xs); font-weight: 700; font-family: var(--font-mono); color: var(--primary);">
                      ${formatScore(s.reading_score || s.average_performance)}
                    </div>
                    <div style="height: 4px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden; margin-top: 3px; width: 60px; margin-left: auto;">
                      <div style="height: 100%; width: ${Math.min(100, Math.max(0, Number(s.reading_score || s.average_performance || 0)))}%; background: var(--primary);"></div>
                    </div>
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); font-size: var(--text-xs);">
                    ${formatScore(s.fluency_score)}
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); font-size: var(--text-xs);">
                    ${formatPercent(s.accuracy_pct)}
                  </td>
                  <td>
                    <span class="badge" style="background: ${bmBg}; color: ${bmText}; font-size: 10px; padding: 2px 6px;">
                      ${s.benchmark_status || "Meets Benchmark"}
                    </span>
                  </td>
                  <td>
                    <span class="status-pill ${riskPill}" style="font-size: 10px; padding: 1px 6px;">
                      ${s.risk_status || "Low"}
                    </span>
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); font-size: var(--text-xs); color: #047857;">
                    +${formatPercent(s.improvement_percentage || 0)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-secondary btn-inspect-student" data-student-id="${s.student_id}" style="padding: 3px 8px; font-size: 10px;">
                      Inspect
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- 3. Pagination Controls -->
      <div class="pagination-bar">
        <div class="pagination-info">
          Showing <strong>${formatNumber(startRecord)}</strong> to <strong>${formatNumber(endRecord)}</strong> of <strong>${formatNumber(totalCount)}</strong> learners
        </div>

        <div class="pagination-controls">
          <!-- Page Size Selector -->
          <div style="display: flex; align-items: center; gap: 6px; margin-right: 12px;">
            <span style="color: var(--text-muted); font-size: 11px;">Per page:</span>
            <select class="pagination-size-select" id="students-page-size-select">
              <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
              <option value="25" ${pageSize === 25 ? "selected" : ""}>25</option>
              <option value="50" ${pageSize === 50 ? "selected" : ""}>50</option>
              <option value="100" ${pageSize === 100 ? "selected" : ""}>100</option>
            </select>
          </div>

          <!-- Prev Page -->
          <button class="pagination-btn" id="students-page-prev" ${currentPage <= 1 ? "disabled" : ""}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>

          <!-- Current Page Indicator -->
          <span style="font-weight: 600; color: var(--text-primary); padding: 0 8px; font-family: var(--font-mono);">
            ${currentPage} / ${totalPages}
          </span>

          <!-- Next Page -->
          <button class="pagination-btn" id="students-page-next" ${currentPage >= totalPages ? "disabled" : ""}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

    </div>
  `;

  // Attach Table Row Click & Button Events
  attachTableEvents(mount, rootContainer, currentPage, totalPages);
}

/**
 * Attaches pagination, inspect button, and row click listeners
 */
function attachTableEvents(mount, rootContainer, currentPage, totalPages) {
  // Row Click & Inspect Button triggers
  const inspectButtons = mount.querySelectorAll(".btn-inspect-student");
  inspectButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const studentId = btn.getAttribute("data-student-id");
      if (studentId) openStudentModal(studentId);
    });
  });

  const rows = mount.querySelectorAll(".table-row-clickable");
  rows.forEach((row) => {
    row.addEventListener("click", () => {
      const studentId = row.getAttribute("data-student-id");
      if (studentId) openStudentModal(studentId);
    });
  });

  // Page Size Selector
  const pageSizeSelect = mount.querySelector("#students-page-size-select");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      pageState.pageSize = parseInt(e.target.value, 10) || 25;
      pageState.page = 1;
      loadStudentsData(rootContainer);
    });
  }

  // Prev / Next Page Buttons
  const prevBtn = mount.querySelector("#students-page-prev");
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (pageState.page > 1) {
        pageState.page--;
        loadStudentsData(rootContainer);
      }
    });
  }

  const nextBtn = mount.querySelector("#students-page-next");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (pageState.page < totalPages) {
        pageState.page++;
        loadStudentsData(rootContainer);
      }
    });
  }
}

/**
 * Skeleton Loader Component for Student Analytics
 */
function renderStudentsSkeleton(mount) {
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

    <!-- Table Skeleton -->
    <div class="glass-panel" style="height: 380px; background: rgba(255, 255, 255, 0.5);"></div>
  `;
}

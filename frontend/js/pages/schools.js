/**
 * LearnIQ — School Intelligence Analytics Page Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified backend endpoints:
 * GET /api/schools (filtering, search, pagination, scorecards)
 * GET /api/schools/{school_id} (diagnostic profile drawer)
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent } from "../utils/formatters.js";
import { renderErrorState } from "../components/error-state.js";
import { openSchoolModal } from "../components/school-modal.js";

// Active filter & pagination state
let pageState = {
  page: 1,
  pageSize: 25,
  search: "",
  state: "",
  district: "",
  management_type: "",
  board: "",
  urban_rural: "",
  school_type: "",
};

let searchDebounceTimer = null;

/**
 * Main export to render School Intelligence page
 */
export async function renderSchoolsPage(container) {
  if (!container) return;

  // 1. Immediately render initial shell with skeleton loader
  renderSchoolsPageShell(container);

  // 2. Fetch and render data
  await loadSchoolsData(container);
}

/**
 * Renders the persistent shell including breadcrumbs, header, and filter controls
 */
function renderSchoolsPageShell(container) {
  container.innerHTML = `
    <div class="page-container">
      
      <!-- 1. Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Analytics</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">School Intelligence</span>
      </div>

      <!-- 2. Section Header -->
      <div class="section-header">
        <div class="section-title-wrap">
          <h1 class="section-title">School Intelligence</h1>
          <p class="section-subtitle">Institutional comparison, rankings & diagnostics.</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="status-pill status-pill-success">
            <span class="status-pill-dot"></span> Live PostgreSQL Data
          </span>
        </div>
      </div>

      <!-- 3. Comprehensive Filter & Search Bar -->
      <div class="glass-panel" id="schools-filter-panel" style="padding: var(--space-4) var(--space-5); margin-bottom: var(--space-6);">
        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); justify-content: space-between;">
          
          <!-- Search Control -->
          <div class="search-control" style="min-width: 260px; flex: 1 1 260px;">
            <span class="search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input type="text" class="search-input" id="school-search-input" placeholder="Search by school name or ID..." value="${pageState.search}">
          </div>

          <!-- Slicers Row -->
          <div style="display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; flex: 2 1 auto;">
            
            <!-- State Slicer -->
            <select class="filter-select" id="filter-state" style="padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
              <option value="">All States</option>
              <option value="Andhra Pradesh" ${pageState.state === "Andhra Pradesh" ? "selected" : ""}>Andhra Pradesh</option>
              <option value="Assam" ${pageState.state === "Assam" ? "selected" : ""}>Assam</option>
              <option value="Bihar" ${pageState.state === "Bihar" ? "selected" : ""}>Bihar</option>
              <option value="Chandigarh" ${pageState.state === "Chandigarh" ? "selected" : ""}>Chandigarh</option>
              <option value="Chhattisgarh" ${pageState.state === "Chhattisgarh" ? "selected" : ""}>Chhattisgarh</option>
              <option value="Delhi" ${pageState.state === "Delhi" ? "selected" : ""}>Delhi</option>
              <option value="Goa" ${pageState.state === "Goa" ? "selected" : ""}>Goa</option>
              <option value="Gujarat" ${pageState.state === "Gujarat" ? "selected" : ""}>Gujarat</option>
              <option value="Haryana" ${pageState.state === "Haryana" ? "selected" : ""}>Haryana</option>
              <option value="Himachal Pradesh" ${pageState.state === "Himachal Pradesh" ? "selected" : ""}>Himachal Pradesh</option>
              <option value="Jammu and Kashmir" ${pageState.state === "Jammu and Kashmir" ? "selected" : ""}>Jammu and Kashmir</option>
              <option value="Jharkhand" ${pageState.state === "Jharkhand" ? "selected" : ""}>Jharkhand</option>
              <option value="Karnataka" ${pageState.state === "Karnataka" ? "selected" : ""}>Karnataka</option>
              <option value="Kerala" ${pageState.state === "Kerala" ? "selected" : ""}>Kerala</option>
              <option value="Madhya Pradesh" ${pageState.state === "Madhya Pradesh" ? "selected" : ""}>Madhya Pradesh</option>
              <option value="Maharashtra" ${pageState.state === "Maharashtra" ? "selected" : ""}>Maharashtra</option>
              <option value="Odisha" ${pageState.state === "Odisha" ? "selected" : ""}>Odisha</option>
              <option value="Punjab" ${pageState.state === "Punjab" ? "selected" : ""}>Punjab</option>
              <option value="Rajasthan" ${pageState.state === "Rajasthan" ? "selected" : ""}>Rajasthan</option>
              <option value="Tamil Nadu" ${pageState.state === "Tamil Nadu" ? "selected" : ""}>Tamil Nadu</option>
              <option value="Telangana" ${pageState.state === "Telangana" ? "selected" : ""}>Telangana</option>
              <option value="Uttar Pradesh" ${pageState.state === "Uttar Pradesh" ? "selected" : ""}>Uttar Pradesh</option>
              <option value="Uttarakhand" ${pageState.state === "Uttarakhand" ? "selected" : ""}>Uttarakhand</option>
              <option value="West Bengal" ${pageState.state === "West Bengal" ? "selected" : ""}>West Bengal</option>
            </select>

            <!-- Management Slicer -->
            <select class="filter-select" id="filter-management" style="padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
              <option value="">All Management</option>
              <option value="State Government" ${pageState.management_type === "State Government" ? "selected" : ""}>State Government</option>
              <option value="Private Management" ${pageState.management_type === "Private Management" ? "selected" : ""}>Private Management</option>
              <option value="Government Aided" ${pageState.management_type === "Government Aided" ? "selected" : ""}>Government Aided</option>
              <option value="Private Trust" ${pageState.management_type === "Private Trust" ? "selected" : ""}>Private Trust</option>
              <option value="Local Government" ${pageState.management_type === "Local Government" ? "selected" : ""}>Local Government</option>
            </select>

            <!-- Board Slicer -->
            <select class="filter-select" id="filter-board" style="padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
              <option value="">All Boards</option>
              <option value="CBSE" ${pageState.board === "CBSE" ? "selected" : ""}>CBSE</option>
              <option value="ICSE" ${pageState.board === "ICSE" ? "selected" : ""}>ICSE</option>
              <option value="State Board" ${pageState.board === "State Board" ? "selected" : ""}>State Board</option>
              <option value="International" ${pageState.board === "International" ? "selected" : ""}>International</option>
            </select>

            <!-- School Type Slicer -->
            <select class="filter-select" id="filter-type" style="padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
              <option value="">All Types</option>
              <option value="Government" ${pageState.school_type === "Government" ? "selected" : ""}>Government</option>
              <option value="Private" ${pageState.school_type === "Private" ? "selected" : ""}>Private</option>
              <option value="Aided" ${pageState.school_type === "Aided" ? "selected" : ""}>Aided</option>
              <option value="Charter" ${pageState.school_type === "Charter" ? "selected" : ""}>Charter</option>
            </select>

            <!-- Urban / Rural Slicer -->
            <select class="filter-select" id="filter-locality" style="padding: 7px 10px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
              <option value="">All Areas</option>
              <option value="Urban" ${pageState.urban_rural === "Urban" ? "selected" : ""}>Urban</option>
              <option value="Rural" ${pageState.urban_rural === "Rural" ? "selected" : ""}>Rural</option>
            </select>

          </div>

          <!-- Reset Action -->
          <button class="btn btn-secondary" id="btn-reset-school-filters" style="padding: 6px 12px; font-size: var(--text-xs); flex-shrink: 0;">
            Reset Filters
          </button>
        </div>
      </div>

      <!-- 4. Dynamic Workspace Content Mount -->
      <div id="schools-dynamic-content">
        <!-- Rendered asynchronously -->
      </div>

    </div>
  `;

  // Attach Filter Listeners
  attachFilterListeners(container);
}

/**
 * Attaches event handlers for filters, search input, and reset
 */
function attachFilterListeners(container) {
  const searchInput = container.querySelector("#school-search-input");
  const stateSelect = container.querySelector("#filter-state");
  const mgmtSelect = container.querySelector("#filter-management");
  const boardSelect = container.querySelector("#filter-board");
  const typeSelect = container.querySelector("#filter-type");
  const localitySelect = container.querySelector("#filter-locality");
  const resetBtn = container.querySelector("#btn-reset-school-filters");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        pageState.search = e.target.value;
        pageState.page = 1;
        loadSchoolsData(container);
      }, 300);
    });
  }

  const handleSelectChange = () => {
    pageState.state = stateSelect ? stateSelect.value : "";
    pageState.management_type = mgmtSelect ? mgmtSelect.value : "";
    pageState.board = boardSelect ? boardSelect.value : "";
    pageState.school_type = typeSelect ? typeSelect.value : "";
    pageState.urban_rural = localitySelect ? localitySelect.value : "";
    pageState.page = 1;
    loadSchoolsData(container);
  };

  [stateSelect, mgmtSelect, boardSelect, typeSelect, localitySelect].forEach((el) => {
    if (el) el.addEventListener("change", handleSelectChange);
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      pageState = {
        page: 1,
        pageSize: 25,
        search: "",
        state: "",
        district: "",
        management_type: "",
        board: "",
        urban_rural: "",
        school_type: "",
      };
      if (searchInput) searchInput.value = "";
      if (stateSelect) stateSelect.value = "";
      if (mgmtSelect) mgmtSelect.value = "";
      if (boardSelect) boardSelect.value = "";
      if (typeSelect) typeSelect.value = "";
      if (localitySelect) localitySelect.value = "";
      loadSchoolsData(container);
    });
  }
}

/**
 * Fetches school scorecards and renders KPIs, analytics, and table
 */
async function loadSchoolsData(container) {
  const mount = container.querySelector("#schools-dynamic-content");
  if (!mount) return;

  // Render skeleton loading state
  renderSchoolsLoadingSkeleton(mount);

  const queryParams = {
    page: pageState.page,
    page_size: pageState.pageSize,
  };
  if (pageState.search.trim()) queryParams.search = pageState.search.trim();
  if (pageState.state) queryParams.state = pageState.state;
  if (pageState.management_type) queryParams.management_type = pageState.management_type;
  if (pageState.board) queryParams.board = pageState.board;
  if (pageState.school_type) queryParams.school_type = pageState.school_type;
  if (pageState.urban_rural) queryParams.urban_rural = pageState.urban_rural;

  try {
    const data = await api.schools(queryParams);
    if (!data || data.status !== "success") {
      throw new Error(data?.message || "Failed to retrieve school scorecards.");
    }

    renderSchoolsWorkspace(container, mount, data);
  } catch (err) {
    console.error("[School Intelligence Error]", err);
    renderErrorState(mount, {
      title: "Unable to load School Intelligence",
      message: err.message || "Failed to connect to the PostgreSQL analytics engine. Please verify the backend.",
      onRetry: () => loadSchoolsData(container),
    });
  }
}

/**
 * Renders the full verified school intelligence workspace
 */
function renderSchoolsWorkspace(container, mount, data) {
  const schools = data.schools || [];
  const totalCount = data.total_count || 0;
  const page = data.page || 1;
  const pageSize = data.page_size || 25;
  const totalPages = data.total_pages || Math.ceil(totalCount / pageSize) || 1;

  // Calculate real aggregated KPIs from returned dataset
  let avgPerformance = 0;
  let avgBenchmark = 0;
  let avgImprovement = 0;
  let attentionCount = 0;
  let totalEvaluatedStudents = 0;

  if (schools.length > 0) {
    const sumPerf = schools.reduce((acc, s) => acc + Number(s.average_performance || s.average_reading_score || 0), 0);
    const sumBench = schools.reduce((acc, s) => acc + Number(s.benchmark_percentage || 0), 0);
    const sumImp = schools.reduce((acc, s) => acc + Number(s.average_improvement || 0), 0);
    
    avgPerformance = sumPerf / schools.length;
    avgBenchmark = sumBench / schools.length;
    avgImprovement = sumImp / schools.length;
    attentionCount = schools.filter((s) => Number(s.benchmark_percentage || 0) < 80).length;
    totalEvaluatedStudents = schools.reduce((acc, s) => acc + Number(s.evaluated_students || s.total_students || 0), 0);
  }

  // Top 4 Leaders & Focus institutions from current query batch
  const sortedByPerf = [...schools].sort((a, b) => Number(b.average_performance || 0) - Number(a.average_performance || 0));
  const topSchools = sortedByPerf.slice(0, 4);
  const focusSchools = [...sortedByPerf].reverse().slice(0, 4);

  mount.innerHTML = `
    <!-- 1. School KPI Summary Row (4 cards: 2 rows x 2 cols) -->
    <div class="grid-2-cols">
      
      <!-- KPI 1: Monitored Schools -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Institutions</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
        </div>
        <div class="kpi-value">${formatNumber(totalCount)}</div>
        <div class="kpi-subtext">${schools.length} displayed on page ${page}</div>
      </div>

      <!-- KPI 2: Average Score -->
      <div class="kpi-card" style="border-top: 3px solid var(--primary);">
        <div class="kpi-header">
          <span>Average Score</span>
          <span class="badge badge-primary">Mean</span>
        </div>
        <div class="kpi-value" style="color: var(--primary);">${formatScore(avgPerformance)} <span style="font-size: var(--text-sm); font-weight: 500; color: var(--text-muted);">/ 100</span></div>
        <div class="kpi-subtext">${formatPercent(avgImprovement)} average growth</div>
      </div>

      <!-- KPI 3: Benchmark Attainment -->
      <div class="kpi-card" style="border-top: 3px solid var(--emerald);">
        <div class="kpi-header">
          <span>Benchmark Met</span>
          <span class="badge" style="background: var(--emerald-subtle); color: #047857;">Attainment</span>
        </div>
        <div class="kpi-value" style="color: #047857;">${formatPercent(avgBenchmark)}</div>
        <div class="kpi-subtext">Cohort proficiency rate</div>
      </div>

      <!-- KPI 4: Priority Attention Schools -->
      <div class="kpi-card" style="border-top: 3px solid var(--amber);">
        <div class="kpi-header">
          <span>Priority Focus</span>
          <span class="badge" style="background: var(--amber-subtle); color: #b45309;">Support</span>
        </div>
        <div class="kpi-value" style="color: #b45309;">${formatNumber(attentionCount)}</div>
        <div class="kpi-subtext">Institutions below 80% benchmark</div>
      </div>

      <!-- KPI 5: Evaluated Students -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span>Evaluated Learners</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--teal);"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="kpi-value">${formatNumber(totalEvaluatedStudents)}</div>
        <div class="kpi-subtext">Students in current view</div>
      </div>

    </div>

    <!-- 2. Institutional Performance Comparison (Top Leaders vs Focus) -->
    ${schools.length > 0 ? `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6);">
        
        <!-- Leaders -->
        <div class="glass-panel" style="padding: var(--space-5);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
            <div>
              <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 6px;">
                <span class="badge" style="background: var(--emerald-subtle); color: #047857; font-size: 10px;">Leaders</span>
                Highest Performing Institutions
              </h3>
              <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Top benchmark achievement in filtered query</p>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${topSchools.map((s) => `
              <div class="school-quick-card table-row-clickable" data-school-id="${s.school_id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(248, 250, 252, 0.8); border: 1px solid var(--glass-border); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                  <span class="table-rank-badge table-rank-top">#${s.rank || "—"}</span>
                  <div style="overflow: hidden;">
                    <div style="font-size: var(--text-xs); font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.school_name}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${s.district}, ${s.state} · ${s.management_type}</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                  <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${formatScore(s.average_performance || s.average_reading_score)}</span>
                  <span class="badge" style="background: var(--emerald-subtle); color: #047857; font-size: 10px;">${formatPercent(s.benchmark_percentage)}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- Priority Focus -->
        <div class="glass-panel" style="padding: var(--space-5); border-color: rgba(239, 68, 68, 0.2);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
            <div>
              <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 6px;">
                <span class="badge" style="background: var(--coral-subtle); color: var(--coral); font-size: 10px;">Focus</span>
                Institutions Requiring Support
              </h3>
              <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Lowest relative benchmark attainment</p>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            ${focusSchools.map((s) => `
              <div class="school-quick-card table-row-clickable" data-school-id="${s.school_id}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(254, 242, 242, 0.5); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                  <span class="table-rank-badge">#${s.rank || "—"}</span>
                  <div style="overflow: hidden;">
                    <div style="font-size: var(--text-xs); font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.school_name}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${s.district}, ${s.state} · ${s.management_type}</div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                  <span style="font-size: var(--text-xs); font-weight: 700; color: var(--coral); font-family: var(--font-mono);">${formatScore(s.average_performance || s.average_reading_score)}</span>
                  <span class="badge" style="background: var(--coral-subtle); color: var(--coral); font-size: 10px;">${formatPercent(s.benchmark_percentage)}</span>
                </div>
              </div>
            `).join("")}
          </div>
        </div>

      </div>
    ` : ""}

    <!-- 3. School Scorecard Ranking Table -->
    <div class="table-container" style="margin-bottom: var(--space-6);">
      
      <!-- Table Header Bar -->
      <div style="padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2);">
        <div>
          <h2 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0;">Institutional Scorecard Directory</h2>
          <p style="font-size: 11px; color: var(--text-muted); margin: 2px 0 0 0;">Click any institution to open the full 360° diagnostic profile</p>
        </div>
        <span class="badge badge-primary font-mono">${formatNumber(totalCount)} Total Institutions</span>
      </div>

      <!-- Table Body -->
      ${schools.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">Rank</th>
              <th>Institution</th>
              <th>Location</th>
              <th>Management</th>
              <th>Board</th>
              <th style="text-align: right;">Students</th>
              <th style="text-align: right;">Avg Score</th>
              <th style="text-align: right;">Benchmark %</th>
              <th style="text-align: right;">Growth %</th>
              <th style="text-align: right;">At Risk</th>
              <th style="text-align: center; width: 100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${schools.map((s) => {
              const isTop = s.rank && s.rank <= 10;
              const isUnderperforming = Number(s.benchmark_percentage || 0) < 80;
              return `
                <tr class="table-row-clickable" data-school-id="${s.school_id}">
                  <td style="text-align: center;">
                    <span class="table-rank-badge ${isTop ? "table-rank-top" : ""}">#${s.rank || "—"}</span>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: var(--text-primary);">${s.school_name}</div>
                    <div style="display: flex; gap: 6px; align-items: center; margin-top: 2px;">
                      <span class="badge badge-neutral" style="font-family: var(--font-mono); font-size: 9px; padding: 1px 4px;">${s.school_id}</span>
                      <span style="font-size: 10px; color: var(--text-muted);">${s.school_type || "—"}</span>
                      <span style="font-size: 10px; color: var(--text-muted);">·</span>
                      <span style="font-size: 10px; color: var(--text-muted);">${s.urban_rural || "—"}</span>
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 11px; font-weight: 500; color: var(--text-primary);">${s.district || "—"}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${s.state || "—"}</div>
                  </td>
                  <td>
                    <span class="badge badge-teal" style="font-size: 10px;">${s.management_type || "—"}</span>
                  </td>
                  <td>
                    <span class="badge badge-violet" style="font-size: 10px;">${s.board || "—"}</span>
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono);">
                    <div style="font-weight: 600;">${formatNumber(s.total_students)}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${formatNumber(s.evaluated_students)} eval</div>
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--primary);">
                    ${formatScore(s.average_performance || s.average_reading_score)}
                  </td>
                  <td style="text-align: right;">
                    <span class="badge" style="background: ${isUnderperforming ? "var(--coral-subtle)" : "var(--emerald-subtle)"}; color: ${isUnderperforming ? "var(--coral)" : "#047857"}; font-size: 10px;">
                      ${formatPercent(s.benchmark_percentage)}
                    </span>
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); color: var(--text-secondary);">
                    ${formatPercent(s.average_improvement)}
                  </td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 600; color: ${Number(s.at_risk_student_count || 0) > 0 ? "var(--coral)" : "var(--text-muted)"};">
                    ${formatNumber(s.at_risk_student_count)}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn btn-secondary btn-inspect-school" data-school-id="${s.school_id}" style="padding: 4px 8px; font-size: 10px;">
                      Inspect
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      ` : `
        <div style="padding: var(--space-10) var(--space-6); text-align: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-surface-subtle); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-1);">No matching institutions found</h3>
          <p style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 400px; margin: 0 auto var(--space-4); line-height: 1.5;">
            No institutions match the current search query and filter criteria. Try adjusting your filters or search terms.
          </p>
          <button class="btn btn-secondary" id="btn-empty-reset" style="font-size: var(--text-xs);">
            Clear All Filters
          </button>
        </div>
      `}

      <!-- 4. Pagination Controls Bar -->
      <div class="pagination-bar">
        <div class="pagination-info">
          Showing <span style="font-weight: 700; color: var(--text-primary);">${schools.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to <span style="font-weight: 700; color: var(--text-primary);">${Math.min(page * pageSize, totalCount)}</span> of <span style="font-weight: 700; color: var(--text-primary);">${formatNumber(totalCount)}</span> institutions
        </div>

        <div style="display: flex; align-items: center; gap: var(--space-3);">
          
          <!-- Page Size Selector -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: var(--text-muted);">Rows:</span>
            <select class="pagination-size-select" id="page-size-selector">
              <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
              <option value="25" ${pageSize === 25 ? "selected" : ""}>25</option>
              <option value="50" ${pageSize === 50 ? "selected" : ""}>50</option>
              <option value="100" ${pageSize === 100 ? "selected" : ""}>100</option>
            </select>
          </div>

          <!-- Page Navigation Buttons -->
          <div class="pagination-controls">
            <button class="pagination-btn" id="btn-page-first" ${page <= 1 ? "disabled" : ""} title="First Page">&laquo;</button>
            <button class="pagination-btn" id="btn-page-prev" ${page <= 1 ? "disabled" : ""} title="Previous Page">&lsaquo;</button>
            
            <span style="font-size: 11px; font-weight: 600; padding: 0 6px; color: var(--text-primary);">
              Page ${page} of ${totalPages}
            </span>

            <button class="pagination-btn" id="btn-page-next" ${page >= totalPages ? "disabled" : ""} title="Next Page">&rsaquo;</button>
            <button class="pagination-btn" id="btn-page-last" ${page >= totalPages ? "disabled" : ""} title="Last Page">&raquo;</button>
          </div>

        </div>
      </div>

    </div>
  `;

  // Attach interactive row & pagination events
  attachWorkspaceEvents(container, mount, totalPages);
}

/**
 * Attaches row click handlers (modal open) and pagination button events
 */
function attachWorkspaceEvents(container, mount, totalPages) {
  // Row and inspect button clicks -> Open school modal
  const clickableElements = mount.querySelectorAll(".table-row-clickable, .btn-inspect-school, .school-quick-card");
  clickableElements.forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const schoolId = el.getAttribute("data-school-id") || el.closest("[data-school-id]")?.getAttribute("data-school-id");
      if (schoolId) {
        openSchoolModal(schoolId);
      }
    });
  });

  // Empty state reset button
  const emptyResetBtn = mount.querySelector("#btn-empty-reset");
  if (emptyResetBtn) {
    emptyResetBtn.addEventListener("click", () => {
      const resetBtn = container.querySelector("#btn-reset-school-filters");
      if (resetBtn) resetBtn.click();
    });
  }

  // Page Size Selector
  const pageSizeSelect = mount.querySelector("#page-size-selector");
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener("change", (e) => {
      pageState.pageSize = parseInt(e.target.value, 10) || 25;
      pageState.page = 1;
      loadSchoolsData(container);
    });
  }

  // Pagination navigation
  const btnFirst = mount.querySelector("#btn-page-first");
  const btnPrev = mount.querySelector("#btn-page-prev");
  const btnNext = mount.querySelector("#btn-page-next");
  const btnLast = mount.querySelector("#btn-page-last");

  if (btnFirst) {
    btnFirst.addEventListener("click", () => {
      if (pageState.page > 1) {
        pageState.page = 1;
        loadSchoolsData(container);
      }
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      if (pageState.page > 1) {
        pageState.page -= 1;
        loadSchoolsData(container);
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      if (pageState.page < totalPages) {
        pageState.page += 1;
        loadSchoolsData(container);
      }
    });
  }

  if (btnLast) {
    btnLast.addEventListener("click", () => {
      if (pageState.page < totalPages) {
        pageState.page = totalPages;
        loadSchoolsData(container);
      }
    });
  }
}

/**
 * Skeleton Loader during async table refresh
 */
function renderSchoolsLoadingSkeleton(mount) {
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

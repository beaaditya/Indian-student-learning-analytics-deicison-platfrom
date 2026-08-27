/**
 * LearnIQ — Proactive AI Insights Page Module
 * Student Learning Analytics & Decision Intelligence Platform
 *
 * Connects directly to verified backend endpoint:
 * GET /api/insights (proactive grounded insight cards, priority triage, and statistics)
 * POST /api/insights/generate (triggers fresh fact extraction and narrative synthesis)
 */

import { api } from "../api.js";
import { formatNumber, formatScore, formatPercent } from "../utils/formatters.js";
import { renderErrorState } from "../components/error-state.js";
import { openInsightModal } from "../components/insight-modal.js";

// Active filter state
let pageState = {
  category: "",
  priority: "",
};

/**
 * Main export to render AI Insights page
 */
export async function renderInsightsPage(container) {
  if (!container) return;

  // 1. Render persistent page shell
  renderInsightsShell(container);

  // 2. Fetch and render proactive insights
  await loadInsightsData(container);
}

/**
 * Renders the persistent shell including header and filter bar
 */
function renderInsightsShell(container) {
  container.innerHTML = `
    <div class="page-container">
      
      <!-- 1. Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Intelligence</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">AI Insights</span>
      </div>

      <!-- 2. Section Header -->
      <div class="section-header">
        <div class="section-title-wrap">
          <h1 class="section-title">AI Insights</h1>
          <p class="section-subtitle">Proactive, evidence-grounded intelligence from learning analytics.</p>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <span class="status-pill status-pill-success">
            <span class="status-pill-dot"></span> Live PostgreSQL Grounding
          </span>
        </div>
      </div>

      <!-- 3. Filter & Control Bar -->
      <div class="glass-panel" id="insights-filter-panel" style="padding: var(--space-3) var(--space-5); margin-bottom: var(--space-6); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
          <span style="font-size: var(--text-xs); font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Insight Filters:</span>
          
          <!-- Category Filter -->
          <select class="filter-select" id="insights-filter-category" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Categories</option>
            <option value="Learning Gap" ${pageState.category === "Learning Gap" ? "selected" : ""}>Learning Gap</option>
            <option value="School" ${pageState.category === "School" ? "selected" : ""}>School Performance</option>
            <option value="Subject" ${pageState.category === "Subject" ? "selected" : ""}>Subject Competency</option>
            <option value="Risk" ${pageState.category === "Risk" ? "selected" : ""}>Risk & Early Warning</option>
            <option value="Intervention" ${pageState.category === "Intervention" ? "selected" : ""}>Intervention & Recovery</option>
            <option value="Growth" ${pageState.category === "Growth" ? "selected" : ""}>Growth & Trajectory</option>
          </select>

          <!-- Priority / Severity Filter -->
          <select class="filter-select" id="insights-filter-priority" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); background: #ffffff; font-size: var(--text-xs); color: var(--text-primary);">
            <option value="">All Priorities</option>
            <option value="High" ${pageState.priority === "High" ? "selected" : ""}>High Priority</option>
            <option value="Medium" ${pageState.priority === "Medium" ? "selected" : ""}>Medium Priority</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <button class="btn btn-secondary" id="btn-refresh-insights" style="padding: 6px 12px; font-size: var(--text-xs); display: inline-flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            Re-scan Insights
          </button>
          <button class="btn btn-secondary" id="btn-reset-insight-filters" style="padding: 6px 10px; font-size: var(--text-xs);">
            Reset Filters
          </button>
        </div>
      </div>

      <!-- 4. Dynamic Insights Mount -->
      <div id="insights-dynamic-mount">
        <!-- Rendered asynchronously -->
      </div>

    </div>
  `;

  // Attach filter event listeners
  attachFilterListeners(container);
}

/**
 * Attaches filter select, refresh, and reset handlers
 */
function attachFilterListeners(container) {
  const catSelect = container.querySelector("#insights-filter-category");
  const prioSelect = container.querySelector("#insights-filter-priority");
  const resetBtn = container.querySelector("#btn-reset-insight-filters");
  const refreshBtn = container.querySelector("#btn-refresh-insights");

  const onFilterChange = () => {
    pageState.category = catSelect ? catSelect.value : "";
    pageState.priority = prioSelect ? prioSelect.value : "";
    loadInsightsData(container);
  };

  if (catSelect) catSelect.addEventListener("change", onFilterChange);
  if (prioSelect) prioSelect.addEventListener("change", onFilterChange);

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      pageState = { category: "", priority: "" };
      if (catSelect) catSelect.value = "";
      if (prioSelect) prioSelect.value = "";
      loadInsightsData(container);
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `
        <span class="spinner" style="width: 12px; height: 12px; border-width: 2px;"></span>
        Scanning...
      `;
      try {
        api.clearCache();
        await api.generateInsights();
        await loadInsightsData(container);
      } catch (e) {
        console.error("Error refreshing insights:", e);
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          Re-scan Insights
        `;
      }
    });
  }
}

/**
 * Fetches proactive grounded insights from backend
 */
async function loadInsightsData(container) {
  const mount = container.querySelector("#insights-dynamic-mount");
  if (!mount) return;

  renderInsightsSkeleton(mount);

  try {
    const params = {};
    if (pageState.category) params.category = pageState.category;
    if (pageState.priority) params.priority = pageState.priority;

    const res = await api.insights(params);

    if (!res || res.status !== "success") {
      throw new Error(res?.message || "Failed to retrieve grounded AI insights.");
    }

    renderInsightsDashboard(mount, res, container);
  } catch (err) {
    console.error("[AI Insights Error]", err);
    renderErrorState(mount, {
      title: "Unable to load AI Insights",
      message: err.message || "Failed to connect to the PostgreSQL analytics intelligence engine. Please verify the backend.",
      onRetry: () => loadInsightsData(container),
    });
  }
}

/**
 * Renders the verified AI Insights dashboard
 */
function renderInsightsDashboard(mount, data, rootContainer) {
  const insights = data.insights || [];
  const totalInsights = data.total_insights || insights.length;
  const highPrioCount = data.high_priority_count || 0;

  // Handle empty state
  if (insights.length === 0) {
    mount.innerHTML = `
      <div class="glass-panel" style="padding: var(--space-10) var(--space-6); text-align: center; margin: var(--space-6) 0;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-surface-subtle); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-1);">No matching insights detected</h3>
        <p style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 440px; margin: 0 auto var(--space-4); line-height: 1.5;">
          No proactive intelligence signals matched the active category or priority filters. Reset your filters to view all active insights.
        </p>
        <button class="btn btn-secondary" id="btn-empty-reset-insights" style="font-size: var(--text-xs);">
          Clear All Filters
        </button>
      </div>
    `;
    const btn = mount.querySelector("#btn-empty-reset-insights");
    if (btn) {
      btn.addEventListener("click", () => {
        pageState = { category: "", priority: "" };
        renderInsightsPage(rootContainer);
      });
    }
    return;
  }

  const gapCount = insights.filter(i => i.category === "Learning Gap" || i.category === "Subject").length;
  const remCount = insights.filter(i => i.category === "Intervention" || i.category === "Risk").length;

  mount.innerHTML = `
    <!-- 1. Macro Insights Summary KPIs (4 cards: 2 rows x 2 cols) -->
    <div class="grid-2-cols">
      
      <!-- Total Insights -->
      <div class="kpi-card" style="border-top: 3px solid var(--primary);">
        <div class="kpi-header">
          <span>Active Intelligence Signals</span>
          <span class="badge badge-primary font-mono">Signals</span>
        </div>
        <div class="kpi-value" style="color: var(--primary);">${formatNumber(totalInsights)}</div>
        <div class="kpi-subtext">Verified statistical detections</div>
      </div>

      <!-- High Priority Warnings -->
      <div class="kpi-card" style="border-top: 3px solid var(--coral);">
        <div class="kpi-header">
          <span>High-Priority Action Areas</span>
          <span class="badge" style="background: rgba(239, 68, 68, 0.12); color: var(--coral);">Priority</span>
        </div>
        <div class="kpi-value" style="color: var(--coral);">${formatNumber(highPrioCount)}</div>
        <div class="kpi-subtext">Require leadership attention</div>
      </div>

      <!-- Curricular & Gap Signals -->
      <div class="kpi-card" style="border-top: 3px solid var(--amber);">
        <div class="kpi-header">
          <span>Curricular & Skill Gaps</span>
          <span class="badge" style="background: var(--amber-subtle); color: #b45309;">Curriculum</span>
        </div>
        <div class="kpi-value" style="color: #b45309;">${formatNumber(gapCount)}</div>
        <div class="kpi-subtext">Sub-skill & subject bottlenecks</div>
      </div>

      <!-- Remediation & Recovery -->
      <div class="kpi-card" style="border-top: 3px solid var(--emerald);">
        <div class="kpi-header">
          <span>Remediation & Triage</span>
          <span class="badge" style="background: var(--emerald-subtle); color: #047857;">Remediation</span>
        </div>
        <div class="kpi-value" style="color: #047857;">${formatNumber(remCount)}</div>
        <div class="kpi-subtext">Intervention effectiveness tracking</div>
      </div>

    </div>

    <!-- 2. Proactive Grounded Insight Cards Grid (6 cards: 2 rows x 3 cols) -->
    <div class="grid-3-cols" style="gap: var(--space-5);">
      ${insights.map((ins) => {
        const severity = (ins.severity || "Medium").toLowerCase();
        const isPos = severity.includes("pos");
        const isCrit = severity.includes("crit") || severity.includes("high");

        const badgeBg = isPos ? "var(--emerald-subtle)" : isCrit ? "rgba(239, 68, 68, 0.12)" : "var(--amber-subtle)";
        const badgeColor = isPos ? "#047857" : isCrit ? "var(--coral)" : "#b45309";

        return `
          <div class="glass-panel insight-card" data-insight-id="${ins.id}" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid ${badgeColor}; transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer;">
            <div>
              <!-- Top Category & Severity -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3);">
                <span class="badge" style="background: var(--bg-surface-subtle); color: var(--text-primary); font-size: 10px; font-weight: 700; text-transform: uppercase;">
                  ${ins.category || "General"}
                </span>
                <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-size: 10px; font-weight: 700;">
                  ${ins.severity || "Medium"} Severity
                </span>
              </div>

              <!-- Title -->
              <h3 style="font-size: var(--text-sm); font-weight: 700; color: var(--text-primary); margin: 0 0 var(--space-2) 0; line-height: 1.4;">
                ${ins.title}
              </h3>

              <!-- Grounded Summary Narrative -->
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.5; margin: 0 0 var(--space-4) 0;">
                ${ins.summary}
              </p>

              <!-- Metric Callout & Baseline Box -->
              <div style="padding: 10px 12px; background: rgba(248, 250, 252, 0.85); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); margin-bottom: var(--space-4);">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <div>
                    <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; display: block;">${ins.metric_label || "Observed Metric"}</span>
                    <strong style="font-size: var(--text-base); font-family: var(--font-mono); color: ${badgeColor};">${ins.metric || "—"}</strong>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-size: 10px; color: var(--text-muted); display: block;">Benchmark</span>
                    <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${ins.comparison || "Standard Baseline"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <!-- Affected Entities Tag -->
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: var(--space-3);">
                <span style="font-weight: 600; color: var(--text-secondary);">Target:</span> ${ins.affected_entities || "Cross-Cohort"}
              </div>

              <!-- Action & Inspect Buttons -->
              <div style="display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--glass-border); padding-top: var(--space-3);">
                <button class="btn btn-secondary btn-inspect-insight" data-insight-id="${ins.id}" style="flex: 1; padding: 6px 8px; font-size: 11px;">
                  Inspect Evidence
                </button>
                <button class="btn btn-primary btn-action-insight" data-route="${ins.target_route || ""}" style="flex: 1; padding: 6px 8px; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                  <span>${ins.action_label || "View Analysis"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  // Attach card and button event listeners
  attachCardEvents(mount, insights);
}

/**
 * Attaches inspect modal and navigation events
 */
function attachCardEvents(mount, insights) {
  const insightMap = new Map(insights.map((i) => [i.id, i]));

  // Inspect Evidence buttons
  const inspectBtns = mount.querySelectorAll(".btn-inspect-insight");
  inspectBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-insight-id");
      const ins = insightMap.get(id);
      if (ins) openInsightModal(ins);
    });
  });

  // Action Navigation buttons
  const actionBtns = mount.querySelectorAll(".btn-action-insight");
  actionBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const route = btn.getAttribute("data-route");
      if (route) {
        window.location.hash = `#${route}`;
      }
    });
  });

  // Entire card clicks
  const cards = mount.querySelectorAll(".insight-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-insight-id");
      const ins = insightMap.get(id);
      if (ins) openInsightModal(ins);
    });
  });
}

/**
 * Skeleton Loader for AI Insights
 */
function renderInsightsSkeleton(mount) {
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

    <!-- Cards Skeletons (6 cards: 2 rows x 3 cols) -->
    <div class="grid-3-cols" style="gap: var(--space-5);">
      ${[1, 2, 3, 4, 5, 6].map(() => `
        <div class="glass-panel" style="height: 280px; background: rgba(255, 255, 255, 0.5);"></div>
      `).join("")}
    </div>
  `;
}

/**
 * LearnIQ — Hash-Based Client Router
 * Guaranteed reliability, graceful 404 fallbacks, and zero blank screens.
 */

import { store } from "./state.js";
import { renderErrorState } from "./components/error-state.js";

// Metadata mapping for all registered application modules
export const ROUTE_REGISTRY = {
  "/overview": {
    title: "Executive Overview",
    subtitle: "High-level institutional performance & KPIs",
    breadcrumb: ["Analytics", "Executive Overview"],
    description: "Macro-level institutional health metrics, national rankings, and longitudinal assessment benchmarks.",
    apiEndpoint: "GET /api/overview",
    features: [
      "Aggregate Performance & Benchmark Attainment",
      "Demographic & Area Distribution Breakdowns",
      "Longitudinal Attainment Trends",
      "Executive Priority Intervention Alerts",
    ],
  },
  "/schools": {
    title: "School Intelligence",
    subtitle: "Institutional comparison, rankings & diagnostics",
    breadcrumb: ["Analytics", "School Intelligence"],
    description: "Deep-dive diagnostic scorecards, multi-criteria filtering, and institution-level performance rankings.",
    apiEndpoint: "GET /api/schools & GET /api/schools/{id}",
    features: [
      "Comprehensive Institutional Directory & Filters",
      "Top-Performing & Priority-Focus Institutions",
      "Subject Mastery & Grade-Level Cohort Breakdown",
      "Digital Access & Infrastructure Correlation",
    ],
  },
  "/grades": {
    title: "Grade & Subject Intelligence",
    subtitle: "Cohort and subject-matter competency diagnostics",
    breadcrumb: ["Analytics", "Grade & Subject"],
    description: "Curricular competency breakdowns, grade-level transitions, and foundational literacy benchmarks.",
    apiEndpoint: "GET /api/grades & GET /api/subjects",
    features: [
      "Grade 1–12 Longitudinal Competency Matrix",
      "Subject Proficiency vs Benchmark Attainment",
      "Curricular Learning Gap Diagnosis",
      "Cross-Subject Correlation Analysis",
    ],
  },
  "/students": {
    title: "Student Intelligence",
    subtitle: "360° individual learner diagnostic registry",
    breadcrumb: ["Student Operations", "Student Intelligence"],
    description: "Comprehensive learner profiles, assessment trajectories, and personalized skill deficiency tracking.",
    apiEndpoint: "GET /api/students & GET /api/students/{id}",
    features: [
      "98,000+ Student Directory with Multi-Criteria Search",
      "Student 360° Profile & Demographics",
      "Longitudinal Assessment History & Trajectories",
      "Personalized Skill Deficiency Diagnostics",
    ],
  },
  "/risk": {
    title: "Risk & Early Warning Intelligence",
    subtitle: "Institutional early warning triage & remediation",
    breadcrumb: ["Student Operations", "Risk & Early Warning"],
    description: "Predictive early warning triage queue, multi-factor risk categorization, and intervention tracking.",
    apiEndpoint: "GET /api/risk & GET /api/interventions",
    features: [
      "Prioritized Student Risk Triage Queue",
      "Multi-Factor Root Cause Diagnostic Breakdown",
      "Remediation Plan Assignment & Tracking",
      "Pre vs Post Intervention Score Recovery",
    ],
  },
  "/ai": {
    title: "AI Student Learning Analyst",
    subtitle: "Natural language query planner grounded in PostgreSQL",
    breadcrumb: ["AI", "AI Student Analyst"],
    description: "Conversational analytics agent with zero-fabrication query planning and structured statistical citations.",
    apiEndpoint: "POST /api/agent/query",
    features: [
      "Conversational Natural-Language Analytics Interface",
      "Dual-Mode Query Planning Grounded in Database",
      "Zero-Fabrication Data Extraction",
      "Evidence Tables & Statistical Citations",
    ],
  },
  "/ai-insight": {
    title: "AI Insights",
    subtitle: "AI-generated intelligence from institutional performance data",
    breadcrumb: ["AI", "AI Insights"],
    description: "Module scheduled for the AI Intelligence phase.",
    apiEndpoint: "GET /api/overview & SQL Analytics",
    features: [
      "Automated Root Cause Diagnosis",
      "Targeted Resource Allocation Guidance",
      "Intervention Efficacy Forecasts",
      "Policy Recommendations",
    ],
  },
};

export class Router {
  constructor(routes = {}, defaultRoute = "/overview") {
    this.routes = routes;
    this.defaultRoute = defaultRoute;
    this.container = null;

    // Bind hash change listener
    window.addEventListener("hashchange", () => this.handleRouteChange());
  }

  init(containerElement) {
    this.container = containerElement;
    if (!window.location.hash) {
      window.location.hash = `#${this.defaultRoute}`;
    } else {
      this.handleRouteChange();
    }
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = `#${path}`;
  }

  async handleRouteChange() {
    const rawHash = window.location.hash.slice(1) || this.defaultRoute;
    const cleanPath = rawHash.split("?")[0] || this.defaultRoute;

    // Normalize route path
    const targetRoute = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
    const routeInfo = ROUTE_REGISTRY[targetRoute];

    // Update global state metadata
    if (routeInfo) {
      store.setState({
        currentRoute: targetRoute,
        pageMeta: {
          title: routeInfo.title,
          subtitle: routeInfo.subtitle,
          breadcrumb: routeInfo.breadcrumb,
        },
      });
    } else {
      store.setState({
        currentRoute: targetRoute,
        pageMeta: {
          title: "Page Not Found",
          subtitle: "The requested route does not exist",
          breadcrumb: ["Error", "404 Not Found"],
        },
      });
    }

    if (!this.container) return;

    try {
      if (this.routes[targetRoute]) {
        // Execute registered custom handler
        await this.routes[targetRoute](this.container, routeInfo);
      } else if (routeInfo) {
        // Fallback default clean module placeholder
        this.renderModulePlaceholder(this.container, routeInfo, targetRoute);
      } else {
        // Unknown 404 route
        this.renderNotFound(this.container, targetRoute);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(`[Router Error] Failed to render route "${targetRoute}":`, err);
      renderErrorState(this.container, {
        title: `Error Loading ${routeInfo?.title || targetRoute}`,
        message: err.message || "An unexpected error occurred while rendering this module.",
        onRetry: () => this.handleRouteChange(),
      });
    }
  }

  renderModulePlaceholder(container, routeInfo, path) {
    const breadcrumbHtml = routeInfo.breadcrumb
      .map((b, i, arr) => `
        <span class="breadcrumb-item ${i === arr.length - 1 ? "active" : ""}">${b}</span>
        ${i < arr.length - 1 ? `<span class="breadcrumb-separator">/</span>` : ""}
      `)
      .join("");

    container.innerHTML = `
      <div class="page-container">
        <div class="breadcrumb">${breadcrumbHtml}</div>
        
        <div class="section-header">
          <div class="section-title-wrap">
            <h1 class="section-title">${routeInfo.title}</h1>
            <p class="section-subtitle">${routeInfo.subtitle}</p>
          </div>
          <span class="status-pill status-pill-neutral">
            <span class="status-pill-dot"></span> Verified Shell Route
          </span>
        </div>

        <div class="module-placeholder-box">
          <div class="module-placeholder-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
          </div>
          <h2 class="module-placeholder-title">${routeInfo.title}</h2>
          <p class="module-placeholder-desc">${routeInfo.description}</p>
          <div style="display: inline-flex; align-items: center; gap: 8px;">
            <span class="badge badge-primary">Shell Module Ready</span>
            <span class="badge badge-teal">${routeInfo.apiEndpoint}</span>
          </div>

          <div class="module-specs-grid">
            ${routeInfo.features
              .map(
                (f) => `
              <div class="module-spec-item">
                <div class="module-spec-label">Planned Capability</div>
                <div class="module-spec-value" style="font-family: inherit; font-size: var(--text-xs); font-weight: 500;">${f}</div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  renderNotFound(container, path) {
    container.innerHTML = `
      <div class="page-container">
        <div class="glass-panel" style="max-width: 600px; margin: 40px auto; padding: var(--space-8); text-align: center;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--amber-subtle); color: var(--amber); display: inline-flex; align-items: center; justify-content: center; margin-bottom: var(--space-4);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 style="font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-2);">Route Not Found</h2>
          <p style="font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.5; margin-bottom: var(--space-6);">
            The route <code>#${path}</code> is not registered in this application shell.
          </p>
          <a href="#/overview" class="btn btn-primary">Return to Executive Overview</a>
        </div>
      </div>
    `;
  }
}

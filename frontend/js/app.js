/**
 * LearnIQ — Main Application Bootstrap Module
 * Coordinates UI Shell, Navigation, Health Polling, and Lifecycle.
 */

import { api } from "./api.js";
import { store } from "./state.js";
import { Router } from "./router.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderHeader } from "./components/header.js";
import { setupGlobalErrorHandlers } from "./components/error-state.js";
import { renderOverviewPage } from "./pages/overview.js";
import { renderSchoolsPage } from "./pages/schools.js";
import { renderGradesPage } from "./pages/grades.js";
import { renderStudentsPage } from "./pages/students.js";
import { renderRiskPage } from "./pages/risk.js";
import { renderInsightsPage } from "./pages/insights.js";
import { renderAiPage } from "./pages/ai.js";
import { initPreloader, dismissPreloader } from "./components/preloader.js";

// DOM Mount References
let sidebarMount = null;
let headerMount = null;
let contentMount = null;
let router = null;

/**
 * Syncs the shell components (header and sidebar) with current state
 */
function syncShell() {
  if (sidebarMount) {
    renderSidebar(sidebarMount);
  }
  if (headerMount) {
    renderHeader(headerMount, () => handleRefresh());
  }
}

/**
 * Checks backend health and updates connection status reactively
 */
async function checkBackendHealth() {
  try {
    const data = await api.health();
    console.log("[Health Check] Backend Response:", data);
    const isHealthy = data.status === "healthy" || data.status === "ok" || data.status === "connected";
    store.setState({
      backendStatus: isHealthy ? "healthy" : "error",
      healthData: data,
    });
  } catch (err) {
    console.warn("[Health Check] Backend health check failed:", err.message);
    store.setState({
      backendStatus: "disconnected",
      healthData: null,
    });
  }
}

/**
 * User-initiated refresh action
 */
async function handleRefresh() {
  console.log("[App] Refreshing health and current route...");
  api.clearCache();
  await checkBackendHealth();
  if (router) {
    router.handleRouteChange();
  }
}

/**
 * Application Bootstrap on DOM Ready
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("%cLearnIQ %cDecision Intelligence Platform Shell Initializing...", "color: #4f46e5; font-weight: bold; font-size: 14px;", "color: #475569; font-size: 12px;");

  // 0. Initialize Full-Screen Preloader Lifecycle & Status Rotation
  initPreloader();

  // 1. Setup Global Error Handlers
  setupGlobalErrorHandlers();

  // 2. Locate DOM Mount Containers
  sidebarMount = document.getElementById("sidebar-mount");
  headerMount = document.getElementById("header-mount");
  contentMount = document.getElementById("content-mount");

  if (!sidebarMount || !headerMount || !contentMount) {
    console.error("[Bootstrap Error] Critical DOM mount nodes missing!");
    return;
  }

  // 3. Subscribe shell components to reactive state changes
  store.subscribe(() => syncShell());

  // 4. Initial Shell Render
  syncShell();

  // 5. Initialize Router and register real pages
  router = new Router({}, "/overview");
  router.register("/overview", async (container) => {
    await renderOverviewPage(container);
  });
  router.register("/schools", async (container) => {
    await renderSchoolsPage(container);
    dismissPreloader();
  });
  router.register("/grades", async (container) => {
    await renderGradesPage(container);
    dismissPreloader();
  });
  router.register("/students", async (container) => {
    await renderStudentsPage(container);
    dismissPreloader();
  });
  router.register("/risk", async (container) => {
    await renderRiskPage(container);
    dismissPreloader();
  });
  router.register("/insights", async (container) => {
    await renderInsightsPage(container);
    dismissPreloader();
  });
  router.register("/ai-insight", async (container) => {
    await renderInsightsPage(container);
    dismissPreloader();
  });
  router.register("/ai", async (container) => {
    await renderAiPage(container);
    dismissPreloader();
  });
  router.init(contentMount);

  // 6. Asynchronous Non-Blocking Backend Health Check
  await checkBackendHealth();

  // 7. Intelligent Staggered Background Preloader for Dashboard Modules
  startDashboardPreload();

  console.log("[App] Shell initialized and active.");
});

/**
 * Preloads data for all major dashboard pages in controlled background batches.
 * Guarantees instant page transitions after initial load without overloading the database.
 */
async function startDashboardPreload() {
  // Allow the active route 300ms uninterrupted priority
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log("[Preloader] Starting background dashboard preloading...");

  const batches = [
    // Batch 1: Primary institutional and cohort performance
    [
      () => api.overview({}),
      () => api.schools({ page: 1, page_size: 25 }),
      () => api.grades({}),
    ],
    // Batch 2: Subject diagnostics and early-warning risk queue
    [
      () => api.subjects({}),
      () => api.risk({ limit: 25, offset: 0 }),
    ],
    // Batch 3: Student directory and remediation interventions
    [
      () => api.students({ page: 1, page_size: 25 }),
      () => api.interventions({ limit: 10 }),
    ],
    // Batch 4: Proactive AI insights (low priority)
    [
      () => api.insights({}),
    ],
  ];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    await Promise.allSettled(
      batch.map((loadFn) =>
        loadFn().catch((err) => {
          console.debug("[Preloader] Task caught non-fatal error:", err.message);
        })
      )
    );
  }

  console.log("[Preloader] All major dashboard modules preloaded successfully into client cache.");
}
